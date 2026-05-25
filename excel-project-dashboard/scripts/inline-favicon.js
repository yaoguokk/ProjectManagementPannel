import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const dist = 'dist';
const htmlPath = join(dist, 'index.html');
const faviconPath = join(dist, 'favicon.svg');

const html = readFileSync(htmlPath, 'utf8');
const favicon = readFileSync(faviconPath);
const b64 = favicon.toString('base64');
const dataUri = `data:image/svg+xml;base64,${b64}`;

const updated = html.replace('href="./favicon.svg"', `href="${dataUri}"`);
writeFileSync(htmlPath, updated);
unlinkSync(faviconPath);

console.log('favicon.svg inlined and cleaned up. dist/ contains only index.html');
