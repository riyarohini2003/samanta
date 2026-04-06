"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from "next-themes";

/**
 * App-wide theme provider.
 *
 * - Uses the `class` strategy so Tailwind's `dark:` variants work.
 * - `enableSystem` lets users follow their OS preference.
 * - `disableTransitionOnChange` prevents a flash of mismatched colors
 *   while CSS variables swap over on toggle.
 * - `storageKey` is shared across admin, employee, and PWA views so the
 *   preference persists through navigation, refresh, and re-login.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="samanta-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
