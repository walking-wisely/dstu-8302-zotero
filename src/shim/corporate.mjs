import { takeKeys } from './extra.mjs';

const KEYS = { has: k => k === 'corporate' };

export function moveCorporateBody(item) {
  const { taken, rest } = takeKeys(item.note, KEYS);
  if (!taken.corporate) return;
  item.note = rest;
  if (item.contributor?.length && !item.authority) {
    item.authority = taken.corporate;
    return;
  }
  item.contributor = [...(item.contributor || []), { literal: taken.corporate }];
}
