import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildStyle, styleName, FORMS, ZONES, REPEATS } from '../../src/styles/build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(root, 'build');
mkdirSync(outDir, { recursive: true });

let n = 0;
for (const form of FORMS) for (const zone of ZONES) for (const repeat of REPEATS) {
  const opts = { form, zone, repeat };
  writeFileSync(join(outDir, `${styleName({ ...opts, analytic: 'slashes' })}.csl`), buildStyle(opts));
  n++;
}
console.log(`wrote ${n} styles to build/`);
