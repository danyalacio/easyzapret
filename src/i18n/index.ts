import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ru from "./ru";
import en from "./en";

export function systemLanguage(): "ru" | "en" {
  return navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: systemLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
