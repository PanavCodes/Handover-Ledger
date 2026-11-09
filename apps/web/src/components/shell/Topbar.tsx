"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSession } from "./SessionContext";
import { useTheme } from "next-themes";
import { PersonaRole } from "@/lib/personas";
import {
  BookOpen,
  ChevronDown,
  RotateCcw,
  Moon,
  Sun,
  ShieldCheck,
  Command,
  Check,
  Sparkles,
} from "lucide-react";

interface TopbarProps {
  onOpenCommandPalette?: () => void;
}

export function Topbar({ onOpenCommandPalette }: TopbarProps) {
  const { persona, allPersonas, switchPersona, resetDemo, loading } = useSession();
  const { theme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (confirm("Reset demo store back to original Aurora Rover dataset?")) {
      setResetting(true);
      await resetDemo();
      setResetting(false);
    }
  };

  const getRoleColor = (role: PersonaRole) => {
    switch (role) {
      case "lead":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "leaver":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
      case "core":
        return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
      case "coord":
        return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-sm">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                Handover Ledger
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                Aurora Rover Demo
              </span>
            </div>
          </Link>
        </div>

        {/* Center/Right: Actions & Persona Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Command Palette Button */}
          <button
            onClick={onOpenCommandPalette}
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground text-xs border border-border transition-colors shadow-inner"
            title="Open Command Palette (Cmd+K)"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Search & Commands</span>
            <kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Canary Status Pill */}
          <Link
            href="/canary"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-medium hover:bg-emerald-500/20 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Canary: Zero Leakage
          </Link>

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition shadow-sm ${getRoleColor(
                persona.role
              )} hover:opacity-90`}
            >
              <div className="text-left">
                <div className="font-semibold leading-tight">{persona.name}</div>
                <div className="text-[10px] opacity-80 leading-tight">{persona.badge}</div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-card border border-border shadow-xl z-50 p-2 divide-y divide-border">
                  <div className="px-2 py-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider font-mono">
                      Simulate Persona (RLS Role)
                    </p>
                  </div>
                  <div className="py-1 space-y-1">
                    {allPersonas.map((p) => {
                      const isActive = p.role === persona.role;
                      return (
                        <button
                          key={p.id}
                          disabled={loading}
                          onClick={() => {
                            switchPersona(p.role);
                            setDropdownOpen(false);
                          }}
                          className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted/70 text-foreground"
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[11px] font-bold ${getRoleColor(
                              p.role
                            )}`}
                          >
                            {p.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold truncate">{p.name}</span>
                              {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                            <span className="text-[11px] text-muted-foreground block truncate">
                              {p.badge}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 px-2 flex justify-between items-center text-[11px] text-muted-foreground">
                    <Link
                      href="/demo"
                      onClick={() => setDropdownOpen(false)}
                      className="hover:text-primary transition underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Persona Explainer Hub
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            title="Reset demo data to clean synthetic state"
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-sm disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-sm"
          >
            <Sun className="w-4 h-4 hidden dark:block" />
            <Moon className="w-4 h-4 block dark:hidden" />
          </button>
        </div>
      </div>
    </header>
  );
}
