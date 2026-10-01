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
  await page.waitForTimeout(6000);
  return await page.evaluate(() => ({
    kpiCount: document.querySelectorAll(".admindash__kpi").length,
    skeletonRows: document.querySelectorAll(".admindash__skl--rowmain").length,
    errorText: document.querySelector(".admindash__error")?.textContent ?? null,
  }));
}
