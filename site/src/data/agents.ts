/**
 * Per-agent install metadata for /install, /install.md, and skill tabs.
 * Paths and docs were checked against vendor docs; bump `verified` when re-checked.
 */

export type AgentId =
  | "claude-code"
  | "claude-ai"
  | "cursor"
  | "codex"
  | "chatgpt"
  | "gemini-cli"
  | "github-copilot"
  | "generic";

export type InstallMethod =
  | "npx"
  | "curl"
  | "powershell"
  | "zip-upload"
  | "copy-text"
  | "openapi";

export interface AgentInstall {
  id: AgentId;
  label: string;
  /** Value for `npx skills add -a` when the CLI knows this agent. */
  cliAgent?: string;
  paths: { scope: "user" | "project"; path: string }[];
  methods: InstallMethod[];
  /** Plain text only — no URLs (links go in docsUrl). */
  notes?: string;
  /** Omitted for github-copilot so the site never links to github.com. */
  docsUrl?: string;
  /** ISO date (YYYY-MM-DD) paths/docs were last checked. */
  verified: string;
}

/**
 * Display order for /install (and redesign tabs):
 * npx-first agents, then chat upload, then generic.
 */
export const AGENTS: AgentInstall[] = [
  {
    id: "claude-code",
    label: "Claude Code",
    cliAgent: "claude-code",
    paths: [
      { scope: "user", path: "~/.claude/skills/<name>/" },
      { scope: "project", path: ".claude/skills/<name>/" },
    ],
    methods: ["npx", "curl", "powershell"],
    notes:
      "Personal installs land under ~/.claude/skills. Project installs use .claude/skills in the repo.",
    docsUrl: "https://code.claude.com/docs/en/skills",
    verified: "2026-10-22",
  },
  {
    id: "cursor",
    label: "Cursor",
    cliAgent: "cursor",
    paths: [
      { scope: "user", path: "~/.agents/skills/<name>/" },
      { scope: "user", path: "~/.cursor/skills/<name>/" },
      { scope: "project", path: ".agents/skills/<name>/" },
      { scope: "project", path: ".cursor/skills/<name>/" },
    ],
    methods: ["npx", "curl", "powershell"],
    notes:
      "Cursor also reads .claude/skills and .codex/skills. Prefer npx skills add -a cursor.",
    docsUrl: "https://cursor.com/docs/context/skills",
    verified: "2026-10-22",
  },
  {
    id: "codex",
    label: "OpenAI Codex",
    cliAgent: "codex",
    paths: [
      { scope: "user", path: "~/.agents/skills/<name>/" },
      { scope: "project", path: ".agents/skills/<name>/" },
    ],
    methods: ["npx", "curl", "powershell"],
    docsUrl: "https://developers.openai.com/codex/skills",
    verified: "2026-10-22",
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    cliAgent: "gemini-cli",
    paths: [
      { scope: "user", path: "~/.gemini/skills/<name>/" },
      { scope: "user", path: "~/.agents/skills/<name>/" },
      { scope: "project", path: ".gemini/skills/<name>/" },
      { scope: "project", path: ".agents/skills/<name>/" },
    ],
    methods: ["npx", "curl", "powershell"],
    docsUrl: "https://geminicli.com/docs/cli/skills/",
    verified: "2026-10-22",
  },
  {
    id: "github-copilot",
    label: "GitHub Copilot",
    cliAgent: "github-copilot",
    paths: [
      { scope: "user", path: "~/.copilot/skills/<name>/" },
      { scope: "user", path: "~/.agents/skills/<name>/" },
      { scope: "project", path: ".claude/skills/<name>/" },
      { scope: "project", path: ".agents/skills/<name>/" },
    ],
    methods: ["npx", "curl", "powershell"],
    notes:
      "Named for the coding agent only. This site does not link out to that vendor's documentation. Extra project paths that embed a disallowed host name are omitted here; use npx skills add -a github-copilot so the CLI places files correctly.",
    // docsUrl intentionally omitted — never link github.com from the site
    verified: "2026-10-22",
  },
  {
    id: "claude-ai",
    label: "Claude.ai",
    paths: [],
    methods: ["zip-upload"],
    notes:
      "Upload under Customize → Skills. Claude.ai requires a ZIP whose top level is a folder named like the skill (skill-name/SKILL.md). The catalog /skill/<name>.zip is flat (SKILL.md at archive root) for the skills CLI — re-wrap before upload, or build a wrapped zip with the snippet below.",
    docsUrl: "https://support.claude.com/en/articles/12512180-use-skills-in-claude",
    verified: "2026-10-22",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    paths: [],
    methods: ["zip-upload", "copy-text"],
    notes:
      "Desktop app: Plugins → Skills → Create → Upload from your computer (paid plans with Skills enabled; Free/Go typically cannot upload). You can also paste SKILL.md into custom GPT Instructions or Knowledge. GPT Actions / OpenAPI come later.",
    docsUrl: "https://help.openai.com/en/articles/20001066-skills-in-chatgpt",
    verified: "2026-10-22",
  },
  {
    id: "generic",
    label: "Any agent",
    paths: [
      {
        scope: "user",
        path: "~/.agents/skills/<name>/",
      },
    ],
    methods: ["npx", "curl", "copy-text"],
    notes:
      "Shared ~/.agents/skills works for many agents. Or curl the tar.gz into whichever folder your agent reads, or fetch SKILL.md / skills.json / the discovery index directly.",
    docsUrl: "https://agentskills.io/specification",
    verified: "2026-10-22",
  },
];

export function agentById(id: AgentId): AgentInstall {
  const agent = AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`Unknown agent id: ${id}`);
  return agent;
}
