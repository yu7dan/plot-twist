// Records each chapter of design/demo (with &rec=1: no caption bar) via the CDP screencast into a 1920×1080 MP4,
// and saves when every narration line started, so the voice-over and subtitles can be laid on exactly.
// Usage: node record.mjs [chapter …]   (default: all chapters)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const ORDER = ["intro", "gift", "claim", "drop", "agent", "outro"];
const chapters = process.argv.slice(2).length ? process.argv.slice(2) : ORDER;
const demo = pathToFileURL(path.join(here, "..", "design", "demo", "index.html")).href;
const out = path.join(here, "out");
const FPS = 30, FADE = 0.3, TAIL = 0.4;

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--force-color-profile=srgb", "--hide-scrollbars"],
});

for (const ch of chapters) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${demo}#ch=${ch}&rec=1`);
  await page.waitForFunction(() => window.__ready && document.fonts.status === "loaded");
  await page.waitForTimeout(600); // images settle

  const dir = path.join(out, "frames", ch);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = path.join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await page.waitForTimeout(400);
  page.evaluate(() => window.__play());
  await page.waitForFunction(() => window.__done, null, { timeout: 120000, polling: 100 });
  await page.waitForTimeout(TAIL * 1000);
  // A still screen sends no frames, so the end comes from the page's clock (the same clock as the marks).
  const stopAt = await page.evaluate(() => (performance.timeOrigin + performance.now()) / 1000);
  await cdp.send("Page.stopScreencast");
  const marks = (await page.evaluate(() => window.__marks)).map((m) => ({ id: m.id, t: m.t / 1000 }));
  await ctx.close();

  // Frames arrive only when something changes: give each one its real on-screen duration.
  const start = frames[0].t, end = Math.max(frames.at(-1).t + 1 / FPS, stopAt);
  const list = frames.map((f, i) => `file '${f.file.replace(/\\/g, "/")}'\nduration ${((frames[i + 1]?.t ?? end) - f.t).toFixed(4)}`).join("\n") + `\nfile '${frames.at(-1).file.replace(/\\/g, "/")}'\n`;
  const listFile = path.join(dir, "list.txt");
  fs.writeFileSync(listFile, list);
  const dur = end - start;
  const mp4 = path.join(out, "chapters", `${ch}.mp4`);
  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile,
    "-vf", `fps=${FPS},scale=1920:1080:flags=lanczos,fade=t=in:st=0:d=${FADE},fade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE},format=yuv420p`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-r", String(FPS), "-t", dur.toFixed(3), mp4]);
  fs.writeFileSync(path.join(out, "chapters", `${ch}.json`), JSON.stringify({ ch, duration: dur, marks: marks.map((m) => ({ id: m.id, at: m.t - start })) }, null, 2));
  console.log(`${ch}: ${dur.toFixed(1)}s, ${frames.length} frames (${(frames.length / dur).toFixed(0)} fps captured), first line at ${(marks[0].t - start).toFixed(2)}s${errors.length ? "  ERRORS: " + errors.join(" | ") : ""}`);
}
await browser.close();
