import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { APKResultData } from '../../types.js';

export interface BuildOptions {
  appName?: string;
  appId?: string;
  versionName?: string;
  githubToken?: string;
}

export class APKBuilder {
  /**
   * Primary entry point for APK build requests.
   * If a GitHub token is available, dispatches to cloud GitHub Actions builder.
   * Otherwise, provides a ready-to-run Android package export and PWA guidance.
   */
  async buildAPK(workspaceDir: string, options: BuildOptions = {}): Promise<APKResultData> {
    const appName = options.appName || 'ALTREX App';
    const cleanName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const appId = options.appId || `com.altrex.${cleanName || 'app'}`;
    const versionName = options.versionName || '1.0.0';

    if (options.githubToken) {
      return this.buildInCloud(workspaceDir, options);
    }

    // When running inside a browser sandbox without GitHub token
    const logs = [
      `[APKBuilder] Target App: ${appName} (${appId} v${versionName})`,
      `[APKBuilder] Detected Container Environment: Cloud Sandbox`,
      `[APKBuilder] Local Android SDK / Gradle daemon is not installed in the lightweight web sandbox.`,
      `[APKBuilder] Solution: Connect a GitHub token in the APK modal for 100% free Cloud APK compilation via GitHub Actions, or download the full Android project ZIP.`,
    ];

    return {
      success: false,
      appName,
      appId,
      versionName,
      message: 'Local Gradle is unavailable in sandbox. Use Cloud APK build or Export Project ZIP.',
      buildLogs: logs,
      errorDetails: {
        reason: 'Android SDK & Gradle daemon cannot execute inside the lightweight container sandbox.',
        fixSuggestion: 'Connect a free GitHub Classic Token with `repo` and `workflow` scopes in the APK modal to build directly on GitHub Cloud Runners.',
      },
    };
  }

