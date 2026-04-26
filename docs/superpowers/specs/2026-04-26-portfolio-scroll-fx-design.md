# Portfolio Scroll FX — Design Spec

**Date:** 2026-04-26
**Project:** Diana Tatar — graphic designer portfolio (`dianatatar.com`)
**Goal:** Cinematic scroll experience with portfolio cases stacking on top of each other; coherent "wow" feel for a designer's site without heavy frameworks.

---

## 1. Architecture

Stack: pure HTML/CSS/JS (no build step) + **Lenis** (~3 kb gzip) for smooth scroll.

**File-level changes:**

| File | Change |
|---|---|
| `index.html` | Add Lenis CDN `<script type="module">`, add `<div class="cursor"></div>` and `<div class="cursor__label"></div>` near `</body>`. Wrap existing `.case` blocks in a single `<section class="cases-stack">…</section>`. Inside each `.case`, wrap the existing `.case__header` + `.case__stage` in a new `.case__pin` div. Restructure `.about` text so "200+" becomes `<span class="counter" data-count-to="200">0</span>+`. |
| `styles.css` | Add new section `/* SCROLL FX */` (~250 lines) covering `.cases-stack`, `.case__pin` (sticky), stack transforms via CSS variables, `.cursor`, `.char`/`.word` (split-text), reduced-motion overrides, mobile fallback. |
| `script.js` | Add new module `initScrollFX()` (~180 lines): Lenis init, stack progress observer, custom cursor, split-text initializer, marquee velocity, magnetic CTAs, parallax, number counter. Existing logic (case slides, testimonials, form, project page, resources page) untouched. |

No new files. No build pipeline change. Deploy stays static.

---

## 2. Stacking mechanics (the headline effect)

### DOM

```html
<section class="cases-stack">
  <article class="case" data-index="01">
    <div class="case__pin">
      <div class="case__header">…</div>
      <div class="case__stage">…</div>
    </div>
  </article>
  <!-- ×5 (cases 01–05) -->
</section>
```

### CSS

- `.cases-stack` — block container, no internal gap.
- `.case` — `height: calc(100vh + 60px)`. The last case (`05`) keeps `height: 100vh` so it doesn't try to peek under `.services`.
- `.case__pin` — `position: sticky; top: 0; height: 100vh; overflow: hidden; transform-origin: 50% 0; will-change: transform, filter;`. Internal layout (header + stage) preserved.
- `.case:nth-child(N) .case__pin { z-index: N; }` — ensures the next card always paints over the previous one.

### Stack progress (JS)

For each `.case`, on every `lenis.on('scroll')`:

```js
const rect = caseEl.getBoundingClientRect();
const progress = Math.max(0, Math.min(1, -rect.top / rect.height));
caseEl.style.setProperty('--stack-progress', progress);
```

`progress`:
- `0` while the card is in its natural pinned position.
- Grows from `0` → `1` as the next card pushes it up under the sticky boundary (because `.case` is taller than 100vh, sticky lets go before the next case begins).

### Transforms applied to `.case__pin`

```css
.case__pin {
  transform: scale(calc(1 - 0.06 * var(--stack-progress, 0)));
  filter:
    brightness(calc(1 - 0.45 * var(--stack-progress, 0)))
    blur(calc(2px * var(--stack-progress, 0)));
}
```

Result: outgoing card recedes (max `scale(0.94)`, `brightness(0.55)`, `blur(2px)`); incoming card slides over it. The 60px height surplus per `.case` produces a ~40px visible "tail" of the previous project under the incoming one — readable as "there's more underneath".

### Progress indicator (fixed UI)

Top-right of viewport, while inside `.cases-stack`:

- Counter `[01 / 05]` updates to whichever case has `progress < 0.5` (i.e. is currently the dominant one).
- Thin horizontal line (1px) at the very bottom of the viewport, width % equal to overall progress through `.cases-stack`.
- Both fade in on entering `.cases-stack`, fade out on leaving (IntersectionObserver on the section).

### IntersectionObserver guard

`will-change` is only set on cases currently within `rootMargin: 50% 0px` of the viewport — set on enter, removed on leave. Prevents 5 GPU layers being kept alive uselessly.

