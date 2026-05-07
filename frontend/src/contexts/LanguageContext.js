import React, { createContext, useContext, useState, useEffect } from "react";
import { I18nManager, Platform } from "react-native";
import i18n from "../i18n";
import { getItem, setItem } from "../utils/storage";

const STORAGE_KEY = "app_language";
const RTL_LANGUAGES = ["ar"];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getItem(STORAGE_KEY);
      if (stored) {
        i18n.changeLanguage(stored);
        setLanguageState(stored);
        applyRTL(stored);
      } else {
        setShowPicker(true);
      }
      setIsReady(true);
    })();
  }, []);

  const applyRTL = (lang) => {
    const shouldBeRTL = RTL_LANGUAGES.includes(lang);
    if (Platform.OS !== "web") {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const setLanguage = async (lang) => {
    await setItem(STORAGE_KEY, lang);
    i18n.changeLanguage(lang);
    setLanguageState(lang);
    applyRTL(lang);
    setShowPicker(false);

    // RTL requires restart on native — for now just apply, user will see it next launch
    // A full reload (Updates.reloadAsync) can be added if needed
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        isReady,
        showPicker,
        setShowPicker,
        isRTL: RTL_LANGUAGES.includes(language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
