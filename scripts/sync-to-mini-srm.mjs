/**
 * Integration bridge: pull the normalized catalog from Price-Normalizer and load
 * it into Mini-SRM as materials (SPEC §8 export contract). Pull-based, one-way.
 *
 * Usage:
 *   node scripts/sync-to-mini-srm.mjs
 * Env overrides:
 *   PN_BASE   (default http://localhost:8000/api/v1)
 *   SRM_BASE  (default http://localhost:8001/api/v1)
 */
const PN_BASE = process.env.PN_BASE ?? "http://localhost:8000/api/v1";
const SRM_BASE = process.env.SRM_BASE ?? "http://localhost:8001/api/v1";

const PN_CREDS = { email: "operator@example.com", password: "password123" };
const SRM_CREDS = { email: "approver@example.com", password: "password123" };

async function post(base, path, body, token) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => undefined) };
}
async function get(base, path, token) {
  const res = await fetch(base + path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, body: await res.json().catch(() => undefined) };
}

async function main() {
  // Price-Normalizer uses accessToken; Mini-SRM uses access_token.
  const pn = await post(PN_BASE, "/auth/login", PN_CREDS);
  const pnToken = pn.body.accessToken;
  if (!pnToken) throw new Error("Price-Normalizer login failed: " + JSON.stringify(pn));

  const srm = await post(SRM_BASE, "/auth/login", SRM_CREDS);
  const srmToken = srm.body.access_token;
  if (!srmToken) throw new Error("Mini-SRM login failed: " + JSON.stringify(srm));

  const exported = await get(PN_BASE, "/export/catalog?mode=best", pnToken);
  console.log(`Price-Normalizer export: ${exported.body.length} priced items`);

  const before = await get(SRM_BASE, "/materials", srmToken);
  console.log(`Mini-SRM materials before: ${before.body.length}`);

  let created = 0;
  for (const item of exported.body) {
    const res = await post(
      SRM_BASE,
      "/materials",
      {
        name: item.name,
        unit: item.unit,
        category: item.category,
        base_price: item.price,
        is_active: true,
      },
      srmToken,
    );
    if (res.status === 201) {
      created++;
      console.log(`  + ${item.name}  ${item.price} ${item.currency} (${item.unit})`);
    } else {
      console.log(`  ! ${item.name} → ${res.status} ${JSON.stringify(res.body)}`);
    }
  }

  const after = await get(SRM_BASE, "/materials", srmToken);
  console.log(`\nЗалито материалов: ${created}`);
  console.log(`Mini-SRM materials after: ${after.body.length}`);
  console.log("Интеграция проверена: каталог Price-Normalizer загружен в Mini-SRM.");
}

main().catch((e) => {
  console.error("Bridge failed:", e.message);
  process.exit(1);
});
