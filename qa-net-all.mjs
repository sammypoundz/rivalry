export default async function run(page, ui) {
  const log = [];
  page.on("request", (r) =>
    log.push("REQ " + r.resourceType() + " " + r.url().slice(0, 110)),
  );
  page.on("pageerror", (e) => log.push("PAGEERROR " + e.message.slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      log.push(m.type().toUpperCase() + " " + m.text().slice(0, 200));
  });
  await page.goto("http://localhost:5173", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(30000);
  const state = await page.evaluate(() =>
    document.body.innerText.slice(0, 120),
  );
  return { state, log };
}
