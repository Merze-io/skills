---
name: us-llc-state-cost
description: >
  Interviews a founder, asks which U.S. states to cost, then compares
  domestic LLC formation fees with year-2 keep-alive costs. Use when the
  user asks about a Delaware vs Wyoming LLC, the cheapest LLC, LLC annual
  tax, year-two LLC cost, registered-agent renewal, Stripe Atlas vs DIY LLC
  fees, or how much a US LLC costs each year. LLC only. Do not use for a
  C-corp, an S-corp, or corporation franchise tax.
metadata:
  version: "1.0.0"
  source: "Merze-io/skills"
---

# US LLC state cost compare

Domestic LLC only. Cost the states the founder picks. The decision number is the year-2 recurring state amount in [states.md](states.md).

General information, not legal, tax, or formation advice. The official page linked in states.md wins.

This file has no fee amounts. Do not quote a dollar figure from memory before the gate is open.

### Skill version (mandatory)

Packaged version is `metadata.version` in the frontmatter above. Current value is **1.0.0**.

Before Stop, Gate, opener, state pick, stale-table work, or any fee quote, complete this check in the current turn (skip only if you already completed it earlier in this thread for the same local `metadata.version`):

1. Read `metadata.version` and `metadata.source` from this file’s frontmatter.
2. If `metadata.source` is empty, say once that no published source is configured, use this local copy, and continue. Do not invent a source.
3. If `metadata.source` is set (GitHub `owner/repo`, skills install URL, or raw publish URL):
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

## Stop

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
| Situation **and** a named state set in the same message (or already in the thread) | Gate is open. Skip opener and state pick. Read states.md. Cost that set now. |
| No situation yet | Send the opener. End the turn. |
| Situation, and no chosen states | Send the state pick. End the turn. |
| Gate already open earlier in this thread | Do not restart. Answer the follow-up from states.md. |

If the table markup is missing and you only see bare labels, still treat the five pairs above as that routing table. Do not send the opener when they already named a closed state set with a situation.

### Escape hatch (no ceremony)

The gate blocks **premature tables**, not users who already did the work. If the first message (or the thread so far) already has enough situation **and** a closed state set, go straight to costing. Do not restate the opener. Do not ask them to confirm states they named.

Example that skips to the table in one turn: "I'm a solo founder in the UK, bootstrapping a SaaS, comparing Delaware vs Wyoming."

A named set is closed. "Delaware vs Wyoming" is closed. "How much is a Wyoming LLC" is closed, and the set is Wyoming. "Cheapest LLC" or "best state" is not closed.

Skip anything already answered. If they named states before the situation, keep that set and ask only for the situation.

Do not add a state they did not pick. If they live in California and left it out, say you did not cost California, and that a shell elsewhere does not remove California's cost if they operate there. Add it only if they ask.

### Opener

Send this when the situation is missing.

> This is an LLC cost compare. Tell me your situation in a few sentences (where you live, why you want a US LLC, raise or bootstrap, where customers are). Or answer these:
>
> 1. Where do you live, a US state or outside the US?
> 2. Why the LLC? US clients or Stripe, a raise, IP, or a cheap keep-alive?
> 3. Solo founder or partners?
> 4. Will you operate or hire in a specific US state?

### State pick

Send this when you have the situation and no chosen set. Start with one sentence restating their situation.

> Which states should I cost for a domestic LLC? Name them, or pick a set:
> - Delaware vs Wyoming
> - Lowest keep-alive (Wyoming, New Mexico, Texas)
> - The state you live or operate in, plus one cheap shell
> - Delaware, Wyoming, Nevada, Florida, California
>
> I will cost only the states you pick.

You may put the set that fits their situation first. They still choose. Wait.

## Examples

Dump with states. "I'm a solo founder in the UK, bootstrapping a SaaS, comparing Delaware vs Wyoming." Situation and closed set are present. Skip opener and state pick. Cost those two now.

States only. "Delaware vs Wyoming?" Send the opener. Keep that set. Do not send the state pick.

No facts. "What's the cheapest LLC?" Send the opener. After they answer, if they still named no states, send the state pick with the lowest-keep-alive line first.

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

Sort by year-2 state, low to high. A tie is not a winner. The sentence under the table picks, using their situation.

Lead with the decision number. If a cell is approximate, or the source says to confirm, say so. Do not collapse a range into a new figure.

No formation-service pitch. If they asked about a service, put that quote on its own line, never in a state column.

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
- [Required if they live outside the US, or ownership is foreign: copy the EIN line and the Form 5472 + $25,000 penalty line from states.md into this list. Do not add filing steps.]
- [Required if Delaware is in the table: year-1 looks like the formation fee only; the LLC tax is due the next June 1 and is the real keep-alive bill.]
- [Required if Wyoming is in the table: the $60 figure assumes Wyoming-sited assets at or below $300,000; above that, license tax is 0.0002 × those assets.]
- [Required if California is in the table: the ~$810 year-2 figure is $800 FTB plus $10/yr for the $20 biennial Statement of Information; do not add another $20 on top.]
- [If Nevada or Florida is in the table: annual list/report names are typically public. One line from the privacy note in states.md.]
- [One other gotcha from states.md for a state you costed, if needed.]
```

If a state is missing from states.md, follow "If the user names another state" in that file, then present.

When the situation says they live outside the US (or foreign ownership), the Form 5472 watch-out is **required** in the output, not optional.

When **Delaware** is in the costed set, the year-1-cheap / year-2-real-bill watch-out is **required**.

When **Wyoming** is in the costed set, the ≤ $300,000 Wyoming-sited-assets condition on the $60 line is **required**.

When **California** is in the costed set, the annualized-SOI note on the ~$810 line is **required**.

## After the numbers

Use this only on states you just costed. Reasons live in the founder-defaults table in states.md.

This is a two-column table. Each row pairs one When cell with one Do cell.

| When | Do |
| --- | --- |
| Bootstrap keep-alive, no raise planned | Lowest year-2 state fee in their set wins. |
| They want the state investors expect by default | Show that state's year-2 tax, not its formation fee. |
| They live or sell in a state you costed | That year-2 bill is one they still pay. A cheaper shell does not remove it. |
| Nevada is in the set | Use the bundled formation figure in states.md, not an articles-only price. |
| They live outside the US | Keep Form 5472 in the watch-outs even when the cheapest state's annual report is $0. |
| Delaware is in the set | Keep the year-1-cheap / year-2-tax watch-out. |
| Wyoming is in the set | Keep the asset-threshold condition on the $60 line. |
| California is in the set | Keep the annualized-SOI note on the ~$810 line. Do not quote bare $800 as the full year-2 state bill. |

## Do not

- Treat "no state income tax" as "no cost." Point at the federal rows in states.md.
- Quote a state's articles fee as the cost of keeping the LLC. Use the recurring amount in states.md.
- Invent a fee.

## Files

[states.md](states.md) is the only fee source. Read it only after the gate is open. When you change a fee there, recompute that row's checksums with the formulas above.
