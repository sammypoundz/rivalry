export default async function run(page) {
  const log = { steps: [] };

  // We're on the contestant profile (Amara). Click like.
  await page.locator(".hero__btn--like").click();
  await page.waitForTimeout(2000);
  const countAfter = await page.locator(".hero__like-count").innerText();
  const clsAfter = await page.locator(".hero__btn--like").getAttribute("class");
  log.steps.push("after click: liked=" + (clsAfter?.includes("hero__btn--fav") ? "YES" : "NO") + ", count=" + countAfter);

  // Reload, reopen the same profile, check persisted state
  await page.reload();
  await page.locator(".bottom-nav__item", { hasText: "Home" }).waitFor({ timeout: 20000 });
  await page.locator("button.contestant-card").first().click();
  await page.locator(".hero__btn--like").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1800);
  const likeClass = await page
    .locator(".hero__btn--like")
    .getAttribute("class");
  const likeCount = await page.locator(".hero__like-count").innerText();
  log.steps.push(
    "after reload — liked: " +
      (likeClass?.includes("hero__btn--fav") ? "YES (persisted)" : "NO") +
      ", count: " +
      likeCount,
  );
  return log;
}
