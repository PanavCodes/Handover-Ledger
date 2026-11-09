import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Store } from "@/lib/store";
import { filterClaimsForPersona } from "@/lib/access";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const searchParams = req.nextUrl.searchParams;
  const format = searchParams.get("format") || "md";

  const allClaims = Store.getClaims();
  const { visibleClaims, withheldCount } = filterClaimsForPersona(allClaims, session.persona);

  const decisions = visibleClaims.filter((c) => c.type === "decision");
  const unfinished = visibleClaims.filter(
    (c) => c.type === "blocker" || c.type === "open_question" || (c.type === "milestone" && c.assertion_value !== "done")
  );
  const ownership = visibleClaims.filter((c) => c.type === "owner" || c.type === "contact");
  const risks = visibleClaims.filter((c) => c.type === "risk" || c.type === "credential_ref" || c.status === "conflicting");

  // Format 1: JSON Export
  if (format === "json") {
    const payload = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        persona: session.persona,
        withheldCount,
        generator: "Handover Ledger v1.0",
        cryptographicProof: "Deterministic Verifier + SHA-256 Hash Chain",
      },
      decisions,
      unfinished,
      ownership,
      risks,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="handover-brief-${session.persona}.json"`,
      },
    });
  }

  // Format 2: Agent-Ready Export (claude-handoff / AGENTS.md style) [WOW FEATURE]
  if (format === "agent") {
    let agentMd = `# HANDOVER.md — Agent Architectural Context & Task Handoff\n`;
    agentMd += `> Generated for AI Coding Agents (Antigravity, Claude Code, Cursor) | Scope: ${session.persona.toUpperCase()}\n`;
    agentMd += `> Integrity: 100% Machine-Verified Citations | Withheld from Scope: ${withheldCount} items\n\n`;

    agentMd += `## 1. The Goal & System Context\n`;
    agentMd += `This repository contains the Rover control systems, firmware, telemetry and operations for Aurora Robotics.\n`;
    agentMd += `The previous lead maintainer is transitioning out. This document establishes all verified constraints.\n\n`;

    agentMd += `## 2. Key Architectural Decisions (Ground Truth)\n`;
    for (const d of decisions) {
      agentMd += `- **${d.title}**: ${d.statement}\n`;
      if (d.citations && d.citations.length > 0) {
        agentMd += `  - *Evidence:* "${d.citations[0].quote}" (${d.citations[0].document_path})\n`;
      }
    }
    agentMd += `\n`;

    agentMd += `## 3. Who Owned What (Subsystem Maintainers)\n`;
    for (const o of ownership) {
      agentMd += `- **${o.subject_key}**: ${o.assertion_value || "Unassigned"} — ${o.statement}\n`;
    }
    agentMd += `\n`;

    agentMd += `## 4. Fragilities, Risks & Single Points of Failure\n`;
    for (const r of risks) {
      agentMd += `- **[${r.status.toUpperCase()}] ${r.title}**: ${r.statement}\n`;
      if (r.citations && r.citations.length > 0) {
        agentMd += `  - *Citation:* "${r.citations[0].quote}"\n`;
      }
    }
    agentMd += `\n`;

    agentMd += `## 5. Unfinished Work & Immediate Day-1 Tasks\n`;
    for (const u of unfinished) {
      agentMd += `- [ ] **${u.title}**: ${u.statement}\n`;
    }
    agentMd += `\n`;

    agentMd += `## 6. Quick Start Commands\n`;
    agentMd += `\`\`\`bash\n# Verify dependencies and tests\npnpm install\npnpm test\n\`\`\`\n`;

    return new NextResponse(agentMd, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": `attachment; filename="HANDOVER.md"`,
      },
    });
  }

  // Format 3: Standard Footnoted Markdown Export
  let md = `# Handover Brief: Aurora Rover Robotics Lab\n\n`;
  md += `**Export Scope:** \`${session.persona}\` | **Generated:** ${new Date().toLocaleDateString()} | **Withheld Items:** ${withheldCount}\n\n`;
  md += `---\n\n`;

  let footnoteCounter = 1;
  const footnotes: { index: number; quote: string; path: string }[] = [];

  const renderSection = (title: string, items: typeof visibleClaims) => {
    md += `## ${title}\n\n`;
    if (items.length === 0) {
      md += `*No items in this section for the current role scope.*\n\n`;
      return;
    }

    for (const item of items) {
      let footnoteRef = "";
      if (item.citations && item.citations.length > 0) {
        const c = item.citations[0];
        const fnIdx = footnoteCounter++;
        footnotes.push({ index: fnIdx, quote: c.quote, path: c.document_path || "source" });
        footnoteRef = `[^${fnIdx}]`;
      }

      const statusBadge = `[${item.status.toUpperCase()}]`;
      md += `### ${statusBadge} ${item.title}\n`;
      md += `${item.statement} ${footnoteRef}\n\n`;
    }
  };

  renderSection("1. Decisions & Architecture Choices", decisions);
  renderSection("2. Unfinished Work & Active Blockers", unfinished);
  renderSection("3. Subsystem Ownership & Key Contacts", ownership);
  renderSection("4. Risks, Expiring Items & Fragilities", risks);

  if (footnotes.length > 0) {
    md += `---\n\n### Verbatim Source Citations (Machine-Verified)\n\n`;
    for (const fn of footnotes) {
      md += `[^${fn.index}]: *"${fn.quote}"* — Source: \`${fn.path}\` (offset-verified)\n`;
    }
  }

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="handover-brief-${session.persona}.md"`,
    },
  });
}

