# design.md — Designing Like a Human, Not a Machine

A reference for building interfaces, documents, and visuals that read as **made by a person who made specific choices** — not assembled from the statistical average of every interface that came before it.

Give this file to any AI tool (or a junior designer) before a UI/UX or frontend task.

---

## 0. The One Rule Behind Everything

An AI defaults to the *average* of its training data. A human defaults to the *specifics* of the brief in front of them: this product, this audience, this material, this culture, this constraint.

Every section below is really one instruction applied to a different surface:
**Before choosing anything — a font, a color, a chart type, a border-radius — ask "does this come from the subject, or did I just reach for it?"** If you can't answer why a choice fits *this* project specifically, it's a default, not a decision.

---

## 1. Typography

- **Pick two typefaces max** — one for display/headlines, one workhorse for body/UI text. Choose them because of what they connote for this subject, not because they're the safe modern default (Inter, Poppins, Montserrat, Manrope show up everywhere and signal "template" the moment they're on screen).
- Build a **real type scale** (a ratio like 1.25 or 1.333), then hand-adjust sizes by eye — perfectly mathematical scales feel generated; slightly irregular ones feel considered.
- Line length under ~80 characters for body copy. Serif body text gets a touch more line-height than sans-serif.
- **Avoid these typographic tells**, the fastest way to look AI-made:
  - Bolding/italicizing/coloring a single word inside a headline for "emphasis"
  - ALL-CAPS labels on everything (eyebrows, tags, nav items)
  - A tracked-out eyebrow label above every heading ("OUR PROCESS" above "How it works")
  - "Label — fragment" constructions with a spaced em dash
  - A monospace face slapped on small numbers/labels purely for "technical" flavor
  - An arrow → appended to every link or button
- **Trilingual (Lao / Thai / English) work:** Phetsarath OT is the correct standard for formal government-style Lao documents, but it reads heavy and formal for product UI. For screen/product work, pair a lighter Lao face (e.g. Noto Sans Lao, Saysettha, Phetsarath Sans-leaning options) with a Latin face of similar x-height and weight so the two scripts don't visually fight each other. Lao and Thai scripts have taller ascenders and stacked diacritics — give mixed-script lines noticeably more line-height than pure-Latin lines, or the tops/bottoms of characters will clip or collide.

## 2. Color

- Derive the palette from the actual subject — the product's materials, the place, the culture, the packaging it sits next to — not from "what looks premium on a landing page."
- **Watch for these palettes**, which are the current AI-generated defaults regardless of subject:
  1. Warm cream background + high-contrast serif + terracotta/clay accent
  2. Near-black background + one neon accent (acid green, vermilion)
  3. Broadsheet layout: hairline rules, zero radius, dense newspaper columns
  4. "SaaS-card kit": identical rounded cards, one blanket border-radius, the same soft grey drop-shadow under everything, gradient washes as pure decoration
- Real palettes are **named and role-based** — 4–6 colors, each with a job (surface, text, accent, success/error), not a swatch strip picked for vibe.
- Slightly desaturated, imperfect colors (a green that leans a bit olive, a blue that leans a bit slate) read as considered; pure, maximally-saturated hex values read as generated.

## 3. Layout ("The Sheet")

- Human layouts have **quiet asymmetry** — not everything centered, not everything in identical equal-width columns. Let the most important element break the grid slightly; let secondary content sit smaller and off to the side.
- Whitespace should be **unequal on purpose** — more air around what matters, tighter grouping around what's related. Uniform gutters everywhere is the tell of a template, not a design.
- Don't cage every section in its own bordered/shadowed card by default. Real layouts mix full-bleed sections, plain text blocks, and contained elements — cards are for things that are actually discrete, comparable units (products, plans, people), not a default wrapper for every paragraph.

## 4. Boxes, Shapes, and Borders

- Vary border-radius **by role**, not blanket-applied: a primary button, a photo, and a data table don't need the same corner treatment just because "8px radius" is the theme default.
- Use hard edges and hairline rules where the content is dense or formal (tables, financial data, legal/government-style docs); reserve soft rounding for things meant to feel approachable (chat bubbles, casual CTAs).
- Shadows should imply real elevation (a menu floating over content, a modal over a backdrop) — not a soft grey haze glued under every card "for depth." If nothing is actually stacked on top of anything else, it doesn't need a shadow.

