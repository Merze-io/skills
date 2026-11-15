/**
 * Prefilled chat links for a skill prompt.
 *
 * Both providers accept a prompt in the `q` query parameter. The message opens
 * in the composer; the visitor still presses Send. No public link can send a
 * message or attach a file, so the prompt points at the published skill files.
 *
 * Pure module (no Astro imports) so node:test can import it directly.
 */
const CHATGPT_URL = "https://chatgpt.com/";
const CLAUDE_URL = "https://claude.ai/new";

export function chatGptLink(prompt) {
  return `${CHATGPT_URL}?q=${encodeURIComponent(prompt)}`;
}

export function claudeLink(prompt) {
  return `${CLAUDE_URL}?q=${encodeURIComponent(prompt)}`;
}
