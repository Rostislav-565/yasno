import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Brief } from '../lib/brief';

type BriefFieldsProps = {
  brief: Brief;
  step: number;
  onChange: (patch: Partial<Brief>) => void;
};

type TextFieldKey = 'title' | 'goal' | 'audience' | 'action' | 'otherFeatures' | 'content' | 'design' | 'references' | 'deadline' | 'budget' | 'contact' | 'notes';

const featureOptions = [
  { id: 'contact', label: 'Форма связи', hint: 'Посетитель может отправить сообщение.' },
  { id: 'booking', label: 'Запись или бронирование', hint: 'Выбор услуги, даты или времени.' },
  { id: 'payment', label: 'Онлайн-оплата', hint: 'Оплата заказа прямо на сайте.' },
  { id: 'catalog', label: 'Каталог', hint: 'Список товаров или услуг с описаниями.' },
  { id: 'search', label: 'Поиск по сайту', hint: 'Поиск нужной страницы или позиции.' },
  { id: 'account', label: 'Личный кабинет', hint: 'Вход пользователя и его личные данные.' },
  { id: 'blog', label: 'Статьи или новости', hint: 'Раздел для регулярных публикаций.' },
  { id: 'multilingual', label: 'Несколько языков', hint: 'Разные языковые версии сайта.' },
  { id: 'analytics', label: 'Статистика посещений', hint: 'Измерение посещений и действий на сайте.' },
] as const;

const suggestedPages = ['Главная', 'Услуги', 'О компании', 'Контакты'];
const maxPages = 20;

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="bf-field">
    <label className="bf-label" htmlFor={id}>{label}</label>
    {hint && <p className="bf-hint" id={`${id}-hint`}>{hint}</p>}
    {children}
  </div>;
}