---

## 3. Other wow effects

### A. Custom cursor

Markup: `<div class="cursor"></div>` and `<div class="cursor__label"></div>` placed once in `<body>`.

CSS:
- `.cursor` — `position: fixed; width: 36px; height: 36px; border-radius: 50%; background: white; mix-blend-mode: difference; pointer-events: none; z-index: 9999;`.
- `.cursor__label` — `position: fixed; pointer-events: none; opacity: 0; transition: opacity 200ms;` — content set from JS.

Behavior:
- Lerp to mouse with factor `0.18` (cursor lags slightly — magnetic feel).
- Hover on any element with `data-cursor-label="..."`: `.cursor` expands to 140×40, label fades in showing the text.
- Hidden via `@media (pointer: coarse) { .cursor, .cursor__label { display: none; } }`.

Targets in HTML get `data-cursor-label`:
- `.case__cta` → `"Vezi proiectul →"`
- `.btn-cv` → `"Descarcă"`
- `.case__arrow` → `"←"` / `"→"` (direction-aware)
- `.t-arrow` → `"←"` / `"→"`

### B. Split-text reveal on `.display` headlines

Targets: `.about__title`, `.portfolio-head__title`, `.services__title`, `.testimonial__head h2`, `.case__category`, `.case__title`.

JS at init:

```js
function splitText(el) {
  const words = el.textContent.split(/(\s+)/);
  el.innerHTML = words
    .map(w => w.trim()
      ? `<span class="word">${[...w].map((c, i) => `<span class="char" style="--i:${i}">${c}</span>`).join('')}</span>`
      : ' '
    ).join('');
}
```

CSS:
```css
.word { display: inline-block; overflow: hidden; }
.char {
  display: inline-block;
  transform: translateY(110%);
  transition: transform 700ms var(--ease) calc(var(--i) * 22ms);
}
.is-revealed .char { transform: translateY(0); }
```

IntersectionObserver adds `.is-revealed` to each `.display` once on enter (threshold 0.3). One-shot — not re-triggered on re-enter.

### C. Marquee velocity-aware

Existing `.ticker__track` currently animates via `@keyframes`. Replaced by `requestAnimationFrame`-driven `transform: translate3d(x, 0, 0)`:

- Base speed: 60px/s (matches current ~30s cycle).
- `velocityBoost = clamp(lenis.velocity * 0.5, -200, 200)` added to base speed each frame.
- `skewX(calc(-3deg * sign(velocity)))` applied while `|velocity| > 50`, returning to 0 with 200ms ease.
- Direction reverses momentarily when velocity flips.

Fallback: on mobile (no Lenis), keep CSS `@keyframes` exactly as today.

### D. Parallax

Three targets, single `applyParallax(el, factor)`:

```js
const targets = [
  { el: '.hero__bg img',   factor: 0.15 },
  { el: '.about__photo img', factor: 0.08 },
  { el: '.footer__bg img',  factor: 0.12 },
];

function applyParallax(el, factor) {
  const rect = el.getBoundingClientRect();
  const center = rect.top + rect.height / 2 - innerHeight / 2;
  el.style.transform = `translate3d(0, ${center * factor * -1}px, 0)`;
}
```

Hooked into `lenis.on('scroll')`. Each parent gets `overflow: hidden` to clip the moving image.

### E. Magnetic CTAs

Buttons with `data-magnetic`: `.btn--primary`, `.hero__link`, `.case__cta`, `.btn-cv`, `.nav__cta`.

```js
btn.addEventListener('mousemove', (e) => {
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const dx = (e.clientX - cx) * 0.3;
  const dy = (e.clientY - cy) * 0.3;
  btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
});
btn.addEventListener('mouseleave', () => {
  btn.style.transform = '';
});
```

Activates only when cursor is within bounds (`mousemove` is fired from inside the button anyway).

### F. Number counter in About

Replace "200+" inline text with `<span class="counter" data-count-to="200">0</span>+`. IntersectionObserver triggers `animate(0, 200, 1400, easeOutQuart)` on first enter.

