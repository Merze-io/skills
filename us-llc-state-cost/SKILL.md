---
name: us-llc-state-cost
title: US LLC Incorporation State Comparison
description: >
  Interviews a founder, then compares domestic LLC formation fees and year-2
  keep-alive costs for any U.S. states they name (two or more), or suggests a
  short state set from their business use case when they ask what to compare.
  Use when the user asks where to form an LLC, any state vs any state (Florida
  vs Texas, Wyoming vs New Mexico, Delaware vs California, and so on), the
  cheapest LLC, LLC annual report cost, LLC annual tax, year-two LLC cost,
  registered-agent renewal, Stripe Atlas vs DIY LLC fees, or how much a US LLC
  costs each year. LLC only. Do not use for a C-corp, an S-corp, or corporation
  franchise tax.
metadata:
  version: "1.2.0"
  source: "Merze-io/skills"
---

# US LLC Incorporation State Comparison

Domestic LLC only. Compare **any U.S. state vs any other** the founder names (two or more is normal; one state is fine when they only ask about that state). If they ask you to suggest what to compare, pick a short set from their situation using the founder-defaults table in [states.md](states.md). The decision number is the year-2 recurring state amount in [states.md](states.md).

General information, not legal, tax, or formation advice. The official page linked in states.md wins.

This file has no fee amounts. Do not quote a dollar figure from memory before the gate is open.

## Progress

- [ ] ⚠️ Version check (`metadata.version` / `metadata.source`)
- [ ] ⛔ Entity is LLC (else Stop)
- [ ] Gate: situation + closed state set, or Suggest set from use case
- [ ] Stale-table check vs states.md “As of”
- [ ] Cost from states.md only; fill Output template
- [ ] Required watch-outs for every applicable state / foreign-ownership case in the set
- [ ] Before you send checklist

## ⛔ Skill version

Packaged version is `metadata.version` in the frontmatter above. Current value is **1.2.0**.

Do not open the gate, run stale-table work, or quote a fee until this check finishes in the current turn (skip only if you already completed it earlier in this thread for the same local `metadata.version`):

1. Read `metadata.version` and `metadata.source` from this file’s frontmatter.
2. If `metadata.source` is empty, say once that no published source is configured, use this local copy, and continue. Do not invent a source.
3. If `metadata.source` is set (`owner/repo`, skills install URL, or raw publish URL):
   - Prefer `npx skills update us-llc-state-cost -y -p` for a project install, or `-y -g` for a global install.
   - If the skill is not in the skills lock, fetch the published `SKILL.md` from that source and compare semver in `metadata.version`.
4. If the published version is **greater** than the local version, pull/install it, **re-read** the updated `SKILL.md` and [states.md](states.md), and continue only from those files. Discard older instructions still in context.
5. If the check fails (offline, 404, CLI error), tell the user, state the local version you are using, then continue with this copy.

When you change fees, formulas, or gate behavior in this package, bump `metadata.version` (semver) in the same edit. Fill `metadata.source` when this skill is published so installs can pull updates.

### Stale fee table

If today's date is more than **6 months after** the "As of" date in [states.md](states.md):

1. Tell the user the packaged table may be stale.
2. For **each state you are about to cost**, open the official source URL(s) in that row (SOS / Comptroller / statute). Do not use affiliate or formation-service pages.
3. Re-read formation fee, recurring fee, due date, and late penalty from those pages. Use the verified figures in this turn's output. Label them **verified [today's date]** next to the as-of line.
4. If a page is unreachable or unclear, say so and fall back to the states.md figure with a "could not re-verify" note. Do not invent a fee.
5. Do **not** rewrite [states.md](states.md) unless the user asks you to persist the update. Session answers use verified numbers; the file stays until they say to save.

When the table is fresh (within 6 months), still prefer the packaged numbers. Re-fetch only if they ask to verify, or a cell already says to confirm.

## ⛔ Stop

If they want a corporation, a C-corp, or an S-corp, send this and end.

> This compare covers a domestic LLC only. A C-corp or S-corp uses a different fee schedule. I will not apply these LLC figures to a corporation.

Delaware LLC tax and Delaware corporation franchise tax are different schedules. Do not describe the corporation schedule.

An LLC that mentions an S election is still an LLC for this table. Say the election is outside this skill, then continue if they still want state fees.

If they mention Stripe Atlas and you cannot tell LLC from C-corp, ask which entity they mean. Do not cost until they say LLC.

## Gate

Do not read [states.md](states.md), quote a dollar amount, or name a winner until the gate is open.

This is a two-column routing table. Each row pairs one You-have cell with one You-do cell. Match from the top. First fit wins.

