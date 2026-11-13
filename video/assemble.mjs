// Joins the recorded chapters, lays every voice-over line at the moment the tour started it, and burns in
// bilingual (EN + ZH) subtitles. Outputs out/plot-twist-demo.mp4 (subtitled), out/plot-twist-demo-clean.mp4,
// and out/subs.en.srt / out/subs.zh.srt.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "out");
const ORDER = ["intro", "gift", "claim", "drop", "agent", "outro"];
const N = JSON.parse(fs.readFileSync(path.join(here, "narration.json"), "utf8"));
const LINES = Object.fromEntries(N.chapters.flatMap((c) => c.lines.map((l) => [l.id, l])));
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const ff = (args) => execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });

// 1. Timeline: where each chapter starts, and when each line plays.
let offset = 0;
const cues = [];
const parts = [];
for (const ch of ORDER) {
  const meta = JSON.parse(fs.readFileSync(path.join(out, "chapters", `${ch}.json`), "utf8"));
  const file = path.join(out, "chapters", `${ch}.mp4`);
  const d = dur(file);
  for (const m of meta.marks) cues.push({ id: m.id, start: offset + m.at, len: dur(path.join(out, "vo", `${m.id}.mp3`)) });
  parts.push(file);
  offset += d;
}
const total = offset;
console.log(`video ${total.toFixed(1)}s, ${cues.length} lines`);

// 2. Video: chapters back to back.
const listFile = path.join(out, "chapters.txt");
fs.writeFileSync(listFile, parts.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n"));
const silent = path.join(out, "video-silent.mp4");
ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", silent]);

// 3. Voice-over: each line delayed to its cue, mixed, loudness-normalised for social video.
const voice = path.join(out, "voice.m4a");
const inputs = cues.flatMap((c) => ["-i", path.join(out, "vo", `${c.id}.mp3`)]);
const delays = cues.map((c, i) => `[${i}:a]adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)},aresample=48000[a${i}]`).join(";");
const mix = `${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)},loudnorm=I=-16:TP=-1.5:LRA=11[v]`;
ff([...inputs, "-filter_complex", `${delays};${mix}`, "-map", "[v]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", voice]);

// 4. Subtitles: each line stays until just before the next one.
const ts = (s, sep) => { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return `${String(h).padStart(sep === "," ? 2 : 1, "0")}:${String(m).padStart(2, "0")}:${sep === "," ? sec.toFixed(3).padStart(6, "0").replace(".", ",") : sec.toFixed(2).padStart(5, "0")}`; };
const spans = cues.map((c, i) => ({ ...c, end: Math.min(c.start + c.len + 0.35, (cues[i + 1]?.start ?? total) - 0.05) }));
const srt = (lang) => spans.map((c, i) => `${i + 1}\n${ts(c.start, ",")} --> ${ts(c.end, ",")}\n${LINES[c.id][lang]}\n`).join("\n");
fs.writeFileSync(path.join(out, "subs.en.srt"), srt("en"));
fs.writeFileSync(path.join(out, "subs.zh.srt"), srt("zh"));

const fontsDir = path.join(here, "..", "src", "assets", "fonts").replace(/\\/g, "/");
const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: EN,Geist,40,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,0,2,2,160,160,74,1
Style: ZH,Microsoft YaHei,31,&H00E6E6EA,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,0,2,2,160,160,26,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${spans.map((c) => `Dialogue: 0,${ts(c.start, ".")},${ts(c.end, ".")},EN,,0,0,0,,{\\fad(120,120)}${LINES[c.id].en}\nDialogue: 0,${ts(c.start, ".")},${ts(c.end, ".")},ZH,,0,0,0,,{\\fad(120,120)}${LINES[c.id].zh}`).join("\n")}
`;
const assFile = path.join(out, "subs.ass");
fs.writeFileSync(assFile, ass);

// 5. Mux. libass needs forward slashes and an escaped drive colon inside the filter graph.
const esc = (p) => p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");
ff(["-i", silent, "-i", voice, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "copy", "-shortest", "-movflags", "+faststart", path.join(out, "plot-twist-demo-clean.mp4")]);
ff(["-i", silent, "-i", voice, "-vf", `ass='${esc(assFile)}':fontsdir='${esc(fontsDir)}'`, "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", "-movflags", "+faststart", path.join(out, "plot-twist-demo.mp4")]);
console.log("done:", path.join(out, "plot-twist-demo.mp4"));
