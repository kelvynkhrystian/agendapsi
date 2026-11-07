const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Appearance & Theme Synchronization Tests", async (t) => {
  await t.test("API /api/admin/appearance synchronizes preset tokens and revalidates cache", () => {
    const routeFilePath = path.join(process.cwd(), "src/app/api/admin/appearance/route.ts");
    const content = fs.readFileSync(routeFilePath, "utf-8");

    assert.ok(content.includes("revalidatePath"), "appearance/route.ts must import and call revalidatePath");
    assert.ok(content.includes("THEME_PRESETS"), "appearance/route.ts must reference canonical THEME_PRESETS");
    assert.ok(content.includes("finalPrimary = preset.primaryColor"), "appearance/route.ts must synchronize canonical preset primary color");
    assert.ok(content.includes("finalButton = preset.buttonColor"), "appearance/route.ts must synchronize canonical preset button color");
  });

  await t.test("Root Layout defines force-dynamic and synchronizes theme tokens", () => {
    const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");

    assert.ok(content.includes('export const dynamic = "force-dynamic"'), "layout.tsx must force dynamic rendering for real-time appearance propagation");
    assert.ok(content.includes("--primary:"), "layout.tsx must set --primary");
    assert.ok(content.includes("--primary-foreground:"), "layout.tsx must set --primary-foreground with WCAG contrast");
    assert.ok(content.includes("--button-bg:"), "layout.tsx must set --button-bg");
  });

  await t.test("Public booking page (/agendar) is strictly Light Mode without ThemeToggle", () => {
    const bookingPath = path.join(process.cwd(), "src/app/agendar/page.tsx");
    const content = fs.readFileSync(bookingPath, "utf-8");

    assert.ok(content.includes('export const dynamic = "force-dynamic"'), "/agendar must force dynamic rendering");
    assert.ok(!content.includes("<ThemeToggle"), "/agendar must not contain ThemeToggle");
    assert.ok(content.includes('data-theme="light"'), "/agendar must declare data-theme='light'");
    assert.ok(content.includes("var(--primary)"), "/agendar must bind to CSS variable var(--primary)");
  });

  await t.test("Minisite Hero CTA and CRP badge use official CSS tokens instead of hardcoded overrides", () => {
    const homePagePath = path.join(process.cwd(), "src/app/page.tsx");
    const content = fs.readFileSync(homePagePath, "utf-8");

    assert.ok(content.includes('export const dynamic = "force-dynamic"'), "page.tsx must force dynamic rendering");
    assert.ok(content.includes("bg-[var(--primary)] text-[var(--primary-foreground,#ffffff)]"), "Hero badge must use unified theme tokens");
    assert.ok(!content.includes("style={{ backgroundColor: site?.buttonColor"), "Hero CTA must not hardcode site.buttonColor override");
  });
});
