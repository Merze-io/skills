/** Single source of truth for skills.merze.ai URL paths (no trailing slash except `/`). */

export const SITE_ORIGIN = "https://skills.merze.ai";

export function skillPath(name: string): string {
  return `/skill/${name}`;
}

export function skillDocPath(name: string, doc: string): string {
  return `/skill/${name}/${doc}`;
}

export function rawUrl(name: string, filePath = "SKILL.md"): string {
  return `/skill/${name}/${filePath}`;
}

export function zipUrl(name: string): string {
  return `/skill/${name}.zip`;
}

export function tarUrl(name: string): string {
  return `/skill/${name}.tar.gz`;
}

export function skillJsonUrl(name: string): string {
  return `/skill/${name}.json`;
}

export function absolute(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_ORIGIN}${p}`;
}

export function discoveryIndexPath(): string {
  return "/.well-known/agent-skills/index.json";
}

export function scopedDiscoveryIndexPath(name: string): string {
  return `/skill/${name}/.well-known/agent-skills/index.json`;
}

export function allZipUrl(): string {
  return "/skills.zip";
}

export function allTarUrl(): string {
  return "/skills.tar.gz";
}
