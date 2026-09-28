export default async function run(page, ui) {
  const out = { errors: [] };
  page.on("pageerror", (e) => out.errors.push("PAGEERROR " + e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForSelector(".dashboard", { timeout: 30000 });
  await page.waitForTimeout(1200);

  // ---------- 1. Refer a Friend modal: real brand icons ----------
  // Open a contest detail first
  const card = page.locator(".contest-card").first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(900);
  }
  const referBtn = page.locator(".contest-detail__refer");
  if (await referBtn.count()) {
    await referBtn.click();
    await page.waitForTimeout(500);
    out.referModal = await page.evaluate(() => {
      const icons = [...document.querySelectorAll(".share-sheet__target-icon")];
      return {
        open: !!document.querySelector(".share-sheet"),
        targets: icons.map((i) => ({
          bg: getComputedStyle(i).backgroundColor,
          hasSvg: !!i.querySelector("svg"),
          text: i.parentElement?.textContent?.trim().slice(0, 12),
        })),
      };
    });
    await page.screenshot({ path: "qa-refer-icons.png" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } else {
    out.referModal = "no refer button";
  }

  // ---------- 2. Vote-details modal responsive on desktop ----------
  const row = page.locator(".vote-feed__row").first();
  if (await row.count()) {
    await row.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    out.voteDetail = await page.evaluate(() => {
      const d = document.querySelector(".vote-detail");
      if (!d) return "not-open";
      const card = document.querySelector(".vote-detail__card");
      const r = card?.getBoundingClientRect();
      const cs = card ? getComputedStyle(card) : null;
      return {
        cardWidth: r ? Math.round(r.width) : null,
        cardHeight: r ? Math.round(r.height) : null,
        maxWidth: cs?.maxWidth,
        paddingBottom: cs?.paddingBottom,
        paddingX: cs ? cs.paddingLeft + "/" + cs.paddingRight : null,
        overflowsCard:
          card &&
          [...card.children].some(
            (c) => c.getBoundingClientRect().right > r.right + 1,
          ),
      };
    });
    await page.screenshot({ path: "qa-votedetail-desktop.png" });
    await page.keyboard.press("Escape");
  } else {
    out.voteDetail = "no vote rows (no votes in DB?)";
  }

  return out;
}
