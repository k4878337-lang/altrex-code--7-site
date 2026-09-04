import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LanguageConfig, LanguageDetector, LANGUAGE_REGISTRY } from '../languages/registry.js';

const execAsync = promisify(exec);

export interface UniversalPreviewResult {
  type: 'web' | 'output' | 'apk' | 'none';
  htmlContent?: string;
  output?: string;
  exitCode?: number;
  durationMs?: number;
  language: string;
  error?: string;
}

export class UniversalPreview {
  /**
   * Preview ANY file in any language inside the workspace
   */
  async previewFile(filePath: string, workDir?: string): Promise<UniversalPreviewResult> {
    const lang = LanguageDetector.detect(filePath) || LANGUAGE_REGISTRY.javascript;
    const dir = workDir || path.dirname(filePath);
    const fileName = path.basename(filePath);
    const baseName = path.basename(filePath, path.extname(filePath));
    const start = Date.now();

    try {
      switch (lang.preview) {
        // ===== WEB: HTML / CSS / Markdown / JSON =====
        case 'web': {
          const content = await fs.readFile(filePath, 'utf-8');
          if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
            const html = this.renderMarkdown(content);
            return {
              type: 'web',
              htmlContent: html,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          }

          if (fileName.endsWith('.json')) {
            const html = `<!DOCTYPE html><html><body style="background:#090d16;color:#38bdf8;font-family:monospace;padding:24px;white-space:pre-wrap;">${this.escapeHtml(content)}</body></html>`;
            return {
              type: 'web',
              htmlContent: html,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          }

          return {
            type: 'web',
            htmlContent: content,
            language: lang.name,
            durationMs: Date.now() - start,
          };
        }

        // ===== RUN & SHOW OUTPUT: Python, JS, TS, Go, Ruby, PHP, Lua, Shell =====
        case 'run-output': {
          const runCmdTemplate = lang.runCommand || 'node {file}';
          const cmd = runCmdTemplate.replace('{file}', `"${filePath}"`);
          
          try {
            const { stdout, stderr } = await execAsync(cmd, {
              cwd: dir,
              timeout: 25000,
              maxBuffer: 1024 * 1024 * 5,
              env: { ...process.env, PYTHONUNBUFFERED: '1' },
            });

            return {
              type: 'output',
              output: stdout.trim() || '(Execution completed with no stdout)',
              error: stderr.trim() || undefined,
              exitCode: 0,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          } catch (error: any) {
            return {
              type: 'output',
              output: error.stdout ? error.stdout.trim() : '',
              error: error.stderr ? error.stderr.trim() : error.message,
              exitCode: error.code || 1,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          }
        }

        // ===== COMPILE THEN RUN: C, C++, Java, Rust =====
        case 'compile-run': {
          const outBinary = path.join(dir, `${baseName}_bin`);
          try {
            if (lang.compileCommand) {
              const compileCmd = lang.compileCommand
                .replace('{file}', `"${filePath}"`)
                .replace('{output}', `"${outBinary}"`)
                .replace('{classname}', baseName);
              
              await execAsync(compileCmd, { cwd: dir, timeout: 45000 });
            }

            const runCmd = (lang.runCommand || './{output}')
              .replace('{output}', `"${outBinary}"`)
              .replace('{classname}', baseName);

            const { stdout, stderr } = await execAsync(runCmd, {
              cwd: dir,
              timeout: 25000,
            });

            // Cleanup binary
            try {
              if (fsSync.existsSync(outBinary)) await fs.unlink(outBinary);
            } catch {}

            return {
              type: 'output',
              output: stdout.trim() || '(Process completed with no output)',
              error: stderr.trim() || undefined,
              exitCode: 0,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          } catch (error: any) {
            return {
              type: 'output',
              output: error.stdout ? error.stdout.trim() : '',
              error: error.stderr ? error.stderr.trim() : error.message,
              exitCode: error.code || 1,
              language: lang.name,
              durationMs: Date.now() - start,
            };
          }
        }

        case 'server': {
          return {
            type: 'web',
            htmlContent: `<!DOCTYPE html><html><body style="background:#090d16;color:#38bdf8;font-family:system-ui;padding:24px;text-align:center;"><h2>⚡ Live Dev Server Preview Active</h2><p style="color:#94a3b8">Language: ${lang.name}</p></body></html>`,
            language: lang.name,
            durationMs: Date.now() - start,
          };
        }

        case 'mobile': {
          return {
            type: 'apk',
            language: lang.name,
            durationMs: Date.now() - start,
          };
        }

        default:
          return {
            type: 'none',
            language: lang.name,
            error: `Language ${lang.name} does not have an active preview handler.`,
            durationMs: Date.now() - start,
          };
      }
    } catch (err: any) {
      return {
        type: 'output',
        error: err.message,
        exitCode: 1,
        language: lang.name,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Preview raw code string directly from the UI or agent output
   */
  async previewCode(code: string, languageId: string, workDir: string): Promise<UniversalPreviewResult> {
    const lang = LANGUAGE_REGISTRY[languageId] || LanguageDetector.detect(`sample.${languageId}`) || LANGUAGE_REGISTRY.javascript;

    // Web languages can be returned directly
    if (lang.preview === 'web') {
      if (lang.id === 'markdown') {
        return {
          type: 'web',
          htmlContent: this.renderMarkdown(code),
          language: lang.name,
          durationMs: 5,
        };
      }
      return {
        type: 'web',
        htmlContent: code,
        language: lang.name,
        durationMs: 5,
      };
    }

    // Run / Compile languages: write temp file in .altrex/tmp and preview
    const tmpDir = path.join(workDir, '.altrex-tmp');
    await fs.mkdir(tmpDir, { recursive: true });
    const ext = lang.extensions[0] || '.txt';
    const tmpFile = path.join(tmpDir, `exec_${Date.now()}${ext}`);

    try {
      await fs.writeFile(tmpFile, code, 'utf-8');
      const res = await this.previewFile(tmpFile, tmpDir);
      // Clean up temp file
      try {
        await fs.unlink(tmpFile);
      } catch {}
      return res;
    } catch (err: any) {
      return {
        type: 'output',
        error: err.message,
        exitCode: 1,
        language: lang.name,
        durationMs: 10,
      };
    }
  }

  private renderMarkdown(md: string): string {
    const body = md
      .replace(/^### (.*$)/gm, '<h3 style="color:#38bdf8;font-size:1.1rem;margin:1rem 0 0.5rem;">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 style="color:#67e8f9;font-size:1.3rem;margin:1.25rem 0 0.5rem;border-bottom:1px solid #1e293b;padding-bottom:4px;">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 style="color:#a5f3fc;font-size:1.6rem;margin:1.5rem 0 0.75rem;border-bottom:1px solid #334155;padding-bottom:6px;">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color:#cbd5e1;">$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:#1e293b;color:#38bdf8;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:0.9em;">$1</code>')
      .replace(/```([a-z]*)\n([\s\S]*?)```/gm, '<pre style="background:#030712;border:1px solid #1e293b;border-radius:8px;padding:12px;overflow-x:auto;color:#e2e8f0;font-family:monospace;font-size:0.85em;line-height:1.5;"><code>$2</code></pre>')
      .replace(/^\- (.*$)/gm, '<li style="margin-left:1.5rem;color:#cbd5e1;">$1</li>')
      .replace(/\n/g, '<br>');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #090d16;
      color: #e2e8f0;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
    }
  </style>
</head>
<body>${body}</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
