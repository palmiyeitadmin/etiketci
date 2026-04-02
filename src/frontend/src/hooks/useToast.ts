import { create } from 'zustand';
import { Toast } from '@/components/ui/Toast';

interface ToastStore {
    toasts: Toast[];
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

export const useToast = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (toast) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        set((state) => ({
            toasts: [...state.toasts, { ...toast, id }]
        }));
    },
    removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    })),
    clearToasts: () => set({ toasts: [] }),
}));
