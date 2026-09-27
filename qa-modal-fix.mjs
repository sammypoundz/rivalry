export default async function run(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:5173");
  await page.waitForSelector(".vote-feed__row", { timeout: 60000 });
  const out = {};
  // Open the popup
  await page.evaluate(() =>
    document
      .querySelector(".vote-feed__row")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  await page.waitForTimeout(400);
  out.opened = await page.evaluate(
    () => !!document.querySelector(".vote-detail"),
  );
  // Tap the close button
  await page.evaluate(() =>
    document
      .querySelector(".vote-detail__close")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  await page.waitForTimeout(300);
  out.closedByBtn = await page.evaluate(
    () => !document.querySelector(".vote-detail"),
  );
  // Open again, navigate to Contests tab, come back home
  await page.evaluate(() =>
    document
      .querySelector(".vote-feed__row")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
  );
  await page.waitForTimeout(300);
  out.reopened = await page.evaluate(
    () => !!document.querySelector(".vote-detail"),
  );
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".bottom-nav__item")].find((x) =>
      x.textContent.toLowerCase().includes("contest"),
    );
    b?.click();
  });
  await page.waitForTimeout(600);
  out.modalWhileAway = await page.evaluate(
    () => !!document.querySelector(".vote-detail"),
  );
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".bottom-nav__item")].find((x) =>
      x.textContent.toLowerCase().includes("home"),
    );
    b?.click();
  });
  await page.waitForTimeout(600);
  out.modalAfterReturningHome = await page.evaluate(
    () => !!document.querySelector(".vote-detail"),
  );
  return out;
}
