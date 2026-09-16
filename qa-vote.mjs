export default async function run(page) {
  const log = { steps: [], errors: [], api: [] };
  page.on("response", (r) => {
    if (r.url().includes("/api/"))
      log.api.push(r.status() + " " + r.request().method() + " " + r.url());
  });
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  await page.locator(".bottom-nav__item", { hasText: "Home" }).click();
  await page.waitForTimeout(1200);
  await page.locator("button.contestant-card").first().click();
  await page.waitForTimeout(1500);
  log.steps.push("on contestant profile: " + (await page.locator(".profile.app").count()));

  await page.locator("button", { hasText: /Vote Now/i }).first().click();
  await page.locator(".vote-modal__pay").waitFor({ timeout: 10000 });
  await page.locator(".vote-modal__pay").click();
  await page.locator(".vote-modal__success").waitFor({ timeout: 30000 });
  const successText = await page.locator(".vote-modal__success").innerText();
  log.steps.push("success: " + successText.replace(/\n/g, " | "));
  await page.locator(".vote-modal__pay").click();
  await page.waitForTimeout(600);

  // Reload — the vote total must come back from the DB
  await page.reload();
  await page.locator(".profile.app").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  const text = await page.locator(".profile.app").innerText();
  const m = text.match(/([\d.,]+[K]?)\s*\n\s*TOTAL VOTES/i);
  log.steps.push("TOTAL VOTES after reload: " + (m?.[1] ?? "not found"));

  // Like persistence: click the heart, reload, check state
  await page.locator(".hero__btn--like").click();
  await page.waitForTimeout(1200);
  await page.reload();
  await page.locator(".profile.app").waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  const likeClass = await page.locator(".hero__btn--like").getAttribute("class");
  log.steps.push("liked state after reload: " + (likeClass?.includes("hero__btn--fav") ? "LIKED (persisted)" : "not liked"));
  return log;
}
