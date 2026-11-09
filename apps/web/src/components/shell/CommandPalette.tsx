"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { useSession } from "./SessionContext";
import {
  LayoutDashboard,
  Layers,
  Network,
  FileText,
  UploadCloud,
  ShieldCheck,
  History,
  RotateCcw,
  Download,
  Bot,
  UserCheck,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { switchPersona, resetDemo } = useSession();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runAction = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div
        className="fixed inset-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in-0 zoom-in-95 duration-100">
        <Command className="w-full">
          <div className="flex items-center border-b border-border px-3">
            <Command.Input
              autoFocus
              placeholder="Type a command, page, or persona..."
              className="w-full h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2 text-sm divide-y divide-border">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              No matching commands found.
            </Command.Empty>

            {/* Navigation Group */}
            <Command.Group heading="Navigation" className="py-1 text-xs text-muted-foreground font-mono">
              <Command.Item
                onSelect={() => runAction(() => router.push("/"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <LayoutDashboard className="w-4 h-4 text-primary" />
                <span>Executive Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/ledger"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>Evidence Ledger</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/constellation"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <Network className="w-4 h-4 text-primary" />
                <span>Knowledge Constellation</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/brief"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <FileText className="w-4 h-4 text-primary" />
                <span>Handover Brief & 30-Day Plan</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/canary"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span>Leak Canary Security Matrix</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/audit"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <History className="w-4 h-4 text-primary" />
                <span>Cryptographic Audit Ledger</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => router.push("/capture"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Quick Ingest & Repository Sync</span>
              </Command.Item>
            </Command.Group>

            {/* Persona Switching */}
            <Command.Group heading="Simulate Persona" className="py-1 text-xs text-muted-foreground font-mono">
              <Command.Item
                onSelect={() => runAction(() => switchPersona("lead"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Switch to Dr. Meera (Project Lead)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => switchPersona("leaver"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <UserCheck className="w-4 h-4 text-amber-500" />
                <span>Switch to Rahul Mehta (Departing Owner)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => switchPersona("core"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Switch to Ananya Rao (Successor: Core Dev)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => switchPersona("coord"))}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <UserCheck className="w-4 h-4 text-purple-500" />
                <span>Switch to Kabir Shah (Operations Coordinator)</span>
              </Command.Item>
            </Command.Group>

            {/* Instant Actions */}
            <Command.Group heading="Actions & Exports" className="py-1 text-xs text-muted-foreground font-mono">
              <Command.Item
                onSelect={() =>
                  runAction(() => {
                    window.open("/api/export?format=agent", "_blank");
                  })
                }
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <Bot className="w-4 h-4 text-amber-500" />
                <span>Export Agent Context (HANDOVER.md)</span>
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runAction(() => {
                    window.open("/api/export?format=md", "_blank");
                  })
                }
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-foreground"
              >
                <Download className="w-4 h-4 text-foreground" />
                <span>Download Handover Brief (Markdown)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runAction(() => resetDemo())}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted text-rose-500"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Reset Demo Store to Initial State</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

