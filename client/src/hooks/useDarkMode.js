import { useEffect, useState } from 'react';

const STORAGE_KEY = 'datastory_dark_mode';

// Dark mode is scoped to the dashboard experience — the landing page's
// marketing sections (Hero, InteractiveDemo, etc.) weren't converted to the
// theme's CSS variables, so applying the .dark class while on that page
// would wash out shared components (e.g. the Navbar wordmark) that WERE
// converted, against a landing background that stays fixed-light. `active`
// gates whether the class actually lands on <html> without losing the
// user's underlying preference (still tracked/persisted regardless).
export function useDarkMode(active = true) {
  // Light is always the default on first visit — deliberately NOT following
  // the OS's prefers-color-scheme, since that surprised users with an
  // unrequested dark mode. Only an explicit toggle (persisted below) changes it.
  const [isDark, setIsDark] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark && active);
    localStorage.setItem(STORAGE_KEY, String(isDark));
  }, [isDark, active]);

  return [isDark, setIsDark];
}
