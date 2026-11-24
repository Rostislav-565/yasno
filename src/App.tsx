import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Circle, Clipboard, Download, FileCheck2, FilePlus2, FileText, FolderOpen, LockKeyhole, Printer, RotateCcw, X } from 'lucide-react';
import BriefFields from './components/BriefFields';
import BriefPreview from './components/BriefPreview';
import { emptyBrief, parseBrief, buildBriefMarkdown, buildBriefText, getBriefChecklist, getBriefFilename } from './lib/brief';
import type { Brief } from './lib/brief';
import { download } from './lib/files';
import { useDialog } from './lib/hooks';

const STORAGE_KEY = 'yasno-brief-v1';
const steps = ['Задача', 'Страницы и функции', 'Материалы и условия', 'Готовое задание'];
const titles = ['Какой сайт вам нужен?', 'Что должно быть на сайте?', 'Что уже есть и что нужно учесть?', 'Ваше задание для разработчика'];
const descriptions = [
  'Ответьте на простые вопросы. Из ваших ответов получится документ, который можно отправить разработчику для оценки стоимости и сроков.',
  'Соберите список страниц и выберите нужные возможности. Всё, что вы добавите, попадёт в задание.',
  'Укажите свои материалы, пожелания и ограничения. Если ответа пока нет, оставьте поле пустым — его можно обсудить с исполнителем.',
  'Проверьте текст и скачайте его. Документ содержит ваши ответы, а пустые пункты отмечены как вопросы для обсуждения.',
];
function hasContent(brief: Brief) {
  return Object.entries(brief).some(([key, value]) => key !== 'version' && key !== 'updatedAt' && (typeof value === 'string' ? value.trim().length > 0 : Array.isArray(value) && value.length > 0));
}
function loadDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { brief: emptyBrief(), notice: '' };
    const parsed = parseBrief(JSON.parse(stored));
    return parsed ? { brief: parsed, notice: '' } : { brief: emptyBrief(), notice: 'Сохранённый документ повреждён. Можно открыть резервную копию JSON или начать заново.' };
  } catch { return { brief: emptyBrief(), notice: 'Не удалось восстановить черновик. Скачивайте резервную копию, чтобы сохранить работу.' }; }
}
function ReplaceDialog({ importing, onCancel, onSave, onConfirm }: { importing: Brief | null; onCancel: () => void; onSave: () => void; onConfirm: () => void }) {
  const ref = useDialog(onCancel);
  return <div className="brief-modal-backdrop" onMouseDown={event=>{if(event.currentTarget===event.target)onCancel();}}><div ref={ref} role="dialog" aria-modal="true" aria-labelledby="replace-title" className="brief-modal">
    <button className="brief-close" onClick={onCancel} aria-label="Закрыть подтверждение"><X size={20}/></button><FileText size={32} className="brief-dialog-icon"/>
    <h2 id="replace-title">{importing ? 'Открыть другое задание?' : 'Начать новое задание?'}</h2>
    <p>{importing ? `Будет открыт документ «${importing.title.trim() || 'Без названия'}».` : 'Откроется пустой документ.'} Текущее задание можно сначала сохранить в JSON. Последнюю замену можно отменить.</p>
    <div className="brief-modal-actions"><button className="bf-btn bf-btn-secondary" onClick={onSave}><Download size={17}/>Сохранить текущий JSON</button><button className="bf-btn bf-btn-primary" onClick={onConfirm}>{importing ? 'Открыть документ' : 'Начать заново'}</button><button className="bf-btn bf-btn-quiet" onClick={onCancel}>Отмена</button></div>
  </div></div>;
}
export default function App() {
  const [initial] = useState(loadDraft);
  const [brief, setBrief] = useState<Brief>(initial.brief);
  const [step, setStep] = useState(0);
  const [saveState, setSaveState] = useState<'saving'|'saved'|'failed'>('saving');
  const [notice, setNotice] = useState(initial.notice);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Brief|null>(null);
  const [undoBrief, setUndoBrief] = useState<Brief|null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const checklist = getBriefChecklist(brief), completed = checklist.filter(item=>item.done).length, meaningful = hasContent(brief);
  useEffect(()=>{
    const timer = window.setTimeout(()=>{try { localStorage.setItem(STORAGE_KEY, JSON.stringify(brief)); setSaveState('saved'); } catch { setSaveState('failed'); }}, 250);
    return ()=>window.clearTimeout(timer);
  },[brief]);
  useEffect(()=>{
    const flush = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(brief)); } catch { /* Exports remain available. */ } };
    window.addEventListener('pagehide', flush); return ()=>window.removeEventListener('pagehide', flush);
  },[brief]);
  const change = (patch: Partial<Brief>) => {setBrief(previous=>({...previous,...patch,version:1,updatedAt:new Date().toISOString()}));setSaveState('saving');setNotice('');};
  const navigate = (next: number) => {setStep(next);setNotice('');window.requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});});};
  const exportFile = (format: 'txt'|'md'|'json') => {
    try {const value = format==='json'?JSON.stringify(brief,null,2):format==='md'?buildBriefMarkdown(brief):buildBriefText(brief);download(value,getBriefFilename(brief,format),format==='json'?'application/json':format==='md'?'text/markdown;charset=utf-8':'text/plain;charset=utf-8');setNotice(format==='json'?'Резервная копия JSON подготовлена. Её можно снова открыть здесь.':'Файл задания подготовлен для скачивания. Передайте его выбранному разработчику.');}
    catch {setNotice('Не удалось скачать файл. Попробуйте скопировать текст или выделить его в готовом задании.');}
  };
  const copy = async () => {try {await navigator.clipboard.writeText(buildBriefText(brief));setNotice('Текст задания скопирован. Его можно вставить в письмо или сообщение разработчику.');}catch{setNotice('Браузер не разрешил копирование. Скачайте TXT или выделите текст задания вручную.');}};
  const replace = (next: Brief) => {setUndoBrief(brief);setBrief(next);setSaveState('saving');setReplaceOpen(false);setPendingImport(null);navigate(0);setNotice('Документ заменён. При необходимости нажмите «Отменить замену».');};
  const openJson = async (file?: File) => {
    if (!file) return;
    try {if(file.size>256_000)throw new Error('too-large');const parsed=parseBrief(JSON.parse(await file.text()));if(!parsed)throw new Error('invalid');if(meaningful){setPendingImport(parsed);setReplaceOpen(true);}else replace(parsed);}
    catch {setNotice('Файл не открыт. Выберите резервную копию JSON из этого приложения, размером не более 256 КБ. Текущее задание сохранено.');}
    finally {if(importInput.current)importInput.current.value='';}
  };
  return <div className="brief-app">
    <a href="#brief-editor" className="brief-skip">Перейти к заданию</a>
    <aside className="brief-sidebar">
      <a href="#" className="brief-brand" onClick={event=>{event.preventDefault();navigate(0);}} aria-label="Ясно — начало"><span><FileCheck2 size={26}/></span><div>Ясно<small>Задание на сайт</small></div></a>
      <p className="brief-sidebar-caption">ОТ ИДЕИ К ПОНЯТНОМУ ЗАДАНИЮ</p>
      <nav aria-label="Шаги подготовки задания" className="brief-steps">{steps.map((label,index)=><button key={label} aria-current={step===index?'step':undefined} className={step===index?'is-active':''} onClick={()=>navigate(index)}><span className="brief-step-number">{index===3?<FileText size={18}/>:index+1}</span><span>{label}</span></button>)}</nav>
      <div className="brief-sidebar-help"><LockKeyhole size={19}/><p>Ваши ответы остаются<br/>в этом браузере.</p><small>Без регистрации и отправки заявок. Готовый файл вы передаёте исполнителю сами.</small></div>
    </aside>
    <div className="brief-main">
      <header className="brief-topbar"><span className={'brief-save-state '+saveState} role="status">{saveState==='saved'?<CheckCircle2 size={16}/>:<Circle size={16}/>}<span>{saveState==='saved'?(meaningful?'Черновик сохранён в браузере':'Новый документ'):saveState==='failed'?'Сохранение недоступно — скачайте файл':'Сохраняем…'}</span></span><div className="brief-file-actions"><button className="bf-btn bf-btn-quiet" onClick={()=>importInput.current?.click()}><FolderOpen size={18}/><span>Открыть JSON</span></button><button className="bf-btn bf-btn-secondary" onClick={()=>{if(meaningful){setPendingImport(null);setReplaceOpen(true);}else navigate(0);}}><FilePlus2 size={18}/><span>Новое задание</span></button><input ref={importInput} type="file" accept=".json,application/json" className="brief-file-input" aria-label="Открыть резервную копию JSON" onChange={event=>void openJson(event.currentTarget.files?.[0])}/></div></header>
      <main className="brief-workspace" id="brief-editor">
        <div className="brief-page-heading"><p className="brief-eyebrow">ШАГ {step+1} ИЗ 4 · {step===3?'ПРОВЕРЬТЕ И СОХРАНИТЕ':'ЗАПОЛНЯЕТСЯ ВАШИМИ ДАННЫМИ'}</p><h1 ref={heading} tabIndex={-1}>{titles[step]}</h1><p>{descriptions[step]}</p></div>
        {(notice||undoBrief)&&<div className="brief-feedback">{notice&&<div className="brief-notice" role="status">{notice}</div>}{undoBrief&&<button className="brief-undo" onClick={()=>{setBrief(undoBrief);setUndoBrief(null);setSaveState('saving');setNotice('Предыдущее задание восстановлено.');}}><RotateCcw size={16}/>Отменить замену</button>}</div>}
        <div className={'brief-work-columns '+(step===3?'is-preview':'')}>
          <div className="brief-editor-column">
            {step<3?<div className="brief-editor-card"><BriefFields brief={brief} step={step} onChange={change}/></div>:<>
              <div className="brief-export-bar"><button className="bf-btn bf-btn-primary" disabled={!meaningful} onClick={()=>exportFile('txt')}><Download size={18}/>Скачать задание · TXT</button><button className="bf-btn bf-btn-secondary" disabled={!meaningful} onClick={()=>void copy()}><Clipboard size={18}/>Скопировать текст</button><button className="bf-btn bf-btn-secondary" disabled={!meaningful} onClick={()=>{try{window.print();setNotice('Команда печати передана браузеру. Для PDF выберите «Сохранить как PDF». Если встроенный браузер не открыл печать, используйте Chrome или Edge.');}catch{setNotice('Печать недоступна. Скачайте TXT или Markdown.');}}}><Printer size={18}/>Печать / PDF</button></div>
              {!meaningful&&<div className="brief-empty-note">Документ пока пуст. Начните с описания задачи — кнопки сохранения станут доступны.</div>}
              <BriefPreview brief={brief}/>
              <div className="brief-other-exports"><button className="bf-btn bf-btn-quiet" disabled={!meaningful} onClick={()=>exportFile('md')}><Download size={16}/>Скачать Markdown</button><button className="bf-btn bf-btn-quiet" disabled={!meaningful} onClick={()=>exportFile('json')}><Download size={16}/>Резервная копия JSON</button><p>TXT — для отправки исполнителю. JSON — чтобы продолжить заполнение на другом устройстве.</p></div>
            </>}
            <div className="brief-step-actions">{step>0&&<button className="bf-btn bf-btn-secondary" onClick={()=>navigate(step-1)}>Назад</button>}{step<3&&<button className="bf-btn bf-btn-primary" onClick={()=>navigate(step+1)}>{step===2?'Посмотреть задание':`Далее: ${step===0?'страницы и функции':'материалы и условия'}`}</button>}{step===3&&<button className="bf-btn bf-btn-secondary" onClick={()=>navigate(0)}>Вернуться к редактированию</button>}</div>
          </div>
          <aside className="brief-checklist" aria-label="Проверка задания"><div className="brief-checklist-title"><FileCheck2 size={22}/><h2>Что уже понятно</h2></div><p className="brief-checklist-count">Уточнено {completed} из {checklist.length} основных пунктов</p><div className="brief-progress-track" aria-hidden="true"><span style={{width:`${checklist.length?completed/checklist.length*100:0}%`}}/></div><ul>{checklist.map(item=><li key={item.id}><button onClick={()=>navigate(item.step)} className={item.done?'is-done':''}>{item.done?<Check size={17}/>:<Circle size={16}/>}<span>{item.label}</span><span className="brief-sr-only">{item.done?'Заполнено':'Не заполнено'}</span></button></li>)}</ul><p className="brief-checklist-note">Это подсказка, а не обязательные поля. Неизвестные ответы можно обсудить с разработчиком.</p>{step<3&&<button className="bf-btn bf-btn-secondary brief-preview-button" onClick={()=>navigate(3)}>Предпросмотр задания</button>}<div className="brief-output-note"><FileText size={19}/><p><strong>На выходе — ваш документ</strong><span>Только ваши ответы и список вопросов для обсуждения. Стоимость определит исполнитель.</span></p></div></aside>
        </div>
        <footer className="brief-footer">Ясно — подготовьте описание, сохраните файл и обсудите проект с исполнителем.</footer>
      </main>
    </div>
    {replaceOpen&&<ReplaceDialog importing={pendingImport} onCancel={()=>{setReplaceOpen(false);setPendingImport(null);}} onSave={()=>exportFile('json')} onConfirm={()=>replace(pendingImport??emptyBrief())}/>}
  </div>;
}
