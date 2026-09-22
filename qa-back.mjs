export default async function run(page) {
  await page.waitForTimeout(2500);
  const before = await page.evaluate(() => ({
    hash: window.location.hash,
    hasHero: !!document.querySelector(".hero"),
  }));
  await page.locator('button[aria-label="Back"], .hero__btn').first().click();
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => {
    const active = document.querySelector(".bottom-nav__item--active");
    return {
      hash: window.location.hash,
      url: window.location.href,
      hasHero: !!document.querySelector(".hero"),
      navItems: document.querySelectorAll("nav .bottom-nav__item").length,
      activeLabel: active ? active.textContent : null,
      bodyStart: document.body.innerText.slice(0, 120),
    };
  });
  await page.screenshot({ path: "qa-back2.png" });
  return { before, after };
}
