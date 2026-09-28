import { useState, useEffect } from 'react';

const DEMO_KEY = 'cyberedu_demo_mode';

/**
 * Demo modu hook'u.
 * Demo modunda:
 *  - Tüm kurs kilitleri kalkar
 *  - Yanlış cevap yüzde engeli devre dışı kalır
 *  - Soru sıralaması kilitlemesi kalkar
 */
export function useDemoMode() {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem(DEMO_KEY) === 'true';
  });

  useEffect(() => {
    localStorage.setItem(DEMO_KEY, isDemoMode ? 'true' : 'false');
  }, [isDemoMode]);

  const toggleDemoMode = () => setIsDemoMode((prev) => !prev);
  const enableDemoMode = () => setIsDemoMode(true);
  const disableDemoMode = () => setIsDemoMode(false);

  return { isDemoMode, toggleDemoMode, enableDemoMode, disableDemoMode };
}
