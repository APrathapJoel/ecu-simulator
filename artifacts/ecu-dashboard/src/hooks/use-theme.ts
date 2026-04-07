import { useEffect } from 'react';

export function useThemeProvider() {
  useEffect(() => {
    // Force dark mode
    document.documentElement.classList.add('dark');
  }, []);
}
