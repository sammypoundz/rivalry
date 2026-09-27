export default async function run(page) {
  const out = {};
  // Desktop Earn page
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://localhost:5173");
  await page.waitForSelector(".bottom-nav__item", { timeout: 20000 });
  const earnBtn = page.locator(".dashboard__earn").first();
  if (await earnBtn.count()) {
    await earnBtn.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  out.earn = await page.evaluate(() => {
    const el = document.querySelector(".earn");
    if (!el) return "MISSING";
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), w: Math.round(r.width) };
  });

  // Sticky joined-contest banner on home
  const home = page.locator(".bottom-nav__item", { hasText: "Home" }).first();
  if (await home.count()) await home.click().catch(() => {});
  await page.waitForTimeout(800);
  out.sticky = await page.evaluate(() => {
    const el = document.querySelector(".joined-contest-banners");
    if (!el) return "no-banner";
    window.scrollTo(0, 600);
    return new Promise((res) =>
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        res({ top: Math.round(r.top), pos: getComputedStyle(el).position });
      }, 400),
    );
  });

  // Mobile snooze pill position (left) + no cancel button
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const snoozeBtn = page.locator(".vote-feed__snooze-btn");
  if (await snoozeBtn.count()) {
    await page.evaluate(() =>
      document.querySelector(".vote-feed__snooze-btn")?.click(),
    );
    await page.waitForTimeout(400);
    out.pill = await page.evaluate(() => {
      const p = document.querySelector(".vote-feed__snooze");
      if (!p) return "PILL MISSING";
      const r = p.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        hasCancelBtn: !!document.querySelector(".vote-feed__close"),
      };
    });
  } else {
    out.pill = "no feed (no votes yet?)";
  }
  return out;
}
