export default async function run(page) {
  const log = { steps: [], errors: [], api: [] };
  page.on("response", (r) => {
    if (r.url().includes("/api/"))
      log.api.push(r.status() + " " + r.request().method() + " " + r.url());
  });
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  // Sign in
  await page.getByPlaceholder(/Email or phone/i).fill("probe@test.dev");
  await page
    .getByPlaceholder(/Password/i)
    .first()
    .fill("password123");
  await page.locator("button", { hasText: "Sign In" }).last().click();
  await page.waitForTimeout(2500);

  // Bottom-nav Profile -> user profile with stats
  await page.locator(".bottom-nav__item", { hasText: "Profile" }).click();
  await page.waitForTimeout(1500);
  log.userProfileText = await page
    .locator(".userprofile")
    .innerText()
    .catch(() => "gone");

  // Click the joined contest inside MySpace -> should open contest detail
  const contestItem = page.locator(".myspace-contest").first();
  if (await contestItem.count()) {
    await contestItem.click();
    await page.waitForTimeout(1200);
    log.steps.push(
      "contest detail after click: " +
        (await page.locator(".contest-detail").count()),
    );
    log.steps.push(
      "detail title: " +
        (await page
          .locator(
            ".contest-detail__hero strong, .contest-detail h1, .contest-detail__hero div strong",
          )
          .first()
          .innerText()
          .catch(() => "?")),
    );
  } else {
    log.steps.push("no myspace-contest item");
  }

  // Vote persistence test: open contestant profile, vote, reload, check
  await page.locator(".bottom-nav__item", { hasText: "Home" }).click();
  await page.waitForTimeout(800);
  await page.locator("button.contestant-card").first().click();
  await page.waitForTimeout(1000);
  log.steps.push(
    "logout on contestant profile: " +
      (await page.locator(".profile__logout").count()),
  );

  return log;
}
