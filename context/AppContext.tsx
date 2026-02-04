
import React, { createContext, useContext, useState, useEffect } from 'react';
// Fixed: Removed TRANSLATIONS from types import as it does not exist there.
import { Language, FontSize } from '../types';
import { TRANSLATIONS as TranslationsDict } from '../constants';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  t: (key: keyof typeof TranslationsDict.en) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('bma_language');
    return (saved as Language) || 'en';
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    const saved = localStorage.getItem('bma_fontSize');
    return (saved as FontSize) || 'medium';
  });

  useEffect(() => {
    localStorage.setItem('bma_language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('bma_fontSize', fontSize);
    
    // Apply font size globally
    const html = document.documentElement;
    if (fontSize === 'small') html.style.fontSize = '14px';
    else if (fontSize === 'medium') html.style.fontSize = '16px';
    else if (fontSize === 'large') html.style.fontSize = '18px';
  }, [fontSize]);

  const t = (key: keyof typeof TranslationsDict.en): string => {
    return TranslationsDict[language][key] || TranslationsDict.en[key] || String(key);
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, fontSize, setFontSize, t }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
