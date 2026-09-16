export default async function run(page) {
  const log = { steps: [], errors: [] };
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  // MySpace has now loaded — click the contest row
  const contestItem = page.locator(".myspace-contest").first();
  await contestItem.waitFor({ state: "visible", timeout: 10000 });
  await contestItem.click();
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
