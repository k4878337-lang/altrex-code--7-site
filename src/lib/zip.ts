import JSZip from 'jszip';
import { WorkspaceFile } from '../types.js';

export async function createProjectZipBlob(
  files: Array<{ path: string; content: string } | WorkspaceFile & { content?: string }>,
  projectName: string = 'altrex-project'
): Promise<Blob> {
  const zip = new JSZip();

  // If files array is passed with content
  for (const file of files) {
    if ('isDirectory' in file && file.isDirectory) continue;
    const path = file.path.replace(/^\/+/, '');
    const content = 'content' in file ? (file.content ?? '') : '';
    zip.file(path, content);
  }

  // Ensure index.html exists in zip if empty
  if (!files.some((f) => f.path === 'index.html' || f.path.endsWith('/index.html'))) {
    zip.file(
      'index.html',
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${projectName}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #00f0ff; text-align: center; padding: 4rem; }
    h1 { font-size: 2.5rem; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>${projectName}</h1>
  <p>Exported from ALTREX CODE Cyber IDE</p>
</body>
</html>`
    );
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return blob;
}

export async function downloadProjectZip(
  files: Array<{ path: string; content: string } | WorkspaceFile & { content?: string }>,
  projectName: string = 'altrex-project'
): Promise<void> {
  const blob = await createProjectZipBlob(files, projectName);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
