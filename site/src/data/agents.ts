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
  cliAgent?: string;
  paths: { scope: "user" | "project"; path: string }[];
  methods: InstallMethod[];
  notes?: string;
  /** Omitted for github-copilot — never link github.com from the site. */
  docsUrl?: string;
  verified: string;
}

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
      "Named for the coding agent only. This site does not link out to that vendor's documentation. For project installs, use npx skills add … -a github-copilot.",
    // docsUrl intentionally omitted — never link github.com from the site
    verified: "2026-10-22",
  },
  {
    id: "claude-ai",
    label: "Claude.ai",
    paths: [],
    methods: ["zip-upload"],
    notes:
      "Upload under Customize → Skills (enable code execution and file creation under Settings → Capabilities). The upload ZIP must have a top-level folder named like the skill that contains SKILL.md (not SKILL.md at the archive root). Catalog per-skill zips stay flat for the skills CLI — re-wrap with the snippet below before uploading.",
    docsUrl: "https://support.claude.com/en/articles/12512198-how-to-create-custom-skills",
    verified: "2026-10-22",
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    paths: [],
    methods: ["copy-text"],
    notes:
      "On Business, Enterprise, Edu, and Healthcare plans, ChatGPT can upload a skill zip under Plugins → Skills → Create → Upload from your computer. On other plans, paste SKILL.md into a custom GPT’s Instructions or Knowledge. GPT Actions / OpenAPI come later.",
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
