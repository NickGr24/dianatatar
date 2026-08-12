/* =========================================================
   Diana Tatar — portfolio site
   Client-side logic for index, proiect, and resurse pages.
   ========================================================= */
(function () {
  "use strict";

  /* Form backend — set to "" to fall back to mailto:.
     FormSubmit needs no account: the first submission emails an activation
     link to designerdianatatar@gmail.com; once confirmed, messages arrive
     directly in the inbox. A Formspree endpoint works here too. */
  const FORM_ENDPOINT = "https://formsubmit.co/ajax/designerdianatatar@gmail.com";

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
    const setMenuOpen = (open) => {
      navMenu.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("is-menu-open", open);
    };
    navToggle.addEventListener("click", () => {
      setMenuOpen(!navMenu.classList.contains("is-open"));
    });
    navMenu.addEventListener("click", (e) => {
      if (e.target.tagName === "A") setMenuOpen(false);
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
      const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    });
  });

  /* ---------- reveal on scroll ----------
     .is-settled is added once the fade-up has played: it drops the
     transition so the element stops being restyled on every later
     frame. Fast scrolling used to enter several of these at once and
     each one kept billing the main thread for its full duration. */
  const reveal = $$(".reveal");
  if (reveal.length && "IntersectionObserver" in window) {
    const settleReveal = (el) => {
      const done = (e) => {
        if (e && e.target !== el) return;      // ignore bubbling child transitions
        el.removeEventListener("transitionend", done);
        clearTimeout(fallback);
        el.classList.add("is-settled");
      };
      // transitionend can be skipped entirely (background tab, interrupted
      // transition), so a timer guarantees the element still settles.
      const fallback = setTimeout(done, 1200);
      el.addEventListener("transitionend", done);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            settleReveal(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    reveal.forEach((el) => io.observe(el));
  }

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

    /* Clicking a card (or using the arrows) must always activate it,
       even when the card can't physically reach the rail center —
       so manual choices briefly override the scroll-position picker. */
    let manualUntil = 0;

    /* IO inside the horizontal scroller — the card closest to the rail center wins */
    const pickActiveByScroll = () => {
      if (Date.now() < manualUntil) return;
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

    const activateCard = (i) => {
      const idx = Math.min(cards.length - 1, Math.max(0, i));
      manualUntil = Date.now() + 900;
      setActive(idx);
      const c = cards[idx];
      track.scrollTo({
        left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2,
        behavior: "smooth"
      });
    };

    cards.forEach((card, i) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".t-card__more")) return;
        activateCard(i);
      });
    });

    track.addEventListener("scroll", pickActiveByScroll, { passive: true });
    window.addEventListener("resize", pickActiveByScroll);
    // wait for first paint to measure correctly
    requestAnimationFrame(pickActiveByScroll);

    /* Blurred backdrop behind the contained (uncropped) photo —
       each figure gets its own image as a CSS variable. */
    cards.forEach((card) => {
      const img = card.querySelector(".t-card__photo");
      const fig = card.querySelector("figure");
      if (img && fig) fig.style.setProperty("--photo", `url("${img.getAttribute("src")}")`);
    });

    /* Long quotes are clamped to a few lines so the photo stays visible;
       "Citește tot" expands the full text in place. */
    cards.forEach((card) => {
      const quote = card.querySelector("blockquote");
      if (!quote) return;
      quote.classList.add("is-clamped");
      if (quote.scrollHeight <= quote.clientHeight + 4) {
        quote.classList.remove("is-clamped");
        return;
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "t-card__more";
      btn.textContent = "Citește tot";
      btn.setAttribute("aria-expanded", "false");
      quote.insertAdjacentElement("afterend", btn);
      btn.addEventListener("click", () => {
        const expanded = !quote.classList.toggle("is-clamped");
        btn.textContent = expanded ? "Restrânge" : "Citește tot";
        btn.setAttribute("aria-expanded", String(expanded));
      });
    });

    tArrows.forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir);
        const cur = cards.findIndex((c) => c.classList.contains("is-active"));
        activateCard((cur < 0 ? 0 : cur) + dir);
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
     VIEW TRANSITIONS — the clicked card's cover morphs into the
     project hero. Names must be unique per page at snapshot time,
     so only the card being navigated gets one.
     ========================================================= */
  $$(".pf-card").forEach((card) => {
    card.addEventListener("click", () => {
      $$(".pf-card .pf-card__media img").forEach((i) => { i.style.viewTransitionName = ""; });
      const img = $(".pf-card__media img", card);
      if (img) img.style.viewTransitionName = "project-cover";
    });
  });

  window.addEventListener("pagereveal", (e) => {
    if (!e.viewTransition) return;
    const act = window.navigation && navigation.activation;
    let from = null;
    try { from = act && act.from && act.from.url ? new URL(act.from.url) : null; } catch (_) {}
    if (!from || from.origin !== location.origin) return;

    /* Arriving from another internal page: things already in the
       viewport are shown at rest — no replayed entrance animations
       underneath the transition. */
    $$(".reveal").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-visible");
    });

    /* Project -> portfolio: the hero cover flies back into its card
       (only when that card is actually on screen). */
    const m = from.pathname.match(/\/proiecte\/([a-z0-9-]+)\//);
    const slug = (m && m[1]) || from.searchParams.get("slug");
    if (slug) {
      const img = $(`.pf-card[href$="slug=${slug}"] .pf-card__media img`);
      if (img) {
        const r = img.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) {
          img.style.viewTransitionName = "project-cover";
          e.viewTransition.finished.then(() => { img.style.viewTransitionName = ""; });
        }
      }
    }
  });

  /* =========================================================
     CONTACT FORM — validation + Formspree (with mailto fallback)
     ========================================================= */
  const form = $(".footer__form");
  if (form) {
    const status = $(".footer__status", form);
    const submitBtn = form.querySelector('button[type="submit"]');
    const submitHTML = submitBtn ? submitBtn.innerHTML : "";

    const setStatus = (text, color) => {
      status.textContent = text;
      status.style.color = color;
    };

    const showSuccessButton = () => {
      if (!submitBtn) return;
      submitBtn.classList.remove("is-loading");
      submitBtn.classList.add("is-success");
      submitBtn.innerHTML =
        'Trimis <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">' +
        '<path class="check" d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" ' +
        'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(() => {
        submitBtn.classList.remove("is-success");
        submitBtn.innerHTML = submitHTML;
      }, 4000);
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

      if (FORM_ENDPOINT) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add("is-loading");
        }
        setStatus("Se trimite…", "rgba(255,255,255,.7)");
        try {
          const res = await fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: { "Accept": "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({
              name, email, message,
              _subject: `Solicitare proiect — ${name}`,
              _template: "table"
            })
          });
          /* FormSubmit answers 200 even when it did NOT deliver
             (e.g. form awaiting activation) — trust only success:true */
          const out = await res.json().catch(() => null);
          if (!res.ok || !out || String(out.success) !== "true") {
            throw new Error(out && out.message ? out.message : "FormSubmit refused");
          }
          setStatus("Mulțumesc! Mesajul a fost trimis — îți voi răspunde curând.", "rgba(255,255,255,.85)");
          showSuccessButton();
          form.reset();
        } catch (err) {
          if (submitBtn) submitBtn.classList.remove("is-loading");
          setStatus("Ceva nu a mers. Încearcă pe Telegram sau direct la email.", "#ff7a7a");
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
        return;
      }

      const subject = encodeURIComponent(`Solicitare proiect — ${name}`);
      const body    = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
      window.location.href = `mailto:designerdianatatar@gmail.com?subject=${subject}&body=${body}`;
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
    const projects = window.DT_PROJECTS || {};
    const order = Object.keys(projects);
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug") || projectRoot.dataset.slug || null;
    const data = projects[slug] || projects[order[0]];

    const set = (field, value) => {
      const el = projectRoot.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      if (field === "cover") {
        el.setAttribute("src", value);
        /* Square-ish covers don't survive the 16:9 crop — show them
           whole over a blurred copy once the real size is known. */
        const frameEl = el.closest(".project__cover");
        if (frameEl) {
          const applyFit = () => {
            const frame = 16 / 9;
            const a = el.naturalWidth / el.naturalHeight;
            if (a && Math.abs(a - frame) / frame > 0.15) {
              frameEl.classList.add("project__cover--fit");
              frameEl.style.setProperty("--photo", `url("${value}")`);
            }
          };
          if (el.complete && el.naturalWidth) applyFit();
          else el.addEventListener("load", applyFit, { once: true });
        }
      }
      else                   el.textContent = value;
    };

    if (data) {
      const safeSlug = slug in projects ? slug : order[0];
      document.title = `${data.title} — ${data.category} | Diana Tatar`;
      set("category", data.category);
      set("title",    data.title);
      set("sub",      data.sub);
      set("cover",    data.cover);
      set("context",  data.context);
      set("goal",     data.goal);
      set("solution", data.solution);
      set("result",   data.result);

      /* Gallery — full set of project visuals, click opens the lightbox */
      const gallery = projectRoot.querySelector('[data-field="gallery"]');
      if (gallery && Array.isArray(data.images) && data.images.length) {
        const grid = gallery.querySelector(".project__gallery-grid");
        grid.innerHTML = "";

        const lb = document.createElement("div");
        lb.className = "lightbox";
        lb.setAttribute("role", "dialog");
        lb.setAttribute("aria-modal", "true");
        lb.setAttribute("aria-label", "Imagine mărită din proiect");
        lb.innerHTML =
          '<button class="lightbox__close" aria-label="Închide">&times;</button>' +
          '<button class="lightbox__nav lightbox__nav--prev" aria-label="Imaginea anterioară">&#8249;</button>' +
          '<img class="lightbox__img" alt="" />' +
          '<button class="lightbox__nav lightbox__nav--next" aria-label="Imaginea următoare">&#8250;</button>' +
          '<span class="lightbox__count" aria-hidden="true"></span>';
        document.body.appendChild(lb);

        const lbImg = lb.querySelector(".lightbox__img");
        const lbCount = lb.querySelector(".lightbox__count");
        let lbIndex = 0;

        const showLb = (i) => {
          lbIndex = (i + data.images.length) % data.images.length;
          lbImg.src = data.images[lbIndex];
          lbImg.alt = `${data.title} — imagine ${lbIndex + 1} din proiect`;
          lbCount.textContent = `${lbIndex + 1} / ${data.images.length}`;
        };
        const openLb = (i) => {
          showLb(i);
          lb.classList.add("is-open");
          document.body.classList.add("is-lightbox-open");
        };
        const closeLb = () => {
          lb.classList.remove("is-open");
          document.body.classList.remove("is-lightbox-open");
        };

        lb.querySelector(".lightbox__close").addEventListener("click", closeLb);
        lb.querySelector(".lightbox__nav--prev").addEventListener("click", () => showLb(lbIndex - 1));
        lb.querySelector(".lightbox__nav--next").addEventListener("click", () => showLb(lbIndex + 1));
        lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
        document.addEventListener("keydown", (e) => {
          if (!lb.classList.contains("is-open")) return;
          if (e.key === "Escape") closeLb();
          if (e.key === "ArrowLeft") showLb(lbIndex - 1);
          if (e.key === "ArrowRight") showLb(lbIndex + 1);
        });
        let lbX0 = 0;
        lb.addEventListener("touchstart", (e) => { lbX0 = e.touches[0].clientX; }, { passive: true });
        lb.addEventListener("touchend", (e) => {
          const dx = e.changedTouches[0].clientX - lbX0;
          if (Math.abs(dx) > 50) showLb(lbIndex + (dx < 0 ? 1 : -1));
        }, { passive: true });

        data.images.forEach((src, i) => {
          const fig = document.createElement("figure");
          fig.className = "project__gallery-item";
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "project__gallery-btn";
          btn.setAttribute("aria-label", `Mărește imaginea ${i + 1} din proiect`);
          const img = document.createElement("img");
          img.src = src;
          img.alt = `${data.title} — imagine ${i + 1} din proiect`;
          img.loading = "lazy";
          img.decoding = "async";
          btn.appendChild(img);
          btn.addEventListener("click", () => openLb(i));
          fig.appendChild(btn);
          /* Rebranding pairs: label the old/new logo so the story
             "cum a fost → cum a devenit" reads at a glance. */
          const beforeAfter = src.includes("-before") ? "Înainte"
            : src.includes("-after") ? "După" : null;
          if (beforeAfter) {
            const cap = document.createElement("figcaption");
            cap.className = "project__gallery-cap";
            cap.textContent = beforeAfter;
            fig.appendChild(cap);
          }
          grid.appendChild(fig);
        });

        /* Masked reveal: each frame wipes open as it scrolls into view */
        const galleryItems = $$(".project__gallery-item", grid);
        if ("IntersectionObserver" in window &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const gio = new IntersectionObserver((entries) => entries.forEach((en) => {
            if (en.isIntersecting) {
              en.target.classList.add("is-open");
              gio.unobserve(en.target);
            }
          }), { threshold: 0, rootMargin: "0px 0px 120px 0px" });
          galleryItems.forEach((f) => gio.observe(f));
        } else {
          galleryItems.forEach((f) => f.classList.add("is-open"));
        }
        gallery.hidden = false;
      }

      const canonicalUrl = `https://dianatatar.com/proiecte/${safeSlug}/`;
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
      if (prev) prev.setAttribute("href", `/proiecte/${prevSlug}/`);
      if (next) next.setAttribute("href", `/proiecte/${nextSlug}/`);
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
     SCROLL FX — stacking + cursor + parallax + marquee + magnetic
     Only initializes when MOTION_FULL is true.
     ========================================================= */
  const MOTION_FULL =
    matchMedia("(min-width: 1024px)").matches &&
    matchMedia("(pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initScrollFX() {
    if (!MOTION_FULL) return;
    document.documentElement.classList.add("js-stack-on");

    /* Custom cursor */
    const cursor = $(".cursor");
    const cursorLabel = $(".cursor__label");
    if (cursor && cursorLabel) {
      let mx = window.innerWidth / 2, my = window.innerHeight / 2;
      let cx = mx, cy = my;
      let cursorRaf = 0;
      /* The ring eases toward the pointer, so it only needs frames while
         it is still catching up. Scrolling by wheel leaves the pointer
         still — the loop used to keep running through every scroll. */
      const cursorLoop = () => {
        cx += (mx - cx) * 0.18;
        cy += (my - cy) * 0.18;
        cursor.style.transform = `translate3d(${cx - 18}px, ${cy - 18}px, 0)`;
        cursorLabel.style.transform = `translate3d(${mx + 22}px, ${my - 8}px, 0)`;
        if (Math.abs(mx - cx) < 0.1 && Math.abs(my - cy) < 0.1) {
          cursorRaf = 0;   // settled — sleep until the pointer moves again
          return;
        }
        cursorRaf = requestAnimationFrame(cursorLoop);
      };
      window.addEventListener("mousemove", (e) => {
        mx = e.clientX; my = e.clientY;
        if (!cursorRaf) cursorRaf = requestAnimationFrame(cursorLoop);
      });
      cursorRaf = requestAnimationFrame(cursorLoop);

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

    /* One rAF per frame even when the wheel fires many scroll events */
    let parallaxQueued = false;
    window.addEventListener("scroll", () => {
      if (parallaxQueued) return;
      parallaxQueued = true;
      requestAnimationFrame(() => {
        parallaxQueued = false;
        updateParallax();
      });
    }, { passive: true });
    requestAnimationFrame(updateParallax);

    /* Marquee — JS-driven so it can react to scroll velocity */
    const tickerTrack = $(".ticker__track");
    if (tickerTrack) {
      let x = 0;
      let velocity = 0;
      let smoothedSkew = 0;
      let lastScrollY = window.scrollY;
      const baseSpeed = 60; // px/s
      let lastT = performance.now();
      let raf = 0;

      /* scrollWidth forces a synchronous layout. Reading it inside the
         loop made the ticker buy a full layout ~60x/s for the lifetime
         of the page; the width only changes when the line re-wraps. */
      let trackWidth = tickerTrack.scrollWidth / 3;
      const measure = () => { trackWidth = tickerTrack.scrollWidth / 3; };
      window.addEventListener("resize", measure, { passive: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

      const trackLoop = (t) => {
        const dt = Math.min(0.05, (t - lastT) / 1000);
        lastT = t;
        const dy = window.scrollY - lastScrollY;
        lastScrollY = window.scrollY;
        // pixels per second from native scroll delta
        const targetVel = dt > 0 ? dy / dt : 0;
        velocity += (targetVel - velocity) * 0.18;
        const boost = Math.max(-200, Math.min(200, velocity * 0.5));
        x -= (baseSpeed + boost) * dt;
        if (trackWidth > 0) {
          if (-x >= trackWidth) x += trackWidth;
          if (x > 0) x -= trackWidth;
        }
        const targetSkew = Math.max(-3, Math.min(3, -velocity * 0.02));
        smoothedSkew += (targetSkew - smoothedSkew) * 0.12;
        tickerTrack.style.setProperty("--ticker-x", `${x.toFixed(1)}px`);
        tickerTrack.style.setProperty("--ticker-skew", `${smoothedSkew.toFixed(2)}deg`);
        raf = requestAnimationFrame(trackLoop);
      };

      /* Runs only while the ticker is actually on screen. */
      const start = () => {
        if (raf) return;
        lastT = performance.now();
        lastScrollY = window.scrollY;
        raf = requestAnimationFrame(trackLoop);
      };
      const stop = () => {
        if (!raf) return;
        cancelAnimationFrame(raf);
        raf = 0;
      };
      const tickerHost = tickerTrack.closest(".ticker");
      if ("IntersectionObserver" in window && tickerHost) {
        new IntersectionObserver(
          (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
          { rootMargin: "150px 0px" }
        ).observe(tickerHost);
      } else {
        start();
      }
    }
  }

  initScrollFX();

  /* =========================================================
     FLOWING SERVICES — Codrops-style menu: hovering a service row
     slides in a dark marquee band (category name + project covers)
     from the edge the cursor entered, and out through the exit edge.
     ========================================================= */
  function initFlowingServices() {
    if (!MOTION_FULL) return;
    $$(".services__list .svc").forEach((item) => {
      const mq = $(".svc__marquee", item);
      const inner = $(".svc__marquee-inner", item);
      if (!mq || !inner) return;

      const edgeOf = (e) => {
        const r = item.getBoundingClientRect();
        return e.clientY - r.top < r.height / 2 ? "top" : "bottom";
      };
      const EASE = "transform .55s cubic-bezier(.19,1,.22,1)";

      item.addEventListener("mouseenter", (e) => {
        const edge = edgeOf(e);
        mq.style.transition = "none";
        inner.style.transition = "none";
        mq.style.transform = `translateY(${edge === "top" ? "-101%" : "101%"})`;
        inner.style.transform = `translateY(${edge === "top" ? "101%" : "-101%"})`;
        void mq.offsetHeight; // flush so the next transform animates
        mq.style.transition = EASE;
        inner.style.transition = EASE;
        mq.style.transform = "translateY(0)";
        inner.style.transform = "translateY(0)";
      });

      item.addEventListener("mouseleave", (e) => {
        const edge = edgeOf(e);
        mq.style.transform = `translateY(${edge === "top" ? "-101%" : "101%"})`;
        inner.style.transform = `translateY(${edge === "top" ? "101%" : "-101%"})`;
      });
    });
  }
  initFlowingServices();

  /* =========================================================
     Infinite marquees keep the whole render pipeline awake for every
     frame they exist, whether or not they are on screen. Park them
     while their section is out of view.
     ========================================================= */
  function initOffscreenAnimationPause() {
    if (!("IntersectionObserver" in window)) return;
    const pairs = [
      [".ticker__track", ".ticker"],
      [".svc__marquee-track", ".svc"],
    ];
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        const tracks = e.target.__animTracks;
        if (!tracks) return;
        tracks.forEach((t) => t.classList.toggle("anim-paused", !e.isIntersecting));
      }),
      { rootMargin: "150px 0px" }
    );
    pairs.forEach(([trackSel, hostSel]) => {
      $$(trackSel).forEach((track) => {
        const host = track.closest(hostSel) || track.parentElement;
        if (!host) return;
        (host.__animTracks ||= []).push(track);
        io.observe(host);
      });
    });
  }
  initOffscreenAnimationPause();

  /* =========================================================
     Split-text reveal — runs unconditionally (cheap, respects
     reduced motion via CSS). Walks text nodes only, so nested
     <strong> and <br/> stay intact.

     Staggering happens per WORD, not per letter. Per-letter used to
     mean ~125 simultaneously transitioning inline-blocks; a transform
     inside an overflow:hidden parent can't go to the compositor, so
     every one of them was restyled on the main thread each frame
     (measured: 10.5k style invalidations = 76% of all scroll work,
     which is what stalled fast scrolling on phones). Word-level keeps
     the same masked slide-up with ~5x fewer animated elements.
     ========================================================= */
  const STAGGER_CAP = 12; // longest headline still finishes its cascade quickly

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
        const inner = document.createElement("span");
        inner.className = "word__inner";
        inner.style.setProperty("--i", Math.min(counter.value, STAGGER_CAP));
        inner.textContent = part;
        wordSpan.appendChild(inner);
        counter.value++;
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
    const splitTargets = $$(".display, .pf-cat__title");
    splitTargets.forEach((el) => {
      const counter = { value: 0 };
      const newChildren = Array.from(el.childNodes).map((c) => splitNode(c, counter));
      while (el.firstChild) el.removeChild(el.firstChild);
      newChildren.forEach((c) => el.appendChild(c));
      el.classList.add("split-ready");
    });

    /* Longest cascade = capped stagger + duration, plus a small margin.
       After that the words are parked with .is-settled so they stop
       counting as animated elements for the rest of the session. */
    const CASCADE_MS = STAGGER_CAP * 40 + 620 + 120;
    const settle = (el) => setTimeout(() => el.classList.add("is-settled"), CASCADE_MS);

    if ("IntersectionObserver" in window) {
      const splitIO = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            settle(entry.target);
            splitIO.unobserve(entry.target);
          }
        }),
        { threshold: 0.3 }
      );
      splitTargets.forEach((el) => splitIO.observe(el));
    } else {
      splitTargets.forEach((el) => {
        el.classList.add("is-revealed");
        settle(el);
      });
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

  /* Footer curtain — slide up + fade in when entering viewport */
  function initFooterReveal() {
    const footer = $(".footer");
    if (!footer) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      footer.classList.add("is-revealed");
      return;
    }
    if (!("IntersectionObserver" in window)) {
      footer.classList.add("is-revealed");
      return;
    }
    const fIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          footer.classList.add("is-revealed");
          fIO.unobserve(footer);
        }
      }),
      { threshold: 0.05 }
    );
    fIO.observe(footer);
  }
  initFooterReveal();

  /* =========================================================
     Grainient — WebGL2 noisy gradient (ported from reactbits.dev/Grainient).
     Lazy-loads on view, skipped on reduced-motion.
     ========================================================= */
  async function initGrainient() {
    const canvases = $$("[data-grainient]");
    if (!canvases.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const vertex = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);} `;

    const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed,uColorBalance,uWarpStrength,uWarpFrequency,uWarpSpeed,uWarpAmplitude;
uniform float uBlendAngle,uBlendSoftness,uRotationAmount,uNoiseScale,uGrainAmount,uGrainScale;
uniform float uContrast,uGamma,uSaturation,uZoom;
uniform vec2 uCenterOffset;
uniform vec3 uColor1,uColor2,uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void main(){
  vec2 C=gl_FragCoord.xy;
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float ws=max(uWarpStrength,0.001);
  float amp=uWarpAmplitude/ws;
  float wt=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*uWarpFrequency+wt)/amp;
  tuv.y+=sin(tuv.x*(uWarpFrequency*1.5)+wt)/(amp*0.5);
  float b=uColorBalance, sf=max(uBlendSoftness,0.0);
  mat2 br=Rot(radians(uBlendAngle));
  float bx=(tuv*br).x;
  float e0=-0.3-b-sf, e1=0.2-b+sf, v0=0.5-b+sf, v1=-0.3-b-sf;
  vec3 l1=mix(uColor3,uColor2,S(e0,e1,bx));
  vec3 l2=mix(uColor2,uColor1,S(e0,e1,bx));
  vec3 col=mix(l1,l2,S(v0,v1,tuv.y));
  vec2 gu=uv*max(uGrainScale,0.001);
  float grain=fract(sin(dot(gu,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  fragColor=vec4(col,1.0);
}`;

    const hexToRgb = (hex) => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? [parseInt(m[1],16)/255, parseInt(m[2],16)/255, parseInt(m[3],16)/255] : [1,1,1];
    };

    let ogl;
    try {
      /* vendored locally: reuses the already-open same-origin
         connection instead of a fresh handshake to cdn.jsdelivr.net */
      ogl = await import("/assets/vendor/ogl.mjs");
    } catch (err) {
      console.warn("ogl failed to load — Grainient disabled", err);
      return;
    }
    const { Renderer, Program, Mesh, Triangle } = ogl;

    canvases.forEach((canvas) => {
      const container = canvas.parentElement;
      const colors = {
        c1: hexToRgb(canvas.dataset.c1 || "#f5f0ea"),
        c2: hexToRgb(canvas.dataset.c2 || "#e2d5c1"),
        c3: hexToRgb(canvas.dataset.c3 || "#a89e8e"),
      };

      /* DPR capped at 1.5: the shader outputs animated noise, where the
         retina/1.5 difference is invisible but the fragment cost is ~2x. */
      const renderer = new Renderer({
        canvas, webgl: 2, alpha: true, antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      });
      const gl = renderer.gl;
      const program = new Program(gl, {
        vertex, fragment,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Float32Array([1, 1]) },
          uTimeSpeed:     { value: 0.18 },
          uColorBalance:  { value: 0.05 },
          uWarpStrength:  { value: 1.0 },
          uWarpFrequency: { value: 4.0 },
          uWarpSpeed:     { value: 1.4 },
          uWarpAmplitude: { value: 60.0 },
          uBlendAngle:    { value: 15.0 },
          uBlendSoftness: { value: 0.12 },
          uRotationAmount:{ value: 360.0 },
          uNoiseScale:    { value: 1.6 },
          uGrainAmount:   { value: 0.16 },
          uGrainScale:    { value: 2.4 },
          uContrast:      { value: 1.05 },
          uGamma:         { value: 1.0 },
          uSaturation:    { value: 0.55 },
          uCenterOffset:  { value: new Float32Array([0, 0]) },
          uZoom:          { value: 1.0 },
          uColor1:        { value: new Float32Array(colors.c1) },
          uColor2:        { value: new Float32Array(colors.c2) },
          uColor3:        { value: new Float32Array(colors.c3) },
        },
      });
      const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

      const isGlobal = canvas.classList.contains("grainient--global");
      const setSize = () => {
        const w = isGlobal ? window.innerWidth : container.getBoundingClientRect().width;
        const h = isGlobal ? window.innerHeight : container.getBoundingClientRect().height;
        renderer.setSize(Math.max(1, Math.floor(w)), Math.max(1, Math.floor(h)));
        program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
        program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
        renderer.render({ scene: mesh });
      };
      if (isGlobal) {
        window.addEventListener("resize", setSize, { passive: true });
      } else {
        const ro = new ResizeObserver(setSize);
        ro.observe(container);
      }
      setSize();

      let raf = 0, running = false;
      let skipFrame = false;
      const t0 = performance.now();
      /* The gradient drifts slowly (uTimeSpeed 0.18) — 30fps is
         indistinguishable and halves the GPU load. */
      const loop = (t) => {
        if (running) raf = requestAnimationFrame(loop);
        skipFrame = !skipFrame;
        if (skipFrame) return;
        program.uniforms.iTime.value = (t - t0) * 0.001;
        renderer.render({ scene: mesh });
      };

      /* Phones and tablets keep the gradient but as a static image:
         the animated loop forced the full render pipeline (style →
         layerize → commit → GPU) ~60×/s even at rest, which starved
         touch scrolling — and even an idle GL canvas keeps a costly
         compositing surface alive on mobile Safari. Snapshot the
         first frame into a plain <img> and drop the GL context. */
      if (!MOTION_FULL) {
        try {
          const still = new Image();
          still.src = canvas.toDataURL("image/jpeg", 0.85);
          still.className = canvas.className;
          still.alt = "";
          still.setAttribute("aria-hidden", "true");
          canvas.replaceWith(still);
        } catch (_) { /* snapshot failed: keep the static canvas */ }
        const lose = gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
        return;
      }

      if (isGlobal) {
        /* Render only when the canvas can actually be seen: while the
           opaque hero still covers the whole viewport, the shader is
           invisible — pausing it removes the GPU spike right at the
           hero -> Despre mine boundary. */
        const hero = document.querySelector(".hero");
        const updateRunning = () => {
          const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 0;
          const covered = hero && window.scrollY + window.innerHeight <= heroBottom + 8;
          if (!covered && !running) {
            running = true;
            raf = requestAnimationFrame(loop);
          } else if (covered && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        };
        window.addEventListener("scroll", updateRunning, { passive: true });
        window.addEventListener("resize", updateRunning, { passive: true });
        updateRunning();
      } else {
        const visIO = new IntersectionObserver((entries) => entries.forEach((e) => {
          if (e.isIntersecting && !running) {
            running = true;
            raf = requestAnimationFrame(loop);
          } else if (!e.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
          }
        }), { threshold: 0 });
        visIO.observe(container);
      }
    });
  }
  /* Off the critical path: the ogl module + shader init should not
     compete with the hero image and fonts for first paint — and the
     idle callback keeps the one-time WebGL + snapshot cost away from
     the user's first scroll gesture right after load. */
  const grainientWhenIdle = () =>
    (window.requestIdleCallback || ((fn) => setTimeout(fn, 1)))(() => initGrainient());
  if (document.readyState === "complete") {
    grainientWhenIdle();
  } else {
    window.addEventListener("load", grainientWhenIdle, { once: true });
  }
})();
