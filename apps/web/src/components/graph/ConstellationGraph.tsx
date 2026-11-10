"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  UserCheck,
  UserX,
  Radio,
  Cpu,
  BatteryCharging,
  Eye,
  Calendar,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { Claim } from "@/lib/types";

export function ConstellationGraph() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [rahulDeparted, setRahulDeparted] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [liveClaims, setLiveClaims] = useState<Claim[]>([]);

  const fetchClaims = useCallback(async () => {
    try {
      const res = await fetch("/api/claims");
      if (res.ok) {
        const data = await res.json();
        setLiveClaims(data.claims || []);
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchClaims();
    const refresh = () => fetchClaims();
    window.addEventListener("persona-changed", refresh);
    window.addEventListener("demo-reset", refresh);
    return () => {
      window.removeEventListener("persona-changed", refresh);
      window.removeEventListener("demo-reset", refresh);
    };
  }, [fetchClaims]);

  const dynamicGitOwners = useMemo(
    () => liveClaims.filter((c) => c.origin === "git_derived" && c.type === "owner"),
    [liveClaims]
  );

  // Define Nodes
  const initialNodes: Node[] = useMemo(() => {
    const baseNodes: Node[] = [
      // People Nodes
      {
        id: "p-rahul",
        position: { x: 50, y: 150 },
        data: {
          label: "Rahul Mehta (Leaver)",
          role: "Departing Owner",
          busFactorRisk: true,
          orphanTarget: "c-telemetry",
          icon: UserCheck,
        },
        style: {
          background: rahulDeparted ? "#27272a" : "#78350f",
          color: rahulDeparted ? "#71717a" : "#fef3c7",
          border: rahulDeparted ? "2px dashed #52525b" : "2px solid #f59e0b",
          borderRadius: "12px",
          padding: "12px",
          width: 200,
          opacity: rahulDeparted ? 0.6 : 1,
        },
      },
      {
        id: "p-ananya",
        position: { x: 50, y: 350 },
        data: {
          label: "Ananya Rao (Core Dev)",
          role: "Successor",
          icon: UserCheck,
        },
        style: {
          background: "#1e3a8a",
          color: "#dbeafe",
          border: "2px solid #3b82f6",
          borderRadius: "12px",
          padding: "12px",
          width: 200,
        },
      },
      {
        id: "p-meera",
        position: { x: 50, y: 20 },
        data: {
          label: "Dr. Meera Iyer (Lead)",
          role: "Advisor & Lead",
          icon: UserCheck,
        },
        style: {
          background: "#064e3b",
          color: "#d1fae5",
          border: "2px solid #10b981",
          borderRadius: "12px",
          padding: "12px",
          width: 200,
        },
      },
      {
        id: "p-kabir",
        position: { x: 50, y: 500 },
        data: {
          label: "Kabir Shah (Coord)",
          role: "Operations Coord",
          icon: UserCheck,
        },
        style: {
          background: "#581c87",
          color: "#f3e8ff",
          border: "2px solid #a855f7",
          borderRadius: "12px",
          padding: "12px",
          width: 200,
        },
      },

      // Subsystem / Component Nodes
      {
        id: "c-telemetry",
        position: { x: 420, y: 120 },
        data: {
          label: "Telemetry & RF Pipeline",
          subsystem: "Firmware & Comms",
          busFactor: rahulDeparted ? 0 : 1,
          orphaned: rahulDeparted,
          files: ["docs/architecture.md", "ops/crontab.txt"],
          icon: Radio,
        },
        style: {
          background: rahulDeparted ? "#7f1d1d" : "#18181b",
          color: rahulDeparted ? "#fecaca" : "#f4f4f5",
          border: rahulDeparted ? "3px solid #ef4444" : "2px solid #f59e0b",
          borderRadius: "14px",
          padding: "16px",
          width: 240,
          boxShadow: rahulDeparted ? "0 0 25px rgba(239, 68, 68, 0.6)" : "none",
        },
      },
      {
        id: "c-canbus",
        position: { x: 420, y: 280 },
        data: {
          label: "Motor Controller CANbus",
          subsystem: "Actuation & Power",
          busFactor: rahulDeparted ? 1 : 2,
          orphaned: false,
          files: ["firmware/can_config.h", "firmware/README.md"],
          icon: Cpu,
        },
        style: {
          background: "#18181b",
          color: "#f4f4f5",
          border: "2px solid #3b82f6",
          borderRadius: "14px",
          padding: "16px",
          width: 240,
        },
      },
      {
        id: "c-bms",
        position: { x: 420, y: 440 },
        data: {
          label: "Battery Management BMS",
          subsystem: "Power & Thermal",
          busFactor: 1,
          orphaned: false,
          files: ["power/bms_driver.cpp"],
          icon: BatteryCharging,
        },
        style: {
          background: "#18181b",
          color: "#f4f4f5",
          border: "2px solid #3b82f6",
          borderRadius: "14px",
          padding: "16px",
          width: 240,
        },
      },
      {
        id: "c-vision",
        position: { x: 740, y: 200 },
        data: {
          label: "Vision Nav & Obstacle Avoidance",
          subsystem: "Autonomous Navigation",
          busFactor: 2,
          orphaned: false,
          files: ["vision/depth_camera.py", "models/rover_yolo.onnx"],
          icon: Eye,
        },
        style: {
          background: "#18181b",
          color: "#f4f4f5",
          border: "2px solid #10b981",
          borderRadius: "14px",
          padding: "16px",
          width: 240,
        },
      },
      {
        id: "c-scheduler",
        position: { x: 740, y: 380 },
        data: {
          label: "Mission Scheduler & Vendors",
          subsystem: "Ground Control",
          busFactor: 2,
          orphaned: false,
          files: ["tasks/board-export.csv"],
          icon: Calendar,
        },
        style: {
          background: "#18181b",
          color: "#f4f4f5",
          border: "2px solid #a855f7",
          borderRadius: "14px",
          padding: "16px",
          width: 240,
        },
      },
    ];

    // Append up to 3 dynamically ingested GitHub subsystem nodes if synced
    dynamicGitOwners.slice(0, 3).forEach((dynClaim, idx) => {
      baseNodes.push({
        id: `c-dyn-${dynClaim.id}`,
        position: { x: 740, y: 20 + idx * 90 },
        data: {
          label: dynClaim.title,
          subsystem: `Git Synced (${dynClaim.subject_key})`,
          busFactor: 1,
          orphaned: false,
          files: dynClaim.citations?.map((c) => c.document_path || "git commit") || [],
        },
        style: {
          background: "#0f172a",
          color: "#e2e8f0",
          border: "2px solid #06b6d4",
          borderRadius: "12px",
          padding: "12px",
          width: 250,
        },
      });
    });

    return baseNodes;
  }, [rahulDeparted, dynamicGitOwners]);

  // Define Edges
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [
      {
        id: "e-rahul-telemetry",
        source: "p-rahul",
        target: "c-telemetry",
        animated: !rahulDeparted,
        style: {
          stroke: rahulDeparted ? "#ef4444" : "#f59e0b",
          strokeWidth: rahulDeparted ? 1 : 3,
          strokeDasharray: rahulDeparted ? "5 5" : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-rahul-canbus",
        source: "p-rahul",
        target: "c-canbus",
        style: {
          stroke: rahulDeparted ? "#71717a" : "#f59e0b",
          strokeWidth: 2,
          strokeDasharray: rahulDeparted ? "4 4" : undefined,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-ananya-canbus",
        source: "p-ananya",
        target: "c-canbus",
        style: { stroke: "#3b82f6", strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-ananya-bms",
        source: "p-ananya",
        target: "c-bms",
        animated: true,
        style: { stroke: "#3b82f6", strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-telemetry-scheduler",
        source: "c-telemetry",
        target: "c-scheduler",
        style: { stroke: "#52525b", strokeWidth: 1.5 },
      },
      {
        id: "e-canbus-vision",
        source: "c-canbus",
        target: "c-vision",
        style: { stroke: "#52525b", strokeWidth: 1.5 },
      },
      {
        id: "e-kabir-scheduler",
        source: "p-kabir",
        target: "c-scheduler",
        style: { stroke: "#a855f7", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-meera-vision",
        source: "p-meera",
        target: "c-vision",
        style: { stroke: "#10b981", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ];

    dynamicGitOwners.slice(0, 3).forEach((dynClaim) => {
      edges.push({
        id: `e-dyn-${dynClaim.id}`,
        source: "p-meera",
        target: `c-dyn-${dynClaim.id}`,
        animated: true,
        style: { stroke: "#06b6d4", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    return edges;
  }, [rahulDeparted, dynamicGitOwners]);

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Knowledge Constellation &amp; Bus-Factor Analyzer
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
              {liveClaims.length} Live Ledger Claims
            </span>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Git-derived subsystem map plus live synced GitHub ownership nodes detecting maintainer silos and orphaned components before departure.
          </p>
        </div>

        {/* Departure Simulator Button */}
        <button
          onClick={() => setRahulDeparted(!rahulDeparted)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition shadow border ${
            rahulDeparted
              ? "bg-rose-600 text-white border-rose-700 hover:bg-rose-700 animate-pulse"
              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25"
          }`}
        >
          {rahulDeparted ? (
            <>
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>Simulating Departure: Rahul Gone (Orphans Triggered)</span>
            </>
          ) : (
            <>
              <UserX className="w-4 h-4" />
              <span>Simulate Rahul&apos;s Departure (Check Bus-Factor = 0)</span>
            </>
          )}
        </button>
      </div>

      {/* Orphan Alert Banner when Rahul Departs (placed outside canvas so zero nodes are obscured) */}
      {rahulDeparted && (
        <div className="p-4 rounded-2xl bg-rose-950/95 border border-rose-500/50 shadow-lg text-rose-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in-0 duration-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-300 font-bold uppercase font-mono tracking-wider">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              CRITICAL: Bus Factor = 0 Detected!
            </div>
            <p className="leading-relaxed">
              <strong>Telemetry &amp; RF Pipeline</strong> is completely orphaned. Rahul Mehta was the sole maintainer.
            </p>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 bg-rose-900/60 rounded-xl border border-rose-500/40 font-mono text-[11px] shrink-0">
            <span>Assign custody to Ananya Rao</span>
            <Link href="/brief" className="text-amber-300 hover:underline inline-flex items-center gap-1 font-semibold">
              Open Brief <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="relative w-full h-[600px] rounded-2xl border border-border bg-card/40 overflow-hidden shadow-inner">
        <ReactFlow
          nodes={initialNodes}
          edges={initialEdges}
          onNodeClick={(_, node) => setSelectedNode(node)}
          fitView
          colorMode={isLight ? "light" : "dark"}
          attributionPosition="bottom-right"
        >
          <Background color="#71717a" gap={20} size={1} />
          <Controls />
          <MiniMap
            bgColor={isLight ? "#f4f4f5" : "#09090b"}
            maskColor={isLight ? "rgba(244, 244, 245, 0.72)" : "rgba(9, 9, 11, 0.72)"}
            nodeStrokeColor={(n) => (n.id.startsWith("p-") ? "#3b82f6" : "#f59e0b")}
            nodeColor={(n) => (n.id === "c-telemetry" && rahulDeparted ? "#ef4444" : isLight ? "#cbd5e1" : "#27272a")}
            nodeBorderRadius={6}
            style={{
              backgroundColor: isLight ? "#f4f4f5" : "#09090b",
              border: isLight ? "1px solid #d4d4d8" : "1px solid #27272a",
              borderRadius: "10px",
            }}
          />
        </ReactFlow>

        {/* Selected Node Inspector Drawer */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 max-w-sm w-full p-4 rounded-xl bg-card/95 border border-border backdrop-blur shadow-xl text-xs space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">
                  {selectedNode.data.subsystem ? "Subsystem Node" : "Team Member"}
                </span>
                <h4 className="font-serif font-bold text-sm text-foreground">
                  {selectedNode.data.label}
                </h4>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            {selectedNode.data.busFactor !== undefined && (
              <div className="flex items-center justify-between p-2 rounded bg-muted/50 border border-border">
                <span className="text-muted-foreground">Bus Factor Score:</span>
                <span
                  className={`font-mono font-bold ${
                    selectedNode.data.busFactor === 0
                      ? "text-rose-500"
                      : selectedNode.data.busFactor === 1
                        ? "text-amber-500"
                        : "text-emerald-500"
                  }`}
                >
                  {selectedNode.data.busFactor} maintainer(s)
                </span>
              </div>
            )}

            {selectedNode.data.files && selectedNode.data.files.length > 0 && (
              <div className="space-y-1">
                <span className="text-muted-foreground font-mono text-[10px] block">
                  Associated Code Assets:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-foreground">
                  {selectedNode.data.files.map((f: string, i: number) => (
                    <li key={i} className="p-1.5 rounded bg-muted/40 border border-border truncate">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href="/ledger"
              className="inline-flex items-center gap-1 text-primary hover:underline font-semibold pt-1"
            >
              <span>Inspect Subsystem Claims in Ledger</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
