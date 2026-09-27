export default async function run(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://localhost:5173");
  await page.waitForSelector(".bottom-nav__item", { timeout: 20000 });
  await page.locator(".bottom-nav__item", { hasText: "Contests" }).first().click();
  await page.waitForSelector(".contest-card", { timeout: 10000 });
  await page.locator(".contest-card").first().click();
  await page.waitForSelector(".contest-detail__refer", { timeout: 10000 });
  await page.evaluate(() => document.querySelector(".contest-detail__refer").click());
  await page.waitForSelector(".share-sheet", { timeout: 5000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "qa-refer.png" });
  return "ok";
}
