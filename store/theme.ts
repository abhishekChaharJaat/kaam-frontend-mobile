import { create } from "zustand";

type ThemeMode = "light" | "dark";

interface ThemeState {
  theme: ThemeMode;
  isLoaded: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = "@app_theme";

async function getStoredTheme(): Promise<string | null> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    return await AsyncStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function saveTheme(theme: string): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "dark",
  isLoaded: false,

  setTheme: async (theme: ThemeMode) => {
    set({ theme });
    await saveTheme(theme);
  },

  toggleTheme: () => {
    const next = get().theme === "light" ? "dark" : "light";
    get().setTheme(next);
  },

  loadTheme: async () => {
    const stored = await getStoredTheme();
    if (stored === "light" || stored === "dark") {
      set({ theme: stored, isLoaded: true });
    } else {
      set({ isLoaded: true });
    }
  },
}));
