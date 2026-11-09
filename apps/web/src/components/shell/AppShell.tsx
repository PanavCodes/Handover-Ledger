"use client";

import React, { useState } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { SessionProvider } from "./SessionContext";
import { Topbar } from "./Topbar";
import { Navigation } from "./Navigation";
import { SimulationBanner } from "./SimulationBanner";
import { CommandPalette } from "./CommandPalette";
import { ShieldCheck, Terminal, Heart } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-accent/30 selection:text-foreground">
          {/* Top Sticky Bar */}
          <Topbar onOpenCommandPalette={() => setCommandPaletteOpen(true)} />

          {/* Navigation Bar */}
          <Navigation />

          {/* Persona Simulation Alert (shows when not Dr. Meera) */}
          <SimulationBanner />

          {/* Main App Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>

          {/* Global Command Palette */}
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
          />

          {/* Footer with Cryptographic Assurance Stamp */}
          <footer className="border-t border-border bg-card/40 py-6 px-4 text-xs text-muted-foreground mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>
                  <strong>Handover Ledger:</strong> Machine-verified citations with 1:1 character-offset normalizer & head-anchored SHA-256 audit chain.
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  Next.js 14 + Vitest
                </span>
                <span>•</span>
                <span>Zero Synthetic Leaks</span>
                <span>•</span>
                <span className="text-muted-foreground/60">Aurora Rover Hackathon Build</span>
              </div>
            </div>
          </footer>
        </div>
      </SessionProvider>
    </ThemeProvider>
  );
}
