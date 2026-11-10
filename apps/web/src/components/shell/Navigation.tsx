"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Network,
  FileText,
  UploadCloud,
  MessageSquareMore,
  ShieldCheck,
  History,
  Users,
} from "lucide-react";

export function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/capture", label: "Ingest", icon: UploadCloud },
    { href: "/interview", label: "Exit Interview", icon: MessageSquareMore },
    { href: "/ledger", label: "Evidence Ledger", icon: Layers },
    { href: "/brief", label: "Handover Brief", icon: FileText },
    { href: "/constellation", label: "Constellation", icon: Network },
    { href: "/canary", label: "Leak Canary", icon: ShieldCheck },
    { href: "/audit", label: "Audit Chain", icon: History },
    { href: "/demo", label: "Personas", icon: Users },
  ];

  return (
    <nav className="border-b border-border bg-card/60 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-none gap-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
