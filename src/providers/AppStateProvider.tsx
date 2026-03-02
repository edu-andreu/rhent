import { createContext, useContext, useState, ReactNode } from "react";

interface AppStateContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  catalogEditMode: boolean;
  setCatalogEditMode: (mode: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  catalogSearchQuery: string;
  setCatalogSearchQuery: (query: string) => void;
}

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: AppStateProviderProps) {
  const [activeTab, setActiveTab] = useState("catalog");
  const [catalogEditMode, setCatalogEditMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState("");

  const value: AppStateContextValue = {
    activeTab,
    setActiveTab,
    catalogEditMode,
    setCatalogEditMode,
    mobileMenuOpen,
    setMobileMenuOpen,
    catalogSearchQuery,
    setCatalogSearchQuery,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return context;
}