export default function BriefFields({ brief, step, onChange }: BriefFieldsProps) {
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocus.current) return;
    const input = document.getElementById(pendingFocus.current);
    if (input) { input.focus(); pendingFocus.current = null; }
  }, [brief.pages]);

  const textArea = (key: TextFieldKey, label: string, placeholder: string, hint?: string, maxLength = 4000, rows = 3) => {
    const id = `brief-${key}`;
    return <Field id={id} label={label} hint={hint}>
      <textarea id={id} className="bf-input bf-textarea" value={brief[key]} rows={rows} maxLength={maxLength} placeholder={placeholder} aria-describedby={hint ? `${id}-hint` : undefined} onChange={event => onChange({ [key]: event.target.value })}/>
    </Field>;
  };

  const addPage = (title = '') => {
    if (brief.pages.length >= maxPages) return;
    const id = globalThis.crypto?.randomUUID?.() ?? `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    pendingFocus.current = `brief-page-${id}-title`;
    onChange({ pages: [...brief.pages, { id, title, notes: '' }] });
  };

  const updatePage = (id: string, patch: { title?: string; notes?: string }) => {
    onChange({ pages: brief.pages.map(page => page.id === id ? { ...page, ...patch } : page) });
  };

  const removePage = (id: string) => {
    const index = brief.pages.findIndex(page => page.id === id);
    const nextPages = brief.pages.filter(page => page.id !== id);
    const nextPage = nextPages[Math.min(index, nextPages.length - 1)];
    pendingFocus.current = nextPage ? `brief-page-${nextPage.id}-title` : 'brief-add-page';
    onChange({ pages: nextPages });
  };

  const toggleFeature = (id: string, checked: boolean) => {
    onChange({ features: checked ? [...new Set([...brief.features, id])] : brief.features.filter(feature => feature !== id) });
  };

  if (step === 0) return <>
    <section className="bf-section" aria-labelledby="brief-task-heading">
      <h3 className="bf-section-title" id="brief-task-heading">Что вы хотите создать</h3>
      <div className="bf-grid">
        <Field id="brief-title" label="Название проекта" hint="Рабочее название — его можно изменить позже.">
          <input id="brief-title" className="bf-input" type="text" value={brief.title} maxLength={120} placeholder="Как называется ваш проект?" aria-describedby="brief-title-hint" onChange={event => onChange({ title: event.target.value })}/>
        </Field>
        <Field id="brief-type" label="Тип сайта" hint="Выберите ближайший вариант или пока пропустите.">
          <select id="brief-type" className="bf-input" value={brief.type} aria-describedby="brief-type-hint" onChange={event => onChange({ type: event.target.value })}>
            <option value="">Пока не выбрано</option>
            <option value="landing">Лендинг — одна страница</option>
            <option value="business">Сайт компании</option>
            <option value="catalog">Каталог товаров или услуг</option>
            <option value="shop">Интернет-магазин</option>
            <option value="service">Веб-сервис или приложение</option>
          </select>
        </Field>
      </div>
      {textArea('goal', 'Зачем нужен сайт?', 'Опишите задачу, которую должен решить сайт.', 'Какой результат вы хотите получить для своего проекта или бизнеса?')}
      {textArea('audience', 'Кто будет пользоваться сайтом?', 'Расскажите о будущих посетителях и их потребностях.', 'Что им нужно найти, узнать или сделать?')}
      {textArea('action', 'Главное действие посетителя', 'Что человек должен сделать после посещения сайта?', 'Выделите самое важное действие, если их несколько.')}
    </section>
  </>;

  if (step === 1) return <>
    <section className="bf-section" aria-labelledby="brief-pages-heading">
      <h3 className="bf-section-title" id="brief-pages-heading">Страницы сайта</h3>
      <p className="bf-hint">Для каждой страницы можно указать, что на ней должно быть. Добавлено: {brief.pages.length} из {maxPages}.</p>
      <div className="bf-page-suggestions" role="group" aria-label="Быстро добавить страницу">
        {suggestedPages.map(title => {
          const exists = brief.pages.some(page => page.title.trim().toLocaleLowerCase('ru') === title.toLocaleLowerCase('ru'));
          return <button className="bf-chip-button" type="button" key={title} onClick={() => addPage(title)} disabled={exists || brief.pages.length >= maxPages} aria-label={exists ? `Страница «${title}» уже добавлена` : `Добавить страницу «${title}»`}><Plus size={16} aria-hidden="true"/>{title}{exists ? ' · добавлена' : ''}</button>;
        })}
      </div>
      {brief.pages.length === 0 && <p className="bf-hint bf-empty-pages">Страниц пока нет. Добавьте свою или выберите название выше.</p>}
      <div className="bf-page-list">
        {brief.pages.map((page, index) => <div className="bf-page-row" key={page.id}>
          <div className="bf-page-heading"><span className="bf-label">Страница {index + 1}</span><button className="bf-btn bf-btn-secondary" type="button" onClick={() => removePage(page.id)} aria-label={`Удалить страницу ${page.title.trim() ? `«${page.title.trim()}»` : index + 1}`}><Trash2 size={16} aria-hidden="true"/>Удалить</button></div>
          <Field id={`brief-page-${page.id}-title`} label="Название страницы"><input id={`brief-page-${page.id}-title`} className="bf-input" type="text" value={page.title} maxLength={120} placeholder="Введите название страницы" onChange={event => updatePage(page.id, { title: event.target.value })}/></Field>
          <Field id={`brief-page-${page.id}-notes`} label="Что разместить на странице"><textarea id={`brief-page-${page.id}-notes`} className="bf-input bf-textarea" value={page.notes} maxLength={1000} rows={2} placeholder="Опишите содержание и важные детали" onChange={event => updatePage(page.id, { notes: event.target.value })}/></Field>
        </div>)}
      </div>
      <button id="brief-add-page" className="bf-btn bf-btn-secondary" type="button" onClick={() => addPage()} disabled={brief.pages.length >= maxPages}><Plus size={18} aria-hidden="true"/>Добавить свою страницу</button>
      {brief.pages.length >= maxPages && <p className="bf-hint" role="status">Добавлено 20 страниц. Чтобы добавить новую, сначала удалите лишнюю.</p>}
    </section>
    <section className="bf-section" aria-labelledby="brief-features-heading">
      <h3 className="bf-section-title" id="brief-features-heading">Что должен уметь сайт</h3>
      <p className="bf-hint">Отметьте только то, что нужно. Можно выбрать несколько вариантов или ни одного.</p>
      <div className="bf-grid bf-feature-grid" role="group" aria-label="Возможности сайта">
        {featureOptions.map(feature => <label className={`bf-feature-choice${brief.features.includes(feature.id) ? ' is-selected' : ''}`} htmlFor={`brief-feature-${feature.id}`} key={feature.id}><input id={`brief-feature-${feature.id}`} type="checkbox" checked={brief.features.includes(feature.id)} onChange={event => toggleFeature(feature.id, event.target.checked)} aria-describedby={`brief-feature-${feature.id}-hint`}/><span><strong>{feature.label}</strong><small className="bf-hint" id={`brief-feature-${feature.id}-hint`}>{feature.hint}</small></span></label>)}
      </div>
      {textArea('otherFeatures', 'Другие возможности', 'Опишите то, чего нет в списке выше.', 'Необязательное поле.')}
    </section>
  </>;

  if (step === 2) return <>
    <section className="bf-section" aria-labelledby="brief-materials-heading">
      <h3 className="bf-section-title" id="brief-materials-heading">Материалы и внешний вид</h3>
      {textArea('content', 'Какие материалы уже есть?', 'Расскажите, что готово и что ещё нужно подготовить.', 'Тексты, фотографии, логотип и другие материалы — перечислите только то, что относится к вашему проекту.')}
      {textArea('design', 'Пожелания к оформлению', 'Опишите желаемое настроение, цвета и особенности оформления.', 'Если конкретных пожеланий нет, оставьте поле пустым.')}
      {textArea('references', 'Ссылки на примеры', 'Вставьте ссылки и напишите, что именно вам нравится.', 'По одной ссылке на строку. Это обычные заметки: содержимое ссылок не загружается.', 4000, 4)}
    </section>
    <section className="bf-section" aria-labelledby="brief-conditions-heading">
      <h3 className="bf-section-title" id="brief-conditions-heading">Срок, бюджет и контакт</h3>
      <div className="bf-grid">
        <Field id="brief-deadline" label="Желаемая дата готовности" hint="Необязательно. Можно оставить пустым, если дата пока не определена.">
          <input id="brief-deadline" className="bf-input" type="date" value={brief.deadline} aria-describedby="brief-deadline-hint" onChange={event => onChange({ deadline: event.target.value })}/>
        </Field>
        <Field id="brief-budget" label="Ваш бюджет, если определён" hint="Укажите свою сумму или диапазон и валюту. Это не расчёт стоимости.">
          <input id="brief-budget" className="bf-input" type="text" value={brief.budget} maxLength={120} placeholder="Сумма или диапазон и валюта" aria-describedby="brief-budget-hint" onChange={event => onChange({ budget: event.target.value })}/>
        </Field>
      </div>
      <Field id="brief-contact" label="Контакт для будущего обсуждения" hint="Необязательно. Контакт попадёт в документ, который вы сохраните; форма ничего не отправляет.">
        <input id="brief-contact" className="bf-input" type="text" value={brief.contact} maxLength={500} placeholder="Как с вами связаться" aria-describedby="brief-contact-hint" autoComplete="off" onChange={event => onChange({ contact: event.target.value })}/>
      </Field>
      {textArea('notes', 'Дополнительные пожелания', 'Что ещё важно знать перед началом работы?', 'Ограничения, вопросы или детали, которым не нашлось места выше.')}
    </section>
  </>;

  return null;
}
