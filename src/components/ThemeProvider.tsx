'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface ThemeValue {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue>({ dark: false, toggle: () => {} });

export const THEME_KEY = 'fcee-theme';

/**
 * Script que corre antes del primer pintado para aplicar el tema guardado y
 * evitar el parpadeo blanco al cargar en modo oscuro.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      try {
        localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      } catch {
        // Modo privado o almacenamiento bloqueado: el tema dura la sesión.
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}
