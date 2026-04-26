# Portfolio Scroll FX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add cinematic scroll experience to Diana Tatar portfolio — portfolio cases stack on top of each other while scrolling, smooth scroll via Lenis, custom cursor, split-text headlines, velocity-aware marquee, parallax, magnetic CTAs, and number counter.

**Architecture:** Static site (HTML/CSS/JS, no build step). Add Lenis (CDN ESM, ~3 kb gzip) for smooth scroll. All scroll-driven effects subscribe to Lenis `scroll` event. CSS sticky + per-card height surplus produces the stacking effect; JS computes per-card progress and writes it as a CSS variable. Single `MOTION_FULL` flag gates expensive effects on desktop+fine-pointer+no-reduced-motion only.

**Tech Stack:** Vanilla HTML/CSS/JS, Lenis (smooth scroll lib).

**Verification approach:** This is a static site with no test suite. Each task ends with a manual browser verification step (specific URL or DevTools check) before commit. Browser: Chrome on macOS for primary verification; Safari/Firefox spot-checks at the end.

**Spec:** `docs/superpowers/specs/2026-04-26-portfolio-scroll-fx-design.md`

---

## Task 1: DOM restructure for stacking

**Files:**
- Modify: `index.html:171-371` (wrap five `<article class="case">` blocks)

- [ ] **Step 1: Wrap all five `.case` articles in a single `<section class="cases-stack">`**

Open `index.html`. Find the comment `<!-- ============ CASES ============ -->` at line 171. Right after that comment line, add:
```html
  <section class="cases-stack">
```
Find the closing `</article>` of case-05 (around line 371, the AI CONTENT case). Right after that closing tag, add:
```html
  </section>
```

- [ ] **Step 2: Add `.case__pin` wrapper inside each `.case` article**

For each of the 5 `<article class="case" …>` blocks, wrap the existing `.case__header` div + `.case__stage` div in a new `<div class="case__pin">…</div>`.

Pattern — change this:
```html
<article class="case" …>
  <div class="container case__header">…</div>
  <div class="case__stage">…</div>
</article>
```
To this:
```html
<article class="case" …>
  <div class="case__pin">
    <div class="container case__header">…</div>
    <div class="case__stage">…</div>
  </div>
</article>
```

Apply this transformation to all 5 cases (01–05).

- [ ] **Step 3: Verify markup**

Open `index.html` in browser (`open index.html`). The page should still render — same look as before — because no CSS changes yet. Use DevTools Inspector to verify each `.case` has exactly one `.case__pin` child wrapping the header and stage.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "refactor(cases): wrap cases in stack section + pin div"
```

---

## Task 2: CSS for stacking + peek

**Files:**
- Modify: `styles.css` (append new section at the end)

- [ ] **Step 1: Append new SCROLL FX section at the end of `styles.css`**

Open `styles.css`. After the last existing rule (around line 1193), add:

```css
/* =========================================================
   SCROLL FX — stacking cases (desktop only, gated by JS)
   ========================================================= */
.cases-stack {
  position: relative;
}

.case {
  /* On desktop with stacking on, each case is taller than viewport
     so the next case overlaps the previous by 60px while sticky holds.
     The .js-stack-on class is added to <html> by JS only when MOTION_FULL. */
}

html.js-stack-on .case {
  height: calc(100vh + 60px);
  padding-top: 0;
}
html.js-stack-on .case:last-of-type {
  height: 100vh;
}
html.js-stack-on .case__pin {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  transform-origin: 50% 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  background: var(--c-bg);
}
html.js-stack-on .case:nth-of-type(1) .case__pin { z-index: 1; }
html.js-stack-on .case:nth-of-type(2) .case__pin { z-index: 2; }
html.js-stack-on .case:nth-of-type(3) .case__pin { z-index: 3; }
html.js-stack-on .case:nth-of-type(4) .case__pin { z-index: 4; }
html.js-stack-on .case:nth-of-type(5) .case__pin { z-index: 5; }

html.js-stack-on .case__pin {
  transform: scale(calc(1 - 0.06 * var(--stack-progress, 0)));
  filter:
    brightness(calc(1 - 0.45 * var(--stack-progress, 0)))
    blur(calc(2px * var(--stack-progress, 0)));
  transition: filter 60ms linear;
}

html.js-stack-on .case.is-near .case__pin {
  will-change: transform, filter;
}

