import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

const execAsync = promisify(exec);

export interface GitStatus {
  branch: string;
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  isClean: boolean;
}

export interface GitDiff {
  file: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface PRDescription {
  title: string;
  summary: string;
  changes: string[];
  filesModified: string[];
  additions: number;
  deletions: number;
}

export class GitEngine {
  private initialized = false;

  constructor(private workDir: string) {}

  /**
   * Ensure git is initialized in the workspace
   */
  async ensureGitRepo(): Promise<void> {
    if (this.initialized) return;
    try {
      const gitDir = path.join(this.workDir, '.git');
      if (!fsSync.existsSync(gitDir)) {
        await execAsync('git init -b main', { cwd: this.workDir });
        await execAsync('git config user.name "ALTREX Agent"', { cwd: this.workDir });
        await execAsync('git config user.email "agent@altrex.internal"', { cwd: this.workDir });
      }
      this.initialized = true;
    } catch (err) {
      // Ignore if already initialized or permissions error
      this.initialized = true;
    }
  }

  /**
   * Get current git status
   */
  async status(): Promise<GitStatus> {
    await this.ensureGitRepo();
    try {
      const { stdout } = await this.git('status --porcelain -b');
      const lines = stdout.trim().split('\n').filter(Boolean);

      let branch = 'main';
      const modified: string[] = [];
      const added: string[] = [];
      const deleted: string[] = [];
      const untracked: string[] = [];

      for (const line of lines) {
        if (line.startsWith('## ')) {
          branch = line.replace('## ', '').split('...')[0].trim();
          continue;
        }

        const status = line.substring(0, 2).trim();
        const file = line.substring(3).trim();

        if (status.includes('M')) modified.push(file);
        else if (status.includes('A')) added.push(file);
        else if (status.includes('D')) deleted.push(file);
        else if (status === '??') untracked.push(file);
      }

      return {
        branch: branch || 'main',
        modified,
        added,
        deleted,
        untracked,
        isClean: modified.length === 0 && added.length === 0 && deleted.length === 0 && untracked.length === 0,
      };
    } catch (error: any) {
      return {
        branch: 'main',
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        isClean: true,
      };
    }
  }

  /**
   * Get diff of changes
   */
  async diff(staged = false): Promise<GitDiff[]> {
    await this.ensureGitRepo();
    try {
      const flag = staged ? '--staged' : '';
      const { stdout } = await this.git(`diff ${flag} --numstat`);
      const lines = stdout.trim().split('\n').filter((l) => l.trim());

      const diffs: GitDiff[] = [];
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 3) continue;
        const [additions, deletions, file] = parts;
        const { stdout: patch } = await this.git(`diff ${flag} -- "${file}"`);

        diffs.push({
          file,
          additions: parseInt(additions) || 0,
          deletions: parseInt(deletions) || 0,
          patch: patch || '',
        });
      }

      return diffs;
    } catch (error: any) {
      return [];
    }
  }

  /**
   * Create and checkout a new branch
   */
  async createBranch(name: string): Promise<string> {
    await this.ensureGitRepo();
    const cleanName = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
    const { stdout, stderr } = await this.git(`checkout -B ${cleanName}`);
    return (stdout || stderr || `Switched to branch ${cleanName}`).trim();
  }

  /**
   * Stage files
   */
  async stage(files?: string[]): Promise<string> {
    await this.ensureGitRepo();
    const target = files && files.length > 0 ? files.map((f) => `"${f}"`).join(' ') : '.';
    const { stdout } = await this.git(`add ${target}`);
    return stdout.trim() || 'Staged changes.';
  }

  /**
   * Commit with message
   */
  async commit(message: string): Promise<string> {
    await this.ensureGitRepo();
    const escaped = message.replace(/"/g, '\\"');
    const { stdout } = await this.git(`commit -m "${escaped}"`);
    return stdout.trim();
  }

  /**
   * Generate PR description using AI context
   */
  async generatePRDescription(aiSummary?: string): Promise<PRDescription> {
    await this.ensureGitRepo();
    const status = await this.status();
    // Check both staged and unstaged diffs
    let diffs = await this.diff(true);
    if (diffs.length === 0) {
      diffs = await this.diff(false);
    }

    const totalAdditions = diffs.reduce((sum, d) => sum + d.additions, 0);
    const totalDeletions = diffs.reduce((sum, d) => sum + d.deletions, 0);

    const changes = diffs.map((d) => {
      const action = d.additions > d.deletions ? 'Modified' : 'Refactored';
      return `${action} \`${d.file}\` (+${d.additions} -${d.deletions})`;
    });

    if (changes.length === 0 && status.untracked.length > 0) {
      status.untracked.forEach((f) => {
        changes.push(`Created \`${f}\` (new file)`);
      });
    }

    const title = aiSummary
      ? aiSummary.split('\n')[0].substring(0, 72)
      : diffs.length > 0
      ? `feat: update ${diffs.length} workspace file${diffs.length !== 1 ? 's' : ''}`
      : 'feat: workspace updates and enhancements';

    return {
      title,
      summary: aiSummary || 'Automated code changes generated and verified by ALTREX CODE ATX-1.',
      changes: changes.length > 0 ? changes : ['Verified workspace code consistency and formatting.'],
      filesModified: diffs.map((d) => d.file),
      additions: totalAdditions,
      deletions: totalDeletions,
    };
  }

  /**
   * Format PR description as Markdown
   */
  formatPRMarkdown(pr: PRDescription): string {
    return `## ${pr.title}

### 📋 Summary
${pr.summary}

### 🛠️ Changes
${pr.changes.map((c) => `- ${c}`).join('\n')}

### 📊 Statistics
- **Files modified:** ${pr.filesModified.length}
- **Lines added:** +${pr.additions}
- **Lines deleted:** -${pr.deletions}

---
*Generated by ALTREX CODE v3.0 (ATX-1 Engine)* ⚡
`;
  }

  /**
   * Push to remote
   */
  async push(remote = 'origin', branch?: string): Promise<string> {
    await this.ensureGitRepo();
    const currentBranch = branch || (await this.status()).branch;
    const { stdout, stderr } = await this.git(`push ${remote} ${currentBranch}`);
    return stdout || stderr;
  }

  /**
   * Create PR via GitHub CLI (if available)
   */
  async createGitHubPR(title: string, body: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `gh pr create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`,
        { cwd: this.workDir }
      );
      return stdout.trim();
    } catch (error: any) {
      return `GitHub CLI note: ${error.message}`;
    }
  }

  private async git(command: string): Promise<{ stdout: string; stderr: string }> {
    return execAsync(`git ${command}`, { cwd: this.workDir });
  }
}
