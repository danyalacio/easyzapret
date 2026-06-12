import { create } from "zustand";

export interface ToastItem {
  id: number;
  message: string;
  tone: "ok" | "fail" | "info";
}

interface ToastStore {
  toasts: ToastItem[];
  push: (message: string, tone?: ToastItem["tone"]) => void;
  remove: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastStore>((set) => ({
  toasts: [],
  push: (message, tone = "info") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(message: string, tone: ToastItem["tone"] = "info") {
  useToasts.getState().push(message, tone);
}
