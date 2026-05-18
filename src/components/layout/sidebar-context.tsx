"use client";

import * as React from "react";

const STORAGE_KEY = "samanta:sidebar-collapsed";

type SidebarCtxValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarCtx = React.createContext<SidebarCtxValue>({
  collapsed: false,
  toggle: () => {},
});

export function useSidebarState() {
  return React.useContext(SidebarCtx);
}

export function SidebarStateProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggle = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ collapsed, toggle }), [collapsed, toggle]);

  return <SidebarCtx.Provider value={value}>{children}</SidebarCtx.Provider>;
}
