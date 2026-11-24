import { BRIEF_FEATURE_LABELS, BRIEF_TYPE_LABELS, getBriefQuestions } from '../lib/brief';
import type { Brief } from '../lib/brief';
import './BriefPreview.css';

const unanswered = 'Не указано — обсудить с исполнителем';

function Answer({ value }: { value: string }) {
  const text = value.trim();
  return <p className={text ? 'brief-document-answer' : 'brief-document-answer brief-document-unanswered'}>{text || unanswered}</p>;
}

export default function BriefPreview({ brief }: { brief: Brief }) {
  const questions = getBriefQuestions(brief);
  const pages = brief.pages.filter(page => page.title.trim() || page.notes.trim());
  const hasContent = [brief.title, brief.type, brief.goal, brief.audience, brief.action, brief.otherFeatures, brief.content, brief.design, brief.references, brief.deadline, brief.budget, brief.contact, brief.notes].some(value => value.trim()) || pages.length > 0 || brief.features.length > 0;
  const updated = brief.updatedAt ? new Date(brief.updatedAt) : null;
  const updatedLabel = updated && !Number.isNaN(updated.getTime()) ? updated.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return <article className="brief-print-document" aria-labelledby="brief-document-title">
    <header className="brief-document-header">
      <div className="brief-document-kicker"><span>Задание на сайт</span><span className="brief-document-preview-label">Предпросмотр</span></div>
      <h2 id="brief-document-title">{brief.title.trim() || 'Задание на сайт'}</h2>
      <div className="brief-document-meta"><span>Тип сайта: <strong>{brief.type ? BRIEF_TYPE_LABELS[brief.type] || brief.type : 'нужно уточнить'}</strong></span>{updatedLabel && <span>Обновлено: {updatedLabel}</span>}</div>
      {!hasContent && <p className="brief-document-empty">Пока здесь нет ваших данных. Заполните форму — ответы появятся в документе, а неуказанные детали останутся вопросами для обсуждения.</p>}
    </header>

    <section className="brief-document-section"><h3>Цель сайта</h3><Answer value={brief.goal} /></section>
    <section className="brief-document-section"><h3>Аудитория</h3><Answer value={brief.audience} /></section>
    <section className="brief-document-section"><h3>Действие посетителя</h3><Answer value={brief.action} /></section>

    <section className="brief-document-section"><h3>Страницы и содержание</h3>
      {pages.length ? <ol className="brief-document-pages">{pages.map(page => <li key={page.id}><h4>{page.title.trim() || 'Название страницы нужно уточнить'}</h4><Answer value={page.notes} /></li>)}</ol> : <Answer value="" />}
    </section>

    <section className="brief-document-section"><h3>Возможности сайта</h3>
      {brief.features.length > 0 && <ul className="brief-document-features">{brief.features.map(feature => <li key={feature}>{BRIEF_FEATURE_LABELS[feature] || feature}</li>)}</ul>}
      {brief.otherFeatures.trim() && <Answer value={brief.otherFeatures} />}
      {!brief.features.length && !brief.otherFeatures.trim() && <Answer value="" />}
    </section>

    <section className="brief-document-section"><h3>Материалы</h3><Answer value={brief.content} /></section>
    <section className="brief-document-section"><h3>Дизайн и примеры</h3><Answer value={brief.design} />{brief.references.trim() && <div className="brief-document-subsection"><h4>Ссылки и ориентиры</h4><Answer value={brief.references} /></div>}</section>

    <section className="brief-document-section"><h3>Сроки и бюджет</h3><dl className="brief-document-details"><div><dt>Желаемый срок</dt><dd><Answer value={brief.deadline} /></dd></div><div><dt>Бюджет</dt><dd><Answer value={brief.budget} /></dd></div></dl></section>
    <section className="brief-document-section"><h3>Контакт для связи</h3><Answer value={brief.contact} /></section>
    {brief.notes.trim() && <section className="brief-document-section"><h3>Дополнительно</h3><Answer value={brief.notes} /></section>}

    <section className="brief-document-section brief-document-questions"><h3>Вопросы для обсуждения</h3>{questions.length ? <ul>{questions.map(question => <li key={question}>{question}</li>)}</ul> : <p className="brief-document-answer">Основные вопросы заполнены. Дополнительные детали можно уточнить с исполнителем.</p>}</section>
    <footer className="brief-document-footer">Составлено из ваших ответов в «Ясно». Сроки, стоимость и состав работ согласовываются с исполнителем.</footer>
  </article>;
}