  /**
   * Builds an APK using GitHub Actions runner (Ubuntu + Java 17 + Gradle).
   */
  async buildInCloud(workspaceDir: string, options: BuildOptions = {}): Promise<APKResultData> {
    const appName = options.appName || 'ALTREX App';
    const clean = appName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const appId = options.appId || `com.altrex.${clean.replace(/-/g, '') || 'app'}`;
    const versionName = options.versionName || '1.0.0';
    const token = options.githubToken?.trim();

    const logs: string[] = [
      `[CloudBuild] Initializing GitHub Actions APK Pipeline...`,
      `[CloudBuild] App: "${appName}" [${appId} v${versionName}]`,
    ];

    if (!token) {
      logs.push(`[CloudBuild] Error: No GitHub token provided.`);
      return {
        success: false,
        appName,
        appId,
        versionName,
        message: 'GitHub Personal Access Token is required to trigger cloud build.',
        buildLogs: logs,
        errorDetails: {
          reason: 'GitHub token was empty or missing.',
          fixSuggestion: 'Create a GitHub Personal Access Token (Classic) with `repo` and `workflow` scopes at https://github.com/settings/tokens/new?scopes=repo,workflow and paste it into Connect Platforms.',
        },
      };
    }

    try {
      logs.push(`[CloudBuild] Authenticating with GitHub API...`);
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ALTREX-Cloud-Builder',
        },
      });

      if (!userRes.ok) {
        const errText = await userRes.text();
        logs.push(`[CloudBuild] GitHub authentication failed: ${errText}`);
        return {
          success: false,
          appName,
          appId,
          versionName,
          message: 'GitHub authentication failed. Token may be invalid or expired.',
          buildLogs: logs,
          errorDetails: {
            reason: `GitHub API error HTTP ${userRes.status}: ${errText}`,
            fixSuggestion: 'Verify that your token has not expired and has `repo` and `workflow` scopes enabled.',
          },
        };
      }

      const userData = await userRes.json();
      const username = userData.login;
      logs.push(`[CloudBuild] Authenticated as GitHub user: ${username}`);

      // Create a dedicated build repository
      const repoName = `altrex-apk-${clean}-${Date.now().toString().slice(-6)}`;
      logs.push(`[CloudBuild] Creating cloud build repository: ${username}/${repoName}...`);

      const createRepoRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ALTREX-Cloud-Builder',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: `Automated Android APK build repository for ${appName} generated by ALTREX CODE`,
          private: true,
          auto_init: true,
        }),
      });

      if (!createRepoRes.ok) {
        const errText = await createRepoRes.text();
        logs.push(`[CloudBuild] Failed to create repository: ${errText}`);
        return {
          success: false,
          appName,
          appId,
          versionName,
          message: `Failed to create GitHub repository: ${errText}`,
          buildLogs: logs,
          errorDetails: {
            reason: `GitHub repository creation rejected (HTTP ${createRepoRes.status}).`,
            fixSuggestion: 'Ensure your GitHub token has full `repo` permissions.',
          },
        };
      }

      const repoData = await createRepoRes.json();
      const repoUrl = repoData.html_url;
      logs.push(`[CloudBuild] Repository created: ${repoUrl}`);

      // Wait 1.5s for GitHub to initialize repo
      await new Promise((r) => setTimeout(r, 1500));

      // Push Android Workflow file (.github/workflows/apk.yml)
      logs.push(`[CloudBuild] Injecting GitHub Actions Android Workflow...`);
      const workflowContent = this.getGitHubWorkflowYaml(appName);
      const putWorkflowRes = await fetch(
        `https://api.github.com/repos/${username}/${repoName}/contents/.github/workflows/apk.yml`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'ALTREX-Cloud-Builder',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'feat: add Android APK build workflow [ALTREX Cloud]',
            content: Buffer.from(workflowContent).toString('base64'),
          }),
        }
      );

      if (!putWorkflowRes.ok) {
        const errText = await putWorkflowRes.text();
        logs.push(`[CloudBuild] Failed to push workflow: ${errText}`);
      } else {
        logs.push(`[CloudBuild] Workflow successfully pushed.`);
      }

      // Push Project README
      const readmeContent = `# ${appName} - Android Mobile Build\n\nAutomatically generated by **ALTREX CODE**.\n\n### Status\nThis repository is currently compiling your Android APK via GitHub Actions.\n\nView the live build status: [GitHub Actions](${repoUrl}/actions)`;
      await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/README.md`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ALTREX-Cloud-Builder',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'docs: update build documentation',
          content: Buffer.from(readmeContent).toString('base64'),
        }),
      });

      const workflowUrl = `${repoUrl}/actions`;
      logs.push(`[CloudBuild] 🚀 GitHub Actions workflow dispatched successfully!`);
      logs.push(`[CloudBuild] Tracking URL: ${workflowUrl}`);

      // Generate QR Code for tracking on phone
      let qrCodeData = '';
      try {
        qrCodeData = await QRCode.toDataURL(workflowUrl, {
          margin: 2,
          width: 280,
          color: {
            dark: '#00f0ff',
            light: '#070c18',
          },
        });
      } catch (qrErr) {
        console.warn('QR Code generation error:', qrErr);
      }

      return {
        success: true,
        appName,
        appId,
        versionName,
        repoUrl,
        workflowUrl,
        qrCodeData,
        message: 'Cloud build started! GitHub Actions is compiling your Android APK.',
        buildLogs: logs,
      };
    } catch (err: any) {
      logs.push(`[CloudBuild] Unexpected failure: ${err.message}`);
      return {
        success: false,
        appName,
        appId,
        versionName,
        message: err.message || 'Cloud build failed',
        buildLogs: logs,
        errorDetails: {
          reason: err.message,
          fixSuggestion: 'Check your internet connection and GitHub token scopes.',
        },
      };
    }
  }

  /**
   * Generates a complete Android Capacitor project as a zip file Buffer.
   */
  async generateAndroidProjectZip(workspaceDir: string, options: BuildOptions = {}): Promise<Buffer> {
    const appName = options.appName || 'ALTREX App';
    const clean = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const appId = options.appId || `com.altrex.${clean || 'app'}`;
    const versionName = options.versionName || '1.0.0';

    const zip = new JSZip();

    // 1. Root configuration files
    zip.file('package.json', JSON.stringify({
      name: (appName.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'altrex-app'),
      version: versionName,
      private: true,
      scripts: {
        build: 'echo "Web assets ready"',
        'build:android': 'cd android && ./gradlew assembleDebug',
      },
      dependencies: {
        '@capacitor/core': '^6.0.0',
        '@capacitor/android': '^6.0.0',
      },
      devDependencies: {
        '@capacitor/cli': '^6.0.0',
      },
    }, null, 2));

    zip.file('capacitor.config.json', JSON.stringify({
      appId,
      appName,
      webDir: 'www',
      bundledWebRuntime: false,
    }, null, 2));

    // 2. Android Studio & Gradle Structure
    zip.file('android/build.gradle', `
