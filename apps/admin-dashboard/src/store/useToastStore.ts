import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  title?: string;
  message: string;
  severity: ToastSeverity;
};

type ToastStore = {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ...toast,
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));