# Space Ex-Boyfriend battle simulator — proposal

Prepared September 22, 2026. Status: proposal, before implementation or simulation results.

## 1. Intended result

Build a reproducible battle simulator that estimates the probability that Omori, Kel, Aubrey, and Hero defeat Captain Spaceboy in his first, prologue encounter as **Space Ex-Boyfriend**. Compare four decision policies: suboptimal, decent, optimal (best found), and custom.

The main result should answer: **Given this exact party, equipment, skill loadout, inventory, and model of player decisions, how often does the party win?** Every percentage must retain those conditions. A second experiment varies preparation to show how much levels and supplies matter independently of decisions.

The workspace currently contains no application files. This proposal establishes the model and implementation plan; it does not claim measured win rates.

## 2. Research baseline

### Encounter and character statistics

Use the first encounter, with these neutral boss stats: 1,350 Heart, 750 Juice, 15 Attack, 16 Defense, 25 Speed, and 10 Luck. Its scripted anger stages begin at 75%, 50%, and 25% Heart. The source separately lists Boss Rush statistics, which must not enter this encounter. [Boss reference](https://omori.wiki/Space_Ex-Boyfriend).

Use level 10 as the proposed reference scenario, with levels 7–12 as the initial sensitivity range. This is an experimental baseline, not a claim that every player reaches this boss at level 10. Individual character levels remain configurable.

| Character, level 10 | Heart | Juice | Attack | Defense | Speed | Luck |
|---|---:|---:|---:|---:|---:|---:|
| Omori | 81 | 53 | 17 | 15 | 20 | 5 |
| Kel | 71 | 65 | 14 | 11 | 25 | 7 |
| Aubrey | 93 | 31 | 20 | 12 | 12 | 3 |
| Hero | 84 | 53 | 11 | 17 | 9 | 5 |

These are raw values before equipment and optional bonuses. Sources: [Omori and Hero level tables](https://omori.fandom.com/wiki/STATS), [Kel](https://omori.wiki/Kel), [Aubrey](https://omori.wiki/Aubrey). Import discrete level rows; do not interpolate stat growth. Track base, equipment, permanent bonus, and temporary modifiers separately.

For a reproducible starting-equipment comparison, use Shiny Knife (+5 Attack), Stuffed Toy (+4), Rubber Ball (+3), and Spatula (+4), respectively, with no charms. These weapons each contribute 100 Hit. The resulting neutral Attack values are 22, 24, 17, and 15 for Omori, Aubrey, Kel, and Hero. [Weapon statistics](https://omori.wiki/Weapons).

A second equipment preset will represent ordinary exploration upgrades, but every upgrade and charm must have a verified pre-boss acquisition route before inclusion. Unique equipment cannot be duplicated. Starting equipment is a conservative reproducible reference, not an assertion about typical exploration.

### Available skills and proposed loadouts

At level 10, the initial fixed comparison would use:

| Character | Four equipped skills | Purpose |
|---|---|---|
| Omori | Sad Poem, Stab, Mock, Hack Away | Emotion control, focused damage, attack reduction, burst |
| Kel | Annoy, Rebound, Run ’n Gun, Curveball | Emotion control and alternative damage options |
| Aubrey | Pep Talk, Guard, Counter, Twirl | Happiness setup, protection, retaliation, damage |
| Hero | Cook, Guard, Massage, Smile | Healing, protection, emotion removal, attack reduction |

These are proposed legal level-10 loadouts, not optimized recommendations. Skill unlocks must update with level. Headbutt and Flex are separate optional-unlock flags; enabling one requires choosing which equipped skill it replaces. The baseline excludes both so sidequest assumptions remain explicit. Aubrey’s optional permanent Juice bonus also gets its own flag.

Relevant documented unlocks include Mock at level 7 and Hack Away at 10; Run ’n Gun at 9; Twirl at 10; and Smile at 10. Headbutt comes from Berly and Flex from Pluto. [Omori skills](https://omori.wiki/Omori), [Kel skills](https://omori.wiki/Kel), [Aubrey skills](https://omori.wiki/Aubrey), [Hero skills](https://omori.wiki/Hero).

The first comparison keeps the same four equipped skills for all policies. A separate preparation experiment allows choosing a loadout before battle from the same unlocked pool. This avoids attributing an equipment or skill advantage to better in-battle decisions.

## 3. Supplies at this point in the game

“Standard inventory” has no unique factual answer: exploration, purchases, drops, and earlier consumption differ. Use transparent, editable scenarios built from supplies available in Otherworld.

| Supply | Sparse | Reference | Well supplied | Documented effect |
|---|---:|---:|---:|---|
| Smores | 2 | 5 | 8 | Restore 50 Heart |
| Cherry Soda | 2 | 4 | 6 | Restore 25% Juice |
| Life Jam | 0 | 2 | 3 | Revive with 50% Heart |
| Rubber Band | 0 | 2 | 3 | 50 damage and one Defense reduction tier |
| Sparkler | 1 | 3 | 4 | Apply/increase happiness |

All quantities are modeling assumptions, not guaranteed pickups or measured player averages. Each listed item is documented as purchasable at the Otherworld mailbox. References: [Smores](https://omori.wiki/Smores), [Cherry Soda](https://omori.wiki/Cherry_Soda), [Life Jam](https://omori.wiki/Life_Jam), [Rubber Band](https://omori.wiki/Rubber_Band), [Sparkler](https://omori.wiki/Sparkler).

The reference bundle has a listed replacement cost of 1,405 clams before any applicable discounts. That is a bookkeeping value, not a claim that the player naturally has that much spare money. A later route audit can establish a stricter budget preset using documented pickups and remaining shopping funds.

Begin with full Heart/Juice, neutral emotions, and verified encounter-start energy. Add an attrition scenario starting with reduced resources. Optional finds, additional early snacks, Coffee, and stronger equipment should enter only after an availability audit. Never include the boss’s own reward as pre-fight equipment.

## 4. Mechanics and fidelity

The engine should model individual actions, hits, follow-ups, and triggered events rather than subtracting average damage once per round.

Required state includes current/max Heart and Juice; equipment-derived stats; emotion and tier; buff/debuff tiers and duration; living/Toast status; equipped skills; shared inventory; energy; queued commands; boss phase; turn number; and special once-per-battle flags.

Documented mechanics include the four-equipped-skill limit, weapon-derived Hit, speed ordering with defined ties, damage variation, and the emotion triangle: Happy beats Angry, Angry beats Sad, Sad beats Happy. Space Ex-Boyfriend uses special anger modifiers: Attack/Defense multipliers of 1.25/0.9, 1.5/0.5, and 2/0.3. Its advanced anger stages retain first-tier anger matchup modifiers. [Battle mechanics](https://omori.wiki/Battle_system).

Model every enabled skill’s formula, Juice cost, accuracy, critical eligibility, target restrictions, and secondary effects. Include ordinary attacks, snacks, toys, guarding when equipped, and the correct prologue follow-up tier. Separate fixed damage from ordinary damage, while auditing which later multipliers still apply.

The boss’s listed formulas include ordinary attack `2 × Attack + 5 − Defense`, party-wide Angry Song `2 × Attack − Defense`, Space Laser `2.5 × Attack − Defense`, and Bullet Hell with four randomly targeted hits with listed base damage 20 and no critical hits. [Boss attack formulas](https://omori.wiki/Space_Ex-Boyfriend).

### Research gates before trustworthy results

1. **Boss action selection.** Several wiki rows list percentages totaling more than 100%. They may represent sequential conditional checks, but this is not established. Do not normalize them or assume sequential checks silently. Resolve the actual selection order from a reliable code-backed source or available game data. If unresolved, expose separately named candidate models and show their sensitivity results.
2. **Phase transitions.** Establish the precise threshold comparison, rounding, timing, skipped-threshold behavior, and whether transitions replace an action or occur between hits/actions/turns.
3. **Numerical pipeline.** Verify effective-stat rounding, variance distribution, minimum damage, critical multiplier, modifier order, and healing rounding. “20% variation” alone does not establish a uniform distribution.
4. **Follow-up edge cases.** The baseline rules and tier are documented below. Still verify zero-damage/miss energy behavior, multi-hit energy timing, eligibility after a missed basic attack, induced-attack chaining restrictions, and precise secondary-effect ordering against the selected game version.
5. **Omori defeat behavior.** Verify Did Not Succumb activation/reset rules and when Omori reaching zero causes game over; do not substitute a generic all-four-KO loss condition.
6. **Dynamic targeting.** Verify taunt, Counter, random multi-hit retargeting, and what happens when a queued target or actor becomes unavailable.
7. **Emotion/resource interactions.** Verify sadness’s Juice absorption at low/zero Juice, emotion locks, healing interactions, buff duration, and state clearing on revival.
8. **Version scope.** Pin a documented PC English ruleset initially. Record conflicting or version-dependent rules rather than mixing platforms.

Each rule stores its source URL, retrieval date, confidence, version, and unresolved questions. Results using unresolved high-impact rules must be labeled provisional. Monte Carlo confidence intervals cannot compensate for incorrect mechanics.

## 5. Stochastic player decisions

Separate two randomness sources: the game’s outcomes and the player’s choices. Keep their random streams independent. Difficulty presets change decisions, not damage or enemy strength.

A policy observes only information available under the selected knowledge model. The default uses party resources, visible emotions, turn history, and observed boss phases; it must not read exact hidden boss Heart, the queued enemy command, or future random outcomes. An optional full-state analysis mode is labeled separately and used consistently across comparisons.

At each command-selection window, generate legal actions and targets, score them, and sample a choice. A useful model is:

`P(action | observation) = (1 − ε) × softmax(score / temperature) + ε × lapse_distribution`

The lapse distribution contains legal but plausible mistakes, such as attacking instead of restoring Juice, unnecessary healing, poorly timed emotion changes, or spending energy too early. It should not consist mainly of deliberate self-sabotage. Target selection and follow-up decisions are sampled separately where appropriate.

Shared inventory is reserved during party command selection so characters cannot promise the same last item. Normal turn commands remain committed during resolution, except for the actual game’s interactive follow-up opportunities. The AI cannot freely re-plan after every enemy hit.

### Suboptimal

Represent an inexperienced but purposeful player: attack-heavy choices, reactive healing, inconsistent emotion management, delayed recovery, and imperfect energy use. Initial tunable assumptions: roughly 25% decision lapses and a healing trigger around 25% Heart. Choices remain varied; the player is still trying to win.

### Decent

Represent a player who understands the basic mechanics: support endangered allies, use favorable emotions, reduce incoming damage when worthwhile, restore scarce resources, and coordinate items. Initial assumptions: about 8% lapses, healing consideration around 50% Heart, and moderate variation among reasonable actions. Thresholds are features, not absolute rules: turn order and likely incoming damage matter.

### Optimal — best found

Start with expert rules, optimize their parameters through offline simulation, then evaluate limited-lookahead planning if runtime allows. Search joint party plans using candidate pruning and sampled continuations. Internal search uses independent samples, never the real battle’s future random stream.

The primary objective is win probability. Resource conservation and shorter victories break ties only after win probability. The strongest policy need not make avoidable mistakes merely to remain stochastic; battles still vary, and near-equivalent actions can be randomized.

The interface should say **Optimal (best found)** because a finite search does not prove global optimality. Report search budget and held-out performance. If an apparent improvement does not survive independent evaluation, retain the earlier policy.

### Custom

Custom means **a model of one specific person**. The first release should leave room for a richer fitting system without making it a prerequisite for the Space Ex-Boyfriend simulator.

The intended workflow has two inputs:

1. **Narrative profile.** The user answers a prompt explaining how the person tends to play: whether they hoard items, prefer damage, heal early or late, understand emotions, coordinate the party, repeat familiar skills, save energy, and react to setbacks. A prompt interpreter maps that text into a structured, editable set of behavioral dimensions and records the passages that support each inference.
2. **Calibration choices.** The user steps through ordinary fights or carefully selected battle states. Before each choice, the system predicts the person's action and target. The user then supplies what the person actually chose. The comparison updates the dimensions and creates a decision-history record.

The narrative prompt initializes **priors**, not hard rules. “They are cautious” might raise the prior for early healing and guarding, but actual decisions can correct either interpretation. The interface must show the translation—such as “item conservation: high” and “emotion knowledge: uncertain”—so the user can fix a misunderstood description before running simulations.

Keep the following dimensions available in the schema, while allowing new versioned dimensions later:

| Dimension | Examples of evidence and effect |
|---|---|
| Damage urgency | Favors immediate attacks, burst skills, or attempts to finish a target |
| Healing threshold | How Heart, expected incoming damage, speed, and party role trigger healing |
| Revival priority | How quickly the person restores Toast allies and which allies matter most |
| Juice management | Restores Juice proactively, reacts when empty, or ignores future skill costs |
| Item conservation | Uses common/rare items freely, keeps a reserve, or avoids consumables entirely |
| Emotion knowledge/use | Recognizes matchups and deliberately creates or removes emotions |
| Buff/debuff preference | Values setup, and how many future turns are needed to justify it |
| Skill familiarity | Repeats known moves, explores alternatives, or favors visually strong moves |
| Target preference | Focuses weak enemies, dangerous enemies, a favorite ally, or whoever is lowest |
| Party coordination | Notices turn order, queued heals, redundant actions, and combined setups |
| Follow-up preference | Extra damage versus support follow-ups versus Skip |
| Energy reserve | Spends immediately, saves for Omori, or aims for Release Energy |
| Risk tolerance | Chooses high-variance finishes or safer recovery/setup |
| Habit/persistence | Repeats the previous plan despite state changes or adapts readily |
| Knowledge and learning | Represents what the person knows now and how later attempts change them |

Each dimension should store an estimate, confidence, source (`prompt`, `observed choice`, or `manual edit`), and supporting evidence. Preserve the original narrative and all observed choices so a later fitting method can rebuild the profile. A manual edit creates a new profile revision rather than erasing observations.

The initial named profile is stored in [`profiles/someone.v1.json`](profiles/someone.v1.json). It treats focused targeting, critical-only healing, item hoarding, ignored Juice/emotion management, frequent follow-up spending, aggressive finishes, familiar-action repetition, occasional Aubrey Headbutt use, and multi-Toast-only Life Jam use as the current baseline. Unknown skill choices, detailed character roles, other follow-ups, and retry learning remain low-confidence calibration targets.

#### Screenshot-assisted setup

Allow the user to upload screenshots of character stats, equipment, skill slots, and inventory. These images calibrate the **battle scenario and legal action set**, while prompt answers and observed combat decisions calibrate the **person profile**. Keep those evidence streams separate so a high Attack value is never mistaken for an aggressive play preference.

The screenshot workflow is:

1. Group images into one named game-state snapshot and identify each screen type.
2. Extract visible fields into a strict draft schema: character/level/stats, weapon/charm, equipped skills, and item quantities.
3. Resolve extracted names against the sourced content registry rather than accepting arbitrary text as a new game entity.
4. Run deterministic validation: four skill slots, legal character ownership, progression availability, unique equipment, nonnegative item counts, and consistency between displayed and recomputed stats.
5. Show a review screen with the image beside extracted values, confidence, conflicts, and missing fields. Nothing enters a simulation scenario until accepted or corrected.
6. Save the accepted scenario revision with image hash, extraction model, prompt/schema version, and field-level provenance.

Support multiple inventory pages and merge them only within the same snapshot. Do not silently combine screenshots from different saves or stages of progression. If two images conflict, preserve both values and request selection in the review UI. Distinguish **equipped skills** from merely unlocked/available skills and current Heart/Juice from maximum values.

A cheap vision-capable model can perform the bounded image-to-schema extraction. `gpt-5.6-luna` supports image input and structured outputs, making it a reasonable configurable default for this role. Batch compatible screenshots where it reduces overhead, but retain a per-field link to the source image. [GPT-5.6 Luna model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

Use the model only to read and classify the screenshots. The content registry, progression checks, stat recomputation, and user review determine the accepted state. Cache extraction results by image hash so repeated simulations incur no model calls. Preserve manual entry as a complete fallback.

Later, battle screenshots can also seed behavioral calibration when they show a decision state and the selected action. Record those as observed-choice evidence only if the before-choice state and actual selection are unambiguous; otherwise use them solely as scenario/replay context.

#### Custom calibration loop

At a decision point, the profiling layer receives an immutable **player observation** and the engine's list of legal choices. It returns ranked actions with probabilities and short reasons. The calibration interface initially hides that prediction to avoid influencing the reported choice; after the person’s action is entered, it reveals the comparison.

For each calibration decision, store:

- Encounter, turn, party setup, visible state, recent visible events, and already queued party commands.
- Every legal action/target pair and every legal follow-up including Skip.
- Predicted probabilities and explanation before observing the answer.
- Actual action and target, plus whether it was directly observed, recalled, or hypothetical.
- Profile revision before and after the update.

The initial fitter can be a transparent weighted-choice model over these dimensions. Later implementations may add Bayesian fitting or a learned choice model without changing the engine, event format, or profile API. Fix either score scale or temperature so those parameters cannot mimic one another. Do not force a separate “mistake rate” unless observations show occasional choices that the dimension model cannot explain.

After each response, update only behavior-related state. Never alter combat rules to make the prediction match. Show what changed, for example: “item conservation increased; predicted Life Jam use fell from 42% to 19%.” Allow undoing an incorrectly entered observation.

Choose calibration encounters for information value as well as variety. Begin with simple Otherworld enemies so individual preferences are visible, then introduce multiple enemies, low Heart, low Juice, emotions, item use, and follow-up decisions. The system may suggest a state where its top models disagree, but the user can also play an ordinary seeded fight from beginning to end. Treat hypothetical answers and naturally observed actions as separate evidence types with configurable trust.

When validating the profile, hold out complete fights or sessions. Check whether it predicts action, target, follow-up, and broad resource-use patterns. If simulated behavior reaches states unlike any prompt example or calibration decision, mark those decisions as extrapolations and surface them as good candidates for another calibration question. Sequential decision errors can otherwise lead a model into unfamiliar states. [Sequential imitation and data aggregation](https://proceedings.mlr.press/v15/ross11a).

To estimate the person’s win chance, sample both combat randomness and plausible profile parameters. Report simulation error separately from profile uncertainty. A large number of simulations cannot eliminate uncertainty caused by a vague prompt or a handful of observations.

The default prediction target is **this person's next attempt with their current knowledge and the selected preparation**. Store attempt/session number so practice can be modeled later. Keep preparation preferences separate from in-battle choices, with an optional combined mode once the system supports route-level inventory and equipment decisions.

Manual controls remain available for inspecting the prompt translation, correcting it, or making labeled counterfactuals such as “this person, but willing to spend Life Jam.” Support versioned profile import/export. This preserves room for the prompt-plus-calibration design without requiring an external language model or sophisticated fitter in the first battle-simulator milestone.

#### Repeat boss encounters

Model a second boss attempt as a stable personal profile plus an encounter-specific **knowledge and adaptation overlay**. Do not replace the person's baseline with an expert policy merely because they have seen the fight once.

The stable profile contains habits that usually persist across attempts: item conservation, late healing, focus-fire preference, follow-up use, energy spending, risk tolerance, attention to Juice/turn order, and tendency to repeat familiar actions. The per-boss overlay contains only what this person could have learned from previous attempts:

- Which boss actions and phase changes they actually observed.
- Which party members became Toast, what resources were exhausted, and the apparent cause of defeat.
- Any explicit strategy conclusions or planned changes stated by the person.
- Increased willingness to use boss-only consumables.
- Familiarity with the encounter and number of attempts.

After each failed or successful attempt, ask a short post-fight prompt: “What do they think went wrong or right?”, “What, if anything, would they change next time?”, and “Would they change equipment, supplies, or levels before retrying?” Convert those answers into a new boss-overlay revision and retain the original profile unchanged unless the evidence reveals a general habit.

If no post-fight information is available, do not invent one precise learning response. Evaluate three labeled retry assumptions: **repeat**, where behavior remains essentially unchanged; **local adjustment**, where only an observed failure behavior changes; and **strategic learning**, where the person forms a broader counter-plan. Weight these only after calibration provides evidence about how the person learns. Until then, report a range or separate results instead of a single second-attempt win percentage.

Calibration should include at least one repeated encounter. This reveals whether the person notices mechanics, changes healing/item thresholds, or repeats the same plan. Store `attemptNumber`, `encounterKnowledge`, and `plannedChanges` with every decision so first- and second-attempt behavior are not pooled.

### Follow-ups: mechanics and available choices

Follow-ups are bonus actions offered after a normal attack; they are not equipped skills. The party shares energy, starts with 3, and can hold at most 10. Ordinary follow-ups cost 3; Release Energy costs 10 and requires all four friends alive. [Energy and eligibility](https://omori.wiki/Battle_system).

Use **tier 1 throughout this fight**, regardless of character level: the first upgrade occurs only after defeating Space Ex-Boyfriend. Damage to a friend normally grants one energy; documented sources include self/friendly damage, notably Kel's initial Pass to Omori. Audit zero-damage and multi-hit edge cases separately. [Follow-up progression and energy events](https://omori.fandom.com/wiki/FOLLOW-UPS).

The following are base formulas/effects, before applicable modifiers and rounding. `O`, `A`, and `K` denote Omori, Aubrey, and Kel; `D` is the enemy's Defense. All options cost 3 energy except Release Energy.

| Acting character | Follow-up | Tier-1 effect |
|---|---|---|
| Omori | Attack Again | Additional damage: `2 × O.Attack − D` |
| Omori | Trip | Damage: `O.Attack + O.Luck − D`; reduce enemy Speed one tier |
| Omori | Release Energy | 10 energy; base 300 damage to all enemies, plus party stat buff |
| Aubrey | Look at Omori | Aubrey deals `2 × A.Attack + A.Luck − D` |
| Aubrey | Look at Kel | Make Aubrey Angry |
| Aubrey | Look at Hero | Make Aubrey Happy and increase her Defense one tier |
| Kel | Pass to Omori | Deal 1 damage to Omori and make him Sad |
| Kel | Pass to Aubrey | Damage: `A.Attack + K.Attack − D` |
| Kel | Pass to Hero | Damage to all enemies: `A.Attack + K.Attack − D` |
| Hero | Call Omori | Restore 15% of Omori's maximum Heart, then have him attack |
| Hero | Call Aubrey | Restore 15% of Aubrey's maximum Heart, then have her attack |
| Hero | Call Kel | Restore 15% of Kel's maximum Heart, have him attack, and remove sadness |

Character-specific references: [Omori](https://omori.wiki/Omori), [Aubrey](https://omori.wiki/Aubrey), [Kel](https://omori.wiki/Kel), [Hero](https://omori.wiki/Hero). The Kel page documents that Pass to Hero uses Aubrey's Attack rather than Hero's due to a game implementation oversight; preserve that behavior in a faithful model. Verify the acting battler used for accuracy, emotion, and other modifiers separately from the formula's stat references.

Release Energy has no critical hit and is emotion-sensitive. Its buff multiplies Attack, Defense, Speed, and Luck by 1.25; it is not a general 25% increase to maximum Heart/Juice. [Release Energy effects](https://omori.wiki/Omori), [buff definition](https://omori.wiki/Battle_system).

Avoid importing later upgrades: tier-1 Trip does not inflict Sad; Look at Hero does not heal Aubrey; Pass to Omori does not damage the boss or make Omori Happy; Hero's calls do not restore Juice. [Progression descriptions](https://omori.fandom.com/wiki/SELF-HELP_GUIDE).

### Follow-ups: decision timing and shared energy

Every eligible attack opens a separate policy decision with these candidates: **skip/save energy**, plus the currently legal follow-ups. Recheck energy and participant availability at that moment, not just when selecting turn commands. Resolve the chosen follow-up before continuing through the action queue, following verified event timing.

The policy can react to information now visible, including whether the attack hit, an observed phase transition, or a friend's current Heart. It cannot revise unrelated queued commands. Treat follow-up-generated attacks as their own event type and verify that they cannot recursively create unlimited follow-ups. Skill hits, toys, and snacks do not receive ordinary attack follow-up windows.

The initial command scorer must value **Attack plus its possible follow-up** against a skill or item. Otherwise the policy may repeatedly choose skills and never create the opportunities it supposedly intends to use. Estimate future opportunities during planning, but spend energy only during actual resolution. Energy is shared, so a fast character spending 3 may prevent Omori from using Release Energy later that turn.

Proposed follow-up utility:

`immediate damage + survival benefit + future setup benefit − opportunity cost of energy`

Compare this with saving energy, accounting for expected incoming energy, the 10-point cap, upcoming eligible attackers, and the risk that a friend becomes Toast before Release Energy is available. Reaching 10 is not automatically a command to release; always reserving for 10 is not automatically optimal either.

### Follow-ups by play style

**Suboptimal:** Use the existing 25% lapse setting and high choice temperature at follow-up windows. Prefer visible extra damage, sometimes overlook support options, and sometimes skip useful opportunities or spend energy before a stronger later opportunity. The lapse distribution explicitly includes Skip and contextually weak legal choices. This is a proposal about behavior, not a measured human error frequency. Avoid a second independent “missed button” penalty by default, which would inadvertently compound the preset's mistake rate.

**Decent:** Use the existing 8% lapse setting and moderate temperature. Score Look at Hero for useful happiness/Defense setup; Hero's calls for combined healing and damage; Trip for meaningful future turn-order improvements; and direct attacks for efficient pressure or a likely finish. Evaluate whether a fast character should preserve energy for Omori's upcoming attack. Downweight setup already at its cap and healing that would mostly overflow. Choose Skip when saving energy has greater expected value.

**Optimal (best found):** Search both ordinary commands and contingent follow-up decisions. Compare spending now with saving through sampled continuations, including the risk of losing Release Energy eligibility, energy wasted at the cap, phase transitions caused by extra damage, and the future value of buffs. Use no intentional lapse. Sample internal futures independently of the actual battle. Optimize eventual victory, not follow-up damage alone, and avoid exact hidden boss-Heart information under the default observation model.

**Custom:** Derive named-follow-up preferences, Skip tendency, energy reserve, and Release Energy preference from the person's narrative and calibration choices. Show those inferred values in the profile inspector and permit manual correction. Include follow-up situations in calibration because ordinary easy fights may end before enough energy decisions appear. Overrides remain preferences subject to legality, not free access to unavailable moves.

### Follow-up strategy hypotheses to test

- Aubrey's Look at Hero may combine offense and preparation efficiently because her preceding basic attack still happens.
- Hero's calls may be preferable to another move when modest healing plus a teammate's attack is enough; they are not substitutes for Cook in every emergency.
- Kel's Pass to Omori can set up Sad-dependent Stab, but its emotional matchup and survival consequences must be evaluated against the boss's current phase. Do not assume the combination is always good.
- Trip may be worth its energy when slowing the boss improves later turns; audit when a changed Speed affects ordering rather than silently rebuilding the current queue.
- Release Energy should compete with a sequence of smaller follow-ups, including their earlier timing and support effects.

These are candidate tactics for evaluation, not established winning recommendations.

### Follow-up validation and reporting

Add regression fixtures for tier-1-only effects; a Toast participant; insufficient energy; energy caps; spending before Omori's turn; Release Energy prerequisites; Kel's one-point friendly damage; Hero's healing and sadness removal; the Pass to Hero stat-reference quirk; and prevention of unintended follow-up chains. Pin still-uncertain edge cases before claiming faithful results.

Replays must show energy before/after each gain or spend, available follow-ups, the selected option including Skip, its selection probability, participating characters, and resulting effects. Report follow-up counts, skipped opportunities, Release Energy frequency, energy lost at the cap, and energy remaining on defeat. An optional paired experiment disabling follow-ups measures their contribution without changing the main comparison's rules.

## 6. Experimental design

First run all four policies on the same reference scenario. Then cross three built-in policies with levels 7–12 and the three supply presets: 54 scenario-policy cells. Offer the custom policy in that sweep as an additional six-by-three grid. Hold equipment fixed for this experiment; run equipment and optional-unlock comparisons separately.

Use fixed sample sizes: 1,000 battles for quick exploration, 10,000 for a standard result, and 100,000 for a precision run. At worst-case win probability, approximate 95% sampling margins are ±3.1, ±1.0, and ±0.31 percentage points, respectively. These describe simulation sampling error only.

Report Wilson 95% intervals for win probability. Zero observed failures must not be presented as proof of guaranteed victory. Record unresolved turn-limit runs separately; show a lower bound treating them as losses and an upper bound treating them as wins. Do not silently discard them. If any material number remain, increase the cap or diagnose stalling before interpreting results.

Use reproducible scenario seeds. Where useful, use event-indexed common random numbers for policy comparisons, with independent streams for decisions, enemy actions, targeting, accuracy, and damage. Diverging battle histories still limit pairing; estimate uncertainty on the actual per-seed outcome differences rather than assuming perfect coupling.

Freeze and version policies before held-out evaluation. Training, tuning, and evaluation seeds must be disjoint. Choosing the best policy and reporting its score on the same runs would inflate its apparent quality.

## 7. Outputs and interface

The primary view should show four policy cards with win rate, confidence interval, trial count, and the selected party/supply scenario. Do not pre-fill invented example percentages.

Supporting outputs:

- Median and percentile battle length, separated for wins and losses.
- Survival and remaining resources on victories, explicitly conditional on winning.
- Item consumption and resource depletion over all completed runs.
- Which boss phase defeats the party most often.
- Frequency of each skill, emotion setup, item, and follow-up.
- Per-character Toast frequency and recovery frequency.
- Win-rate curves by level, and a level-versus-supplies heatmap.
- Difference in win probability between policies, with uncertainty.

Include a replay inspector with turn order, chosen actions, decision probabilities/reasons, damage components, emotion transitions, item usage, and final outcome. Offer reproducible random, winning, and losing replays without pretending that a selected replay is representative. During inspection, policy-visible information should remain distinguishable from debug-only hidden state.

The custom area has four views: **Describe**, for the narrative prompt; **Profile**, for inferred dimensions, confidence, and evidence; **Calibrate**, for stepping through fights and comparing hidden-before-answer predictions; and **Evaluate**, for held-out prediction quality and win estimates. Party levels, equipment, four skill slots, unlocks, starting resources, and inventory remain scenario settings rather than personal traits. Save profiles, observations, experiments, aggregate CSV, configuration JSON, and selected replays separately.

Use a readable, restrained interface with character colors, accessible labels, and keyboard controls. Animation is secondary to auditability. A full recreation of the game’s battle presentation is outside the first release.

## 8. Implementation architecture

Use a pure TypeScript simulation core shared by a command-line runner and a local browser dashboard. Keep combat truth, player-visible observations, behavior profiles, and presentation as separate layers.

| Module | Responsibility |
|---|---|
| rules-core | Generic stats, damage, emotions, buffs, action queue, targeting, follow-ups, victory/loss |
| content-registry | Versioned definitions for characters, skills, items, enemies, enemy actions, and encounters |
| encounter-runtime | Instantiates a content definition, runs enemy AI/state machines, and emits combat events |
| observation-projector | Converts complete engine state into only what a player is allowed to see/remember |
| legal-actions | Produces valid commands, targets, and follow-ups from a player observation and scenario |
| policies | Suboptimal, decent, best-found, and custom policy implementations behind one interface |
| profile-schema | Versioned behavioral dimensions, confidence, evidence, and profile revisions |
| prompt-interpreter | Maps narrative descriptions to proposed dimension priors and evidence spans |
| screenshot-importer | Extracts scenario drafts from stats, equipment, skill, inventory, and battle images |
| scenario-validator | Resolves entities, checks progression/constraints, recomputes stats, and requires review |
| calibration | Presents decisions, freezes predictions, records answers, and updates/refits profiles |
| experiments | Seeds, batch simulation, profile sampling, aggregation, and confidence intervals |
| replay | Append-only event logs, deterministic playback, and diagnostic views |
| interface | Scenario editor, Describe/Profile/Calibrate/Evaluate workflow, charts, and replay inspector |

### Architectural boundaries

The engine owns facts such as current Heart, the enemy's hidden Heart, future random draws, and the queued enemy action. The observation projector removes information the person would not know. Every policy—including the best-found and custom policy—accepts the same `PlayerObservation` plus `LegalChoice[]`; it never receives mutable engine state. This makes information fairness enforceable rather than relying on policy authors to remember it.

Represent a choice as a stable semantic record rather than a UI button index:

```text
Choice = { kind, actorId, actionId, targetIds, followUpId? }
```

Represent a profiling observation as an append-only record containing the encounter/state reference, legal choices, frozen prediction, actual choice, evidence type, and profile revision. Store a deterministic state snapshot or seed plus event cursor so the decision can be replayed after UI changes.

The custom profile API should remain small:

```text
interpretPrompt(text) -> ProfileDraft
extractScenario(images, extractionConfig) -> ScenarioDraft
validateScenario(scenarioDraft, contentVersion) -> ReviewableScenario
predict(profile, playerObservation, legalChoices) -> ChoiceDistribution
update(profile, calibrationObservation) -> ProfileRevision
samplePolicy(profileRevision, seed) -> CustomPolicy
```

The initial prompt interpreter may be a deterministic questionnaire/template mapper, an optional language-model adapter, or both. Its output must validate against the same profile schema. Keep the raw prompt and mapping evidence so changing providers or fitting methods does not lose source material. The combat simulator must run without network access or a language model once a profile exists.

Use a language model only for bounded interpretation tasks: mapping the narrative prompt or post-fight explanation into schema-valid evidence, and producing a human-readable explanation of a profile change. Do not call it for every action in Monte Carlo simulation. The deterministic/stochastic profile policy performs those high-volume decisions locally, which keeps experiments reproducible and inexpensive.

Make the interpreter model configurable. `gpt-5.6-luna` is a suitable default candidate for this cost-sensitive structured extraction role because the official model page describes it for high-volume, cost-sensitive workloads and lists structured outputs support. Keep a template/manual fallback and store the model ID, prompt version, and returned structured document with each interpretation. [GPT-5.6 Luna model documentation](https://developers.openai.com/api/docs/models/gpt-5.6-luna).

### Data-driven encounter expansion

Do not encode Space Ex-Boyfriend directly into the turn engine. Define reusable effect primitives—damage, heal, emotion change, stat tier change, fixed damage, multi-hit, random target, taunt, scripted phase change—and compose most skills and enemy actions from them. Permit a narrow, tested custom handler for genuinely unusual behavior; avoid building a universal combat scripting language before the first encounters work.

Each content package should define:

- Enemy base stats, emotions, resistances, actions, target rules, rewards, and source metadata.
- Encounter composition, starting conditions, special field events, and enemy-AI phase/state machine.
- Progression context: legal party levels, skills, follow-up tier, equipment, and available inventory.
- Version scope and unresolved-rule flags.

This supports multiple enemies and prevents boss-only assumptions such as “there is exactly one foe” from entering shared code. Enemy AI should use the same seeded random service as the rest of combat, but a separate stream from player-policy randomness.

### Otherworld content roadmap

Build outward from the same progression period so the ordinary encounters can also calibrate a custom profile:

1. **Foundation set:** Space Bunny, U.F.O., Shark Plane, Venus Flytrap, and Wormhole. These cover simple single/multi-enemy fights and basic targeting. Dust Bunny can be added as an optional encounter. [Otherworld enemy list](https://omori.wiki/Otherworld).
2. **Junkyard set:** Mixtape, Dial-Up, Doombox, Shark Plane formations, and the Download Window boss. Include the Junkyard start-of-battle Kel scavenging event as an encounter hook rather than a global combat rule. [Junkyard enemies and boss](https://omori.wiki/Junkyard).
3. **Primary milestone:** Space Ex-Boyfriend, with thresholds, emotion locking, boss action selection, and tier-1 follow-ups.
4. **Optional and later Otherworld fights:** Earth; Pluto with Left and Right Arms; later Pluto (Expanded)/Earth configurations; and route-specific Space Ex-Husband only after the relevant later-game party progression is modeled. Keep these in separate progression packs so late-game stats, skills, items, and follow-up tiers cannot leak into the prologue simulator. [Otherworld later encounters](https://omori.wiki/Otherworld).

Treat an encounter formation as its own content record even when it reuses enemy definitions. Calibration should include both naturally generated formations and curated snapshots that isolate a behavior dimension. Tag snapshots by what they test—healing, target selection, emotions, items, follow-ups—without revealing that tag until after the response.

### Runtime and storage

Run browser simulations in workers so the interface stays responsive. Batch jobs expose progress and cancellation. Store aggregates for every run and full logs only for selected replays to control memory. Version the engine, ruleset, policy, seed scheme, and configuration; export hashes with results.

Use a lightweight local database or versioned JSON documents for profiles and calibration sessions; keep battle definitions as reviewed source-controlled data. Never store only the current fitted weights: retain raw prompt text, observations, prediction snapshots, and profile lineage so new fitting approaches can be applied later.

Start with the CLI/core so correctness is testable independently, then add a thin calibration UI around the same engine API. If a hosted website is later selected, the engine and content packages can remain unchanged. No account, server, or paid service is required for the proposed local system; an optional prompt-model integration can be added behind the `prompt-interpreter` interface.

## 9. Verification and completion criteria

Write targeted tests for mechanics that can materially change a win: exact threshold crossings, multi-hit transitions, emotion locks, speed ties, guard priority, critical restrictions, empty Juice, last-item contention, revival, follow-up eligibility, and Omori’s loss rules.

Check invariants: resources stay within bounds; inventory never becomes negative; no character uses an unequipped/unlearned skill; no player action spends unavailable Juice; dead actors do not act unless the rules permit it; all sampled distributions normalize; identical configuration and seed reproduce identical events regardless of batch chunking.

Create hand-calculated numerical fixtures and, where accessible, compare representative traces with observed game behavior or code-backed references. Do not validate the whole engine merely by asserting that optimal wins more often than decent: that ordering is a research result, not a test to force.

Acceptance requires a documented ruleset; either resolution or explicit sensitivity treatment of high-impact uncertainties; four working policies; finite inventories; held-out win estimates with intervals; reproducible replays; custom profile/observation export and import; and no invented numerical results. The architecture must prove expansion by running at least one ordinary multi-enemy Otherworld formation and Download Window through the same engine used for Space Ex-Boyfriend.

## 10. Delivery sequence

1. **Rules and data audit:** pin the version, import party/item definitions, audit the foundation Otherworld enemies, Download Window, and Space Ex-Boyfriend, and record remaining uncertainties.
2. **Generic deterministic engine:** implement shared effect primitives, formations, action resolution, observation projection, event logs, and focused tests. Demonstrate one ordinary formation and one boss without encounter-specific engine branches.
3. **Baseline policies and experiments:** add suboptimal and decent policies, deterministic batches, confidence intervals, and replay inspection.
4. **Custom-profile skeleton:** implement the versioned dimension schema, manual profile editing, append-only calibration observations, prediction comparison, and import/export. A template prompt mapper is sufficient initially.
5. **Custom calibration UI:** add Describe/Profile/Calibrate/Evaluate views, ordinary Otherworld fights, profile revision history, undo, held-out sessions, and extrapolation warnings.
6. **Prompt and fitting adapters:** add optional free-text interpretation and increasingly capable fitting behind stable interfaces; preserve the template/manual fallback.
7. **Strategy search:** develop and tune the best-found policy on training seeds; freeze it and evaluate on fresh seeds.
8. **Content expansion and findings:** complete Junkyard formations and bosses, add later Otherworld packs, and report measured strategy, preparation, and personal-profile effects.

The recommended first milestone is a trustworthy shared engine running a basic Otherworld formation, Download Window, and the fixed-reference Space Ex-Boyfriend fight. The custom-profile storage and API should exist early, while sophisticated prompt interpretation and fitting can arrive later. The immediate rules work remains resolving high-impact mechanics—especially ambiguous boss action probabilities—before publishing polished percentages.
