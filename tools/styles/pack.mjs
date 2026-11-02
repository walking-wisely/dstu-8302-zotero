import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { version } = JSON.parse(readFileSync(join(root, 'plugin/manifest.json'), 'utf8'));
const build = join(root, 'build');
const staging = join(build, 'styles-zip');
const out = join(build, `dstu-8302-styles-${version}.zip`);

execFileSync('node', [join(root, 'tools/styles/compile.mjs')], { stdio: 'ignore' });
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
const files = readdirSync(build).filter(f => f.endsWith('.csl')).sort();
for (const f of files) writeFileSync(join(staging, f), readFileSync(join(build, f)));

writeFileSync(join(staging, 'README.txt'), `ДСТУ 8302:2015: готові стилі CSL

Ці файли потрібні, якщо ви не можете встановити розширення «ДСТУ 8302 helper» для Zotero:
Pandoc, Overleaf, Zotero без розширення, інші програми з підтримкою CSL.
З розширенням достатньо двох стилів («ДСТУ 8302 — виноски» і «ДСТУ 8302 — у тексті»),
а решту параметрів обирають у налаштуваннях Zotero і в параметрах документа.

Як обрати файл. Назва складається з частин:
  dstu-8302-<вигляд>-<розділовий знак>-<повторне посилання>-slashes.csl

  вигляд                footnote: виноски; in-text: повний опис у круглих дужках;
                        numeric: номер зі списку; author: автор; author-date: автор і рік
  розділовий знак       period: крапка між зонами; period-dash: крапка й тире
  повторне посилання    short-title: автор і скорочена назва (п. 5.5.2);
                        op-cit: «Зазнач. твір» (п. 5.5.12)

Без розширення стиль не вміє: ставити «Його ж / її ж», виносити назву на перше місце для чотирьох і більше авторів,
складати запис архівного документа з поля «Додатково», змінювати том усередині «Там само».
У таких випадках запис доведеться виправляти вручну.

Установлення в Zotero: Налаштування → Цитування → «+» і вказати файл.
`);
rmSync(out, { force: true });
execFileSync('zip', ['-q', '-r', '-X', out, '.'], { cwd: staging });
rmSync(staging, { recursive: true, force: true });
console.log(out);