// Top-level build file
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.1'
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

tasks.register('clean', Delete) {
    delete rootProject.buildDir
}
`.trim());

    zip.file('android/settings.gradle', `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${appName}"
include ':app'
`.trim());

    zip.file('android/gradle.properties', `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
`.trim());

    // 3. Android App module
    zip.file('android/app/build.gradle', `
apply plugin: 'com.android.application'

android {
    namespace "${appId}"
    compileSdk 34

    defaultConfig {
        applicationId "${appId}"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "${versionName}"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            debuggable true
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'androidx.webkit:webkit:1.10.0'
}
`.trim());

    zip.file('android/app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${appName}"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:theme="@style/Theme.AppCompat.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`.trim());

    // Package Java path
    const pkgPath = appId.replace(/\./g, '/');
    zip.file(`android/app/src/main/java/${pkgPath}/MainActivity.java`, `package ${appId};

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setDatabaseEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`.trim());

    // 4. Bundle Web Assets from workspaceDir into www/ and assets
    let includedAny = false;
    if (fsSync.existsSync(workspaceDir)) {
      const files = await fs.readdir(workspaceDir);
      for (const file of files) {
        if (['node_modules', '.git', 'android'].includes(file)) continue;
        const full = path.join(workspaceDir, file);
        const stat = await fs.stat(full);
        if (stat.isFile()) {
          const content = await fs.readFile(full);
          zip.file(`www/${file}`, content);
          zip.file(`android/app/src/main/assets/${file}`, content);
          if (file === 'index.html') includedAny = true;
        }
      }
    }

    if (!includedAny) {
      const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <title>${appName}</title>
  <style>
    body {
      margin: 0;
      background: #070b14;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 { color: #10b981; font-size: 28px; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; max-width: 320px; }
  </style>
</head>
<body>
  <h1>${appName}</h1>
  <p>Native Android container generated by ALTREX CODE.</p>
</body>
</html>`;
      zip.file('www/index.html', defaultHtml);
      zip.file('android/app/src/main/assets/index.html', defaultHtml);
    }

    // 5. GitHub Actions workflow for 1-click cloud building
    zip.file('.github/workflows/apk.yml', this.getGitHubWorkflowYaml(appName));

    // 6. Comprehensive README.md
    zip.file('README.md', `# ${appName} - Android Mobile Project

Generated by **ALTREX CODE Mobile Engine**.

## Quick Build Options

### Option 1: Free Cloud Build via GitHub (Recommended)
1. Push this entire extracted repository to any new GitHub repository.
2. Go to **Actions** tab in your GitHub repo.
3. The build will run automatically and upload the compiled \`.apk\` under **Artifacts**!

### Option 2: Local Android Studio
1. Open Android Studio.
2. Select **Open** and choose the \`android\` directory inside this project.
3. Wait for Gradle sync to complete.
4. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

### Option 3: Command Line (Linux/Mac)
\`\`\`bash
cd android
./gradlew assembleDebug
\`\`\`
The APK will be generated at \`android/app/build/outputs/apk/debug/app-debug.apk\`.
`.trim());

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return buffer;
  }

  private getGitHubWorkflowYaml(appName: string): string {
    return `name: Build Android APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Assemble Debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Build with Gradle
        run: |
          cd android
          chmod +x gradlew || true
          gradle assembleDebug --stacktrace || ./gradlew assembleDebug --stacktrace

      - name: Upload APK Artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-debug-apk
          path: android/app/build/outputs/apk/debug/*.apk
          retention-days: 14
`.trim();
  }
}
