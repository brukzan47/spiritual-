import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// JSON resources
import en from "./locales/en/common.json";
import am from "./locales/am/common.json";
import om from "./locales/om/common.json"; // Afan Oromo (om)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am },
      om: { translation: om },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "am", "om"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

// keep <html lang=".."> in sync
const updateHtmlLang = () => {
  document.documentElement.setAttribute("lang", i18n.language || "en");
};
i18n.on("initialized", updateHtmlLang);
i18n.on("languageChanged", updateHtmlLang);

export default i18n;
