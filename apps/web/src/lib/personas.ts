export type PersonaRole = "lead" | "leaver" | "core" | "coord";

export interface PersonaProfile {
  id: string;
  role: PersonaRole;
  name: string;
  title: string;
  email: string;
  scope?: "core_dev" | "coordinator";
  badge: string;
  description: string;
}

export const DEMO_PERSONAS: Record<PersonaRole, PersonaProfile> = {
  lead: {
    id: "meera-lead-01",
    role: "lead",
    name: "Dr. Meera Iyer",
    title: "Project Lead & Faculty Advisor",
    email: "meera@aurora.example",
    badge: "Lead & Reviewer",
    description: "Reviews claims, approves handovers, resolves conflicts, and oversees security.",
  },
  leaver: {
    id: "rahul-leaver-02",
    role: "leaver",
    name: "Rahul Mehta",
    title: "Departing Project Owner (Firmware & Ops)",
    email: "rahul@aurora.example",
    badge: "Departing Member",
    description: "Captures knowledge, logs decisions, and attests to undocumented processes.",
  },
  core: {
    id: "ananya-core-03",
    role: "core",
    name: "Ananya Rao",
    title: "Successor (Core Dev)",
    email: "ananya@aurora.example",
    scope: "core_dev",
    badge: "Successor: Core Dev",
    description: "Receives technical brief, firmware notes, repo architecture, and Day-1 plan.",
  },
  coord: {
    id: "kabir-coord-04",
    role: "coord",
    name: "Kabir Shah",
    title: "Successor (Project Coordinator)",
    email: "kabir@aurora.example",
    scope: "coordinator",
    badge: "Successor: Coordinator",
    description: "Receives sponsor terms, vendor contacts, deadlines, and coordination roadmap.",
  },
};

export const DEFAULT_WORKSPACE_ID = "aurora-rover-workspace-demo-2025";
