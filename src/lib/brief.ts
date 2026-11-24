export interface BriefPage { id: string; title: string; notes: string }
export interface Brief {
  version: 1;
  title: string;
  type: string;
  goal: string;
  audience: string;
  action: string;
  pages: BriefPage[];
  features: string[];
  otherFeatures: string;
  content: string;
  design: string;
  references: string;
  deadline: string;
  budget: string;
  contact: string;
  notes: string;
  updatedAt: string;
}
export interface BriefChecklistItem { id: string; label: string; done: boolean; step: number }
export type BriefExportExtension = 'json' | 'md' | 'txt';

export const BRIEF_TYPE_LABELS: Record<string, string> = {
  '': 'Не выбран', landing: 'Лендинг', business: 'Сайт компании', catalog: 'Каталог', shop: 'Интернет-магазин', service: 'Веб-сервис',
};
export const BRIEF_FEATURE_LABELS: Record<string, string> = {
  contact: 'Форма связи', booking: 'Запись или бронирование', payment: 'Онлайн-оплата', catalog: 'Каталог товаров или услуг', search: 'Поиск по сайту', account: 'Личный кабинет', blog: 'Блог или новости', multilingual: 'Несколько языков', analytics: 'Веб-аналитика',
};
export const BRIEF_LIMITS = {
  title: 120, type: 20, goal: 4000, audience: 4000, action: 4000,
  pages: 20, pageTitle: 120, pageNotes: 1000, features: 9,
  otherFeatures: 4000, content: 4000, design: 4000, references: 4000,
  deadline: 10, budget: 120, contact: 500, notes: 4000, updatedAt: 35,
  importCharacters: 256 * 1024,
} as const;

export function emptyBrief(): Brief {
  return { version: 1, title: '', type: '', goal: '', audience: '', action: '', pages: [], features: [], otherFeatures: '', content: '', design: '', references: '', deadline: '', budget: '', contact: '', notes: '', updatedAt: '' };
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function validTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  return validDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60 && Number.isFinite(Date.parse(value));
}

/** Accepts our versioned object or its JSON text. Invalid imports never replace a draft with empty data. */
export function parseBrief(raw: unknown): Brief | null {
  try {
    if (typeof raw === 'string') {
      if (raw.length > BRIEF_LIMITS.importCharacters) return null;
      raw = JSON.parse(raw);
    }
    if (!plainObject(raw) || !Object.hasOwn(raw, 'version') || raw.version !== 1) return null;
    const stringFields = ['title', 'type', 'goal', 'audience', 'action', 'otherFeatures', 'content', 'design', 'references', 'deadline', 'budget', 'contact', 'notes', 'updatedAt'] as const;
    for (const field of stringFields) {
      if (!Object.hasOwn(raw, field) || typeof raw[field] !== 'string' || raw[field].length > BRIEF_LIMITS[field]) return null;
    }
    if (!Object.hasOwn(BRIEF_TYPE_LABELS, raw.type as string)) return null;
    if (!Object.hasOwn(raw, 'pages') || !Object.hasOwn(raw, 'features') || !Array.isArray(raw.pages) || raw.pages.length > BRIEF_LIMITS.pages || !Array.isArray(raw.features) || raw.features.length > BRIEF_LIMITS.features) return null;
    if (raw.features.some((feature) => typeof feature !== 'string' || !Object.hasOwn(BRIEF_FEATURE_LABELS, feature))) return null;
    if (raw.deadline !== '' && !validDate(raw.deadline as string)) return null;
    if (raw.updatedAt !== '' && !validTimestamp(raw.updatedAt as string)) return null;
    const usedIds = new Set<string>();
    const pages: BriefPage[] = [];
    for (const [index, page] of raw.pages.entries()) {
      if (!plainObject(page) || !Object.hasOwn(page, 'id') || !Object.hasOwn(page, 'title') || !Object.hasOwn(page, 'notes') || typeof page.id !== 'string' || typeof page.title !== 'string' || typeof page.notes !== 'string' || page.title.length > BRIEF_LIMITS.pageTitle || page.notes.length > BRIEF_LIMITS.pageNotes) return null;
      let id = page.id;
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id) || ['constructor', 'prototype', '__proto__'].includes(id) || usedIds.has(id)) {
        let suffix = index + 1;
        do { id = `page-${suffix++}`; } while (usedIds.has(id));
      }
      usedIds.add(id);
      pages.push({ id, title: page.title, notes: page.notes });
    }
    const result = emptyBrief();
    for (const field of stringFields) result[field] = raw[field] as string;
    result.pages = pages;
    result.features = [...new Set(raw.features as string[])];
    return result;
  } catch { return null; }
}

export function getBriefChecklist(brief: Brief): BriefChecklistItem[] {
  return [
    { id: 'type', label: 'Выбран тип сайта', done: !!brief.type && Object.hasOwn(BRIEF_TYPE_LABELS, brief.type), step: 0 },
    { id: 'goal', label: 'Описана цель сайта', done: !!brief.goal.trim(), step: 0 },
    { id: 'audience', label: 'Описана аудитория', done: !!brief.audience.trim(), step: 0 },
    { id: 'action', label: 'Указано действие посетителя', done: !!brief.action.trim(), step: 0 },
    { id: 'pages', label: 'Названы страницы сайта', done: brief.pages.length > 0 && brief.pages.every((page) => !!page.title.trim()), step: 1 },
    { id: 'contact', label: 'Указан контакт для обсуждения', done: !!brief.contact.trim(), step: 2 },
  ];
}

