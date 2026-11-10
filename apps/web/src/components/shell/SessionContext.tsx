"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { PersonaRole, PersonaProfile, DEMO_PERSONAS } from "@/lib/personas";

interface SessionContextType {
  persona: PersonaProfile;
  personaRole: PersonaRole;
  allPersonas: PersonaProfile[];
  loading: boolean;
  withheldCount: number;
  setWithheldCount: (count: number) => void;
  switchPersona: (role: PersonaRole) => Promise<void>;
  resetDemo: () => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultContext: SessionContextType = {
  persona: DEMO_PERSONAS.lead,
  personaRole: "lead",
  allPersonas: Object.values(DEMO_PERSONAS),
  loading: true,
  withheldCount: 0,
  setWithheldCount: () => {},
  switchPersona: async () => {},
  resetDemo: async () => {},
  refresh: async () => {},
};

const SessionContext = createContext<SessionContextType>(defaultContext);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersona] = useState<PersonaProfile>(DEMO_PERSONAS.lead);
  const [loading, setLoading] = useState(true);
  const [withheldCount, setWithheldCount] = useState(0);

  const syncWithheldForCurrentPersona = useCallback(async () => {
    try {
      const res = await fetch("/api/claims");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.withheldCount === "number") {
          setWithheldCount(data.withheldCount);
        }
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        if (data.persona) {
          setPersona(data.persona);
        }
      }
      await syncWithheldForCurrentPersona();
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }, [syncWithheldForCurrentPersona]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const switchPersona = async (role: PersonaRole) => {
    setLoading(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: role }),
      });
      if (res.ok) {
        const data = await res.json();
        setPersona(data.persona);
        await syncWithheldForCurrentPersona();
        window.dispatchEvent(new CustomEvent("persona-changed", { detail: { role } }));
      }
    } catch (err) {
      console.error("Failed to switch persona:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    setLoading(true);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona: "lead" }),
      });
      setPersona(DEMO_PERSONAS.lead);
      setWithheldCount(0);
      window.dispatchEvent(new CustomEvent("demo-reset"));
      window.dispatchEvent(new CustomEvent("persona-changed", { detail: { role: "lead" } }));
    } catch (err) {
      console.error("Failed to reset demo:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        persona,
        personaRole: persona.role,
        allPersonas: Object.values(DEMO_PERSONAS),
        loading,
        withheldCount,
        setWithheldCount,
        switchPersona,
        resetDemo,
        refresh: fetchSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
