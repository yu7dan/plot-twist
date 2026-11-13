// Plays chapters of design/demo headlessly and saves a frame every ~1.5s, for checking the tour.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
const here = path.dirname(fileURLToPath(import.meta.url));
const demo = pathToFileURL(path.join(here, "..", "design", "demo", "index.html")).href;
const out = path.join(here, "out", "preview"); fs.mkdirSync(out, { recursive: true });
const chs = process.argv.slice(2).length ? process.argv.slice(2) : ["intro", "gift", "claim", "drop", "agent", "outro"];
const b = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
for (const ch of chs) {
  const p = await (await b.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() !== "log" && errs.push(m.text()));
  await p.goto(`${demo}#ch=${ch}`); await p.waitForFunction(() => window.__ready);
  const t0 = Date.now(); p.evaluate(() => window.__play());
  let n = 0;
  while (!(await p.evaluate(() => window.__done)) && Date.now() - t0 < 60000) { await p.screenshot({ path: path.join(out, `${ch}-${String(n++).padStart(2, "0")}.png`) }); await p.waitForTimeout(1500); }
  await p.screenshot({ path: path.join(out, `${ch}-end.png`) });
  console.log(ch, ((Date.now() - t0) / 1000).toFixed(1) + "s", n, "frames", errs.length ? "ERRORS: " + [...new Set(errs)].join(" | ") : "");
  await p.close();
}
await b.close();
