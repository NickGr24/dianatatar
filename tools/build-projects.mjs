/* =========================================================
   Static project page generator.

   Reads the catalogue from projects-data.js and the template from
   proiect.html, and writes a fully static, SEO-ready page for every
   project into /proiecte/<slug>/index.html: own <title>, meta
   description, canonical, Open Graph, and pre-rendered text content.
   script.js re-hydrates the page on load (galleries, lightbox, nav)
   via the data-slug attribute.

   Run after ANY change to projects-data.js or proiect.html:
     node tools/build-projects.mjs
   ========================================================= */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://dianatatar.com";

/* projects-data.js assigns to window.DT_PROJECTS — evaluate it */
const dataSrc = readFileSync(join(root, "projects-data.js"), "utf8");
const window = {};
new Function("window", dataSrc)(window);
const projects = window.DT_PROJECTS;
if (!projects || !Object.keys(projects).length) {
  throw new Error("projects-data.js produced no projects");
}

const template = readFileSync(join(root, "proiect.html"), "utf8");

const esc = (s) => String(s || "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/* Root-relative asset/page URLs so the markup works from /proiecte/<slug>/ */
const rootify = (html) => html
  .replaceAll('href="styles.css"', 'href="/styles.css"')
  .replaceAll('src="script.js"', 'src="/script.js"')
  .replaceAll('src="projects-data.js"', 'src="/projects-data.js"')
  .replaceAll('href="favicon.svg"', 'href="/favicon.svg"')
  .replaceAll('src="assets/', 'src="/assets/')
  .replaceAll('href="index.html', 'href="/index.html')
  .replaceAll('href="resurse.html"', 'href="/resurse.html"');

const setField = (html, field, value, { keepTag = false } = {}) => {
  /* Replace the inner text of the element carrying data-field="…" */
  const re = new RegExp(`(<[^>]*data-field="${field}"[^>]*>)([\\s\\S]*?)(</)`);
  if (!re.test(html)) {
    console.warn(`  ! data-field="${field}" not found in template`);
    return html;
  }
  return html.replace(re, `$1${keepTag ? value : esc(value)}$3`);
};

/* Projects Diana removed from the visible portfolio — their data stays
   (old ?slug= links keep working) but no indexed static page is built */
const EXCLUDE = new Set(["oo-nutrition", "applexium-social", "centrul-sportiv", "campanie-vizuala"]);

let count = 0;
for (const [slug, data] of Object.entries(projects)) {
  if (EXCLUDE.has(slug)) continue;
  let page = template;

  const pageTitle = `${data.title} — ${data.category} | Diana Tatar`;
  const desc = (data.sub ? `${data.sub}. ` : "") +
    String(data.context || "").replace(/\s+/g, " ").trim();
  const shortDesc = desc.length > 250 ? desc.slice(0, 247).trimEnd() + "…" : desc;
  const url = `${SITE}/proiecte/${slug}/`;
  const ogImage = data.cover ? SITE + data.cover : `${SITE}/assets/images/about.webp`;

  page = page
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(pageTitle)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(shortDesc)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(pageTitle)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(shortDesc)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${ogImage}$2`);

  /* Static content so crawlers need no JS */
  page = setField(page, "title", data.title);
  page = setField(page, "category", data.category);
  page = setField(page, "sub", data.sub);
  page = setField(page, "context", data.context);
  page = setField(page, "goal", data.goal);
  page = setField(page, "solution", data.solution);
  page = setField(page, "result", data.result);
  page = page.replace(
    /(<img[^>]*data-field="cover")([^>]*)src="[^"]*"/,
    `$1$2src="${data.cover}"`
  );

  /* Hydration key for script.js */
  page = page.replace(/<main([^>]*)id="project"/, `<main$1id="project" data-slug="${slug}"`);

  page = rootify(page);

  const dir = join(root, "proiecte", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page);
  count++;
  console.log(`  ✓ /proiecte/${slug}/`);
}
console.log(`${count} project pages generated.`);
