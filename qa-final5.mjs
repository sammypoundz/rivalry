export default async function run(page) {
  const log = { steps: [], errors: [] };
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  // Already signed in from the session — go to Profile tab
  await page.locator(".bottom-nav__item", { hasText: "Profile" }).click();
  await page
    .locator(".myspace-contest")
    .first()
    .waitFor({ state: "visible", timeout: 15000 });
  await page.locator(".myspace-contest").first().click();
  await page.waitForTimeout(1500);
  log.steps.push(
    "contest detail open: " + (await page.locator(".contest-detail").count()),
  );
  log.detailText = (
    await page
      .locator(".contest-detail")
      .innerText()
      .catch(() => "gone")
  ).slice(0, 250);
  return log;
}