/* Mobile / no-stack fallback: cases scroll naturally as before */
@media (max-width: 1023px) {
  html.js-stack-on .case,
  html.js-stack-on .case:last-of-type {
    height: auto;
  }
  html.js-stack-on .case__pin {
    position: static;
    height: auto;
    transform: none !important;
    filter: none !important;
    z-index: auto !important;
  }
}

@media (prefers-reduced-motion: reduce) {
  html.js-stack-on .case,
  html.js-stack-on .case:last-of-type {
    height: auto;
  }
  html.js-stack-on .case__pin {
    position: static;
    height: auto;
    transform: none !important;
    filter: none !important;
    z-index: auto !important;
  }
}
```

- [ ] **Step 2: Verify CSS doesn't break the static layout**

Open `index.html` in browser. Page should still look exactly as before (no `js-stack-on` class on `<html>` yet, so all stacking rules are dormant). Cases scroll one after another normally.

- [ ] **Step 3: Manually test the stacking by adding the class temporarily**

In DevTools, add `class="js-stack-on"` to `<html>`. Cases should now stack — each card sticks at the top while the next scrolls over it. Outgoing cards have NOT yet been transformed (next task adds JS for that), so they just sit there. Remove the class.

- [ ] **Step 4: Commit**

```bash
git add styles.css
git commit -m "style(cases): add sticky stack + transforms gated by .js-stack-on"
```

---

## Task 3: JS — MOTION_FULL flag + Lenis init

**Files:**
- Modify: `script.js` (add new module before the closing `})();`)

- [ ] **Step 1: Add the `initScrollFX` module at the bottom of the IIFE in `script.js`**

Open `script.js`. Find the line near the end with `/* RESURSE (blog) — category filter */` (around line 327). After the entire `if (resGrid) { … }` block closes (around line 344), but BEFORE the `})();` line at the very bottom (line 345), insert:

```js
  /* =========================================================
     SCROLL FX — Lenis + stacking + cursor + split-text + parallax
     Only initializes when MOTION_FULL is true.
     ========================================================= */
  const MOTION_FULL =
    matchMedia("(min-width: 1024px)").matches &&
    matchMedia("(pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lenis = null;

  async function initLenis() {
    if (!MOTION_FULL) return null;
    try {
      const mod = await import("https://unpkg.com/lenis@1.1.13/dist/lenis.mjs");
      const Lenis = mod.default;
      lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
      const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      return lenis;
    } catch (err) {
      console.warn("Lenis failed to load, falling back to native scroll", err);
      return null;
    }
  }

  function initScrollFX() {
    if (!MOTION_FULL) return;
    document.documentElement.classList.add("js-stack-on");
    initLenis();
  }

  initScrollFX();
```

- [ ] **Step 2: Verify in browser**

Open `index.html` in Chrome. Open DevTools console.
- On a desktop window (≥1024px wide), `<html>` should have `class="js-stack-on"` and cases should stack visually (sticky behavior visible while scrolling).
- Scrolling should feel "smooth/lerp-y" (Lenis active). Wheel feels like inertia.
- No console errors.
- Resize to <1024px wide: the class persists (it's set once at load), but the CSS media query `@media (max-width: 1023px)` overrides the sticky rules → cases scroll normally.
- Reload page on a narrow window: the class is NOT added (because `MOTION_FULL` was false at load). Verify in DevTools.

- [ ] **Step 3: Verify hash-link smooth scroll still works**

Click "Vezi portofoliu" link in hero. Page should scroll to `#portofoliu` smoothly (the existing `script.js` smooth-scroll handler still runs; Lenis intercepts wheel/keyboard but `scrollIntoView` calls still work).

- [ ] **Step 4: Commit**

```bash
git add script.js
git commit -m "feat(scroll-fx): add MOTION_FULL gate + Lenis smooth scroll"
```

---

## Task 4: JS — stack progress observer

**Files:**
- Modify: `script.js` (extend `initScrollFX`)

- [ ] **Step 1: Convert `initScrollFX` to async + add stack progress logic**

In `script.js`, replace the entire existing `initScrollFX` function (added in Task 3) with this expanded async version. We declare `cases` as a property on the outer scope so later tasks can reuse it.

```js
  let cases = [];

  async function initScrollFX() {
    if (!MOTION_FULL) return;
    document.documentElement.classList.add("js-stack-on");
    await initLenis();

    /* Stack progress — set --stack-progress on each .case based on
       how far it has been pushed past its sticky boundary. */
    cases = $$(".case");
    if (!cases.length) return;

    if ("IntersectionObserver" in window) {
      const nearIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => e.target.classList.toggle("is-near", e.isIntersecting)),
        { rootMargin: "50% 0px" }
      );
      cases.forEach((c) => nearIO.observe(c));
    }

    const updateStackProgress = () => {
      cases.forEach((caseEl) => {
        if (!caseEl.classList.contains("is-near")) return;
        const rect = caseEl.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
        caseEl.style.setProperty("--stack-progress", progress.toFixed(3));
      });
    };

    const onScroll = () => requestAnimationFrame(updateStackProgress);
    if (lenis) {
      lenis.on("scroll", onScroll);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }
    requestAnimationFrame(updateStackProgress);
  }
```

The `let cases = [];` declaration must be at the IIFE level (alongside `let lenis = null;`), NOT inside the function — so that it's accessible from later tasks (Task 11 needs `cases` for the indicator).

- [ ] **Step 2: Verify the depth effect in browser**

Reload `index.html` in Chrome (desktop, ≥1024px). Scroll slowly through the portfolio. Each card should:
- Stick at top when its `.case` enters viewport.
- As the next card pushes it up, the outgoing card scales down to ~0.94, dims (brightness ~0.55), and slightly blurs.
- The transition is smooth, follows scroll progress, no jumps.

In DevTools, inspect a `.case` element: it should have `style="--stack-progress: 0.345"` (some value between 0 and 1) updating live as you scroll.

- [ ] **Step 3: Verify mobile fallback**

Resize window to <1024px and reload. Cases should scroll naturally (no sticky, no transforms) — CSS media query handles this.

- [ ] **Step 4: Verify reduced-motion fallback**

In Chrome DevTools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → "reduce". Reload. Cases should scroll naturally (CSS overrides). No JS errors (the `MOTION_FULL` flag gates initialization).

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "feat(scroll-fx): compute per-case stack progress on scroll"
```

---

## Task 5: Custom cursor

**Files:**
- Modify: `index.html` (add cursor markup before `<script>`)
- Modify: `styles.css` (append cursor styles)
- Modify: `script.js` (extend `initScrollFX` with cursor init)

- [ ] **Step 1: Add cursor markup to `index.html`**

Open `index.html`. Find the line `<script src="script.js" defer></script>` (around line 526). On the line BEFORE that, add:
```html
  <div class="cursor" aria-hidden="true"></div>
  <div class="cursor__label" aria-hidden="true"></div>
```

- [ ] **Step 2: Add `data-cursor-label` attributes to interactive elements**

In `index.html`, find each `<a class="case__cta">` (5 occurrences) and add the attribute:
```html
<a href="…" class="case__cta" data-cursor-label="Vezi proiectul →">
```

Find the `.btn-cv` link (line ~150) and add:
```html
<a href="assets/cv.pdf" class="btn-cv" data-cursor-label="Descarcă" download>
```

Find each `<button class="case__arrow" data-dir="-1" …>` and add `data-cursor-label="←"`. Each `<button class="case__arrow" data-dir="1" …>` gets `data-cursor-label="→"`. There are 5 cases × 2 arrows = 10 buttons.

Find each `<button class="t-arrow" data-dir="-1" …>` and add `data-cursor-label="←"`. Each `<button class="t-arrow" data-dir="1" …>` gets `data-cursor-label="→"`. There are 2 buttons.

Find the `.hero__link` (line ~117) and add `data-cursor-label="Portofoliu →"`.

- [ ] **Step 3: Add cursor CSS to the SCROLL FX section in `styles.css`**

Append at the end of `styles.css`:
```css
/* Custom cursor */
.cursor,
.cursor__label {
  display: none;
}
html.js-stack-on .cursor {
  display: block;
  position: fixed;
  top: 0; left: 0;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: #fff;
  mix-blend-mode: difference;
  pointer-events: none;
  z-index: 9999;
  transform: translate3d(-100px, -100px, 0);
  transition: width .35s var(--ease), height .35s var(--ease), border-radius .35s var(--ease);
  will-change: transform;
}
html.js-stack-on .cursor.is-expanded {
  width: 140px;
  height: 40px;
  border-radius: 24px;
}
html.js-stack-on .cursor__label {
  display: block;
  position: fixed;
  top: 0; left: 0;
  pointer-events: none;
  z-index: 10000;
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  color: #0c0c0c;
  opacity: 0;
  transition: opacity .25s var(--ease);
  transform: translate3d(-100px, -100px, 0);
  white-space: nowrap;
  mix-blend-mode: difference;
}
html.js-stack-on .cursor__label.is-visible { opacity: 1; }
@media (pointer: coarse) {
  html.js-stack-on .cursor,
  html.js-stack-on .cursor__label { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  html.js-stack-on .cursor,
  html.js-stack-on .cursor__label { display: none !important; }
}
```

- [ ] **Step 4: Add cursor JS to `initScrollFX` in `script.js`**

Inside `initScrollFX()`, after the stack progress block, append:

```js
    /* Custom cursor */
    const cursor = $(".cursor");
    const cursorLabel = $(".cursor__label");
    if (cursor && cursorLabel) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let cx = mx, cy = my;
      window.addEventListener("mousemove", (e) => {
        mx = e.clientX; my = e.clientY;
      });
      const cursorLoop = () => {
        cx += (mx - cx) * 0.18;
        cy += (my - cy) * 0.18;
        cursor.style.transform = `translate3d(${cx - 18}px, ${cy - 18}px, 0)`;
        cursorLabel.style.transform = `translate3d(${mx + 22}px, ${my - 8}px, 0)`;
        requestAnimationFrame(cursorLoop);
      };
      requestAnimationFrame(cursorLoop);

      $$("[data-cursor-label]").forEach((el) => {
        el.addEventListener("mouseenter", () => {
          cursor.classList.add("is-expanded");
          cursorLabel.textContent = el.dataset.cursorLabel;
          cursorLabel.classList.add("is-visible");
        });
        el.addEventListener("mouseleave", () => {
          cursor.classList.remove("is-expanded");
          cursorLabel.classList.remove("is-visible");
        });
      });
    }
```

- [ ] **Step 5: Verify in browser**

Reload on Chrome desktop. Move mouse — a small white circle should follow the cursor with slight lag (not perfectly stuck). Hover `.case__cta` ("Vezi proiectul"): the circle expands into a pill, and the text "Vezi proiectul →" appears next to the cursor. Move away: it shrinks back. The blend mode should make the cursor visible over both light and dark backgrounds.

Verify on a touch emulation device (DevTools → toggle device toolbar): cursor should be hidden.

- [ ] **Step 6: Commit**

```bash
git add index.html styles.css script.js
git commit -m "feat(scroll-fx): custom cursor with hover labels"
```

---

## Task 6: Split-text reveal on display headlines

**Files:**
- Modify: `styles.css` (append split-text styles)
- Modify: `script.js` (extend `initScrollFX` with split-text)

- [ ] **Step 1: Add split-text CSS to `styles.css`**

Append at the end of `styles.css`:
```css
/* Split-text reveal */
.split-ready .word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;
}
.split-ready .char {
  display: inline-block;
  transform: translateY(110%);
  transition: transform 700ms var(--ease) calc(var(--i, 0) * 22ms);
  will-change: transform;
}
.split-ready.is-revealed .char {
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .split-ready .char {
    transform: none !important;
    opacity: 0;
    transition: opacity 300ms;
  }
  .split-ready.is-revealed .char {
    opacity: 1;
  }
}
```

- [ ] **Step 2: Add `initSplitText` as a standalone function (NOT inside `initScrollFX`)**

Split-text should run on mobile too because it's cheap and respects `prefers-reduced-motion` via CSS. So it lives outside `initScrollFX`.

In `script.js`, at the very end of the IIFE (right BEFORE the `})();` closing line), add:

```js
  /* Split-text reveal — always on (cheap, respects reduced motion via CSS) */
  function initSplitText() {
    const splitTargets = $$(".display, .case__category, .case__title");
    splitTargets.forEach((el) => {
      const original = el.textContent;
      const parts = original.split(/(\s+)/);
      let charIndex = 0;
      el.innerHTML = parts.map((part) => {
        if (!part.trim()) return part;
        const chars = [...part].map((c) => {
          const out = `<span class="char" style="--i:${charIndex}">${c}</span>`;
          charIndex++;
          return out;
        }).join("");
        return `<span class="word">${chars}</span>`;
      }).join("");
      el.classList.add("split-ready");
    });

    if ("IntersectionObserver" in window) {
      const splitIO = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            splitIO.unobserve(entry.target);
          }
        }),
        { threshold: 0.3 }
      );
      splitTargets.forEach((el) => splitIO.observe(el));
    } else {
      splitTargets.forEach((el) => el.classList.add("is-revealed"));
    }
  }
  initSplitText();
