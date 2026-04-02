import { useEffect } from 'react';
import { X, CheckCircle, WarningCircle, Info, XCircle } from '@phosphor-icons/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: WarningCircle,
    info: Info,
};

const colors = {
    success: 'bg-emerald-600 border-emerald-500',
    error: 'bg-red-600 border-red-500',
    warning: 'bg-amber-600 border-amber-500',
    info: 'bg-blue-600 border-blue-500',
};

export function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    const Icon = icons[toast.type];
    const colorClass = colors[toast.type];

    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 5000);

        return () => {
            clearTimeout(timer);
        };
    }, [toast.id, toast.duration, onDismiss]);

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-xl animate-in slide-in-from-right-8 duration-300 ${colorClass}`}
            role="alert"
            aria-live="polite"
            aria-atomic="true"
        >
            <Icon size={20} weight="bold" className="flex-shrink-0" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            {toast.action && (
                <button
                    onClick={() => {
                        toast.action.onClick();
                        onDismiss(toast.id);
                    }}
                    className="flex-shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-colors"
                    type="button"
                >
                    {toast.action.label}
                </button>
            )}
            <button
                onClick={() => onDismiss(toast.id)}
                className="flex-shrink-0 rounded-lg p-1 hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
                type="button"
            >
                <X size={16} weight="bold" aria-hidden="true" />
            </button>
        </div>
    );
}
