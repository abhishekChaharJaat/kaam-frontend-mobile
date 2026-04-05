import { Platform } from "react-native";
import { TokenCache } from "@clerk/clerk-expo";

const createTokenCache = (): TokenCache => {
  const inMemoryCache: Record<string, string> = {};

  return {
    async getToken(key: string) {
      try {
        const SecureStore = require("expo-secure-store");
        return await SecureStore.getItemAsync(key);
      } catch {
        return inMemoryCache[key] ?? null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        const SecureStore = require("expo-secure-store");
        await SecureStore.setItemAsync(key, value);
      } catch {
        inMemoryCache[key] = value;
      }
    },
  };
};

export const tokenCache = createTokenCache();
