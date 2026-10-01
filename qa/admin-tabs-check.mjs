export default async function run(page) {
  const res = await page.request.post("http://localhost:5173/api/auth/login", {
    data: { email: "admin@rivalry.ng", password: "Admin123!" },
  });
  const body = await res.json();
  await page.evaluate(
    (t) => localStorage.setItem("rivalry_token", t),
    body.token,
  );
  await page.reload();
  await page.waitForSelector(".admindash__kpi", { timeout: 40000 });
  await page.waitForTimeout(1200);
  // open the Users tab
  await page.click('.admindash__tab:has-text("Users")');
  await page.waitForTimeout(2000);
  const users = await page.evaluate(() => ({
    tab: document.querySelector(".admindash__tab--active")?.textContent,
    rows: document.querySelectorAll(".admindash__user-row").length,
  }));
  // open the Contests tab
  await page.click('.admindash__tab:has-text("Contests")');
  await page.waitForTimeout(2500);
  const contests = await page.evaluate(() => ({
    tab: document.querySelector(".admindash__tab--active")?.textContent,
    rows: document.querySelectorAll(".admindash__contest-row").length,
  }));
  await page.screenshot({ path: "qa-admin-desktop.png", fullPage: true });
  return { users, contests };
}