```

- [ ] **Step 3: Verify in browser**

Reload `index.html`. Scroll down to "Despre mine". The headline should animate in character by character — each letter sliding up from below with a stagger. Same for "Portofoliu.", each `.case__category` (e.g. "Branding"), each `.case__title`, "Servicii.", and "Testimonial".

In DevTools, inspect `.about__title`: it should have `<span class="word"><span class="char" style="--i:0">D</span>…</span>` structure and the class `split-ready`. After scrolling into view, class `is-revealed` is added.

Test with reduced-motion emulation: characters fade in opacity-only (no slide).

- [ ] **Step 4: Verify on mobile width**

Resize to 600px wide and reload. Split-text reveal should still work (no `js-stack-on`, but `initSplitText` runs unconditionally).

- [ ] **Step 5: Commit**

```bash
git add styles.css script.js
git commit -m "feat(reveal): split-text character-staggered reveal on headlines"
```

---

## Task 7: Marquee velocity boost

**Files:**
- Modify: `styles.css` (adjust marquee animation behavior)
- Modify: `script.js` (extend `initScrollFX` with marquee JS)

- [ ] **Step 1: Find the existing marquee CSS and modify**

Open `styles.css`. Find `.ticker` and `.ticker__track` rules. They use a CSS `@keyframes` animation today.

Locate the rule that animates `.ticker__track`. Before that rule, add:

```css
html.js-stack-on .ticker__track {
  animation: none !important;
  transform: translate3d(var(--ticker-x, 0px), 0, 0) skewX(var(--ticker-skew, 0deg));
  transition: transform 200ms var(--ease);
  will-change: transform;
}
```

This disables the CSS animation when JS-driven marquee is active, but only when `js-stack-on` is set (i.e. on desktop with full motion). On mobile / reduced motion, the original `@keyframes` continues to run.

- [ ] **Step 2: Add marquee JS to `initScrollFX` in `script.js`**

Inside `initScrollFX()` (after the cursor block, before the closing brace), append:

```js
    /* Marquee — JS-driven so it can react to scroll velocity */
    const tickerTrack = $(".ticker__track");
    if (tickerTrack && lenis) {
      let x = 0;
      let velocity = 0;
      const baseSpeed = 60; // px/s
      let lastT = performance.now();

      lenis.on("scroll", ({ velocity: v }) => {
        velocity = v;
      });

      const trackLoop = (t) => {
        const dt = (t - lastT) / 1000;
        lastT = t;
        const boost = Math.max(-200, Math.min(200, velocity * 0.5));
        x -= (baseSpeed + boost) * dt;
        // Loop: each <span> in the track is one full cycle. Track has 3 spans.
        const trackWidth = tickerTrack.scrollWidth / 3;
        if (-x >= trackWidth) x += trackWidth;
        if (x > 0) x -= trackWidth;
        const skew = Math.max(-3, Math.min(3, -velocity * 0.02));
        tickerTrack.style.setProperty("--ticker-x", `${x.toFixed(1)}px`);
        tickerTrack.style.setProperty("--ticker-skew", `${skew.toFixed(2)}deg`);
        requestAnimationFrame(trackLoop);
      };
      requestAnimationFrame(trackLoop);
    }
