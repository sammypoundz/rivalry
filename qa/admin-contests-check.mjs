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
  await page.click('.admindash__tab:has-text("Contests")');
  // wait up to 20s for contest rows
  let ok = false;
  for (let i = 0; i < 20; i++) {
    const n = await page.evaluate(
      () => document.querySelectorAll(".admindash__contest-row").length,
    );
    if (n > 0) {
      ok = true;
      break;
    }
    await page.waitForTimeout(1000);
  }
  return await page.evaluate(() => ({
    rows: document.querySelectorAll(".admindash__contest-row").length,
    spinner: !!document.querySelector(".admindash__loading"),
    text: document.body.innerText.replace(/\s+/g, " ").slice(200, 800),
  }));
}