| You have | You do |
| --- | --- |
| Corporation, C-corp, or S-corp | Send the stop line. End. |
| Situation **and** a named state set in the same message (or already in the thread) | Gate is open. Skip opener and state pick. Read states.md. Cost that set now. Any U.S. states they named are valid, including ones not yet in the packaged table. |
| Situation **and** they ask you to suggest / recommend / pick states for them | Gate is open. Skip the waiting state-pick turn. Run **Suggest set**, then cost that set in the same turn. |
| No situation yet | Send the opener. End the turn. |
| Situation, and no chosen states, and they did not ask for a suggestion | Send the state pick. End the turn. |
| Gate already open earlier in this thread | Do not restart. Answer the follow-up from states.md. |

If the table markup is missing and you only see bare labels, still treat the pairs above as that routing table. Do not send the opener when they already named a closed state set with a situation.

### Escape hatch (no ceremony)

The gate blocks **premature tables**, not users who already did the work. If the first message (or the thread so far) already has enough situation **and** a closed state set, go straight to costing. Do not restate the opener. Do not ask them to confirm states they named.

Example that skips to the table in one turn: "I'm a solo founder in Texas selling online, comparing Texas vs Wyoming."

A named set is closed. "Florida vs Texas" is closed. "Delaware vs Wyoming" is closed. "How much is a Wyoming LLC" is closed, and the set is Wyoming. "Cheapest LLC", "best state", or "where should I form" without naming states is **not** closed unless they also asked you to suggest — then use **Suggest set**.

Skip anything already answered. If they named states before the situation, keep that set and ask only for the situation.

Do not add a home or operating state they left out unless they asked for a suggestion that includes it, or they later ask to add it. If they live in California and left it out of a named set, say you did not cost California, and that a shell elsewhere does not remove California's cost if they operate there.

### Opener

Send this when the situation is missing.

> This is an LLC cost compare for any U.S. states you want. Tell me your situation in a few sentences (where you live, why you want a US LLC, raise or bootstrap, where customers are). Name two or more states to compare, or ask me to suggest a set from your use case. Or answer these:
>
> 1. Where do you live, a US state or outside the US?
> 2. Why the LLC? US clients or Stripe, a raise, IP, or a cheap keep-alive?
> 3. Solo founder or partners?
> 4. Will you operate or hire in a specific US state?

### State pick

Send this when you have the situation, they have not named states, and they have not asked you to suggest. Start with one sentence restating their situation.

> Which U.S. states should I cost? Name any two or more (for example Florida vs Texas, or Wyoming vs New Mexico), or say **suggest for me** and I will pick a short set from your use case.
>
> Common starting sets if you want a preset:
> - Lowest keep-alive shells (Wyoming, New Mexico, Texas)
> - The state you live or operate in, plus one cheap shell
> - Investor-default vs cheap shell (Delaware vs Wyoming)
> - Broader scan (Delaware, Wyoming, Nevada, Florida, California)
>
> I will cost only the states in the set we use.

Put the preset that best matches their situation first. They still choose, or they can say suggest for me. Wait.

### Suggest set

Use when the gate row says to suggest. Read the founder-defaults table in [states.md](states.md). Build a **closed set of two states** (three only if their situation clearly needs a third, such as home state + two shells).

1. One sentence: what you will compare and why, tied to their use case.
2. Treat that set as the named set for this turn. Cost it now.
3. End with one line: they can name any other U.S. states for a different compare.

Do not invent fees while choosing the set. Do not cost every state in the packaged table. Do not wait for a second confirmation after you stated the set.

## Examples

Named pair. "I'm a solo founder in the UK, bootstrapping a SaaS, comparing Florida vs Texas." Situation and closed set are present. Cost those two now.

Any packaged or unpackaged states. "Compare Nevada and New Mexico for a bootstrapped LLC." Cost that pair. If a state is missing from states.md, follow "If the user names another state" there first.

Suggest for me. "I live in California, sell SaaS nationwide, bootstrapping — suggest which states to compare." Situation present, suggestion requested. Run Suggest set (likely California + one cheap shell from founder-defaults). Cost that set in the same turn.

States only. "Wyoming vs New Mexico?" Send the opener. Keep that set. Do not send the state pick.

No facts. "What's the cheapest LLC?" Send the opener. After they answer, if they still named no states and did not ask for a suggestion, send the state pick with the lowest-keep-alive line first. If they say suggest for me, run Suggest set and cost.

Corporation. "Delaware C-corp franchise tax." Send the stop line. End.

## Buckets

This is a three-column table. Each row is one cost bucket.

| Bucket | What it is | Paid to |
| --- | --- | --- |
| Formation | Articles or certificate. Some states bundle the first list and license into this check. | Secretary of State |
| Year-2 state | Annual report, franchise or LLC tax, or state business license. This is the decision number. | State |
| Registered agent | Private yearly fee when they have no office in that state. | The agent |
| Outside this compare | EIN, Form 5472, bookkeeping, bank, payments, foreign qualification. | IRS or another state |

A free first-year registered agent is a vendor price. Keep it out of the state columns.

## Formulas

