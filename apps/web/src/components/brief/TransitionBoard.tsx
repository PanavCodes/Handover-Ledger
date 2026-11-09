"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Check, ChevronRight, Sparkles } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  phase: "w1" | "w2" | "w3" | "w4";
  claimRef?: string;
  done: boolean;
}

export function TransitionBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>([
    // Week 1
    {
      id: "t1",
      title: "Inspect low-level STM32 DFU flashing procedure",
      description: "Perform physical jumper pin configuration and run st-flash under Rahul's supervision.",
      phase: "w1",
      claimRef: "c-firmware-dfu",
      done: true,
    },
    {
      id: "t2",
      title: "Shadow nightly lab-vm backup validation",
      description: "Verify rsync log rotation and encrypted tarball destination paths.",
      phase: "w1",
      claimRef: "c-backup-cron",
      done: true,
    },
    {
      id: "t3",
      title: "Review CANbus baud rate configuration",
      description: "Inspect can0 bitrate setting in /etc/network/interfaces and resolve 115200 vs 57600 conflict.",
      phase: "w1",
      claimRef: "c-canbus-baud",
      done: false,
    },

    // Week 2
    {
      id: "t4",
      title: "Reverse-Shadow Rover Field Test Drive",
      description: "Ananya operates the ground station RF telemetry receiver while Rahul observes passively.",
      phase: "w2",
      claimRef: "c-rf-telemetry",
      done: false,
    },
    {
      id: "t5",
      title: "Simulate Telemetry Link Dropout Recovery",
      description: "Deliberately disconnect antenna to test automatic 500ms failsafe shutdown.",
      phase: "w2",
      claimRef: "c-failsafe-drop",
      done: false,
    },

    // Week 3
    {
      id: "t6",
      title: "Solo Execution: Deploy Patch to Motor Driver",
      description: "Draft, verify in SIL simulator, and flash new PWM ramp curves independently.",
      phase: "w3",
      claimRef: "c-motor-pwm",
      done: false,
    },
    {
      id: "t7",
      title: "Access Credentials & SSH Key Rotation",
      description: "Rotate lab-vm root SSH keys and issue Ananya primary deploy access.",
      phase: "w3",
      claimRef: "c-ssh-keys",
      done: false,
    },

    // Week 4
    {
      id: "t8",
      title: "Final Key Ceremony & Attestation Sign-Off",
      description: "Dr. Meera countersigns complete ownership transfer; Rahul Mehta transitions to alumni advisor.",
      phase: "w4",
      claimRef: "c-handover-complete",
      done: false,
    },
  ]);

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPct = Math.round((completedCount / tasks.length) * 100);

  const phases = [
    { id: "w1", title: "Week 1: Shadowing", desc: "Rahul demonstrates, Ananya observes" },
    { id: "w2", title: "Week 2: Reverse-Shadow", desc: "Ananya executes, Rahul observes" },
    { id: "w3", title: "Week 3: Supervised Solo", desc: "Independent execution with safety net" },
    { id: "w4", title: "Week 4: Full Ownership", desc: "Key ceremony & final handover" },
  ];

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-lg text-foreground">
              30-Day Role-Scoped Transition Board
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
              Interactive Plan
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            4-week phased transfer path moving from passive shadowing to full autonomous subsystem custody.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex-1 md:w-48 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Progress:</span>
              <span className="font-mono font-bold text-foreground">{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            {completedCount}/{tasks.length} Done
          </span>
        </div>
      </div>

      {/* 4 Phased Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {phases.map((phase) => {
          const phaseTasks = tasks.filter((t) => t.phase === phase.id);
          const phaseDone = phaseTasks.filter((t) => t.done).length;

          return (
            <div
              key={phase.id}
              className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between space-y-3 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                  <div>
                    <h4 className="font-serif font-bold text-sm text-foreground">
                      {phase.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">{phase.desc}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {phaseDone}/{phaseTasks.length}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {phaseTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => toggleTask(t.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition select-none ${
                        t.done
                          ? "bg-emerald-500/5 border-emerald-500/20 text-muted-foreground"
                          : "bg-muted/40 border-border hover:bg-muted/70 text-foreground"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition"
                        >
                          {t.done ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-medium leading-snug ${
                              t.done ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {t.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                          {t.claimRef && (
                            <span className="inline-block mt-1.5 text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border">
                              #{t.claimRef}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
