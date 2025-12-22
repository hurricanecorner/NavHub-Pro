
import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';
export interface ToastMessage { id: string; type: ToastType; message: string; }
interface ToastContainerProps { toasts: ToastMessage[]; removeToast: (id: string) => void; }

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({ toast, removeToast }) => {
  useEffect(() => {
    const timer = setTimeout(() => { removeToast(toast.id); }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-brand-500" />
  };

  const styles = {
    success: 'bg-white border-emerald-100 dark:bg-zinc-800 dark:border-emerald-900/50 shadow-emerald-100/50 dark:shadow-none',
    error: 'bg-white border-red-100 dark:bg-zinc-800 dark:border-red-900/50 shadow-red-100/50 dark:shadow-none',
    info: 'bg-white border-brand-100 dark:bg-zinc-800 dark:border-brand-900/50 shadow-brand-100/50 dark:shadow-none'
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border border-l-4 ${styles[toast.type]} min-w-[320px] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300`}>
      <div className="shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-black text-slate-700 dark:text-zinc-200 flex-1 leading-relaxed">{toast.message}</p>
      <button onClick={() => removeToast(toast.id)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:hover:bg-zinc-700 dark:hover:text-zinc-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
