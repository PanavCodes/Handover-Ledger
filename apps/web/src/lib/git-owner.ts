/**
 * Handover Ledger: Deterministic Git Ownership & Bus-Factor Analyzer
 * Architectural Lineage: truckfactor, git-tribe, aserg-ufmg/truck-factor
 *
 * Analyzes git commit logs to deterministically extract component ownership,
 * calculate knowledge concentration, and flag bus-factor risks with 0 LLM cost.
 */

export interface CommitEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

export interface FileOwnership {
  path: string;
  component: string;
  primaryOwner: string;
  ownershipRatio: number;
  totalCommits: number;
  contributors: Record<string, number>;
  isBusFactorRisk: boolean;
}

export interface GitDerivedClaimsResult {
  fileOwnerships: FileOwnership[];
  ownerClaims: {
    type: "owner";
    title: string;
    statement: string;
    subject_key: string;
    assertion_value: string;
    status: "verified";
    basis: "explicit";
    confidence: number;
    quote: string;
  }[];
  busFactorRisks: {
    type: "risk";
    title: string;
    statement: string;
    subject_key: string;
    status: "verified";
    basis: "explicit";
    confidence: number;
    quote: string;
  }[];
}

/**
 * Parses raw `git log --name-only --pretty=format:'COMMIT:%H|%an|%ad|%s'` text.
 */
export function parseGitLog(rawLog: string): CommitEntry[] {
  const commits: CommitEntry[] = [];
  const lines = rawLog.split(/\r?\n/);
  let currentCommit: CommitEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("COMMIT:")) {
      if (currentCommit) {
        commits.push(currentCommit);
      }
      const parts = trimmed.substring(7).split("|");
      currentCommit = {
        hash: parts[0] || "",
        author: parts[1] || "Unknown",
        date: parts[2] || "",
        message: parts[3] || "",
        files: [],
      };
    } else if (currentCommit && !trimmed.startsWith("commit ")) {
      currentCommit.files.push(trimmed);
    }
  }

  if (currentCommit) {
    commits.push(currentCommit);
  }

  return commits;
}

/**
 * Maps a file path to its architectural component subsystem.
 */
function getComponentFromPath(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (parts.length > 1) {
    return parts[0]; // e.g. "firmware", "ops", "telemetry", "docs"
  }
  return "root";
}

/**
 * Computes component ownership and bus-factor risks from commit entries.
 */
export function analyzeGitOwnership(commits: CommitEntry[]): GitDerivedClaimsResult {
  const fileStats: Record<
    string,
    {
      component: string;
      contributors: Record<string, number>;
      totalCommits: number;
      latestCommitHash: string;
      latestCommitMsg: string;
      latestAuthor: string;
    }
  > = {};

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileStats[file]) {
        fileStats[file] = {
          component: getComponentFromPath(file),
          contributors: {},
          totalCommits: 0,
          latestCommitHash: commit.hash,
          latestCommitMsg: commit.message,
          latestAuthor: commit.author,
        };
      }

      fileStats[file].totalCommits++;
      fileStats[file].contributors[commit.author] =
        (fileStats[file].contributors[commit.author] || 0) + 1;
    }
  }

  const fileOwnerships: FileOwnership[] = [];
  const ownerClaims: GitDerivedClaimsResult["ownerClaims"] = [];
  const busFactorRisks: GitDerivedClaimsResult["busFactorRisks"] = [];

  // Group by component
  const componentStats: Record<
    string,
    {
      authors: Record<string, number>;
      totalCommits: number;
      files: string[];
      sampleHash: string;
      sampleMsg: string;
    }
  > = {};

  for (const [file, stats] of Object.entries(fileStats)) {
    // Find primary owner for file
    let primaryOwner = "Unknown";
    let maxCommits = 0;

    for (const [author, count] of Object.entries(stats.contributors)) {
      if (count > maxCommits) {
        maxCommits = count;
        primaryOwner = author;
      }
    }

    const ownershipRatio = stats.totalCommits > 0 ? maxCommits / stats.totalCommits : 0;
    const isBusFactorRisk = ownershipRatio >= 0.7 && stats.totalCommits >= 3;

    fileOwnerships.push({
      path: file,
      component: stats.component,
      primaryOwner,
      ownershipRatio: Math.round(ownershipRatio * 100) / 100,
      totalCommits: stats.totalCommits,
      contributors: stats.contributors,
      isBusFactorRisk,
    });

    // Accumulate component stats
    if (!componentStats[stats.component]) {
      componentStats[stats.component] = {
        authors: {},
        totalCommits: 0,
        files: [],
        sampleHash: stats.latestCommitHash,
        sampleMsg: stats.latestCommitMsg,
      };
    }
    componentStats[stats.component].totalCommits += stats.totalCommits;
    componentStats[stats.component].files.push(file);
    for (const [author, count] of Object.entries(stats.contributors)) {
      componentStats[stats.component].authors[author] =
        (componentStats[stats.component].authors[author] || 0) + count;
    }
  }

  // Synthesize claims per component
  for (const [comp, cStats] of Object.entries(componentStats)) {
    let topAuthor = "Unknown";
    let topCount = 0;

    for (const [author, count] of Object.entries(cStats.authors)) {
      if (count > topCount) {
        topCount = count;
        topAuthor = author;
      }
    }

    const compRatio = cStats.totalCommits > 0 ? topCount / cStats.totalCommits : 0;
    const formattedRatio = Math.round(compRatio * 100);

    // Citation quote from git commit log
    const citationQuote = `Commit ${cStats.sampleHash.slice(0, 7)}: ${cStats.sampleMsg} (Author: ${topAuthor})`;

    // Owner claim
    ownerClaims.push({
      type: "owner",
      title: `${comp.toUpperCase()} Subsystem Maintainer: ${topAuthor}`,
      statement: `${topAuthor} authored ${formattedRatio}% of commits (${topCount}/${cStats.totalCommits}) in the '${comp}' subsystem.`,
      subject_key: `component:${comp}`,
      assertion_value: topAuthor,
      status: "verified",
      basis: "explicit",
      confidence: 0.95,
      quote: citationQuote,
    });

    // Bus factor risk claim if ratio >= 70%
    if (compRatio >= 0.7 && cStats.totalCommits >= 3) {
      busFactorRisks.push({
        type: "risk",
        title: `Bus-Factor Vulnerability: ${comp} (${topAuthor})`,
        statement: `Severe knowledge silo in '${comp}'. ${topAuthor} maintains ${formattedRatio}% of historical commits with zero active co-maintainers.`,
        subject_key: `component:${comp}`,
        status: "verified",
        basis: "explicit",
        confidence: 0.92,
        quote: citationQuote,
      });
    }
  }

  return {
    fileOwnerships,
    ownerClaims,
    busFactorRisks,
  };
}
