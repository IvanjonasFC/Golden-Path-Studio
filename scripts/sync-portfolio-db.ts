import { sqlite, initDb } from "../src/db/index";
import { INITIAL_PORTFOLIO_PROJECTS } from "../src/lib/portfolioProjects";

initDb();

const row = sqlite.prepare("SELECT tokens FROM brands WHERE id = ?").get("brand_ivan_jonas") as { tokens: string } | undefined;
if (!row) {
  console.log("Brand not found");
  process.exit(1);
}

const tokens = JSON.parse(row.tokens);
if (!tokens.blueprint) tokens.blueprint = {};

// 1. Asignar proyectos canónicos y rutas completas
tokens.blueprint.projects = INITIAL_PORTFOLIO_PROJECTS;
tokens.blueprint.customRoutes = [
  { path: "/", sceneId: "landing", title: "Inicio (Principal)", icon: "home", description: "Portada, bio interactiva y experiencia en vivo" },
  { path: "/portfolio", sceneId: "portfolio", title: "Portfolio & Proyectos", icon: "briefcase", description: "Catálogo completo de proyectos y stack" },
  { path: "/proyectos/[slug]", sceneId: "content", title: "Ficha de Proyecto", icon: "file-text", parentPath: "/portfolio", isDynamic: true, description: "Plantilla única de detalle dinámico para proyectos" },
  ...INITIAL_PORTFOLIO_PROJECTS.map((p) => ({
    path: `/proyectos/${p.slug}`,
    sceneId: "content" as const,
    title: p.title,
    icon: "file-text",
    parentPath: "/portfolio",
    description: p.summary || `Detalle técnico de ${p.title}`,
  })),
  { path: "/contacto", sceneId: "form", title: "Contacto & Redes", icon: "mail", description: "Terminal de contacto interactiva y canales oficiales" }
];

// 2. Extraer props canónicas completas de Landing
const getProps = (id: string) => tokens.blueprint?.sceneLayouts?.landing?.find((b: any) => b.id === id)?.props || {};
const heroMasterProps = getProps("hero_1");
const bentoMasterProps = getProps("bento_1");
const metricsMasterProps = getProps("stats_1");
const navMasterProps = getProps("nav_1");
const contactMasterProps = getProps("contact_1");
const footerMasterProps = getProps("footer_1");

// 3. Sincronizar componentProps
if (!tokens.blueprint.componentProps) tokens.blueprint.componentProps = {};
tokens.blueprint.componentProps.comp_ivn_hero = heroMasterProps;
tokens.blueprint.componentProps.comp_ivn_bento_numbers = bentoMasterProps;
tokens.blueprint.componentProps.comp_ivn_metrics = metricsMasterProps;
tokens.blueprint.componentProps.comp_ivn_navbar = navMasterProps;
tokens.blueprint.componentProps.comp_ivn_contact = contactMasterProps;
tokens.blueprint.componentProps.comp_ivn_footer = footerMasterProps;

// 4. Sincronizar en portfolio y marca para que empiecen 100% idénticos y completos
const syncScene = (sceneName: string) => {
  const scene = tokens.blueprint.sceneLayouts?.[sceneName];
  if (!scene) return;
  scene.forEach((b: any) => {
    if (b.id === "hero_1") b.props = JSON.parse(JSON.stringify(heroMasterProps));
    if (b.id === "bento_1") b.props = JSON.parse(JSON.stringify(bentoMasterProps));
    if (b.id === "stats_1") b.props = JSON.parse(JSON.stringify(metricsMasterProps));
    if (b.id === "nav_1") b.props = JSON.parse(JSON.stringify(navMasterProps));
    if (b.id === "contact_1") b.props = JSON.parse(JSON.stringify(contactMasterProps));
    if (b.id === "footer_1") b.props = JSON.parse(JSON.stringify(footerMasterProps));
  });
};

syncScene("portfolio");
syncScene("marca");

if (tokens.blueprint.sceneLayouts?.content) {
  const detailBlk = tokens.blueprint.sceneLayouts.content.find((b: any) => b.id === "detail_1");
  if (detailBlk) {
    detailBlk.label = "Ficha Técnica de Proyecto (CMS)";
    detailBlk.componentId = "comp_project_detail";
  }
}

sqlite.prepare("UPDATE brands SET tokens = ?, updated_at = ? WHERE id = ?").run(
  JSON.stringify(tokens),
  Date.now(),
  "brand_ivan_jonas"
);

console.log("SUCCESS: brand_ivan_jonas synchronized with 10 projects and unified master props!");
