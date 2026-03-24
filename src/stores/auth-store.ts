"use client";

import { create } from "zustand";

interface AuthStore {
  currentMode: "employee" | "admin";
  setCurrentMode: (mode: "employee" | "admin") => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  currentMode: "employee",
  setCurrentMode: (mode) => set({ currentMode: mode }),
}));
