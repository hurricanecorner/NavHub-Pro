
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ 
  isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDangerous = false 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={onCancel} />
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative z-10 animate-in zoom-in-95 duration-200 dark:bg-zinc-800 dark:border dark:border-white/5">
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDangerous ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-brand-50 text-brand-500 dark:bg-brand-900/20'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-zinc-100 mb-2">{title}</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed font-black">{message}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-black hover:bg-slate-200 transition-colors dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600">{cancelText}</button>
          <button onClick={onConfirm} className={`flex-1 px-4 py-2.5 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-200 dark:shadow-none transition-all active:scale-95 ${isDangerous ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-600 hover:bg-brand-700'}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};
