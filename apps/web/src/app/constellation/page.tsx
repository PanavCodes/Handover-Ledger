"use client";

import React from "react";
import { ConstellationGraph } from "@/components/graph/ConstellationGraph";

export default function ConstellationPage() {
  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      <ConstellationGraph />
    </div>
  );
}