```

- [ ] **Step 3: Verify in browser**

Reload Chrome desktop. The hero marquee should crawl right-to-left at base speed when not scrolling. Scroll down fast: marquee speeds up and skews slightly. Scroll up fast: marquee slows / reverses momentarily and skews opposite direction. When scrolling stops, marquee returns to base speed and 0 skew within ~200ms.

On mobile width or with reduced motion: marquee uses the original CSS `@keyframes` (no JS interaction).

- [ ] **Step 4: Commit**

```bash
git add styles.css script.js
git commit -m "feat(marquee): scroll-velocity boost + skew, JS-driven on desktop"
```

---

## Task 8: Parallax on hero, about photo, footer

**Files:**
- Modify: `script.js` (extend `initScrollFX` with parallax)

- [ ] **Step 1: Add parallax JS to `initScrollFX` in `script.js`**

Inside `initScrollFX()`, after the marquee block, append:

```js
    /* Parallax — translate3d on Y for select images */
    const parallaxTargets = [
      { el: $(".hero__bg img"),    factor: 0.15 },
      { el: $(".about__photo img"), factor: 0.08 },
      { el: $(".footer__bg img"),   factor: 0.12 },
    ].filter((t) => t.el);

    const updateParallax = () => {
      parallaxTargets.forEach(({ el, factor }) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const center = rect.top + rect.height / 2 - window.innerHeight / 2;
        el.style.transform = `translate3d(0, ${(center * factor * -1).toFixed(1)}px, 0)`;
      });
    };

    if (lenis) {
      lenis.on("scroll", () => requestAnimationFrame(updateParallax));
    } else {
      window.addEventListener("scroll", () => requestAnimationFrame(updateParallax), { passive: true });
    }
    requestAnimationFrame(updateParallax);
