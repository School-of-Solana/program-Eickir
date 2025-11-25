"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export type Role = "client" | "contractor" | null;

type RoleContextValue = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("solance:role");
    if (stored === "client" || stored === "contractor") {
      setRoleState(stored);
    }
  }, []);

  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    if (typeof window === "undefined") return;
    if (newRole) {
      window.localStorage.setItem("solance:role", newRole);
    } else {
      window.localStorage.removeItem("solance:role");
    }
  };

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return ctx;
}
