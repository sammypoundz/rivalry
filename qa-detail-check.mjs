export default async function run(page, ui) {
  const out = { errors: [] };
  page.on("pageerror", (e) => out.errors.push("PAGEERROR " + e.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  // Wait for live-vote rows directly (covers the slow ~30s boot + votes poll).
  await page.waitForSelector(".vote-feed__row", { timeout: 180000 });
  await page.waitForTimeout(800);

  // ---------- 2. Vote-details modal responsive on desktop ----------
  // The feed rotates rows every 6s — a clicked row can detach mid-click.
  // Retry until the popup actually opens.
  let opened = false;
  for (let i = 0; i < 6 && !opened; i++) {
    const row = page.locator(".vote-feed__row").first();
    await row.click({ force: true, timeout: 4000 }).catch(() => {});
    opened = await page
      .waitForSelector(".vote-detail", { timeout: 2500 })
      .then(() => true)
      .catch(() => false);
  }
  if (opened) {
    out.voteDetail = await page.evaluate(() => {
      const overlay = document.querySelector(".vote-detail");
      const card = document.querySelector(".vote-detail__card");
      if (!overlay || !card) return "missing";
      const cs = getComputedStyle(card);
      const os = getComputedStyle(overlay);
      const r = card.getBoundingClientRect();
      const or = overlay.getBoundingClientRect();
      return {
        overlayParent: overlay.parentElement.tagName,
        overlayPos: os.position,
        overlayRect: [Math.round(or.x), Math.round(or.y), Math.round(or.width), Math.round(or.height)],
        cardMaxW: cs.maxWidth,
        cardW: Math.round(r.width),
        cardCenteredX: Math.round(r.left + r.width / 2),
        viewportW: window.innerWidth,
      };
    });
    await page.screenshot({ path: "qa-votedetail-desktop.png" });
    await page.keyboard.press("Escape");
  } else {
    out.voteDetail = "popup never opened after 6 clicks";
  }

  return out;
}
