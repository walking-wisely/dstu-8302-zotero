import { readFileSync } from 'node:fs';

const [file, ...flags] = process.argv.slice(2);
const report = JSON.parse(readFileSync(file, 'utf8'));
if (report.fatal) {
  console.log(`FATAL: ${report.fatal}\n${report.stack || ''}`);
  process.exit(2);
}
const count = s => report.results.filter(r => r.status === s).length;
console.log(`zotero ${report.zotero}  citeproc ${report.citeproc}  citeproc-rs ${report.citeprocRs}  mode ${report.mode}`);
console.log(`cases ${report.results.length}  pass ${count('pass') + count('pass-loose')} (loose ${count('pass-loose')})  fail ${count('fail')}  error ${count('error')}`);
if (flags.includes('--verbose') || flags.includes('-v')) {
  for (const r of report.results.filter(r => !r.status.startsWith('pass'))) {
    console.log(`\n[${r.status}] ${r.id}\n  exp: ${r.expected.join('\n       ')}\n  got: ${(r.got || [r.error]).join('\n       ')}`);
  }
}
