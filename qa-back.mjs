export default async function run(page) {
  await page.waitForTimeout(2500);
  // 1) Click the back button on the deep-linked profile
  const before = await page.evaluate(() => ({
    hash: window.location.hash,
    hasAuth: /password/i.test(document.body.innerText),
    hasHero: !!document.querySelector(".hero"),
  }));
  await page.locator('button[aria-label="Back"], .hero__btn').first().click();
  await page.waitForTimeout(1200);
  const afterBack = await page.evaluate(() => ({
    hash: window.location.hash,
    hasAuth: /password/i.test(document.body.innerText),
    body: document.body.innerText.slice(0, 150),
    nav: document.querySelectorAll("nav").length,
  }));
  return { before, afterBack };
}
