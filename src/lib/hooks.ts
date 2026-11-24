import { useEffect, useRef, useState } from 'react';
const openDialogs: symbol[] = [];
const dialogReturnTargets = new Map<symbol, HTMLElement[]>();
let unlockedOverflow = '';
function captureReturnTargets() {
  const active = document.activeElement instanceof HTMLElement ? [document.activeElement] : [];
  return [...active, ...[...openDialogs].reverse().flatMap(id => dialogReturnTargets.get(id) ?? [])];
}
export function useStoredState<T>(key: string, initial: T, validate?: (stored:unknown)=>stored is T) {
  const [value, setValue] = useState<T>(() => { try { const data = localStorage.getItem(key); if(!data)return initial; const parsed:unknown=JSON.parse(data); return (validate?validate(parsed):typeof parsed===typeof initial&&parsed!==null)?parsed as T:initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be unavailable in private browsing. State remains usable. */ } }, [key, value]);
  return [value, setValue] as const;
}
export function useDialog(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const returnFocus = useRef(captureReturnTargets());
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = returnFocus.current;
    const element = ref.current;
    if (!element) return;
    const id = Symbol('dialog');
    dialogReturnTargets.set(id, previous);
    if (!openDialogs.length) { unlockedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    openDialogs.push(id);
    const isTop = () => openDialogs.at(-1) === id;
    const elements = () => Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]')).filter(item => item.getClientRects().length > 0 && !item.closest('[inert],[aria-hidden="true"]'));
    element.tabIndex = -1;
    const initial = element.querySelector<HTMLElement>('[data-autofocus]') ?? elements()[0] ?? element;
    initial.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (!isTop() || event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const all = elements(), first = all[0], last = all.at(-1);
        if (!first) { event.preventDefault(); element.focus({ preventScroll: true }); }
        else if (!element.contains(document.activeElement) || document.activeElement === element) { event.preventDefault(); (event.shiftKey ? last : first)?.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      const wasTop = isTop();
      document.removeEventListener('keydown', key);
      const index = openDialogs.indexOf(id);
      if (index !== -1) openDialogs.splice(index, 1);
      dialogReturnTargets.delete(id);
      if (!openDialogs.length) document.body.style.overflow = unlockedOverflow;
      const target = previous.find(item => item.isConnected && !element.contains(item));
      if (wasTop && target) target.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}
