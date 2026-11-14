// Fails CI if the Bangla and English catalogues drift apart.
import bn from "./messages/bn.json" with { type: "json" };
import en from "./messages/en.json" with { type: "json" };

const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

const a = new Set(keys(bn)), b = new Set(keys(en));
const missing = [...[...b].filter((k) => !a.has(k)).map((k) => `bn missing ${k}`), ...[...a].filter((k) => !b.has(k)).map((k) => `en missing ${k}`)];
if (missing.length) { console.error(missing.join("\n")); process.exit(1); }
console.log(`✓ ${a.size} keys in sync`);
