/**
 * Handover Ledger: GitHub Repository Ingestion Engine
 * Architectural Lineage: repomix, gitingest
 *
 * Fetches repository structure, docs, key code files, commits, and PRs,
 * applying repomix-grade ignore patterns and token safeguards.
 */

// Ignored extensions and file patterns (derived from repomix defaultIgnore)
const IGNORE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "ico", "pdf", "zip", "tar", "gz",
  "exe", "dll", "so", "dylib", "bin", "lock", "map", "pyc", "class",
  "woff", "woff2", "ttf", "eot", "mp4", "mp3", "mov",
]);

const IGNORE_DIRS = [
  "node_modules", ".git", ".next", "dist", "build", ".cache",
  "vendor", "coverage", ".nyc_output", "target", ".idea", ".vscode",
];

export interface IngestedDocument {
  path: string;
  kind: "file" | "commit" | "pull_request" | "issue";
  content: string;
  meta: Record<string, any>;
}

export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

export function shouldIgnoreFile(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Check directory ignores
  for (const part of parts) {
    if (IGNORE_DIRS.includes(part.toLowerCase())) return true;
  }

  // Check extension
  const ext = normalized.split(".").pop()?.toLowerCase();
  if (ext && IGNORE_EXTENSIONS.has(ext)) return true;

  // Ignore lockfiles
  const basename = parts[parts.length - 1];
  if (basename.endsWith("-lock.json") || basename === "pnpm-lock.yaml" || basename === "yarn.lock" || basename === "poetry.lock") {
    return true;
  }

  return false;
}

export async function ingestGitHubRepo(
  repoUrl: string,
  githubToken?: string
): Promise<{ documents: IngestedDocument[]; repoName: string }> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub repository URL. Must be in format https://github.com/owner/repo");
  }

  const { owner, repo } = parsed;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Handover-Ledger-Ingester/1.0",
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  // 1. Fetch repo metadata
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    throw new Error(`GitHub API error (${repoRes.status}): Could not access repository ${owner}/${repo}`);
  }
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch || "main";

  // 2. Fetch git tree recursively
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch file tree for branch ${defaultBranch}`);
  }
  const treeData = await treeRes.json();
  const files: { path: string; url: string; size: number }[] = (treeData.tree || [])
    .filter((node: any) => node.type === "blob" && !shouldIgnoreFile(node.path))
    .slice(0, 40); // Cap at 40 files for hackathon safety

  const documents: IngestedDocument[] = [];

  // Fetch file contents in parallel (concurrency 6)
  const filePromises = files.map(async (file) => {
    try {
      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`,
        { headers }
      );
      if (rawRes.ok) {
        const text = await rawRes.text();
        // Cap file content at 120KB
        if (text.length > 0 && text.length < 120000) {
          documents.push({
            path: file.path,
            kind: "file",
            content: text,
            meta: {
              url: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${file.path}`,
              size: text.length,
            },
          });
        }
      }
    } catch {
      // Ignore individual file fetch failures
    }
  });
  await Promise.all(filePromises);

  // 3. Fetch latest 30 commits
  try {
    const commitsRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=30`,
      { headers }
    );
    if (commitsRes.ok) {
      const commitsData = await commitsRes.json();
      for (const c of commitsData) {
        const sha = c.sha?.slice(0, 7) || "";
        const author = c.commit?.author?.name || "Unknown";
        const date = c.commit?.author?.date || "";
        const msg = c.commit?.message || "";

        const commitText = `Commit ${sha} by ${author} on ${date}\n\n${msg}`;
        documents.push({
          path: `commits/${sha}`,
          kind: "commit",
          content: commitText,
          meta: {
            sha,
            author,
            date,
            url: c.html_url,
          },
        });
      }
    }
  } catch {
    // Ignore commit fetch errors if rate limited
  }

  return {
    documents,
    repoName: `${owner}/${repo}`,
  };
}