```

- [ ] **Step 2: Verify in browser**

Reload Chrome desktop. Scroll slowly:
- Hero background image should move slower than the foreground (visible parallax).
- The "Despre mine" photo should drift slightly within its frame.
- Footer background should also drift.

The parent containers (`.hero__bg`, `.about__photo`, `.footer__bg`) all already have `overflow: hidden`, so the moving image stays clipped within its frame.

If any of these parents do NOT have `overflow: hidden`, the parallax may cause layout overflow. Check in DevTools: `.about__photo` should have `overflow: hidden` from the existing CSS. If not, add to `styles.css`:

```css
.about__photo,
.hero__bg,
.footer__bg {
  overflow: hidden;
}
```

(The first two likely already have it; verify before adding.)

- [ ] **Step 3: Commit**

```bash
git add script.js styles.css
git commit -m "feat(parallax): scroll-driven Y translate on hero, about, footer"
```

---

## Task 9: Magnetic CTAs

**Files:**
- Modify: `index.html` (add `data-magnetic` attribute to target buttons)
- Modify: `script.js` (extend `initScrollFX` with magnetic logic)

- [ ] **Step 1: Add `data-magnetic` attribute to target elements in `index.html`**

Add `data-magnetic` (no value needed) to:
- `.hero__link` (around line 117)
- `.btn-cv` (around line 150)
- All 5 `.case__cta` links
- The `<button type="submit" class="btn btn--primary">` in the footer form (around line 509)
- `.nav__cta` (around line 96)

Example pattern:
```html
<a href="#portofoliu" class="hero__link" data-magnetic data-cursor-label="Portofoliu →">…</a>
```

- [ ] **Step 2: Add magnetic JS to `initScrollFX` in `script.js`**

Inside `initScrollFX()`, after the parallax block, append:

```js
    /* Magnetic CTAs */
    $$("[data-magnetic]").forEach((btn) => {
      btn.style.transition = "transform 300ms var(--ease)";
      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * 0.3;
        const dy = (e.clientY - cy) * 0.3;
        btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.transform = "";
      });
    });