Read amounts only from states.md. Formation and recurring state are the inputs. The checksum columns in states.md must equal these formulas for the timing branch in that row. If your arithmetic and a packaged checksum disagree, trust the formulas, show both, and treat the packaged cell as stale. That path is a backstop for drift, not the normal read.

```
year1_state = formation + first_year_recurring_if_due
year2_state = recurring_state
year2_with_ra = year2_state + RA
two_year = year1_state + year2_state
five_year = year1_state + (4 * year2_state)
```

`year2_state` is the decision number. Use the base recurring amount. Apply a higher branch only when states.md states a condition and their situation meets it.

When states.md annualizes a biennial fee into the recurring cell (California’s $20 Statement of Information as $10/yr inside ~$810), use that cell as-is. Do not add the biennial fee again outside the formula, and do not invent a third input column.

`five_year` is formation-year state cash plus four later years of `year2_state`. Do not add a fifth recurring bill on top of a year 1 that already includes the first one.

Follow the "First-year recurring due?" column. When that bill is due the next year, year 1 is formation only.

Registered agent comes from their quote. If they have none, use the placeholder in states.md and label it an estimate. If they have an office in that state, omit the agent and say so. State columns never include it. `year2_with_ra` is the only combined figure.

## Output

Sort by year-2 state, low to high. A tie is not a winner. The sentence under the table picks, using their situation and the pick heuristics in **After the numbers**.

Lead with the decision number. If a cell is approximate, or the source says to confirm, say so. Do not collapse a range into a new figure.

No formation-service pitch. If they asked about a service, put that quote on its own line, never in a state column.

If a state is missing from states.md, follow "If the user names another state" in that file, then present.

### Required watch-outs

Include each line that applies in **Not in the state number**. This is the only place these rules live — do not restate them elsewhere.

| When | Required line |
| --- | --- |
| They live outside the US, or ownership is foreign | Copy the EIN line and the Form 5472 + $25,000 penalty line from states.md. Do not add filing steps. |
| Delaware is in the costed set | Year-1 looks like the formation fee only; the LLC tax is due the next June 1 and is the real keep-alive bill. |
| Wyoming is in the costed set | The $60 figure assumes Wyoming-sited assets at or below $300,000; above that, license tax is 0.0002 × those assets. |
| California is in the costed set | The ~$810 year-2 figure is $800 FTB plus $10/yr for the $20 biennial Statement of Information; do not add another $20 on top. Do not quote bare $800 as the full year-2 state bill. |
| Nevada or Florida is in the costed set | Annual list/report names are typically public. One line from the privacy note in states.md. |

```markdown
## LLC keep-alive

General information, not legal or tax advice. Domestic LLC. [Solo or partners, as they said.] Assumes the LLC is formed in each costed state (formation-state comparison, not foreign qualification). Registered agent [their quote, the states.md placeholder, or omitted].
Figures as of [date in states.md]. [Verified YYYY-MM-DD against official links — only when you re-fetched under the stale-table protocol, or when they asked to verify. Omit this sentence when you used the packaged table as-is.]

**Decision number.** Year-2 state keep-alive is [State] at [year2_state].
Year-2 cash with the registered agent is [year2_with_ra].

| State | Year-2 state | Year-2 with RA | Year-1 state | 2-year state | 5-year state | When year-2 hits |
|---|---:|---:|---:|---:|---:|---|
| … | | | | | | |

[One sentence. Which picked state wins for this founder, and which fact in their situation drives it.]

### Not in the state number
- The registered agent is private and yearly when they have no office in the state.
- [Every Required watch-outs row that applies.]
- [One other gotcha from states.md for a state you costed, if needed.]
```

## After the numbers

Use only for the pick sentence under the table, and only on states you just costed. Reasons live in the founder-defaults table in states.md. Watch-outs stay in **Required watch-outs** above — do not duplicate them here.

| When | Do |
| --- | --- |
| Bootstrap keep-alive, no raise planned | Lowest year-2 state fee in their set wins. |
| They want the state investors expect by default | Show that state's year-2 tax, not its formation fee. |
| They live or sell in a state you costed | That year-2 bill is one they still pay. A cheaper shell does not remove it. |
| Nevada is in the set | Use the bundled formation figure in states.md, not an articles-only price. |

## Do not

- Treat "no state income tax" as "no cost." Point at the federal rows in states.md.
- Quote a state's articles fee as the cost of keeping the LLC. Use the recurring amount in states.md.
- Invent a fee.
- Expand a named set with states they did not pick or ask you to suggest.

## Before you send

- [ ] Every dollar came from states.md (or a labeled re-verify), not memory
- [ ] Decision number is year-2 state, not formation
- [ ] No state added outside the named or suggested set
- [ ] Every applicable Required watch-outs row is in the output
- [ ] Pick sentence matches After the numbers / founder-defaults, not a formation-fee winner

## Files

[states.md](states.md) is the only fee source. Read it only after the gate is open. When you change a fee there, recompute that row's checksums with the formulas above.
