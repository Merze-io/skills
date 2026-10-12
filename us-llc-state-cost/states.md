# State LLC fee table

Domestic LLC fees. Do not use this table for a C-corp or an S-corp.

**As of October 2026.** Domestic single-member LLC, standard online or mail filing, no expedite, no extra certified copies.

Formation and Recurring state are the inputs. The 2-year and 5-year columns are checksums computed from [SKILL.md](SKILL.md), not independent estimates. When you change an input or the first-year timing, recompute both checksums before saving. Do not keep a hand-stacked total that the formula does not produce. Registered agent is not in any column.

Verify before anyone files. If a number disagrees with the official page, the official page wins. Update this table and the as-of date.

This is a seven-column table. Each row is one state.

| State | Formation (state) | Recurring state (year 2+) | First-year recurring due? | 2-year checksum | 5-year checksum | Official source |
| --- | --- | --- | --- | --- | --- | --- |
| **Wyoming** | $100 Articles of Organization | $60 annual report license tax (or 0.0002 × WY-sited assets if greater) | Anniversary month of formation (**often year 1**). Default checksums use year-1 = $160. If the first report falls in year 2, year-1 = $100 and use the alternate checksums. | **$220** (or $160 if first report is year 2) | **$400** (or $340 if first report is year 2) | [WY fee schedule (PDF)](https://sos.wyo.gov/Business/docs/BusinessFees.pdf) · [Annual report](https://wyobiz.wyo.gov/Business/AnnualReport.aspx) |
| **Delaware** | $110 Certificate of Formation (includes municipality fee) | $400 annual LLC/LP/GP tax; **no** annual report | Tax is for the calendar year, due **June 1 of the next year**. Form in 2026 and the $400 is due 1 Jun 2027 | $510 | $1,710 | [DE LLC tax instructions](https://corp.delaware.gov/alt-entitytaxinstructions/) · [Fee schedule](https://corpfiles.delaware.gov/Fee_Schedule/AugustFee2026.pdf) |
| **New Mexico** | $50 Articles (NMSA 1978 § 53-19-63) | **None** (no routine annual report) | No | $50 | $50 | Fee: [NMSA § 53-19-63](https://nmonesource.com/nmos/nmsa/en/item/4399/index.do#!b/53-19-63) · File: [NM SOS Business Services](https://www.sos.nm.gov/business-services/) |
| **Texas** | $300 Certificate of Formation (Form 205) | $0 tax under the no-tax-due threshold; **Public Information Report (PIR) or Ownership Information Report still due May 15**. For **2026** reports the threshold is **$2,650,000** annualized total revenue ([Comptroller](https://comptroller.texas.gov/taxes/franchise/forms/2026-franchise.php)). It is adjusted by statute; do not invent a different number. | PIR/OIR filing required even at $0 tax | $300 | $300 (if still no-tax-due) | [Texas Comptroller franchise tax](https://comptroller.texas.gov/taxes/franchise/) · [2026 forms](https://comptroller.texas.gov/taxes/franchise/forms/2026-franchise.php) |
| **Florida** | $125 ($100 filing + $25 RA designation fee) | $138.75 annual report by **May 1** ($538.75 if late). Report lists managers/members (public). | Next May 1 after formation. Checksums treat that bill as year-2 cash, so year-1 is $125. | $263.75 | $680.00 | [FL Division of Corporations fees](https://dos.fl.gov/sunbiz/forms/fees) |
| **Nevada** | **~$425** ($75 Articles + $150 initial list + $200 state business license). Do not quote $75 alone. | **~$350/yr** (annual list + business license renewal), due last day of anniversary month. Annual list names managers/members (public). | Initial list + license are paid **at formation**, so do not add ~$350 again in year 1 | ~$775 | ~$1,825 | [NV SOS forms & fees](https://www.nvsos.gov/businesses/commercial-recordings/forms-fees/all-business-forms) |
| **California** | $70 Articles | **~$810/yr** ($800 LLC franchise tax + **$10/yr** for the $20 Statement of Information every 2 years, annualized) | First franchise tax often due by the 15th day of the 4th month after formation (verify FTB). Initial SOI is usually due within 90 days of formation. Both sit inside the ~$810 recurring input for checksums. | ~$1,690 | ~$4,120 | [CA SOS statements](https://www.sos.ca.gov/business-programs/business-entities/statements) · FTB LLC tax |

Registered agent if they have no quote: **$100/yr**, labeled an estimate. Typical quotes are about $50 to $150/yr. A year-1 "free" agent usually renews higher. Omit the agent when they have an office in that state.

## How to read year-1 vs year-2

Checksums use `two_year = year1 + year2` and `five_year = year1 + (4 × year2)`. Year-1 includes recurring only when the timing column says it is due in the formation year. The decision number is the Recurring state cell.

**Delaware.** Formation cash is $110. The $400 tax is not prorated. An LLC active any day in calendar year 2026 owes $400 by 1 June 2027. That $400 is year-2 cash. The late penalty is $200 plus 1.5% per month on tax and penalty. Checksums: $110 + $400 = $510, and $110 + 4×$400 = $1,710.

**Wyoming.** $100 in. $60/yr if Wyoming-sited assets are at or below $300,000. The decision number is $60 unless their assets trip the 0.0002 branch. Online annual report adds a card fee (about 2.4%, minimum $1). That card fee is not in the checksums. Due the first day of the anniversary month. Default (often year 1): year-1 = $160, two-year = $220, five-year = $400. Alternate (first report in year 2): year-1 = $100, two-year = $160, five-year = $340. Both ends are formula results, not a fuzzy band.

**Nevada.** Do not quote the $75 articles line. Year-1 state cash is about $425, which already includes the initial list and the state business license. Year-2 is about $350. Checksums: about $775, and about $1,825 ($425 + 4×$350). A retired 5-year figure of about $2,175 counted a fifth $350.

**California.** The $70 filing is not the cost of a California LLC. The recurring cell is about **$810** ($800 FTB + $10/yr for the $20 biennial Statement of Information). Do not keep SOI outside the formula. Year-1 state cash is about $880 ($70 + ~$810). Checksums: about $1,690, and about $4,120 ($880 + 4×$810). Retired figures of about $1,670 and about $4,070 used $800 only and were $20 / $40 light on SOI. A retired ~$4,110 counted two discrete $20 filings by hand instead of annualizing.

**Texas.** High formation. For 2026 reports, no franchise tax if annualized total revenue ≤ **$2,650,000**, but a **PIR or OIR is still due May 15**. Missing that filing still draws penalties. Quote the linked Comptroller page if the as-of date is stale.

**Florida.** Checksums assume one $138.75 report inside two years, and four reports inside five years: $125 + $138.75 = $263.75, and $125 + 4×$138.75 = $680. That treats the first May 1 bill as year-2 cash. Do not also add $138.75 to year 1 unless the current Sunbiz rule says this LLC owes the report in the formation year. The cell lists $538.75 if late. Add that figure on top of $138.75 only if the current fee page shows the penalty that way. Annual reports list managers/members publicly.

**New Mexico.** Cheapest 5-year state cash in this table. $50 formation by statute (NMSA § 53-19-63), no routine annual report. Re-verify the fee on the statute link and file through NM SOS Business Services. Slower SOS, less used as a SaaS or investor default. An out-of-state owner still needs a registered agent.

## Privacy on annual lists (not a fee)

When costing **Nevada** or **Florida**, note that the annual list/report typically publishes **manager or member names** (and often addresses) on the public SOS record. Wyoming and Delaware do not use that same public annual-list pattern for a plain domestic LLC. This is a privacy tradeoff, not a dollar line.

## Always add (not state fees)

Do not add these into Year-2 state.

This is a three-column table. Each row is one non-state item.

| Item | Typical | Notes |
| --- | --- | --- |
| Registered agent | $50 to $150/yr, else $100 | Required without an in-state office. |
| Federal EIN | $0 (IRS) | Non-US persons without SSN/ITIN generally cannot use the online EIN tool. SS-4 by fax or mail takes weeks, not days. |
| Form 5472 + pro forma 1120 | Federal, not state | Typical for a **foreign-owned** single-member US LLC. The penalty for a missing 5472 starts at $25,000. Put it on the calendar even when the state annual report is $0. |
| Foreign qualification | The other state's foreign-LLC fee, plus another registered agent | Operating in a state other than the formation state does not skip that state's cost. |

## Founder defaults (cost only)

Cost heuristics for states in this table. Not legal advice. Apply only to states the founder picked.

This is a three-column table. Each row is one founder-default pairing.

| Goal | Cost-shaped default | Why |
| --- | --- | --- |
| Lowest keep-alive, online, no US office | Wyoming | Published stack is $100, then $60/yr at ordinary asset levels |
| Absolute lowest 5-year state cash | New Mexico | $50 formation, no annual report |
| Investor or "Delaware company" default | Delaware | Budget the $400/yr tax, not the $110 filing |
| Already live and selling in one US state | That state | A second agent plus foreign qualification comes later |

## If the user names another state

1. Open that state's Secretary of State fee page, not a formation-service landing page.
2. Record formation, annual report, franchise or license tax, due date, and late penalty.
3. Add a row in the same shape as the table. Fill both checksums from the SKILL.md formulas.
4. Mark the retrieval date.

Do not copy an affiliate formation price into the state column.
