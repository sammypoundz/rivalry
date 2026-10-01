export default async function run(page) {
  const res = await page.request.post("http://localhost:5173/api/auth/login", {
    data: { email: "admin@rivalry.ng", password: "Admin123!" },
  });
  const body = await res.json();
  await page.evaluate((t) => localStorage.setItem("rivalry_token", t), body.token);
  await page.reload();
  await page.waitForSelector(".admindash__kpi", { timeout: 40000 });

  // ---- Users tab: scroll-synced pagination ----
  await page.click('.admindash__tab:has-text("Users")');
  await page.waitForSelector(".admindash__user-row", { timeout: 20000 });
  const usersPage1 = await page.evaluate(() => ({
    rows: document.querySelectorAll(".admindash__user-row").length,
    pager: document.querySelector(".admindash__pager-label")?.textContent,
    rail: document.querySelectorAll(".admindash__pager-num").length,
    backBtn: !!document.querySelector(".admindash__back"),
  }));
  // click page 2 in the rail -> smooth scroll + auto-fetch
  await page.click('.admindash__pager-num:text-is("2")');
  await page.waitForTimeout(1500);
  const usersPage2 = await page.evaluate(() => ({
    rows: document.querySelectorAll(".admindash__user-row").length,
    pager: document.querySelector(".admindash__pager-label")?.textContent,
    activeNum: document.querySelector(".admindash__pager-num--active")?.textContent,
  }));
  // scroll down -> the last page-section triggers the next fetch
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(1500);
  const afterScroll = await page.evaluate(() => ({
    rows: document.querySelectorAll(".admindash__user-row").length,
    pageGroups: document.querySelectorAll(".admindash__page-group").length,
  }));

  // ---- Contests tab: pagination + click-through ----
  await page.click('.admindash__tab:has-text("Contests")');
  await page.waitForSelector(".admindash__contest-row", { timeout: 20000 });
  const contestsInfo = await page.evaluate(() => ({
    rows: document.querySelectorAll(".admindash__contest-row").length,
    pager: document.querySelector(".admindash__pager-label")?.textContent,
  }));
  // click the first row -> detail modal
  await page.click(".admindash__contest-row");
  await page.waitForSelector(".admindash__detail-card", { timeout: 20000 });
  await page.waitForTimeout(1500);
  const detail = await page.evaluate(() => ({
    title: document.querySelector(".admindash__detail-card h3")?.textContent,
    gridCells: document.querySelectorAll(".admindash__detail-grid > div").length,
    rewards: document.querySelectorAll(".admindash__detail-rewards li").length,
    rosterRows: document.querySelectorAll(".admindash__detail-roster li").length,
    cardBg: getComputedStyle(document.querySelector(".admindash__detail-card")).backgroundColor,
  }));
  await page.click(".admindash__detail-close");
  await page.waitForTimeout(500);
  const modalClosed = await page.evaluate(
    () => !document.querySelector(".admindash__detail-card"),
  );
  await page.screenshot({ path: "qa-admin-new-features.png", fullPage: true });

  return { usersPage1, usersPage2, afterScroll, contestsInfo, detail, modalClosed };
}
