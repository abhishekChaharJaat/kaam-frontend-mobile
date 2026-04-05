import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import en from "./locales/en.json";
import hi from "./locales/hi.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
};

const LANG_STORAGE_KEY = "@app_language";

const deviceLocale = Localization.getLocales()?.[0]?.languageCode || "en";
const defaultLang = deviceLocale === "hi" ? "hi" : "en";

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: "v4",
});

(async () => {
  try {
    const AsyncStorage =
      require("@react-native-async-storage/async-storage").default;
    const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "en" || stored === "hi") {
      i18n.changeLanguage(stored);
    }
  } catch {}
})();

export default i18n;
