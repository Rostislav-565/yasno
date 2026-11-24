import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(project, 'src/lib/brief.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { emptyBrief, parseBrief, buildBriefMarkdown, buildBriefText, getBriefChecklist, getBriefQuestions, getBriefFilename, BRIEF_LIMITS, BRIEF_TYPE_LABELS, BRIEF_FEATURE_LABELS } = await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

const blank = emptyBrief();
assert.equal(blank.version, 1);
assert.equal(blank.updatedAt, '');
for (const [key, value] of Object.entries(blank)) if (key !== 'version') assert.deepEqual(value, Array.isArray(value) ? [] : '', `empty field ${key}`);
assert.notEqual(emptyBrief().pages, emptyBrief().pages, 'fresh drafts never share arrays');
assert.deepEqual(parseBrief(blank), blank);
assert.deepEqual(parseBrief(JSON.stringify(blank)), blank);
assert.ok(getBriefChecklist(blank).every((item) => item.done === false));
assert.deepEqual(getBriefChecklist(blank).map((item) => [item.id, item.step]), [['type', 0], ['goal', 0], ['audience', 0], ['action', 0], ['pages', 1], ['contact', 2]]);
assert.ok(getBriefQuestions(blank).some((question) => question.includes('бюджет')));
assert.ok(buildBriefMarkdown(blank).includes('Не указано'));
assert.ok(!buildBriefText(blank).includes('₽'), 'empty exports never invent a price');
assert.ok(!buildBriefText(blank).includes('NOVA'), 'no invented company in an empty export');
assert.ok(!buildBriefText(blank).includes('##'), 'TXT does not add Markdown headings');

const complete = {
  ...emptyBrief(), title: 'Сайт мастерской', type: 'business', goal: 'Показать услуги\nПомочь клиенту записаться', audience: 'Местные жители', action: 'Записаться на встречу',
  pages: [{ id: 'page-1', title: 'Услуги', notes: 'Перечень услуг\nЦены предоставляет заказчик' }, { id: 'page-2', title: 'Контакты', notes: 'Адрес и способы связи' }],
  features: ['contact', 'booking'], content: 'Тексты подготовит заказчик', design: 'Спокойная типографика', references: 'https://example.com/reference', deadline: '2028-02-29', budget: 'Нужно обсудить', contact: 'team@example.com', notes: 'Без рекламы', updatedAt: '2026-11-24T12:34:56.789Z',
};
assert.deepEqual(parseBrief(JSON.stringify(complete)), complete);
assert.ok(getBriefChecklist(complete).every((item) => item.done));
assert.deepEqual(getBriefQuestions(complete), []);
const markdown = buildBriefMarkdown(complete);
const text = buildBriefText(complete);
assert.ok(markdown.includes('Сайт компании'));
assert.ok(markdown.includes('Форма связи') && markdown.includes('Запись или бронирование'));
assert.ok(markdown.includes(complete.goal), 'multiline answers are preserved');
assert.ok(text.includes(complete.pages[0].notes));
assert.ok(text.includes('Бюджет, указанный пользователем: Нужно обсудить'));
assert.ok(!markdown.includes('Что нужно обсудить'), 'no unanswered section when all tracked details are provided');

for (const raw of [null, undefined, 1, true, [], {}, '', '{bad', 'null', '[]', { version: 1 }, { ...blank, version: 2 }, { ...blank, version: '1' }, new Date(), { ...blank, type: 'unknown' }, { ...blank, type: '__proto__' }, { ...blank, goal: 42 }, { ...blank, contact: null }, { ...blank, pages: {} }, { ...blank, pages: [null] }, { ...blank, pages: [{ id: 'a', title: 'Page' }] }, { ...blank, features: ['unknown'] }, { ...blank, features: [2] }, { ...blank, features: ['__proto__'] }]) assert.equal(parseBrief(raw), null, `reject ${JSON.stringify(raw)}`);
for (const field of ['title', 'goal', 'audience', 'action', 'otherFeatures', 'content', 'design', 'references', 'budget', 'contact', 'notes']) {
  assert.equal(parseBrief({ ...blank, [field]: 'x'.repeat(BRIEF_LIMITS[field] + 1) }), null, `reject oversized ${field}`);
  assert.notEqual(parseBrief({ ...blank, [field]: 'x'.repeat(BRIEF_LIMITS[field]) }), null, `accept ${field} at the documented bound`);
}
const missing = { ...blank }; delete missing.goal;
assert.equal(parseBrief(missing), null);
assert.equal(parseBrief({ ...blank, pages: Array.from({ length: BRIEF_LIMITS.pages + 1 }, (_, index) => ({ id: String(index), title: 'Page', notes: '' })) }), null);
assert.equal(parseBrief(' '.repeat(BRIEF_LIMITS.importCharacters + 1)), null);
for (const deadline of ['2025-02-29', '2026-02-30', '2026-13-01', '2026-01-00', '0000-01-01', '24.11.2026', 'not a date']) assert.equal(parseBrief({ ...blank, deadline }), null, deadline);
assert.equal(parseBrief({ ...blank, deadline: '2024-02-29' }).deadline, '2024-02-29');
for (const updatedAt of ['not a time', '2026-02-30T00:00:00Z', '2026-11-24T24:00:00Z', '2026-11-24T12:60:00Z', '2026-11-24']) assert.equal(parseBrief({ ...blank, updatedAt }), null, updatedAt);

const hostile = '<script>alert("test")</script>\n[x](javascript:alert(1))';
const dangerous = { ...blank, title: hostile, goal: hostile, pages: [{ id: '<bad>', title: hostile, notes: hostile }, { id: '<bad>', title: 'Second', notes: '' }, { id: 'page-1', title: 'Third', notes: '' }], features: ['search', 'search'] };
const safe = parseBrief(dangerous);
assert.ok(safe);
assert.equal(safe.goal, hostile, 'import preserves user text without executing or interpreting it');
assert.equal(new Set(safe.pages.map((page) => page.id)).size, 3);
assert.ok(safe.pages.every((page) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(page.id)));
assert.deepEqual(safe.features, ['search']);
assert.equal(dangerous.pages[0].id, '<bad>', 'sanitization does not mutate the input object');
assert.ok(!buildBriefMarkdown(safe).includes('<script>'));
assert.ok(buildBriefMarkdown(safe).includes('&lt;script&gt;'));
assert.ok(!buildBriefMarkdown(safe).includes('[x](javascript:'));
assert.ok(buildBriefText(safe).includes(hostile), 'TXT retains literal user text');
const pollution = JSON.parse(JSON.stringify(blank).replace('"version":1', '"version":1,"__proto__":{"polluted":true}'));
assert.ok(parseBrief(pollution));
assert.equal({}.polluted, undefined);
assert.equal(getBriefChecklist({ ...complete, pages: [{ id: 'a', title: ' ', notes: 'text' }] }).find((item) => item.id === 'pages').done, false);
assert.ok(getBriefQuestions({ ...complete, pages: [{ id: 'a', title: 'Name', notes: '' }] }).some((question) => question.includes('каждой странице')));

assert.equal(getBriefFilename(blank, 'json'), 'brief-website.json');
for (const title of ['../../bad<>:"\\|?*\nfile', 'CON', '  .  ', 'Сайт мастерской', 'x'.repeat(300)]) {
  const filename = getBriefFilename({ ...blank, title }, 'md');
  assert.ok(filename.startsWith('brief-') && filename.endsWith('.md'));
  assert.ok(!/[<>:"/\\|?*]/.test(filename));
  assert.ok(filename.length <= 89);
}
assert.throws(() => getBriefFilename(blank, '../exe'), /формат/);
assert.equal(Object.keys(BRIEF_TYPE_LABELS).length, 6);
assert.equal(Object.keys(BRIEF_FEATURE_LABELS).length, 9);
console.info('PASS: empty data, JSON round trips, strict schema and size limits, calendar dates, unique safe IDs, multiline exports, Russian labels, unanswered checklist/questions, literal hostile input, and safe filenames.');