```js
function easeOutQuart(t) { return 1 - Math.pow(1 - t, 4); }
function animateCount(el, to, duration) {
  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(to * easeOutQuart(t));
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

---

## 4. Mobile, accessibility, performance

### Motion gate

Single JS flag at script init:

```js
const MOTION_FULL =
  matchMedia('(min-width: 1024px)').matches &&
  matchMedia('(pointer: fine)').matches &&
  !matchMedia('(prefers-reduced-motion: reduce)').matches;
```

If `MOTION_FULL === false`:
- Lenis is **not** loaded (skip the import).
- Sticky stacking does not initialize → `.case__pin` falls back to `position: static` via CSS media query.
- Custom cursor not initialized.
- Magnetic CTAs not initialized.
- Parallax not initialized.
- Marquee uses CSS `@keyframes` (existing behavior).
- Split-text reveal **stays** (cheap, no motion sickness risk).
- Number counter **stays**.

### Mobile/tablet CSS fallback

```css
@media (max-width: 1023px) {
  .case { height: auto; }
  .case__pin { position: static; height: auto; transform: none; filter: none; }
  .case__pin { z-index: auto; }
}

@media (pointer: coarse) {
  .cursor, .cursor__label { display: none; }
}
```

### Reduced motion overrides

```css
@media (prefers-reduced-motion: reduce) {
  .case__pin { position: static; transform: none !important; filter: none !important; }
  .char { transform: none !important; transition: opacity 300ms; opacity: 0; }
  .is-revealed .char { opacity: 1; }
  .cursor, .cursor__label { display: none; }
  .ticker__track { animation: none; transform: none; }
}
```

### Performance budget

| Metric | Target |
|---|---|
| Lenis bundle | ≤ 4 kb gzip (CDN, async via `type="module"`) |
| Added CSS | ~250 lines, ~6 kb uncompressed |
| Added JS | ~180 lines, ~5 kb uncompressed |
| LCP | Unchanged — still `assets/images/hero.webp` (preloaded) |
| CLS | 0 — split-text doesn't change layout (chars stay inline, just translated) |
| TBT | `lenis.on('scroll')` handler under 1ms per frame (rect reads + CSS variable writes only, no layout thrash) |

### will-change discipline

- `will-change: transform, filter` set on `.case__pin` only when its `.case` is within `rootMargin: 50% 0px` (IntersectionObserver). Removed otherwise.
- Same pattern for parallax targets (set on enter, remove on leave).

### Lenis init shape

```js
import Lenis from 'https://unpkg.com/lenis@1.x/dist/lenis.mjs';
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
requestAnimationFrame(raf);
```

The native smooth-scroll for `<a href="#…">` (existing `script.js`) gets replaced by `lenis.scrollTo(target)` when `MOTION_FULL` is true; falls back to native `scrollIntoView` otherwise.

---

## 5. Out of scope

Not part of this work (could be future enhancements):
- WebGL / shader effects on hero (variant C from brainstorm).
- Page transitions between `index.html` ↔ `proiect.html` (full-page curtain).
- 3D tilt on cards.
- Page-load preloader.

---

## 6. Acceptance criteria

1. On desktop (Chrome/Safari/Firefox, ≥1024px, fine pointer, no `prefers-reduced-motion`):
   - All 5 cases stack with the depth effect; outgoing card visibly recedes.
   - Custom cursor visible, expands with label on `.case__cta` hover.
   - Marquee speeds up while scrolling fast, returns to base when idle.
   - All `.display` headlines reveal with character-staggered animation on enter.
   - Hero, about photo, and footer image have parallax.
   - Smooth-scroll feels noticeably "lerp-y" (Lenis active).
   - "200+" counter animates from 0 on enter.
   - No console errors. No layout shift (CLS = 0).
2. On mobile (≤1023px or coarse pointer):
   - Cases scroll as before (no stacking).
   - No custom cursor, no magnetic CTAs, no parallax.
   - Split-text reveal still plays.
   - Marquee uses pure CSS animation (no JS).
3. With `prefers-reduced-motion: reduce` on desktop:
   - No sticky stacking (cases scroll naturally).
   - No parallax, no cursor, no marquee animation.
   - Split-text → opacity fade only.
4. Lighthouse Performance score on desktop home page ≥ 90 (matches or exceeds current).
