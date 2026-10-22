/**
 * Single source of install snippets for /install, /install.md, skills.json,
 * skill-page tabs (redesign), and CI snippet replay.
 */
import type { AgentInstall, InstallMethod } from "../data/agents";
import { SITE_ORIGIN, absolute, tarUrl, zipUrl, rawUrl } from "./routes";

export type InstallSnippet = {
  method: InstallMethod;
  label: string;
  code: string;
  lang: "bash" | "powershell" | "text" | "markdown";
};

/** Canonical one-skill install (table §5.1 #9 / skills.json install.npx). */
export function installCommand(name: string): string {
  return `npx skills add ${SITE_ORIGIN} --skill ${name}`;
}

export function installCommandScoped(name: string): string {
  return `npx skills add ${SITE_ORIGIN}/skill/${name}`;
}

/** Install every skill from the catalog (`--all` = --skill '*' --agent '*' -y). */
export function installCommandAll(): string {
  return `npx skills add ${SITE_ORIGIN} --all`;
}

export function curlTarSnippet(
  name: string,
  destDir = `~/.agents/skills/${name}`,
): string {
  return `mkdir -p ${destDir} && curl -fsSL ${SITE_ORIGIN}${tarUrl(name)} | tar -xz -C ${destDir}`;
}

export function powershellZipSnippet(
  name: string,
  destDir = `$HOME\\.agents\\skills\\${name}`,
): string {
  return `$d="${destDir}"; $z="$env:TEMP\\${name}.zip"; New-Item -ItemType Directory -Force $d | Out-Null; Invoke-WebRequest ${SITE_ORIGIN}${zipUrl(name)} -OutFile $z -UseBasicParsing; Expand-Archive $z -DestinationPath $d -Force; Remove-Item $z`;
}

/** Flat catalog zip → wrapped zip for Claude.ai / ChatGPT upload. */
export function wrappedZipBuildSnippet(name: string): string {
  return [
    `name=${name}`,
    `tmpdir=$(mktemp -d)`,
    `mkdir -p "$tmpdir/$name"`,
    `curl -fsSL ${SITE_ORIGIN}${tarUrl(name)} | tar -xz -C "$tmpdir/$name"`,
    `(cd "$tmpdir" && zip -r "$PWD/${name}-upload.zip" "$name")`,
    `echo "Upload: $tmpdir/${name}-upload.zip"`,
  ].join("\n");
}

export function copySkillMdSnippet(name: string): string {
  return `curl -fsSLo SKILL.md ${SITE_ORIGIN}${rawUrl(name, "SKILL.md")}`;
}

export function skillsJsonInstallBlock(name: string): {
  npx: string;
  npx_scoped: string;
  curl: string;
  powershell: string;
} {
  return {
    npx: installCommand(name),
    npx_scoped: installCommandScoped(name),
    curl: curlTarSnippet(name),
    powershell: powershellZipSnippet(name),
  };
}

function userCurlDest(agent: AgentInstall, name: string): string {
  const user = agent.paths.find((p) => p.scope === "user");
  if (!user) return `~/.agents/skills/${name}`;
  return user.path.replace(/\/$/, "").replace("<name>", name);
}

function userPowershellDest(agent: AgentInstall, name: string): string {
  const dest = userCurlDest(agent, name);
  // PowerShell prefers $HOME\… ; keep forward slashes only for ~ expansion style
  if (dest.startsWith("~/")) {
    return `$HOME\\${dest.slice(2).replace(/\//g, "\\")}`;
  }
  return dest.replace(/\//g, "\\");
}

/**
 * Snippets for one skill + one agent. Used by /install HTML, /install.md,
 * and (later) skill-page tabs so every surface stays identical.
 */
export function installSnippets(
  skill: { name: string },
  agent: AgentInstall,
): InstallSnippet[] {
  const { name } = skill;
  const out: InstallSnippet[] = [];

  for (const method of agent.methods) {
    if (method === "npx") {
      const agentFlag = agent.cliAgent ? ` -a ${agent.cliAgent}` : "";
      out.push({
        method: "npx",
        label: "npx skills",
        code: `${installCommand(name)}${agentFlag}`,
        lang: "bash",
      });
      continue;
    }
    if (method === "curl") {
      out.push({
        method: "curl",
        label: "curl + tar",
        code: curlTarSnippet(name, userCurlDest(agent, name)),
        lang: "bash",
      });
      continue;
    }
    if (method === "powershell") {
      out.push({
        method: "powershell",
        label: "PowerShell",
        code: powershellZipSnippet(name, userPowershellDest(agent, name)),
        lang: "powershell",
      });
      continue;
    }
    if (method === "zip-upload") {
      out.push({
        method: "zip-upload",
        label: "Wrapped zip for upload",
        code: wrappedZipBuildSnippet(name),
        lang: "bash",
      });
      out.push({
        method: "zip-upload",
        label: "Flat catalog zip (CLI layout)",
        code: absolute(zipUrl(name)),
        lang: "text",
      });
      continue;
    }
    if (method === "copy-text") {
      out.push({
        method: "copy-text",
        label: "Download SKILL.md",
        code: copySkillMdSnippet(name),
        lang: "bash",
      });
      continue;
    }
    if (method === "openapi") {
      out.push({
        method: "openapi",
        label: "OpenAPI (coming later)",
        code: `${SITE_ORIGIN}/openapi.json`,
        lang: "text",
      });
    }
  }

  return out;
}

/** Markdown body for /install.md (llmstxt companion). */
export function buildInstallMarkdown(
  skillNames: string[],
  agents: AgentInstall[],
): string {
  const primary = skillNames[0] ?? "<name>";
  const lines: string[] = [
    "# Install Merze skills",
    "",
    `> Install from ${SITE_ORIGIN} with the skills CLI, curl/tar, PowerShell, or a zip upload. No Git host required.`,
    "",
    "## Quick start",
    "",
    "```bash",
    installCommand(primary),
    "```",
    "",
    "Every skill:",
    "",
    "```bash",
    installCommandAll(),
    "```",
    "",
    "Scoped URL (needs the per-skill discovery index):",
    "",
    "```bash",
    installCommandScoped(primary),
    "```",
    "",
  ];

  for (const agent of agents) {
    lines.push(`## ${agent.label}`, "");
    if (agent.notes) {
      lines.push(agent.notes, "");
    }
    if (agent.paths.length > 0) {
      lines.push("Paths:", "");
      for (const p of agent.paths) {
        lines.push(`- (${p.scope}) \`${p.path}\``);
      }
      lines.push("");
    }
    if (agent.docsUrl) {
      lines.push(`Docs: ${agent.docsUrl}`, "");
    }
    lines.push(`Verified: ${agent.verified}`, "");
    const snippets = installSnippets({ name: primary }, agent);
    for (const s of snippets) {
      lines.push(`### ${s.label}`, "");
      const fence = s.lang === "powershell" ? "powershell" : s.lang === "text" ? "" : "bash";
      if (s.lang === "text") {
        lines.push(s.code, "");
      } else {
        lines.push(`\`\`\`${fence}`, s.code, "```", "");
      }
    }
  }

  lines.push(
    "## Machine-readable",
    "",
    `- [skills.json](${SITE_ORIGIN}/skills.json)`,
    `- [Discovery index](${SITE_ORIGIN}/.well-known/agent-skills/index.json)`,
    `- [HTML install guide](${SITE_ORIGIN}/install)`,
    "",
  );

  return lines.join("\n");
}
