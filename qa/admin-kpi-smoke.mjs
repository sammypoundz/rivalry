export default async function run(page) {
  // Sign in against the backend directly and inject the session token.
  const res = await page.request.post("http://localhost:5173/api/auth/login", {
    data: { email: "admin@rivalry.ng", password: "Admin123!" },
  });
  if (!res.ok()) return { error: "login API failed", status: res.status() };
  const body = await res.json();
  await page.evaluate((t) => {
    localStorage.setItem("rivalry_token", t);
  }, body.token);
  await page.reload();
  await page
    .waitForSelector(".admindash__kpis", { timeout: 40000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  return await page.evaluate(() => ({
    kpis: !!document.querySelector(".admindash__kpis"),
    kpiCount: document.querySelectorAll(".admindash__kpi").length,
    tabs: [...document.querySelectorAll(".admindash__tab")].map(
      (t) => t.textContent,
    ),
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 700),
  }));
}