```

- [ ] **Step 3: Verify in browser**

Reload Chrome desktop. Hover the "Vezi portofoliu" link in the hero — it should slightly lean toward your cursor as you move within ~80px of it. Move away: snaps back smoothly. Same for "Descarcă CV", each "Vezi proiectul", "Trimite cererea", "Contactează-mă".

- [ ] **Step 4: Commit**

```bash
git add index.html script.js
git commit -m "feat(scroll-fx): magnetic hover for primary CTAs"
```

---

## Task 10: Number counter in About

**Files:**
- Modify: `index.html` (replace plain "200+ clienți" text with counter span)
- Modify: `script.js` (add counter logic — runs unconditionally)

- [ ] **Step 1: Update `index.html`**

Open `index.html`. Find the `.about__text` paragraph (around line 143-149). The text contains "200+ clienți". Locate the exact phrase and replace just the number "200" with the counter span:

Change:
```html
peste 10 brand-uri dezvoltate și
200+ clienți cu care am colaborat la branding, social media,
```
To:
```html
peste <span class="counter" data-count-to="10">10</span> brand-uri dezvoltate și
<span class="counter" data-count-to="200">200</span>+ clienți cu care am colaborat la branding, social media,
```

(The text content stays "10" and "200" so the layout is correct before JS runs and for users without JS / reduced-motion.)

- [ ] **Step 2: Add counter JS at the bottom of the IIFE in `script.js`**

After the `initSplitText();` call (added in Task 6), add:

```js
  /* Number counter — animates 0 → target on first enter */
  function initCounters() {
    const counters = $$(".counter");
    if (!counters.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
    const animateCount = (el, to, duration) => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        el.textContent = Math.round(to * easeOutQuart(t));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterIO = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const to = Number(entry.target.dataset.countTo);
          animateCount(entry.target, to, 1400);
          counterIO.unobserve(entry.target);
        }
      }),
      { threshold: 0.6 }
    );
    counters.forEach((c) => counterIO.observe(c));
  }
  initCounters();
