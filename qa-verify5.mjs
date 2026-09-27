export default async function run(page) {
  const out = {};
  // Desktop: verify the centering rule applies to .earn regardless of navigation
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://localhost:5173");
  await page.waitForSelector(".dashboard", { timeout: 30000 });
  out.earnRule = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "earn";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const res = { maxWidth: cs.maxWidth, margin: cs.marginLeft };
    probe.remove();
    return res;
  });
  // Sticky rule check for the joined banner (probe on body — no dashboard needed)
  out.stickyRule = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.className = "joined-contest-banners";
    document.body.appendChild(probe);
    const cs = getComputedStyle(probe);
    const res = { position: cs.position, top: cs.top, zIndex: cs.zIndex };
    probe.remove();
    return res;
  });
  return out;
}
