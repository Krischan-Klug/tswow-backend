import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve('src/plugins');
const destRoot = path.resolve('dist/src/plugins');

if (fs.existsSync(srcRoot)) {
  for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(srcRoot, entry.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const destDir = path.join(destRoot, entry.name);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(pkgPath, path.join(destDir, 'package.json'));
  }
}