```

- [ ] **Step 3: Verify in browser**

Reload `index.html`. Scroll to "Despre mine". As the paragraph enters the viewport, "10" and "200" should count up from 0 to their target values smoothly over ~1.4 seconds. After completion, they freeze.

Refresh the page without scrolling: the numbers should already show "10" and "200" before JS animates (graceful — text is in the DOM).

With reduced motion: numbers stay at 10 and 200 — no animation runs.

- [ ] **Step 4: Commit**

```bash
git add index.html script.js
git commit -m "feat(about): animated 0→target number counters"
```

---

## Task 11: Stack progress indicator (counter + line)

**Files:**
- Modify: `index.html` (add the indicator markup inside `.cases-stack`)
- Modify: `styles.css` (append indicator styles)
- Modify: `script.js` (extend `initScrollFX` with indicator logic)

- [ ] **Step 1: Add indicator markup to `index.html`**

Inside the `<section class="cases-stack">` opener (added in Task 1), as the very first child, add:

```html
    <div class="stack-indicator" aria-hidden="true">
      <span class="stack-indicator__num" data-cur>01</span>
      <span class="stack-indicator__sep">/</span>
      <span class="stack-indicator__total">05</span>
    </div>
    <div class="stack-progress-bar" aria-hidden="true">
      <div class="stack-progress-bar__fill"></div>
    </div>
```

- [ ] **Step 2: Add indicator CSS to `styles.css`**

Append at the end:
```css
/* Stack indicator (only visible during stacking) */
.stack-indicator,
.stack-progress-bar { display: none; }

html.js-stack-on .stack-indicator {
  display: flex;
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 100;
  gap: 6px;
  font-weight: 600;
  letter-spacing: 0.06em;
  font-size: 13px;
  color: #fff;
  mix-blend-mode: difference;
  opacity: 0;
  transition: opacity .35s var(--ease);
  pointer-events: none;
}
html.js-stack-on .stack-indicator.is-visible { opacity: 1; }
html.js-stack-on .stack-indicator__sep { opacity: 0.5; }

html.js-stack-on .stack-progress-bar {
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255,255,255,0.1);
  z-index: 100;
  opacity: 0;
  transition: opacity .35s var(--ease);
  pointer-events: none;
}
html.js-stack-on .stack-progress-bar.is-visible { opacity: 1; }
html.js-stack-on .stack-progress-bar__fill {
  height: 100%;
  background: #fff;
  width: var(--bar-progress, 0%);
  mix-blend-mode: difference;
}

@media (max-width: 1023px) {
  html.js-stack-on .stack-indicator,
  html.js-stack-on .stack-progress-bar { display: none !important; }
}
@media (prefers-reduced-motion: reduce) {
  html.js-stack-on .stack-indicator,
  html.js-stack-on .stack-progress-bar { display: none !important; }
}
```

- [ ] **Step 3: Add indicator JS to `initScrollFX` in `script.js`**

Inside `initScrollFX()`, after the magnetic block, append:

```js
    /* Stack indicator */
    const indicator = $(".stack-indicator");
    const bar = $(".stack-progress-bar");
    const barFill = $(".stack-progress-bar__fill");
    const stack = $(".cases-stack");
    const numEl = indicator && indicator.querySelector("[data-cur]");

    if (indicator && bar && barFill && stack && numEl && cases.length) {
      const stackIO = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          indicator.classList.toggle("is-visible", entry.isIntersecting);
          bar.classList.toggle("is-visible", entry.isIntersecting);
        }),
        { threshold: 0 }
      );
      stackIO.observe(stack);

      const updateIndicator = () => {
        let active = 0;
        for (let i = 0; i < cases.length; i++) {
          const p = parseFloat(cases[i].style.getPropertyValue("--stack-progress")) || 0;
          if (p < 0.5) { active = i; break; }
          active = i;
        }
        numEl.textContent = String(active + 1).padStart(2, "0");

        const stackRect = stack.getBoundingClientRect();
        const totalProgress = Math.max(0, Math.min(1,
          -stackRect.top / (stackRect.height - window.innerHeight)
        ));
        barFill.style.setProperty("--bar-progress", `${(totalProgress * 100).toFixed(1)}%`);
      };

      const onIndicatorScroll = () => requestAnimationFrame(updateIndicator);
      if (lenis) lenis.on("scroll", onIndicatorScroll);
      else window.addEventListener("scroll", onIndicatorScroll, { passive: true });
      requestAnimationFrame(updateIndicator);
    }