## 5. Lines and Dividers

- A rule or divider should encode something (a section boundary, a hierarchy level) — not decorate a gap that didn't need filling.
- Vary weight on purpose: a hairline for a minor separation inside a group, a heavier rule for a real section break. Using one uniform divider style everywhere is a template tell.
- Avoid gradient-fade-to-transparent dividers as a default — they're a common AI ornament with no functional reason to exist.

## 6. Diagrams and Charts

- The default chart-library look (bright rainbow-per-series bars, drop shadows on bars, 3D pie slices, a legend box in the corner) reads as generated. Pull the chart's palette from the brand palette, not the library default.
- **Label directly on the chart** where possible (a line labeled at its endpoint) rather than defaulting to a separate legend the eye has to cross-reference.
- Only show gridlines that actually help someone read a value — decorative full gridlines on every axis are noise.
- For process/flow diagrams: only number steps (01 / 02 / 03) if the content is genuinely sequential. A generic "three icons in a row" explainer for non-sequential ideas is one of the most common AI tells — if the three things could be reordered without changing meaning, they're not a sequence, and numbering them lies about the content's structure.
- Hand-drawn or intentionally organic diagram layouts (a real annotated photo, a sketched flow with a callout on the one number that matters) read more human than a perfectly symmetrical, auto-laid-out flowchart.

## 7. Icons and Illustration

- Pick one icon style (weight, corner treatment, stroke width) and hold it for the whole product. Mixing outline and filled icons at random looks careless, but so does using an entire default icon-library set with zero customization — the goal is a set that feels chosen for this brand, not swapped in wholesale from Lucide/Feather/Font Awesome.
- For illustration, real photography, a genuine hand-drawn mark, or a texture tied to the actual product (packaging material, a coffee stain, a printed label) beats a generic 3D-render gradient blob every time — the blob is a template filler, not a decision about this subject.

## 8. Motion

- Spend motion on **one deliberate moment** (a single page-load sequence, one reveal that matters) rather than the generic default of fade-and-slide-up on every section as it scrolls into view, with a hover lift on every card. Scattered ambient motion is one of the clearest AI tells.
- Motion should mostly answer something the person just did (opened, expanded, confirmed, submitted) — not run on a timer regardless of what they're doing.

## 9. Copy and Voice

- Words are content, not decoration — every label, button, and error should say something specific to this product, not filler that could sit on any product.
- Active voice, plain language: a button says exactly what happens ("Save changes," not "Submit"), and that word choice is used consistently through the whole flow (a "Publish" button leads to a "Published" confirmation, not "Success!").
- Errors state what happened and how to fix it, in the interface's voice — no apologizing, no vagueness.
- Avoid the same copy tells as the typography list: tracked-out ALL-CAPS microcopy, meta strings joined with middle-dots ("Updated · 2 min ago · by You"), and an arrow tacked onto every CTA.

## 10. Quick Self-Check — "Would I mistake this for AI output?"

Before shipping, check the design against these tells. If more than one or two show up **and weren't a deliberate brief requirement**, revise:

- [ ] Cream background + terracotta accent, or near-black + single neon accent
- [ ] Every card has the same border-radius and the same soft grey shadow
- [ ] An ALL-CAPS eyebrow label sits above every heading
- [ ] Something is numbered 01/02/03 that isn't actually a sequence
- [ ] Every section fades and slides up on scroll; every card lifts on hover
- [ ] A single word in a headline is bolded/colored for emphasis
- [ ] Chart uses the library's default rainbow palette and a corner legend
- [ ] Copy leans on middle-dots, spaced em dashes, or a trailing → on buttons
- [ ] Nothing about the palette, type, or layout is traceable to the actual subject

## 11. Process

1. **Plan first, in words.** Before touching code or a canvas, write a short token system: 4–6 named colors with roles, the two typefaces and their jobs, a one-paragraph layout concept, and 2–3 principles specific to this brief.
2. **Review the plan against Section 10** before building anything. If a choice would show up in a generic version of this same brief, replace it with something pulled from the actual subject matter.
3. **Build**, then **self-critique with fresh eyes** — ideally after a break, or by comparing against a screenshot. Chanel's rule applies: before you ship, remove one accessory.
4. **Keep a running note** of what you've tried across projects so the same "safe default" doesn't quietly become your own personal template.
