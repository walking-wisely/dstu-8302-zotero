import assert from 'node:assert/strict';
import { shimItem } from '../../src/shim/index.mjs';

const typed = shimItem({ id: 'a', type: 'book', title: 'T', note: 'type: patent\napplication-number: u201101234' });
assert.equal(typed.type, 'patent');
assert.doesNotMatch(typed.note || '', /application-number/);

const archive = { id: 'b', type: 'manuscript', title: 'Лист', archive: 'ЦДІАК України', language: 'uk', note: 'fund: 1\ninventory: 2\nfile: 3' };
const composed = shimItem(archive);
assert.equal(composed.title, 'Лист');
assert.equal(composed.archive, 'ЦДІАК України');
assert.equal(archive.note.includes('fund: 1'), true);

const typedLocation = shimItem({ ...archive, archive_location: 'власний запис' });
assert.equal(typedLocation.archive_location, 'власний запис');

console.log('shim ok');
