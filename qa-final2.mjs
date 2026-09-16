export default async function run(page) {
  const log = { steps: [], errors: [] };
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  await page.locator(".bottom-nav__item", { hasText: "Profile" }).click();
  await page.waitForTimeout(3000);

  const contestItem = page.locator(".myspace-contest").first();
  if (await contestItem.count()) {
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
    ).slice(0, 200);
  } else {
    log.steps.push("STILL no myspace-contest");
    log.myspace = await page
      .locator(".myspace")
      .innerText()
      .catch(() => "gone");
  }
  return log;
}
