import { FORMS, ZONES, REPEATS, ANALYTICS, DEFAULTS } from './build.mjs';

export const CLASSES = {
  note: { id: 'http://www.zotero.org/styles/dstu-8302-notes', title: 'ДСТУ 8302 — виноски', forms: ['footnote'] },
  'in-text': { id: 'http://www.zotero.org/styles/dstu-8302-in-text', title: 'ДСТУ 8302 — у тексті', forms: ['in-text', 'numeric', 'author', 'author-date'] },
};

export const DEFAULT_VARIANTS = {
  note: 'footnote/period/short-title',
  'in-text': 'in-text/period/short-title',
};

const BOOLEAN = [{ value: false, label: 'Ні' }, { value: true, label: 'Так' }];
const SHOWN = [{ value: false, label: 'Показувати' }, { value: true, label: 'Пропускати' }];

export const OPTIONS = [
  {
    key: 'form',
    classes: ['in-text'],
    title: 'Вигляд посилання в тексті',
    sample: 'first',
    choices: [
      { value: 'in-text', label: 'Повний опис у круглих дужках' },
      { value: 'numeric', label: 'Номер зі списку' },
      { value: 'author', label: 'Автор' },
      { value: 'author-date', label: 'Автор і рік' },
    ],
  },
  {
    key: 'zone',
    title: 'Розділовий знак між зонами опису',
    rule: '§4.4',
    sample: 'bibBook',
    choices: [
      { value: 'period', label: 'Крапка' },
      { value: 'period-dash', label: 'Крапка й тире' },
    ],
  },
  {
    key: 'repeat',
    title: 'Повторне посилання на той самий твір',
    rule: '§5.5.2, §5.5.12',
    sample: 'repeat',
    choices: [
      { value: 'short-title', label: 'Автор і скорочена назва' },
      { value: 'op-cit', label: '«Зазнач. твір»' },
    ],
  },
  {
    key: 'analytic',
    title: 'Розділовий знак перед назвою видання',
    rule: '§4.9.1',
    sample: 'bibArticle',
    sampleOverrides: { containerOnly: false },
    choices: [
      { value: 'slashes', label: 'Дві навскісні риски' },
      { value: 'period', label: 'Крапка' },
    ],
  },
  {
    key: 'containerOnly',
    title: 'Посилання на статтю лише з відомостями про видання',
    rule: '§4.9',
    sample: 'article',
    choices: BOOLEAN,
  },
  {
    key: 'urlOnly',
    title: 'Посилання на вебсторінку лише з адресою',
    rule: '§5.3.6',
    sample: 'web',
    choices: BOOLEAN,
  },
  {
    key: 'noMedium',
    title: 'Позначка про тип носія («Електронний ресурс»)',
    rule: '§4.4',
    sample: 'bibDisc',
    choices: SHOWN,
  },
  {
    key: 'noSeries',
    title: 'Відомості про серію',
    rule: '§4.4',
    sample: 'bibBook',
    choices: SHOWN,
  },
  {
    key: 'noPublisher',
    title: 'Видавництво',
    rule: '§4.4',
    sample: 'bibBook',
    choices: SHOWN,
  },
  {
    key: 'isbn',
    title: 'Номер ISBN у кінці опису',
    rule: '§4.4',
    sample: 'bibBook',
    choices: BOOLEAN,
  },
  {
    key: 'bibSort',
    title: 'Порядок у списку літератури',
    sample: 'bibAll',
    choices: [
      { value: 'author', label: 'За абеткою' },
      { value: 'none', label: 'За порядком цитування' },
    ],
  },
];

const ENUMS = { form: FORMS, zone: ZONES, repeat: REPEATS, analytic: ANALYTICS, bibSort: ['author', 'none'] };
const FLAGS = ['containerOnly', 'urlOnly', 'noMedium', 'noSeries', 'noPublisher', 'isbn'];
const PAIRS = ['analytic', 'bibSort'];

export function stubClass(styleID) {
  return Object.keys(CLASSES).find(k => CLASSES[k].id === styleID) || null;
}

export function parseVariant(klass, text) {
  const [form, zone, repeat, ...rest] = String(text || '').split('/');
  if (!CLASSES[klass].forms.includes(form)) return null;
  if (!ZONES.includes(zone) || !REPEATS.includes(repeat)) return null;
  const opts = { form, zone, repeat, containerOnly: DEFAULTS.containerOnly, analytic: DEFAULTS.analytic, urlOnly: DEFAULTS.urlOnly, bibSort: DEFAULTS.bibSort, noMedium: DEFAULTS.noMedium, noSeries: DEFAULTS.noSeries, noPublisher: DEFAULTS.noPublisher, isbn: DEFAULTS.isbn };
  for (const token of rest) {
    if (FLAGS.includes(token)) {
      opts[token] = true;
      continue;
    }
    const [key, value] = token.split('=');
    if (PAIRS.includes(key) && ENUMS[key].includes(value)) opts[key] = value;
  }
  return opts;
}

export function formatVariant(opts) {
  const parts = [opts.form, opts.zone, opts.repeat];
  for (const key of PAIRS) if (opts[key] !== DEFAULTS[key]) parts.push(`${key}=${opts[key]}`);
  for (const key of FLAGS) if (opts[key]) parts.push(key);
  return parts.join('/');
}

export function normalizeVariant(klass, text) {
  return formatVariant(parseVariant(klass, text) || parseVariant(klass, DEFAULT_VARIANTS[klass]));
}
