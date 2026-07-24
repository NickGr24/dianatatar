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

      if (FORM_ENDPOINT) {
        if (submitBtn) submitBtn.disabled = true;
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
    const projects = {
      decoratii: {
        category: "Branding & Identitate vizuală",
        title: "Decorații.md",
        sub: "Decor urban | Rebranding & Identity",
        cover: "assets/images/project-01.webp",
        context: "Decorații.md este un brand dedicat decorului urban și construcțiilor metalice, care transformă orașele prin lumină, structură și experiențe vizuale create pentru oameni și comunități. Rebrandingul a pornit din dorința de a evolua identitatea existentă și de a o aduce mai aproape de ceea ce compania reprezintă astăzi.",
        goal: "Rebrandingul Decorații.md a pornit din dorința de a evolua identitatea existentă și de a o aduce mai aproape de ceea ce compania reprezintă astăzi. Scopul nu a fost schimbarea completă a poveștii, ci reinterpretarea ei într-un limbaj vizual mai contemporan, memorabil și relevant pentru industria în care activează.",
        solution: "Elementul central al noului logo este punctul luminos — un simbol care reprezintă simultan ideea, lumina și începutul procesului creativ. Este momentul din care pornește fiecare proiect, fiecare schiță și fiecare intervenție urbană. Un aspect important al procesului a fost reprezentarea materialului principal cu care compania lucrează — metalul: noua identitate transmite rezistență, structură și precizie, păstrând componenta emoțională pe care brandul o aduce în orașe. Această direcție a fost exprimată printr-un pattern inspirat din structuri metalice și efecte luminoase — un sistem grafic care sugerează atât construcția și modularitatea materialelor, cât și felul în care lumina interacționează cu suprafețele metalice; patternul devine o extensie vizuală a procesului de fabricație și a identității companiei. Paleta cromatică și texturile au fost inspirate direct din industria în care activează Decorații.md și din materialele cu care lucrează zilnic: metal, beton și structuri urbane. Accentul luminos evocă energia și atmosfera sărbătorilor, în timp ce tonurile închise și suprafețele texturate reflectă caracterul industrial și durabil al lucrărilor realizate.",
        result: "Rezultatul este o identitate contemporană, memorabilă și flexibilă, capabilă să poziționeze Decorații.md nu doar ca producător de decor urban, ci ca un brand care contribuie activ la felul în care orașele sunt trăite, celebrate și simțite de oameni.",
        images: [
          "assets/images/projects/decoratii-01.webp",
          "assets/images/projects/decoratii-02.webp",
          "assets/images/projects/decoratii-03.webp",
          "assets/images/projects/decoratii-04.webp",
          "assets/images/projects/decoratii-05.webp",
          "assets/images/projects/decoratii-06.webp",
          "assets/images/projects/decoratii-07.webp",
          "assets/images/projects/decoratii-08.webp",
          "assets/images/projects/decoratii-09.webp",
          "assets/images/projects/decoratii-10.webp",
          "assets/images/projects/decoratii-11.webp",
          "assets/images/projects/decoratii-12.webp",
          "assets/images/projects/decoratii-13.webp",
          "assets/images/projects/decoratii-logo-before.webp",
          "assets/images/projects/decoratii-logo-after.webp"
        ]
      },
      revanty: {
        category: "Branding & Identitate vizuală",
        title: "Revanty",
        sub: "Clinică stomatologică | Naming + identitate vizuală",
        cover: "assets/images/project-revanty.webp",
        context: "Revanty este un brand de clinică stomatologică construit în jurul ideii de reconstrucție și transformare personală. Mai mult decât un spațiu medical, Revanty își propune să ofere o experiență în care tehnologia modernă, grija autentică și confortul pacientului se întâlnesc pentru a reda nu doar sănătatea dentară, ci și încrederea în propriul zâmbet.",
        goal: "Brandul s-a născut din ideea că vizita la stomatolog nu ar trebui asociată cu teamă sau disconfort, ci cu sentimentul că ești ascultat, înțeles și susținut. La Revanty, fiecare pas face parte dintr-un proces de redescoperire — al confortului, al încrederii și al bucuriei de a zâmbi din nou. Conceptul gravitează în jurul prefixului „re” — restabilire, regenerare, reconectare — ideea de a reveni la o stare firească de sănătate și încredere. Namingul combină această semnificație cu inspirația din cuvântul francez avant, asociat progresului și mersului înainte, construind astfel un brand care vorbește despre evoluție și un nou început.",
        solution: "Identitatea vizuală a fost gândită să transmită calm, optimism și apropiere umană. Am ales să prezint brandul prin expresii reale, oameni și emoții autentice. Patternul Revanty nu a apărut din prima formă perfectă — a fost rezultatul unui proces de explorare și al multor încercări prin care am căutat un element care să nu fie doar decorativ, ci să devină parte din identitatea brandului. Punctul de plecare au fost valurile — forme fluide care transmiteau calm, continuitate și ideea de proces natural de transformare. Pe măsură ce liniile au fost reinterpretate și îmbinate, a început să se contureze ceva neașteptat: o formă care amintește subtil de structura dinților. Această descoperire a transformat patternul dintr-un simplu element grafic într-un cod vizual recognoscibil al brandului.",
        result: "Rezultatul este o identitate modernă și prietenoasă, construită în jurul ideii că medicina și empatia pot merge împreună.",
        images: [
          "assets/images/projects/revanty-01.webp",
          "assets/images/projects/revanty-02.webp",
          "assets/images/projects/revanty-03.webp",
          "assets/images/projects/revanty-04.webp",
          "assets/images/projects/revanty-05.webp",
          "assets/images/projects/revanty-06.webp",
          "assets/images/projects/revanty-07.webp",
          "assets/images/projects/revanty-08.webp",
          "assets/images/projects/revanty-09.webp",
          "assets/images/projects/revanty-10.webp",
          "assets/images/projects/revanty-11.webp",
          "assets/images/projects/revanty-12.webp",
          "assets/images/projects/revanty-13.webp",
          "assets/images/projects/revanty-14.webp",
          "assets/images/projects/revanty-15.webp",
          "assets/images/projects/revanty-16.webp",
          "assets/images/projects/revanty-17.webp",
          "assets/images/projects/revanty-18.webp",
          "assets/images/projects/revanty-19.webp"
        ]
      },
      "budan-rush": {
        category: "Branding & Identitate vizuală",
        title: "Budan Rush",
        sub: "Coffee to go | Identitate vizuală",
        cover: "assets/images/project-budan.webp",
        context: "Budan Rush a pornit de la o observație simplă: oamenii beau cafea în fiecare zi, dar de multe ori o fac pe fugă. Conceptul brandului nu vorbește despre cafea, ci despre oamenii care o beau și despre nevoia lor de a găsi o clipă de liniște într-un oraș aflat permanent în mișcare.",
        goal: "Elementul central al identității îl reprezintă paharele cu întrebări. În locul sloganurilor promoționale sau al mesajelor comerciale, fiecare pahar poartă o întrebare scurtă, personală și relevantă. Aceste întrebări transformă un obiect obișnuit într-un punct de reflecție și oferă clientului o scurtă pauză mentală între două întâlniri, două drumuri sau două momente ale zilei. Astfel, experiența brandului începe înainte de prima înghițitură de cafea.",
        solution: "Identitatea vizuală a fost construită pentru a susține această idee. Am ales o paletă de culori calde și apetisante, inspirate de cafea proaspătă, produse de patiserie și atmosfera confortabilă a unei cafenele urbane. Ilustrațiile și elementele grafice au fost dezvoltate într-un stil prietenos și expresiv, aducând personalitate și accesibilitate brandului. Formele simple și limbajul vizual relaxat contribuie la crearea unei experiențe care se simte umană, apropiată și memorabilă.",
        result: "Rezultatul este un brand care depășește funcția clasică de coffee to go. Budan Rush devine un mic ritual urban — un loc care nu te oprește din drum, dar te invită să te oprești pentru câteva secunde în interiorul tău.",
        images: [
          "assets/images/projects/budan-01.webp",
          "assets/images/projects/budan-02.webp",
          "assets/images/projects/budan-03.webp",
          "assets/images/projects/budan-04.webp",
          "assets/images/projects/budan-05.webp",
          "assets/images/projects/budan-06.webp",
          "assets/images/projects/budan-07.webp",
          "assets/images/projects/budan-08.webp",
          "assets/images/projects/budan-09.webp",
          "assets/images/projects/budan-10.webp",
          "assets/images/projects/budan-11.webp",
          "assets/images/projects/budan-12.webp",
          "assets/images/projects/budan-13.webp",
          "assets/images/projects/budan-14.webp",
          "assets/images/projects/budan-15.webp"
        ]
      },
      applexium: {
        category: "Branding & Identitate vizuală",
        title: "Applexium",
        sub: "AI-Driven Tech company | Identitate vizuală",
        cover: "assets/images/projects/applexium-01.webp",
        context: "Applexium este o companie tech orientată spre inovație, automatizare și dezvoltarea de produse digitale moderne.",
        goal: "Obiectivul proiectului a fost crearea unei identități vizuale care să transmită tehnologie, încredere și evoluție, păstrând în același timp un aspect accesibil și contemporan. Identitatea a fost construită în jurul unui limbaj vizual inspirat de universul digital și de noile tehnologii, iar logo-ul și sistemul grafic au fost dezvoltate pentru a susține poziționarea companiei ca un partener modern în dezvoltarea soluțiilor software, AI și a produselor digitale.",
        solution: "Un element definitoriu al identității este utilizarea efectelor de glass morphism, a gradientelor albastre și a transparențelor subtile, care creează senzația de profunzime, fluiditate și inovație tehnologică. Aceste elemente contribuie la construirea unei imagini moderne și premium, inspirate de interfețele digitale și ecosistemele tehnologice contemporane. Pentru a asigura consistența brandului, am dezvoltat un sistem complet de elemente grafice și aplicații vizuale solicitate de client — de la materiale corporate și aplicații digitale până la iconografie, social media și elemente de interfață. Patternurile și formele dinamice completează identitatea și susțin ideea de conectivitate, evoluție și mișcare continuă.",
        result: "Rezultatul este o identitate vizuală modernă și flexibilă, care poziționează Applexium ca un brand tech inovator, pregătit să dezvolte soluții digitale pentru viitor.",
        images: [
          "assets/images/projects/applexium-01.webp",
          "assets/images/projects/applexium-02.webp",
          "assets/images/projects/applexium-03.webp",
          "assets/images/projects/applexium-04.webp",
          "assets/images/projects/applexium-05.webp",
          "assets/images/projects/applexium-06.webp",
          "assets/images/projects/applexium-07.webp",
          "assets/images/projects/applexium-08.webp"
        ]
      },
      "oo-nutrition": {
        category: "Presentation & Social Media",
        title: "OO.Nutrition",
        sub: "Product concept | Prezentare de brand",
        cover: "assets/images/project-02-b.webp",
        context: "OO.Nutrition aveau nevoie de o prezentare de produs clară, care să explice conceptul și beneficiile liniei de nutriție către parteneri și investitori, cât și să funcționeze ca material de comunicare pe social media.",
        goal: "Un document care să vândă conceptul — structură editorială ușor de parcurs, ierarhie tipografică puternică și vizualuri care să transmită ideea de produs premium, fără a încărca informația.",
        solution: "Am construit o prezentare modulară pornind de la conceptul de produs, cu paletă asortată brandului, iconografie simplă, machete de pagini reutilizabile și un set de slide-uri adaptate pentru postări pe social media.",
        result: "Materialul a devenit principalul instrument de comunicare a brandului către parteneri, iar echipa OO.Nutrition a putut reutiliza slide-urile pentru campanii noi fără a cere redesign de la zero.",
        images: [
          "assets/images/projects/oonutrition-01.webp",
          "assets/images/projects/oonutrition-02.webp",
          "assets/images/projects/oonutrition-03.webp"
        ]
      },
      "applexium-social": {
        category: "Social Media",
        title: "Applexium — Social media",
        sub: "AI-Driven Tech | Postări & template-uri",
        cover: "assets/images/project-applexium-social.webp",
        context: "Pentru Applexium am creat sistemul de comunicare vizuală pe social media — postări care traduc poziționarea de AI-Driven Tech company într-un limbaj vizual premium, coerent cu identitatea de brand.",
        goal: "Coerență între identitatea de brand și conținutul publicat zilnic: fiecare postare trebuia să fie recognoscibilă instant în feed și să susțină pilonii de comunicare — soluții digitale, AI, automatizare, compliance.",
        solution: "Serie de template-uri construite pe glass morphism, gradiente albastre și tipografie clară, declinate pentru anunțuri, prezentare de servicii și mesaje de brand — ușor de adaptat de echipă pentru conținut nou.",
        result: "Un feed coerent și premium, care susține poziționarea companiei și poate fi extins fără redesign de la zero.",
        images: [
          "assets/images/projects/asocial-01.webp",
          "assets/images/projects/asocial-02.webp",
          "assets/images/projects/asocial-03.webp",
          "assets/images/projects/asocial-04.webp",
          "assets/images/projects/asocial-05.webp",
          "assets/images/projects/asocial-06.webp"
        ]
      },
      "centrul-sportiv": {
        category: "Editorial & Print",
        title: "Centrul sportiv de pregătire a loturilor naționale",
        sub: "Brand book, flyere și reviste",
        cover: "assets/images/projects/wrestling-a3.webp",
        context: "Centrul sportiv de pregătire a loturilor naționale avea nevoie de materiale tipărite (flyere, reviste, documente de prezentare) care să reflecte seriozitatea și prestigiul instituției, dar să rămână accesibile publicului larg.",
        goal: "Un sistem editorial care să susțină comunicarea oficială și, în același timp, să facă informația ușor de parcurs pentru sportivi, antrenori și parteneri.",
        solution: "Grid editorial pe 8 coloane, ierarhie tipografică clară, fotografie documentară combinată cu infografice. Am livrat layout-uri pentru flyere, revista internă și materiale de eveniment, toate folosind același sistem vizual.",
        result: "Materiale folosite la evenimente oficiale și la comunicarea internă; instituția a câștigat un format editorial pe care îl poate extinde singură pentru numerele următoare.",
        images: [
          "assets/images/projects/wrestling-a3.webp"
        ]
      },
      "cap-cap": {
        category: "Editorial & Print",
        title: "cap cap — branding auto",
        sub: "Vehicle branding | Outdoor",
        cover: "assets/images/projects/capcap-01.webp",
        context: "Branding auto pentru cap cap — aplicarea identității pe vehiculele brandului, transformându-le în purtătoare mobile ale mesajului „Toate bătăile de cap le rezolvă cap cap”.",
        goal: "Vizibilitate urbană maximă: vehiculul trebuia să comunice instant serviciile brandului, atât în trafic, cât și staționat, păstrând lizibilitatea la orice distanță.",
        solution: "Pe lateral și în partea din spate am păstrat conceptul principal cu casa secționată și procesele inginerești reprezentate vizual, deoarece aceasta transmite imediat ideea de soluții complete pentru casă. Capota poartă logo-ul și mesajul principal, pe un layout curat, cu contrast puternic.",
        result: "Un design auto coerent cu identitatea brandului, ușor de recunoscut în oraș și scalabil pe întreaga flotă.",
        images: [
          "assets/images/projects/capcap-01.webp",
          "assets/images/projects/capcap-02.webp",
          "assets/images/projects/capcap-03.webp"
        ]
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
      "campanie-rafi": {
        category: "Concept vizual & Campanii",
        title: "Campanie Rafi Decor",
        sub: "Social + Display ads | 3 linii de produs",
        cover: "assets/images/project-rafi.webp",
        context: "Pentru Rafi Decor am dezvoltat o campanie vizuală completă pentru trei linii de produs — laminat SPC, vopsea profesională și panouri 3D — cu adaptări pentru site, social media și rețele de display.",
        goal: "Un sistem vizual unitar care să funcționeze pe zeci de formate — de la postări și story-uri până la bannere 970×250, 300×600, 300×250, 336×228 și 160×600 — păstrând recognoscibilitatea brandului pe fiecare dintre ele.",
        solution: "Concept construit pe folclor românesc reinterpretat („Foaie verde și-o alună, laminatul SPC e treabă bună!”), fotografie de produs expresivă și o grilă flexibilă adaptată fiecărui format, cu accente clare pe ofertă și preț.",
        result: "Campania a rulat simultan pe site, social media și display ads cu o identitate coerentă pe toate formatele, iar sistemul poate fi reutilizat pentru liniile noi de produs.",
        images: [
          "assets/images/projects/rafi-post-1.webp",
          "assets/images/projects/rafi-post-2.webp",
          "assets/images/projects/rafi-post-3.webp",
          "assets/images/projects/rafi-story-1.webp",
          "assets/images/projects/rafi-story-2.webp",
          "assets/images/projects/rafi-story-3.webp",
          "assets/images/projects/rafi-site-1.webp",
          "assets/images/projects/rafi-site-2.webp",
          "assets/images/projects/rafi-site-3.webp"
        ]
      },
      "campanie-solovov": {
        category: "Concept vizual & Campanii",
        title: "Campanie Solovov Jewelry",
        sub: "Bijuteriile care te duc în Dubai | Social + Display",
        cover: "assets/images/project-solovov.webp",
        context: "Solovov Jewelry a lansat o campanie de tip concurs — „Cumpără bijuterii și ajungi în Dubai” — care avea nevoie de un univers vizual premium și aspirațional, recognoscibil instant.",
        goal: "Comunicarea simultană a eleganței bijuteriilor și a premiului — călătoria la Dubai — într-un vizual memorabil, adaptat pentru feed, story și formate publicitare, în română și rusă.",
        solution: "Concept vizual-semnătură cu Burj Khalifa îmbrăcat în inele și verighete, paletă roșu premium cu accente metalice, declinată pe postări, story-uri și bannere pentru toate canalele campaniei.",
        result: "O campanie recognoscibilă instant, cu un vizual-semnătură care a susținut mecanica de concurs pe toate canalele brandului.",
        images: [
          "assets/images/projects/solovov-01.webp",
          "assets/images/projects/solovov-02.webp",
          "assets/images/projects/solovov-03.webp",
          "assets/images/projects/solovov-04.webp",
          "assets/images/projects/solovov-05.webp",
          "assets/images/projects/solovov-06.webp",
          "assets/images/projects/solovov-07.webp",
          "assets/images/projects/solovov-08.webp",
          "assets/images/projects/solovov-09.webp",
          "assets/images/projects/solovov-10.webp",
          "assets/images/projects/solovov-11.webp",
          "assets/images/projects/solovov-12.webp",
          "assets/images/projects/solovov-13.webp",
          "assets/images/projects/solovov-14.webp",
          "assets/images/projects/solovov-15.webp",
          "assets/images/projects/solovov-16.webp",
          "assets/images/projects/solovov-17.webp",
          "assets/images/projects/solovov-18.webp",
          "assets/images/projects/solovov-19.webp",
          "assets/images/projects/solovov-20.webp",
          "assets/images/projects/solovov-21.webp",
          "assets/images/projects/solovov-22.webp",
          "assets/images/projects/solovov-23.webp",
          "assets/images/projects/solovov-24.webp",
          "assets/images/projects/solovov-25.webp",
          "assets/images/projects/solovov-26.webp",
          "assets/images/projects/solovov-27.webp",
          "assets/images/projects/solovov-28.webp"
        ]
      },
      "campanie-ecb": {
        category: "Concept vizual & Campanii",
        title: "Campanie ECB — Euro Credit Bank",
        sub: "Finanțăm viitorul afacerii tale | Multi-format",
        cover: "assets/images/project-ecb.webp",
        context: "Euro Credit Bank avea nevoie de o campanie pentru creditele BGK destinate antreprenorilor — investiții inteligente în echipament, energie și infrastructură sustenabilă.",
        goal: "Transmiterea încrederii și accesibilității — finanțări între 5.000 și 375.000 EUR — către antreprenori din domenii diferite, pe zeci de formate digitale și segmente de public: casă, călătorii, familie.",
        solution: "Fotografie autentică cu antreprenori reali în mediul lor de lucru, mesaje directe („Finanțăm viitorul afacerii tale”) și un sistem de layout-uri declinat pe toate formatele — social media, bannere web și materiale de campanie.",
        result: "Un sistem de campanie coerent și scalabil, aplicat pe zeci de formate fără pierderea identității vizuale.",
        images: [
          "assets/images/projects/ecb-01.webp",
          "assets/images/projects/ecb-02.webp",
          "assets/images/projects/ecb-03.webp",
          "assets/images/projects/ecb-04.webp",
          "assets/images/projects/ecb-05.webp",
          "assets/images/projects/ecb-06.webp",
          "assets/images/projects/ecb-07.webp",
          "assets/images/projects/ecb-08.webp",
          "assets/images/projects/ecb-09.webp",
          "assets/images/projects/ecb-10.webp",
          "assets/images/projects/ecb-11.webp",
          "assets/images/projects/ecb-12.webp",
          "assets/images/projects/ecb-13.webp",
          "assets/images/projects/ecb-14.webp",
          "assets/images/projects/ecb-15.webp",
          "assets/images/projects/ecb-16.webp"
        ]
      },
      "vector-academy-ai": {
        category: "Generare conținut cu AI",
        title: "Vector Academy — AI content",
        sub: "AI mentor | Video, static, moodboards",
        cover: "assets/images/projects/vector-print-01.webp",
        context: "În calitate de AI content creator și AI mentor la Vector Academy, am dezvoltat concepte grafice pentru postări social media, bannere și materiale promoționale folosind workflow-uri mixte — design clasic + generare cu AI.",
        goal: "Livrare rapidă și constantă de conținut vizual cu look premium, fără costurile unui shooting pentru fiecare campanie, menținând o estetică coerentă de la un lansare la alta.",
        solution: "Workflow hibrid — prompt library reutilizabil, moodboard-uri și scene generate cu AI, retouch și compoziție în Photoshop/Illustrator, export în formate pregătite pentru social și print. Am susținut cursul „AI în Marketing” cu sesiuni practice pentru peste 50 de participanți.",
        result: "Timp de producție redus semnificativ, estetică unitară pe mai multe colecții și campanii, plus un sistem pe care echipele Vector Academy îl pot rula autonom.",
        images: [
          "assets/images/projects/vector-print-01.webp"
        ]
      },
      "enzzi-ai": {
        category: "Generare conținut cu AI",
        title: "ENZZI — AI product content",
        sub: "Integrarea produsului în spațiu | Logo pe produs",
        cover: "assets/images/projects/enzzi-01.webp",
        context: "Pentru brandul ENZZI am generat cu AI imagini de produs — baterii și obiecte sanitare — integrate în spații reale și scene de lifestyle, fără costurile unui shooting foto clasic.",
        goal: "Vizualuri de calitate comercială: integrarea produsului în spațiu și aplicarea logo-ului direct pe produs, păstrând materialele, reflexiile și proporțiile fidele produsului real.",
        solution: "Workflow hibrid — generarea scenelor cu AI, aplicarea logo-ului pe produs, apoi retuș și corecții manuale pentru realism și consistență între imagini.",
        result: "Un set de imagini gata de utilizat în catalog și pe social media, produs într-un timp semnificativ mai scurt decât o producție foto clasică.",
        images: [
          "assets/images/projects/enzzi-01.webp",
          "assets/images/projects/enzzi-02.webp",
          "assets/images/projects/enzzi-03.webp",
          "assets/images/projects/enzzi-04.webp",
          "assets/images/projects/enzzi-05.webp",
          "assets/images/projects/enzzi-06.webp"
        ]
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
          grid.appendChild(fig);
        });
        gallery.hidden = false;
      }

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

    window.addEventListener("scroll", () => requestAnimationFrame(updateParallax), { passive: true });
    requestAnimationFrame(updateParallax);

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
    if (tickerTrack) {
      let x = 0;
      let velocity = 0;
      let smoothedSkew = 0;
      let lastScrollY = window.scrollY;
      const baseSpeed = 60; // px/s
      let lastT = performance.now();

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
    const splitTargets = $$(".display, .pf-cat__title");
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
      ogl = await import("https://cdn.jsdelivr.net/npm/ogl@1.0.11/+esm");
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

      const renderer = new Renderer({
        canvas, webgl: 2, alpha: true, antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
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
      const t0 = performance.now();
      const loop = (t) => {
        program.uniforms.iTime.value = (t - t0) * 0.001;
        renderer.render({ scene: mesh });
        if (running) raf = requestAnimationFrame(loop);
      };

      if (isGlobal) {
        // Global canvas always animates (body is always "intersecting").
        running = true;
        raf = requestAnimationFrame(loop);
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
  initGrainient();
})();
