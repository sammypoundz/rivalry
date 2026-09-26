export default async function run(page, ui) {
  // 1. Bypass auth, go to home
  await page.goto("http://localhost:5174/#/vote/x");
  await page.waitForTimeout(800);
  await page.goto("http://localhost:5174/");
  await page.waitForTimeout(3500);

  // Check View All button exists on home
  const viewAll = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].map((b) =>
      b.innerText.trim(),
    );
    return btns.find((t) => /view all/i.test(t)) ?? null;
  });

  // Click it and see what screen renders
  if (viewAll) {
    const btn = page.locator("button", { hasText: /view all/i }).first();
    await btn.click();
    await page.waitForTimeout(1500);
  }
  const afterViewAll = await page.evaluate(() => {
    const grid = document.querySelector(".allcontestants__grid");
    const bodyClasses = document.body.className;
    const appHtmlLen = document.getElementById("root")?.innerHTML.length ?? 0;
    const backBtn = !!document.querySelector(".allcontestants__back");
    // Is the home page also present? (stacking bug check)
    const homeVisible = !!document.querySelector(
      ".home, .dashboard, .home-hero",
    );
    return { grid: !!grid, backBtn, homeVisible, appHtmlLen };
  });

  // Also check contest detail page for the refer button
  await page.goto("http://localhost:5174/");
  await page.waitForTimeout(2500);
  const contestCards = await page.evaluate(() => {
    const cards = [
      ...document.querySelectorAll(
        "[class*='contest-card'], [class*='contest']",
      ),
    ];
    return cards
      .slice(0, 3)
      .map((c) => ({
        cls: c.className.slice(0, 60),
        text: c.innerText.slice(0, 60),
      }));
  });

  // Click first contest card to open detail
  const clicked = await page.evaluate(() => {
    const card = document.querySelector(
      ".contest-card, [class*='contest-card']",
    );
    if (card) {
      card.click();
      return true;
    }
    return false;
  });
  await page.waitForTimeout(2000);
  const referBtn = await page.evaluate(() => {
    const el = document.querySelector(
      ".contest-detail__refer, [class*='refer']",
    );
    return el ? { cls: el.className, text: el.innerText.slice(0, 40) } : null;
  });
  const detailVisible = await page.evaluate(
    () => !!document.querySelector(".contest-detail"),
  );

  return {
    viewAll,
    afterViewAll,
    contestCards,
    clicked,
    referBtn,
    detailVisible,
  };
}
