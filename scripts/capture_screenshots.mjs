import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function capture() {
  await mkdir('./screenshots', { recursive: true });
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  
  const viewports = [
    { name: 'desktop-1440', width: 1440, height: 900 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'mobile-390', width: 390, height: 844 },
  ];

  for (const vp of viewports) {
    const outFile = resolve(`./screenshots/${vp.name}.png`);
    const args = [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${vp.width},${vp.height}`,
      `--screenshot=${outFile}`,
      'http://127.0.0.1:5173'
    ];

    await new Promise((resolvePromise) => {
      const proc = spawn(edgePath, args, { stdio: 'ignore' });
      proc.on('close', () => resolvePromise(null));
      proc.on('error', () => resolvePromise(null));
    });
  }
}

capture().catch(console.error);
