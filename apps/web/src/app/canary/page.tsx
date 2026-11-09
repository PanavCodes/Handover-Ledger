"use client";

import React from "react";
import { LeakCanaryGrid } from "@/components/canary/LeakCanaryGrid";

export default function CanaryPage() {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      <LeakCanaryGrid />
    </div>
  );
}