export function getBriefQuestions(brief: Brief): string[] {
  const questions: string[] = [];
  if (!brief.type) questions.push('Какой тип сайта нужен: лендинг, сайт компании, каталог, магазин или веб-сервис?');
  if (!brief.goal.trim()) questions.push('Какую задачу должен решать сайт?');
  if (!brief.audience.trim()) questions.push('Для кого создаётся сайт и что важно этим посетителям?');
  if (!brief.action.trim()) questions.push('Что посетитель должен сделать на сайте?');
  if (!brief.pages.length) questions.push('Какие страницы или разделы нужны?');
  else if (brief.pages.some((page) => !page.title.trim())) questions.push('Как назвать каждую добавленную страницу?');
  else if (brief.pages.some((page) => !page.notes.trim())) questions.push('Что должно находиться на каждой странице?');
  if (!brief.features.length && !brief.otherFeatures.trim()) questions.push('Какие функции нужны? Если дополнительные функции не требуются, укажите это в поле «Другие функции».');
  if (!brief.content.trim()) questions.push('Какие тексты, фотографии и другие материалы уже готовы, а какие нужно подготовить?');
  if (!brief.design.trim()) questions.push('Есть ли готовый дизайн или пожелания к оформлению?');
  if (!brief.deadline) questions.push('Есть ли желаемая дата запуска?');
  if (!brief.budget.trim()) questions.push('Какой бюджет или диапазон бюджета можно обсудить?');
  if (!brief.contact.trim()) questions.push('Как связаться с вами для обсуждения проекта?');
  return questions;
}

const answer = (value: string): string => value.trim() ? value : 'Не указано';
function markdownText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/([`*_{}[\]()#+!|])/g, '\\$1').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
const markdownAnswer = (value: string): string => markdownText(answer(value));

export function buildBriefMarkdown(brief: Brief): string {
  const parts = [
    `# ${markdownText(brief.title.trim() || 'Требования к сайту')}`,
    '## Задача',
    `Тип сайта: ${markdownText(BRIEF_TYPE_LABELS[brief.type] && brief.type ? BRIEF_TYPE_LABELS[brief.type] : 'Не указано')}`,
    `### Цель сайта\n\n${markdownAnswer(brief.goal)}`,
    `### Аудитория\n\n${markdownAnswer(brief.audience)}`,
    `### Действие посетителя\n\n${markdownAnswer(brief.action)}`,
    '## Страницы и разделы',
    brief.pages.length ? brief.pages.map((page, index) => `### ${index + 1}. ${markdownAnswer(page.title)}\n\n${markdownAnswer(page.notes)}`).join('\n\n') : 'Не указано',
    '## Функции',
    brief.features.length ? brief.features.map((feature) => `- ${markdownText(BRIEF_FEATURE_LABELS[feature] ?? feature)}`).join('\n') : 'Не указано',
    `### Другие функции\n\n${markdownAnswer(brief.otherFeatures)}`,
    '## Материалы и оформление',
    `### Контент\n\n${markdownAnswer(brief.content)}`,
    `### Дизайн\n\n${markdownAnswer(brief.design)}`,
    `### Примеры и ссылки\n\n${markdownAnswer(brief.references)}`,
    '## Сроки и бюджет',
    `Желаемая дата запуска: ${markdownAnswer(brief.deadline)}`,
    `Бюджет, указанный пользователем: ${markdownAnswer(brief.budget)}`,
    `## Контакт для обсуждения\n\n${markdownAnswer(brief.contact)}`,
    `## Дополнительные пожелания\n\n${markdownAnswer(brief.notes)}`,
  ];
  const questions = getBriefQuestions(brief);
  if (questions.length) parts.push(`## Что нужно обсудить\n\n${questions.map((question) => `- ${question}`).join('\n')}`);
  return parts.join('\n\n') + '\n';
}

export function buildBriefText(brief: Brief): string {
  const parts = [
    brief.title.trim() || 'Требования к сайту',
    `Тип сайта: ${brief.type ? BRIEF_TYPE_LABELS[brief.type] ?? 'Не указано' : 'Не указано'}`,
    `Цель сайта:\n${answer(brief.goal)}`,
    `Аудитория:\n${answer(brief.audience)}`,
    `Действие посетителя:\n${answer(brief.action)}`,
    'Страницы и разделы:',
    brief.pages.length ? brief.pages.map((page, index) => `Страница ${index + 1}: ${answer(page.title)}\nОписание: ${answer(page.notes)}`).join('\n\n') : 'Не указано',
    `Функции:\n${brief.features.length ? brief.features.map((feature) => BRIEF_FEATURE_LABELS[feature] ?? feature).join('\n') : 'Не указано'}`,
    `Другие функции:\n${answer(brief.otherFeatures)}`,
    `Контент:\n${answer(brief.content)}`,
    `Дизайн:\n${answer(brief.design)}`,
    `Примеры и ссылки:\n${answer(brief.references)}`,
    `Желаемая дата запуска: ${answer(brief.deadline)}`,
    `Бюджет, указанный пользователем: ${answer(brief.budget)}`,
    `Контакт для обсуждения:\n${answer(brief.contact)}`,
    `Дополнительные пожелания:\n${answer(brief.notes)}`,
  ];
  const questions = getBriefQuestions(brief);
  if (questions.length) parts.push(`Что нужно обсудить:\n${questions.join('\n')}`);
  return parts.join('\n\n') + '\n';
}

export function getBriefFilename(brief: Brief, extension: BriefExportExtension): string {
  if (!['json', 'md', 'txt'].includes(extension)) throw new Error('Недопустимый формат экспорта.');
  const printableTitle = Array.from(brief.title.normalize('NFKC')).map((character) => character.charCodeAt(0) < 32 ? ' ' : character).join('');
  const slug = printableTitle.trim().replace(/[<>:"/\\|?*]/g, ' ').replace(/\s+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 80).replace(/[-.]+$/g, '');
  return `brief-${slug || 'website'}.${extension}`;
}
