// Lightweight toast stack for success/notice feedback. Errors stay inline where they happen.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

const TONE = {
  good: { icon: 'circleCheck', cls: 'text-pass' },
  info: { icon: 'info', cls: 'text-brand' },
  warn: { icon: 'circleAlert', cls: 'text-thread-deep' },
  error: { icon: 'circleX', cls: 'text-miss' },
};

function Toast({ toast, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4600);
    return () => clearTimeout(t);
  }, [toast.id, onClose]);

  const tone = TONE[toast.tone] || TONE.info;
  return (
    <div role="status" className="animate-toast pointer-events-auto flex w-[22rem] max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border border-line bg-paper px-4 py-3 shadow-[0_16px_40px_-16px_rgba(6,31,34,0.45)]">
      <Icon name={tone.icon} className={`mt-0.5 h-5 w-5 flex-none ${tone.cls}`} />
      <div className="min-w-0 flex-1">
        {toast.title && <p className="font-semibold leading-snug">{toast.title}</p>}
        {toast.message && <p className="text-ink-2">{toast.message}</p>}
      </div>
      <button type="button" className="-m-1 rounded p-1 text-ink-2 hover:bg-wash hover:text-ink" onClick={onClose}>
        <Icon name="x" className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((toast) => {
    const id = ++idRef.current;
    setToasts((list) => [...list.slice(-3), { id, tone: 'info', ...toast }]);
  }, []);

  const close = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[70] flex flex-col items-end gap-2">
        {toasts.map((t) => <Toast key={t.id} toast={t} onClose={() => close(t.id)} />)}
      </div>
    </ToastContext.Provider>
  );
}
