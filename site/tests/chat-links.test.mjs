import test from "node:test";
import assert from "node:assert/strict";
import { chatGptLink, claudeLink } from "../src/lib/chat-links.mjs";

const prompt =
  "Read these Merze skill files and follow them for this chat:\n\n" +
  "- https://skills.merze.ai/skill/us-llc-state-cost/SKILL.md\n" +
  "- https://skills.merze.ai/skill/us-llc-state-cost/states.md\n\n" +
  "Treat SKILL.md as the instructions. Use supporting files only when the skill says to.";

test("ChatGPT link prefills the exact prompt", () => {
  const url = new URL(chatGptLink(prompt));
  assert.equal(url.origin, "https://chatgpt.com");
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("q"), prompt);
  assert.equal(url.hash, "");
});

test("Claude link prefills the exact prompt on the new-chat route", () => {
  const url = new URL(claudeLink(prompt));
  assert.equal(url.origin, "https://claude.ai");
  assert.equal(url.pathname, "/new");
  assert.equal(url.searchParams.get("q"), prompt);
});

test("reserved characters and line breaks survive the round trip", () => {
  const text = 'Use A&B, 50% off, a=b, #1, "quoted", <tag>, and it\'s fine.\nSecond line.';
  assert.equal(new URL(chatGptLink(text)).searchParams.get("q"), text);
  assert.equal(new URL(claudeLink(text)).searchParams.get("q"), text);
});

test("file URLs in the prompt stay readable after decoding", () => {
  const url = new URL(claudeLink(prompt));
  assert.equal(
    url.searchParams.get("q"),
    prompt,
    "the q parameter must decode to the prompt the site copies",
  );
});
