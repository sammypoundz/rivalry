export default async function run(page) {
  const log = { steps: [], errors: [] };
  page.on("pageerror", (e) => log.errors.push("PAGEERROR " + e.message));

  // After the reload the app landed on Home (selected contestant is not restored).
  // Open the same contestant and check like state + votes from the server.
  await page.locator("button.contestant-card").first().click();
  await page.locator(".hero__btn--like").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500); // allow the like-state fetch
  const likeClass = await page
    .locator(".hero__btn--like")
    .getAttribute("class");
  log.steps.push(
    "like state after reload: " +
      (likeClass?.includes("hero__btn--fav")
        ? "LIKED (persisted)"
        : "not liked"),
  );

  const votes = await page.locator(".profile.app").innerText();
  const m = votes.match(/([\d.,]+[K]?)\s*\n\s*TOTAL VOTES/i);
  log.steps.push("TOTAL VOTES shown: " + (m?.[1] ?? "not found"));
  return log;
}
