/* =========================================================
   Diana Tatar — portfolio site
   Client-side logic for index, proiect, and resurse pages.
   ========================================================= */
(function () {
  "use strict";

  /* Form backend — set to "" to fall back to mailto:.
     To activate Formspree: sign up at formspree.io, create a form,
     paste the endpoint URL here (looks like https://formspree.io/f/xxxxxxxx). */
  const FORMSPREE_ENDPOINT = "";

  /* ---------- helpers ---------- */
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- year in footer ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- mobile menu toggle ---------- */
  const navToggle = $(".nav__toggle");
  const navMenu   = $(".nav__menu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const open = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") navMenu.classList.remove("is-open");
    });
  }

  /* ---------- smooth scroll for hash links ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- reveal on scroll ---------- */
  const reveal = $$(".reveal");
  if (reveal.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveal.forEach((el) => io.observe(el));
  }

  /* =========================================================
     CASE — project navigation inside a category
     Each <article.case> may contain multiple .case__slide.
     Arrows cycle through slides; counter shows "n / N".
     ========================================================= */
  $$(".case").forEach((caseEl) => {
    const slides = $$(".case__slide", caseEl);
    const counter = $(".case__counter", caseEl);
    const arrows  = $$(".case__arrow", caseEl);
    if (!slides.length) return;

    let index = slides.findIndex((s) => s.classList.contains("is-active"));
    if (index < 0) index = 0;

    const render = () => {
      slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
      if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
      arrows.forEach((btn) => {
        const dir = Number(btn.dataset.dir);
        const nextIdx = index + dir;
        btn.disabled = slides.length <= 1 || nextIdx < 0 || nextIdx >= slides.length;
      });
    };

    arrows.forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir);
        const next = index + dir;
        if (next < 0 || next >= slides.length) return;
        index = next;
        render();
      });
    });

    render();
  });

  /* =========================================================
     TESTIMONIALS — horizontal carousel
     Centered card becomes color, the others stay grayscale.
     Driven by scroll position + IntersectionObserver.
     ========================================================= */
  const rail  = $("#testimonial-rail");
  if (rail) {
    const track = $(".testimonial__track", rail);
    const cards = $$(".t-card", rail);
    const countEl = $(".testimonial__num", document);
    const tArrows = $$(".t-arrow", rail);

    const setActive = (idx) => {
      cards.forEach((c, i) => c.classList.toggle("is-active", i === idx));
      if (countEl) {
        const n = String(idx + 1).padStart(2, "0");
        countEl.textContent = `[${n}]`;
      }
    };

    /* IO inside the horizontal scroller — the card closest to the rail center wins */
    const pickActiveByScroll = () => {
      const rect = track.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const cr = c.getBoundingClientRect();
        const cCenter = cr.left + cr.width / 2;
        const d = Math.abs(cCenter - center);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      setActive(best);
    };

    track.addEventListener("scroll", pickActiveByScroll, { passive: true });
    window.addEventListener("resize", pickActiveByScroll);
    // wait for first paint to measure correctly
    requestAnimationFrame(pickActiveByScroll);

    tArrows.forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir);
        const step = cards[0].getBoundingClientRect().width + 24;
        track.scrollBy({ left: dir * step, behavior: "smooth" });
      });
    });

    /* Also trigger grayscale->color effect on whole-page scroll:
       when the testimonial section enters viewport, IO keeps the
       active card update responsive even without manual horizontal scroll. */
    if ("IntersectionObserver" in window) {
      const sectionIO = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) pickActiveByScroll();
        }),
        { threshold: 0.25 }
      );
      sectionIO.observe(rail);
    }
  }

  /* =========================================================
     CONTACT FORM — validation + Formspree (with mailto fallback)
     ========================================================= */
  const form = $(".footer__form");
  if (form) {
    const status = $(".footer__status", form);
    const submitBtn = form.querySelector('button[type="submit"]');

    const setStatus = (text, color) => {
      status.textContent = text;
      status.style.color = color;
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name    = (data.get("name")    || "").toString().trim();
      const email   = (data.get("email")   || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();

      if (!name || !email || !message) {
        setStatus("Completează toate câmpurile, te rog.", "#ff7a7a");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setStatus("Adresa de email nu pare validă.", "#ff7a7a");
        return;
      }

      if (FORMSPREE_ENDPOINT) {
        if (submitBtn) submitBtn.disabled = true;
        setStatus("Se trimite…", "rgba(255,255,255,.7)");
        try {
          const res = await fetch(FORMSPREE_ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, message })
          });
          if (!res.ok) throw new Error("Network response was not ok");
          setStatus("Mulțumesc! Mesajul a fost trimis — îți voi răspunde curând.", "rgba(255,255,255,.85)");
          form.reset();
        } catch (err) {
          setStatus("Ceva nu a mers. Încearcă pe Telegram sau direct la email.", "#ff7a7a");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
        return;
      }

      const subject = encodeURIComponent(`Solicitare proiect — ${name}`);
      const body    = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:designerdianatatar30@gmail.com?subject=${subject}&body=${body}`;
      setStatus("Se deschide aplicația de email…", "rgba(255,255,255,.8)");
      form.reset();
    });
  }

  /* =========================================================
     PROJECT DETAIL PAGE (proiect.html)
     Pull data by ?slug=… and hydrate the template.
     ========================================================= */
  const projectRoot = $("#project");
  if (projectRoot) {
    const projects = {
      decoratii: {
        category: "Branding & Identitate vizuală",
        title: "Decorații.md",
        sub: "Decor urban | Rebranding & Identity",
        cover: "assets/images/project-01.webp",
        context: "Orașul nu este doar o construcție din clădiri, străzi și materiale — trăiește prin oamenii săi, prin ideile și detaliile care îi dau sens. Din această înțelegere s-a născut Decorații.md, un brand care aduce claritate, identitate și emoție spațiilor prin care trecem zilnic.",
        goal: "Construirea unei identități vizuale recunoscute pe toate materialele grafice ale Decorații, care să transmită clar ideile de metal, lumină și serviciile oferite de brand.",
        solution: "Sistem vizual unitar construit pe trei culori-pilon — negru (contrast maxim, aplicații elegante), portocaliu (inspirație, dinamism, vizibilitate) și maro (stabilitate, profunzime, conexiune cu materialele naturale). Tipografie NeulisSans, iconografie și texturi dedicate, ghid de aplicare pe print, stand și digital.",
        result: "Brandul a câștigat o identitate coerentă, ușor de recunoscut în spațiul urban, cu layout-uri reutilizabile pentru campanii sezoniere și comunicare pe termen lung."
      },
      "oo-nutrition": {
        category: "Presentation & Social Media",
        title: "OO.Nutrition",
        sub: "Product concept | Prezentare de brand",
        cover: "assets/images/project-02-b.webp",
        context: "OO.Nutrition aveau nevoie de o prezentare de produs clară, care să explice conceptul și beneficiile liniei de nutriție către parteneri și investitori, cât și să funcționeze ca material de comunicare pe social media.",
        goal: "Un document care să vândă conceptul — structură editorială ușor de parcurs, ierarhie tipografică puternică și vizualuri care să transmită ideea de produs premium, fără a încărca informația.",
        solution: "Am construit o prezentare modulară pornind de la conceptul de produs, cu paletă asortată brandului, iconografie simplă, machete de pagini reutilizabile și un set de slide-uri adaptate pentru postări pe social media.",
        result: "Materialul a devenit principalul instrument de comunicare a brandului către parteneri, iar echipa OO.Nutrition a putut reutiliza slide-urile pentru campanii noi fără a cere redesign de la zero."
      },
      "centrul-sportiv": {
        category: "Editorial & Print",
        title: "Centrul sportiv de pregătire a loturilor naționale",
        sub: "Brand book, flyere și reviste",
        cover: "assets/images/project-bg.webp",
        context: "Centrul sportiv de pregătire a loturilor naționale avea nevoie de materiale tipărite (flyere, reviste, documente de prezentare) care să reflecte seriozitatea și prestigiul instituției, dar să rămână accesibile publicului larg.",
        goal: "Un sistem editorial care să susțină comunicarea oficială și, în același timp, să facă informația ușor de parcurs pentru sportivi, antrenori și parteneri.",
        solution: "Grid editorial pe 8 coloane, ierarhie tipografică clară, fotografie documentară combinată cu infografice. Am livrat layout-uri pentru flyere, revista internă și materiale de eveniment, toate folosind același sistem vizual.",
        result: "Materiale folosite la evenimente oficiale și la comunicarea internă; instituția a câștigat un format editorial pe care îl poate extinde singură pentru numerele următoare."
      },
      "campanie-vizuala": {
        category: "Concept vizual & Campanii",
        title: "Campanii vizuale — BloomIn & Fine Digital",
        sub: "Direcție creativă | Social + Print",
        cover: "assets/images/project-bg.webp",
        context: "Pentru clienții BloomIn Agency și Fine Digital am coordonat concepte vizuale pentru campanii de marketing — de la cercetarea publicului țintă până la livrabilele finale pentru social media, bannere și materiale promoționale.",
        goal: "Direcție creativă coerentă care să transmită același mesaj pe toate canalele, adaptabilă de către echipele clientului fără pierderea tonului.",
        solution: "Moodboard detaliat, concept narativ cu piloni vizuali clari, paletă asortată, machete pentru toate canalele (static, video, print). Ghid de aplicare astfel încât echipele interne să poată continua producția autonom.",
        result: "Campaniile au fost lansate cu identitate unitară pe toate canalele; clienții au continuat să producă conținut nou păstrând direcția vizuală stabilită."
      },
      "vector-academy-ai": {
        category: "Generare conținut cu AI",
        title: "Vector Academy — AI content",
        sub: "AI mentor | Video, static, moodboards",
        cover: "assets/images/project-bg.webp",
        context: "În calitate de AI content creator și AI mentor la Vector Academy, dezvolt concepte grafice pentru postări social media, bannere și materiale promoționale folosind workflow-uri mixte — design clasic + generare cu AI.",
        goal: "Livrare rapidă și constantă de conținut vizual cu look premium, fără costurile unui shooting pentru fiecare campanie, menținând o estetică coerentă de la un lansare la alta.",
        solution: "Workflow hibrid — prompt library reutilizabil, moodboard-uri și scene generate cu AI, retouch și compoziție în Photoshop/Illustrator, export în formate pregătite pentru social și print. Sesiuni de mentorat pentru echipele interne.",
        result: "Timp de producție redus semnificativ, estetică unitară pe mai multe colecții și campanii, plus un sistem pe care echipele Vector Academy îl pot rula autonom."
      }
    };

    const order = Object.keys(projects);
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const data = projects[slug] || projects[order[0]];

    const set = (field, value) => {
      const el = projectRoot.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      if (field === "cover") el.setAttribute("src", value);
      else                   el.textContent = value;
    };

    if (data) {
      const safeSlug = slug in projects ? slug : order[0];
      document.title = `${data.title} — Diana Tatar`;
      set("category", data.category);
      set("title",    data.title);
      set("sub",      data.sub);
      set("cover",    data.cover);
      set("context",  data.context);
      set("goal",     data.goal);
      set("solution", data.solution);
      set("result",   data.result);

      const canonicalUrl = `https://dianatatar.com/proiect.html?slug=${safeSlug}`;
      const canonical = document.getElementById("canonical-link");
      if (canonical) canonical.setAttribute("href", canonicalUrl);
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute("content", canonicalUrl);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute("content", `${data.title} — Diana Tatar`);
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute("content", `https://dianatatar.com/${data.cover}`);
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", data.context.slice(0, 160));
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", data.context.slice(0, 160));

      /* Prev / Next within the whole portfolio (wraps around) */
      const idx = order.indexOf(safeSlug);
      const prevSlug = order[(idx - 1 + order.length) % order.length];
      const nextSlug = order[(idx + 1) % order.length];
      const prev = projectRoot.querySelector('[data-rel="prev"]');
      const next = projectRoot.querySelector('[data-rel="next"]');
      if (prev) prev.setAttribute("href", `proiect.html?slug=${prevSlug}`);
      if (next) next.setAttribute("href", `proiect.html?slug=${nextSlug}`);
    }
  }

  /* =========================================================
     RESURSE (blog) — category filter
     ========================================================= */
  const resGrid = $("#resources-grid");
  if (resGrid) {
    const chips = $$(".chip");
    const cards = $$(".r-card", resGrid);
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        chips.forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        const cat = chip.dataset.cat;
        cards.forEach((card) => {
          card.style.display = cat === "all" || card.dataset.cat === cat ? "" : "none";
        });
      });
    });
  }

  /* =========================================================
     SCROLL FX — Lenis + stacking + cursor + parallax + marquee
     Only initializes when MOTION_FULL is true.
     ========================================================= */
  const MOTION_FULL =
    matchMedia("(min-width: 1024px)").matches &&
    matchMedia("(pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  let lenis = null;
  let cases = [];

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

    /* Parallax — translate3d on Y for select images */
    const parallaxTargets = [
      { el: $(".hero__bg img"),     factor: 0.15 },
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

    /* Stack indicator — counter [N / 05] + bottom progress bar */
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
        const denom = stackRect.height - window.innerHeight;
        const totalProgress = denom > 0
          ? Math.max(0, Math.min(1, -stackRect.top / denom))
          : 0;
        barFill.style.setProperty("--bar-progress", `${(totalProgress * 100).toFixed(1)}%`);
      };

      const onIndicatorScroll = () => requestAnimationFrame(updateIndicator);
      if (lenis) lenis.on("scroll", onIndicatorScroll);
      else window.addEventListener("scroll", onIndicatorScroll, { passive: true });
      requestAnimationFrame(updateIndicator);
    }

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

    /* Marquee — JS-driven so it can react to scroll velocity */
    const tickerTrack = $(".ticker__track");
    if (tickerTrack && lenis) {
      let x = 0;
      let velocity = 0;
      let smoothedSkew = 0;
      const baseSpeed = 60; // px/s
      let lastT = performance.now();

      lenis.on("scroll", (e) => {
        if (e && typeof e.velocity === "number") velocity = e.velocity;
      });

      const trackLoop = (t) => {
        const dt = Math.min(0.05, (t - lastT) / 1000);
        lastT = t;
        const boost = Math.max(-200, Math.min(200, velocity * 0.5));
        x -= (baseSpeed + boost) * dt;
        const trackWidth = tickerTrack.scrollWidth / 3;
        if (trackWidth > 0) {
          if (-x >= trackWidth) x += trackWidth;
          if (x > 0) x -= trackWidth;
        }
        const targetSkew = Math.max(-3, Math.min(3, -velocity * 0.02));
        smoothedSkew += (targetSkew - smoothedSkew) * 0.12;
        tickerTrack.style.setProperty("--ticker-x", `${x.toFixed(1)}px`);
        tickerTrack.style.setProperty("--ticker-skew", `${smoothedSkew.toFixed(2)}deg`);
        requestAnimationFrame(trackLoop);
      };
      requestAnimationFrame(trackLoop);
    }
  }

  initScrollFX();

  /* =========================================================
     Split-text reveal — runs unconditionally (cheap, respects
     reduced motion via CSS). Walks text nodes only, so nested
     <strong> and <br/> stay intact.
     ========================================================= */
  function splitNode(node, counter) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (!part.trim()) {
          frag.appendChild(document.createTextNode(part));
          return;
        }
        const wordSpan = document.createElement("span");
        wordSpan.className = "word";
        for (const c of part) {
          const charSpan = document.createElement("span");
          charSpan.className = "char";
          charSpan.style.setProperty("--i", counter.value);
          charSpan.textContent = c;
          wordSpan.appendChild(charSpan);
          counter.value++;
        }
        frag.appendChild(wordSpan);
      });
      return frag;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "BR") return node.cloneNode(true);
      const wrapper = node.cloneNode(false);
      Array.from(node.childNodes).forEach((child) => {
        wrapper.appendChild(splitNode(child, counter));
      });
      return wrapper;
    }
    return node.cloneNode(true);
  }

  function initSplitText() {
    const splitTargets = $$(".display, .case__category, .case__title");
    splitTargets.forEach((el) => {
      const counter = { value: 0 };
      const newChildren = Array.from(el.childNodes).map((c) => splitNode(c, counter));
      while (el.firstChild) el.removeChild(el.firstChild);
      newChildren.forEach((c) => el.appendChild(c));
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

  /* =========================================================
     Number counter — animates 0 → target on first enter.
     Respects prefers-reduced-motion (skipped, static value used).
     ========================================================= */
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
})();
