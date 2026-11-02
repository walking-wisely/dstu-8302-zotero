export const SAMPLE_ITEMS = {
  book: {
    id: 'book', type: 'book', title: 'Історія книги в Україні', language: 'uk',
    author: [{ family: 'Яровий', given: 'І.' }],
    publisher: 'Наукова думка', 'publisher-place': 'Київ',
    issued: { 'date-parts': [[2019]] }, 'number-of-pages': '320',
    'collection-title': 'Бібліотека історії', ISBN: '978-966-00-1234-5',
  },
  article: {
    id: 'article', type: 'article-journal', title: 'Рукописна спадщина XVII століття', language: 'uk',
    author: [{ family: 'Антонович', given: 'М.' }],
    'container-title': 'Вісник Книжкової палати', volume: '4', issue: '4',
    issued: { 'date-parts': [[2012]] }, page: '18-20',
  },
  disc: {
    id: 'disc', type: 'book', title: 'Словник української мови', language: 'uk', medium: 'Електронний ресурс',
    author: [{ family: 'Гринчишин', given: 'Д.' }],
    publisher: 'Либідь', 'publisher-place': 'Київ',
    issued: { 'date-parts': [[2016]] },
  },
  web: {
    id: 'web', type: 'webpage', title: 'Електронні архіви України', language: 'uk',
    'container-title': 'Національна бібліотека України', URL: 'http://www.nbuv.gov.ua/archives',
    issued: { 'date-parts': [[2020]] }, accessed: { 'date-parts': [[2021, 3, 14]] },
  },
};

export const SAMPLE_CLUSTERS = [
  { key: 'first', items: [{ id: 'book', locator: '15', label: 'page' }] },
  { key: 'article', items: [{ id: 'article', locator: '19', label: 'page' }] },
  { key: 'web', items: [{ id: 'web' }] },
  { key: 'repeat', items: [{ id: 'book', locator: '92', label: 'page' }] },
  { key: 'ibid', items: [{ id: 'book', locator: '92', label: 'page' }] },
  { key: 'disc', items: [{ id: 'disc' }] },
];

export const PREVIEW_LABELS = {
  first: 'Перше посилання на книгу',
  article: 'Посилання на статтю',
  web: 'Посилання на вебсторінку',
  repeat: 'Повторне посилання, інша сторінка',
  ibid: 'Повторне посилання, та сама сторінка',
  bibBook: 'Список: книга',
  bibArticle: 'Список: стаття',
  bibWeb: 'Список: вебсторінка',
};
