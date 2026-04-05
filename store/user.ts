import { create } from "zustand";

export type UsagePreference = "find_worker" | "find_work";

interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  locality?: string;
  state?: string;
}

interface UserState {
  usagePreference: UsagePreference;
  isOnboardingComplete: boolean;
  isLoaded: boolean;
  location: LocationData | null;

  setUsagePreference: (pref: UsagePreference) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLocation: (loc: LocationData) => void;
  loadUser: () => Promise<void>;
}

const STORAGE_KEY = "@user_state";

async function getStored(): Promise<Partial<UserState> | null> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function persist(state: {
  usagePreference: UsagePreference;
  isOnboardingComplete: boolean;
  location: LocationData | null;
}): Promise<void> {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export const useUserStore = create<UserState>((set, get) => ({
  usagePreference: "find_worker",
  isOnboardingComplete: false,
  isLoaded: false,
  location: null,

  setUsagePreference: (pref) => {
    set({ usagePreference: pref });
    const s = get();
    persist({
      usagePreference: pref,
      isOnboardingComplete: s.isOnboardingComplete,
      location: s.location,
    });
  },

  setOnboardingComplete: (complete) => {
    set({ isOnboardingComplete: complete });
    const s = get();
    persist({
      usagePreference: s.usagePreference,
      isOnboardingComplete: complete,
      location: s.location,
    });
  },

  setLocation: (loc) => {
    set({ location: loc });
    const s = get();
    persist({
      usagePreference: s.usagePreference,
      isOnboardingComplete: s.isOnboardingComplete,
      location: loc,
    });
  },

  loadUser: async () => {
    const stored = await getStored();
    if (stored) {
      set({
        usagePreference:
          (stored.usagePreference as UsagePreference) || "find_worker",
        isOnboardingComplete: stored.isOnboardingComplete || false,
        location: (stored.location as LocationData) || null,
        isLoaded: true,
      });
    } else {
      set({ isLoaded: true });
    }
  },
}));
