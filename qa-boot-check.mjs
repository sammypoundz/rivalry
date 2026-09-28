export default async function run(page, ui) {
  const log = [];
  page.on("requestfailed", (r) =>
    log.push(
      "FAIL " +
        r.method() +
        " " +
        r.url() +
        " :: " +
        (r.failure()?.errorText || ""),
    ),
  );
  page.on("response", (r) => {
    if (r.url().includes("/api/"))
      log.push("RESP " + r.status() + " " + r.url().slice(0, 90));
  });
  await page.goto("http://localhost:5173", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  // give the boot fetch up to 90s
  const booted = await page
    .waitForSelector(".dashboard, .app-boot", { timeout: 90000 })
    .then((e) => e.evaluate((el) => el.className))
    .catch(() => "neither");
  await page.waitForTimeout(3000);
  const state = await page.evaluate(() =>
    document.body.innerText.slice(0, 200),
  );
  return { booted, state, log: log.slice(0, 25) };
}
