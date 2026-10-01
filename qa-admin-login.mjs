export default async function run(page, ui) {
  await page.waitForTimeout(800);
  const snap = await ui.snapshot();
  const signin = snap.match(/@(e\d+) button "Sign In"/)?.[1];
  if (!signin) return { error: "no Sign In button", snap: snap.slice(0, 600) };
  await ui.click(signin);
  await page.waitForTimeout(800);

  const s2 = await ui.snapshot();
  const boxes = [...s2.matchAll(/@(e\d+) (?:textbox|spinbutton) "([^"]*)"/g)].map(m => `@e${m[1]}`);
  if (boxes.length < 2) return { error: "no login fields", s2: s2.slice(0, 900) };
  await ui.fill(boxes[0], "admin@rivalry.ng");
  await ui.fill(boxes[1], "Admin123!");
  const s3 = await ui.snapshot();
  const submit =
    s3.match(/@e\d+ button "Sign in"/)?.[0] ||
    s3.match(/@e\d+ button "Sign In"/)?.[0];
  if (!submit) return { error: "no submit", s3: s3.slice(0, 900) };
  await ui.click(submit.match(/e\d+/)[0].replace(/^/, "@"));
  await page.waitForSelector(".admindash__kpis", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return await page.evaluate(() => ({
    kpis: !!document.querySelector(".admindash__kpis"),
    kpiCount: document.querySelectorAll(".admindash__kpi").length,
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 600),
  }));
}
