import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { version } = JSON.parse(readFileSync(join(root, 'plugin/manifest.json'), 'utf8'));
const out = join(root, 'build', `dstu-8302-${version}.xpi`);

execFileSync('node', [join(root, 'tools/plugin/bundle.mjs')], { stdio: 'ignore' });
mkdirSync(dirname(out), { recursive: true });
rmSync(out, { force: true });
execFileSync('zip', ['-q', '-X', out, 'manifest.json', 'bootstrap.js', 'hooks.js', 'dstu-lib.js', 'preview.js', 'picker.js', 'pane.js', 'prefs.xhtml'], { cwd: join(root, 'plugin') });
console.log(out);
