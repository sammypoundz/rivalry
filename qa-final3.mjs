export default async function run(page) {
  const out = {};
  out.fetchResult = await page.evaluate(async () => {
    try {
      const token = localStorage.getItem("rivalry_token");
      const res = await fetch("/api/users/me/contestants", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return {
        status: res.status,
        count: json.contestants?.length,
        first: json.contestants?.[0]
          ? {
              id: json.contestants[0].id,
              galleryLen: json.contestants[0].gallery?.length,
              contest: json.contestants[0].contest?.title,
            }
          : null,
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
  return out;
}
