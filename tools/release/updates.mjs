import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repo = 'walking-wisely/dstu-8302-zotero';
const manifest = JSON.parse(readFileSync(join(root, 'plugin/manifest.json'), 'utf8'));
const { version } = manifest;
const { id, strict_min_version: min, strict_max_version: max } = manifest.applications.zotero;
const xpi = `dstu-8302-${version}.xpi`;
const hash = createHash('sha256').update(readFileSync(join(root, 'build', xpi))).digest('hex');

const updates = {
  addons: {
    [id]: {
      updates: [{
        version,
        update_link: `https://github.com/${repo}/releases/download/v${version}/${xpi}`,
        update_hash: `sha256:${hash}`,
        applications: { zotero: { strict_min_version: min, strict_max_version: max } },
      }],
    },
  },
};
writeFileSync(join(root, 'updates.json'), `${JSON.stringify(updates, null, 2)}\n`);
console.log(`updates.json for ${version}`);