```

- [ ] **Step 4: Verify in browser**

Reload Chrome desktop. Scroll into the portfolio section. In the top-right of the viewport, "01 / 05" should appear, fading in. As you scroll through cases, the first number updates: "01", "02", "03", "04", "05". A thin white line at the bottom of the viewport fills left-to-right as you progress through the stack.

When you exit the portfolio section (into Servicii or up into About), both indicators fade out.

On mobile: indicator is hidden (CSS media query).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css script.js
git commit -m "feat(scroll-fx): fixed stack progress indicator and bar"
```

---

## Task 12: Cross-browser polish + accessibility audit + final commit

**Files:**
- Possibly modify: `styles.css`, `script.js`, `index.html` based on findings.

- [ ] **Step 1: Open in Chrome, Safari, Firefox on a desktop window ≥1024px**

For each browser:
1. Visit local file (`file:///…/index.html`) or run `python3 -m http.server` from project dir and open `http://localhost:8000`.
2. Scroll through entire page top-to-bottom, then back up.
3. Verify: stacking works, transforms apply, custom cursor follows, marquee reacts to scroll, parallax visible, headlines reveal, counter animates, stack indicator updates.
4. Open DevTools console — no errors or warnings (other than known Lenis import notice).

If a browser fails an effect: note which, fix the cause (likely a CSS prefix or `mix-blend-mode` issue on Safari), and re-verify.

- [ ] **Step 2: Mobile breakpoint test**

In Chrome DevTools, toggle device toolbar (`⌘+Shift+M`). Test on iPhone SE (375×667) and iPad (768×1024):
- No custom cursor.
- Cases scroll naturally (no stacking).
- Marquee uses CSS animation.
- Split-text reveal still plays.
- Counter still animates.
- No console errors.

- [ ] **Step 3: Reduced motion test**

DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload.
- Cases scroll naturally.
- No parallax, no cursor, no marquee animation.
- Split-text → opacity fade.
- Counter does NOT animate (number shown statically).
- No console errors.

- [ ] **Step 4: Lighthouse audit**

In DevTools Lighthouse panel, run audit on "Desktop" preset, "Performance" + "Accessibility" + "Best Practices" + "SEO".

Targets:
- Performance ≥ 85 (was higher before because of fewer JS effects; some drop is expected from Lenis + scroll handlers, but stay ≥ 85).
- Accessibility = 100 (no regressions — new elements all have `aria-hidden`).
- LCP ≤ 2.5s (hero image still preloaded, should be unchanged).
- CLS ≤ 0.05 (split-text doesn't change layout).

If Performance drops below 85, investigate: likely culprits are Lenis blocking, too-frequent rAF in scroll handlers, or `will-change` not being scoped correctly. Fix and re-audit.

- [ ] **Step 5: Final commit (only if any fixes were applied in steps 1-4)**

```bash
git add -A
git commit -m "chore(scroll-fx): cross-browser fixes + a11y polish"
```

(If no fixes needed, skip the commit.)

- [ ] **Step 6: Push to remote (ask user before pushing)**

Do NOT push automatically. Ask the user:
> "All scroll FX tasks complete and verified. Push to `origin/main` now, or want to review the working site locally first?"

---

## Summary of files changed

| File | Lines added (approx) |
|---|---|
| `index.html` | +20 (cursor div, indicator, stack section, magnetic/cursor-label attrs, counter spans) |
| `styles.css` | +260 (new SCROLL FX section) |
| `script.js` | +200 (initScrollFX, initSplitText, initCounters) |

No new files. No build pipeline changes. Total bundle growth: ~3 kb (Lenis from CDN, cached) + ~7 kb of own CSS/JS gzipped.

## Acceptance recap (matches spec section 6)

1. Desktop ≥1024px, fine pointer, no reduced motion: full effect set works. ✅ (Tasks 1–11)
2. Mobile / coarse pointer: graceful fallback, only split-text + counter remain. ✅ (CSS media queries + `MOTION_FULL` gate)
3. Reduced motion: motion suppressed; readability preserved. ✅ (CSS overrides + JS gate)
4. Lighthouse Performance ≥ 85 desktop. (Verified in Task 12 step 4)
