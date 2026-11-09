# Project guide for coding agents

## Scope and communication

- This workspace contains the **Tesla Motion** website in `tesla-motion/`.
- Speak to the user in Egyptian Arabic. Keep the website UI and product copy in English, with left-to-right layout.
- Treat this file as project context, not a substitute for the latest user request or higher-priority instructions.
- Make requested changes directly, preserve unrelated work, and keep progress updates concise.

## Structure

This is a buildless static website. **`tesla-motion/dist/` contains the editable application source**, not disposable generated output. There is no required npm install or framework build.

| Path | Responsibility |
| --- | --- |
| `tesla-motion/dist/index.html` | Page structure, vehicle cards, product catalog and sections |
| `tesla-motion/dist/style.css` | Layout, responsive styles, dark theme and CSS motion |
| `tesla-motion/dist/app.js` | Catalog interactions, filtering, comparison, charging tabs, dialogs and page motion |
| `tesla-motion/dist/scene.js` | Three.js rendering, intro playback, controls and final hero transition |
| `tesla-motion/dist/timeline.js` | Reference choreography, camera paths and playback duration constants |
| `tesla-motion/dist/film-set.js` | Ramp, lighting, flight jets and smoke effects |
| `tesla-motion/dist/assets/` | Local photographs, SVG logos, licensed 3D model and vendored Three.js files |
| `tesla-motion/dist/credits.html` | Model, illustration and asset attribution |
| `tesla-motion/.openai/hosting.json` | Existing Sites identity and static deployment configuration |
| `tesla-qa/` | Local QA screenshots and browser profile; outside the site checkout |
| `tesla-*-qa.mjs` | Local browser verification helpers; outside the site checkout |
| `.tesla-tools/` | Downloaded local tooling, including portable FFmpeg |

The outer workspace is the GitHub checkout. It tracks the actual files under `tesla-motion/`, not a submodule. The nested `tesla-motion/.git/` is retained for the Sites source workflow; preserve it and keep the two repositories' commits separate. Do not clean or regenerate `dist/`, scaffold another framework, or replace vendored files as part of routine edits.

## Established user preferences

### Visual design

- Use a cohesive dark palette: black and charcoal surfaces, readable light text, subtle borders and restrained blue accents.
- Keep Tesla-style buttons: rectangular, approximately 4px corner radius, 14px labels and clear primary/secondary states.
- Use the real local Tesla SVG wordmark and symbol. Do not substitute spaced text or an invented logo.
- Place hero copy on the **left side** rather than in the center. Keep the car visible and the mobile layout readable.
- Maintain generous spacing, strong photography and smooth navigation.

### Intro and final hero

- The intro is a **real Three.js scene**, not an embedded video or a sequence of pre-rendered video frames.
- Preserve the reference-inspired ramp climb, jump, blue flight jets, landing smoke and replay camera angles.
- Start automatically after loading. Scrolling must not scrub, reset or start playback.
- The complete intro lasts **20 seconds of active playback**. `INTRO_DURATION` is the source of truth; reference choreography remains mapped through `DURATION` and `PLAYBACK_RATE`.
- After completion, reveal the static photographic hero, its headline and exploration/test-drive buttons. Stop continuous 3D rendering in this completed state.
- Keep pause/resume and replay working. Respect reduced-motion preferences; the static hero is the alternative.

### Catalog and interactions

- Current vehicle catalog: Model 3, Model Y, Model S, Model X, Cybertruck and Roadster. Roadster is presented as a preview.
- Model cards show a photograph, short description, body style, electric power and character/use category.
- Selecting a card updates the main vehicle panel, its summary, the selected tab and the selected-card indicator.
- Keep desktop card hover/reveal effects, keyboard focus states and the contained mobile swipe carousel with arrow controls.
- Current energy/charging catalog: Powerwall, Wall Connector, Mobile Connector, Solar Panels, Universal Wall Connector and Megapack.
- Preserve product filters, vehicle comparison, charging scenario tabs and ownership FAQs.

## Content and asset rules

- This is an independent showroom concept, not Tesla's official website. Preserve the affiliation notice and asset credits.
- Booking/configuration forms currently provide demonstrations. Do not imply that a booking, order or payment was submitted without a real connected service.
- Do not invent prices, range, horsepower, seating configurations, availability or customer claims. Use concise qualitative copy when verified specifications are unavailable.
- Verify new factual product specifications against current official Tesla sources.
- Preserve the embedded 3D model attribution, Three.js license and existing asset credits. The Megapack illustration is a conceptual installation, credited to Wikideas1 under CC0.
- Prefer existing local assets. Preserve the original WhatsApp reference video in the outer workspace; it is reference material, not a deployed hero video.

## Verification

Run checks appropriate to the change. Documentation-only changes do not require browser tests or deployment.

From `tesla-motion/`, useful JavaScript checks are:

```powershell
node --check dist/app.js
node --check dist/scene.js
node --check dist/timeline.js
node --check dist/film-set.js
git diff --check
```

From the outer workspace, current focused browser helpers include:

```powershell
node tesla-model-cards-qa.mjs
node tesla-dark-qa.mjs
node tesla-final-hero-qa.mjs
```

- Inspect a helper before using it: several older scripts test superseded scroll-driven playback, earlier durations or earlier layouts. Do not run every historical helper indiscriminately.
- These helpers use a temporary local HTTP server, installed Chrome and the Chrome DevTools Protocol. They write screenshots under `tesla-qa/` and should shut down their own server/browser on completion.
- Request native tool escalation if required by the sandbox; do not bypass access restrictions.
- For visual edits, inspect desktop and mobile screenshots. Check readable contrast, image loading, contained component scrolling, page overflow and actual interaction behavior.
- Test reduced motion for animation changes and verify the final static hero/replay flow when touching playback.
- Stop after relevant checks pass. Report genuine verification limits without claiming unperformed tests.

## Publishing

- The existing site is configured in `tesla-motion/.openai/hosting.json`. Read it and reuse its exact `project_id`; **do not create a replacement Site**.
- Current URL: `https://tesla-motion-eg.shiningserval2.chatgpt.site`.
- Use the available **Sites skill** and its current supported workflow for website changes. Preserve the existing audience and ownership settings.
- Synchronize/open the existing source before editing hosted work. Use fresh source credentials when needed.
- Credentials must remain in session memory and pass to helpers through stdin. Never write tokens into files, command arguments, Git configuration or logs.
- The Sites helper owns source commit/push and deployment packaging. Save/deploy the exact verified commit and matching archive; report success only after a terminal successful deployment result.
- Publish website edits by default unless the user requests local-only work or no deployment. Do not deploy solely for documentation or local QA helper changes.

## Windows workspace care

- Use PowerShell consistently and quote paths containing spaces.
- Prefer `rg` for searches and `apply_patch` for source edits.
- Do not delete the user's reference files or overwrite unrelated edits. Remove only clearly identified generated artifacts when the task calls for it.
- If elevated Git encounters an ownership mismatch, scope any `safe.directory` exception to this checkout and process; do not broadly trust every repository.
- Keep QA browser profiles, downloaded tooling and release archives outside the website checkout. Do not include them in the deployable `dist/` tree.

## Keeping this guide useful

Update the relevant sections when the user changes a lasting design preference, playback behavior, architecture or deployment workflow. Record the final intended behavior rather than abandoned approaches or chronological chat history.
