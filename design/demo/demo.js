/* Plot Twist demo: a hardcoded replica of the app (same markup and stylesheets as the real components) with an
   auto-played, chaptered tour — fake cursor, clicks, typing — paced to the voice-over in timings.js.
   #ch=<chapter> plays one chapter; add &rec=1 for recording (no caption bar, no controls). */

const A = "../../public/assets/", TK = A + "tokens/";
const GAP = 380; // ms of silence between narration lines
const $ = (s, r = document) => r.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const params = new URLSearchParams(location.hash.slice(1));
const REC = params.get("rec") === "1";
const usd = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ---------- icons & marks (copied from the app) ---------- */
const I = {
  spark: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>',
  chev: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  edit: '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  checkSm: '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  copy: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  refresh: '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  lock: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  ext: '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
  back: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  fp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>',
  lockUrl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
};
const V = {
  sun: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  drop: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  gift: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
  term: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 17 6-6-6-6M12 19h8"/></svg>',
  fn: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/></svg>',
  plug: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/></svg>',
  user: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  code: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>',
};
const brand = (k) => `<span class="brand">${window.BRAND[k]}</span>`;
const ci = (id) => `<span class="ci"><img src="${TK}${{ base: "chain_base.png", solana: "chain_sol.png", polygon: "chain_polygon.png", avalanche: "chain_avax.png", arc: "arc_256.png", tempo: "tempo_touch.png", robinhood: "rh_152.png" }[id]}" alt=""></span>`;
const ti = () => `<span class="ti"><img src="${TK}usdc.svg" alt=""></span>`;
const mascot = (pose, cls = "", style = "") => `<img class="mascot ${cls}" style="${style}" src="${A}${pose === "head" ? "logo-head" : "m-" + pose}.png" alt="">`;
const logo = `<a class="logo"><span class="mark img">${mascot("head")}</span>Plot Twist</a>`;
const NETS = ["base", "solana", "polygon", "avalanche", "arc", "tempo", "robinhood"];

/* ---------- product screens ---------- */
const nav = (active = "") => `<header class="v-nav">
  <div class="v-nav-l">${logo}
    <div class="v-mi"><button>Products ${I.chev}</button></div>
    <div class="v-mi"><a class="${active === "dashboard" ? "on" : ""}">Dashboard</a></div>
    <div class="v-mi"><a>Docs</a></div></div>
  <div class="v-nav-r"><button class="v-icon">${V.sun}</button><button class="pill kite-pill">${brand("kite")}Kite · <span class="num">$254.30</span>${I.chev}</button></div>
</header>`;

const CAST = [["happy", 8, 20, 130, ""], ["wink", 82, 14, 120, ""], ["cute", 20, 60, 84, "mid"], ["sparkle", 74, 56, 96, "mid"], ["secret", 4, 84, 70, "far"], ["surprise", 90, 80, 76, "far"], ["claimed", 32, 10, 56, "far"], ["happy", 64, 8, 52, "far"]];
const homeShell = () => `<div class="screen desk app">${nav()}<div class="v-home"><section class="v-hero">
  <div class="v-cast" aria-hidden="true">${CAST.map(([p, x, y, w, d], i) => mascot(p, d, `left:${x}%;top:${y}%;width:${w}px;animation-delay:${-i * 1.3}s`)).join("")}</div>
  <h1>Send money<br><em>like a gift.</em></h1>
  <div class="v-panel"><div class="v-tabs" id="tabs"></div><div id="panel"></div></div>
  <p class="v-under">USDC on <span class="nets">${NETS.map(ci).join("")}</span> 7 networks. Claimed with any wallet<br>or exchange address — <a>gas is on us</a>.</p>
</section></div><div class="ov"></div></div>`;

const S = {
  tab: "gift",
  gift: { phase: "empty", prompt: "", exp: 24, cta: "example", noteEdit: false },
  drop: { phase: "empty", brief: "", rows: [], amountAt: null, all: false },
};
const GIFT = { name: "Maya", occasion: "Birthday", amount: 50, note: "New city, same you. Your first coffee in Berlin is on me — happy birthday!", insight: "The note picks up her move to Berlin." };
const EXP = [[24, "24h"], [72, "3d"], [168, "7d"], [720, "30d"]];
const fee = (a, rate = 0.015, min = 0.25) => Math.max(Number((a * rate).toFixed(2)), min);
const tok = () => `<button class="v-tok"><span class="net">${ti()}${ci("base")}</span>USDC${I.chev}</button>`;

function tabs() {
  return [["gift", "Gift"], ["drop", "Drop"], ["api", "Agent API"]].map(([k, l]) => `<button data-tab="${k}" class="${S.tab === k ? "on" : ""}">${l}</button>`).join("");
}

function giftPanel() {
  const g = S.gift, filled = g.phase === "filled", gen = g.phase === "gen";
  const skel = (w, h = 14) => `<span class="skel" style="width:${w}px;height:${h}px"></span>`;
  const quick = ["Birthday", "Red packet 红包", "Thank you"].map((l) => `<button class="v-chip">${l}</button>`).join("");
  let cta;
  if (g.phase === "empty") cta = g.prompt.length > 8 ? `<button class="v-cta" id="cta">${I.spark}Design gift</button>` : `<button class="v-cta soft" id="cta">${I.spark}Try an example</button>`;
  else if (gen) cta = `<button class="v-cta off"><span class="spin"></span>SERV is designing your gift</button>`;
  else cta = `<button class="v-cta" id="cta">${brand("kite")}Send with Kite</button>`;
  return `<div class="v-gift">
  <div class="v-mod"><div class="v-lbl"><span>Describe the gift</span>${filled ? `<span style="display:flex;gap:8px;align-items:center"><span class="v-serv fill-in">${I.spark}Designed by SERV</span><button class="v-mini">${I.refresh}</button></span>` : gen ? `<span class="v-serv muted">${mascot("head")}Designing</span>` : ""}</div>
    ${g.phase === "empty"
      ? `<div class="v-prompt demo-prompt ${g.prompt ? "" : "ph"}" id="prompt">${g.prompt || "Who’s it for, what’s the occasion, how much?"}</div>${g.prompt ? "" : `<div class="v-chips">${quick}</div>`}`
      : `<p class="v-prompt-text">${g.prompt}</p>`}
  </div>
  <div class="v-link ${gen ? "busy" : ""}"><span>${I.spark}</span></div>
  <div class="v-mod out">
    <div class="v-lbl"><span>${filled ? `<span class="v-name fill-in" id="gname">${GIFT.name}</span> receives` : "They receive"}</span>${filled ? `<span class="v-chip fill-in">${GIFT.occasion}</span>` : gen ? skel(70, 20) : `<span class="v-chip">Gas covered</span>`}</div>
    <div class="v-split"><div style="min-width:0">${filled ? `<label class="v-amt num fill-in" id="gamt">$<input value="${GIFT.amount}" readonly></label>` : gen ? `<div class="v-big">${skel(140, 34)}</div>` : `<div class="v-big ph num">$0</div>`}
      <div class="v-sub num">Kite balance 174.30 USDC${filled ? "<b>Max</b>" : ""}</div></div>${tok()}</div>
    ${filled ? `<div class="v-note fill-in" id="gnote"><p>“${GIFT.note}”</p><button class="v-mini">${I.edit}</button></div><div class="v-hint fill-in">${I.spark}<span>${GIFT.insight}</span></div>` : gen ? `<div class="v-note">${skel(300)}</div>` : ""}
  </div>
  <div class="v-meta"><span class="num">${filled ? `You pay <b>${usd(GIFT.amount + fee(GIFT.amount))}</b> · fee ${usd(fee(GIFT.amount))}` : "Fee 1.5% · gas covered"}</span>
    <span class="v-exp"><span>Claim within</span>${EXP.map(([h, l]) => `<button data-exp="${h}" class="${g.exp === h ? "on" : ""}">${l}</button>`).join("")}</span></div>
  ${cta}</div>`;
}

const DROP_LIST = [
  ["alice.eth", "@alice", 40, "Alice, your docs rewrite cut our support questions in half. Thank you!"],
  ["bob", "GitHub", 25, "Bob — three bug fixes in one week. The release is better because of you."],
  ["chen_dev", "GitHub", 25, "Chen, your first PR landed and it’s already in production. Welcome aboard!"],
  ["mira", "Discord", 25, "Mira, you answered more newcomer questions than anyone this month."],
  ["sam.sol", "X", 15, "Sam, the thread you wrote brought 200 new members. Thank you."],
];
const DROP_BRIEF = "Thank our top contributors this month:\nalice.eth, 40, @alice — rewrote the docs\nbob, 25, GitHub — three bug fixes\nchen_dev, 25, GitHub — first PR\nmira, 25, Discord — helped newcomers\nsam.sol, 15, X — the thread that brought 200 members";
const dropFee = (a) => Math.max(Number((a * 0.01).toFixed(2)), 0.1);
const dropTotals = (rows) => { const sum = rows.reduce((s, r) => s + r[2], 0), f = rows.reduce((s, r) => s + dropFee(r[2]), 0); return { sum, fee: Number(f.toFixed(2)), total: Number((sum + f).toFixed(2)) }; };

function dropPanel() {
  const d = S.drop, filled = d.phase === "filled", building = d.phase === "building";
  const t = dropTotals(d.rows);
  const rows = (d.all ? d.rows : d.rows.slice(0, 4)).map((r, i) => `<div class="v-rw ${filled && d.anim ? "anim-in" : ""}" style="animation-delay:${i * 90}ms" data-row="${i}">
      <span class="av">${r[0][0].toUpperCase()}</span>
      <span class="v-who"><span><span class="nm">${r[0]}</span><span class="ct"> ${r[1]}</span></span><span class="nt">“${r[3]}”</span></span>
      ${d.amountAt === i ? `<label class="dt-amt-in num">$<input value="${r[2]}" id="amtin"></label>` : `<button class="dt-amt num" data-amt="${i}">${usd(r[2])}</button>`}
      <button class="rm">${I.x}</button></div>`).join("");
  let cta;
  if (d.phase === "empty") cta = d.brief ? `<button class="v-cta" id="cta">${I.spark}Build the Drop</button>` : `<button class="v-cta soft" id="cta">${I.spark}Try an example</button>`;
  else if (building) cta = `<button class="v-cta off"><span class="spin"></span>SERV is writing everyone’s note</button>`;
  else cta = `<button class="v-cta" id="cta">${brand("kite")}Approve ${usd(t.total)} with Kite</button>`;
  return `<div class="v-drop">
  <div class="v-mod"><div class="v-lbl"><span>Who’s getting paid?</span>${filled ? `<span class="v-serv">${I.spark}Table by SERV</span>` : building ? `<span class="v-serv muted">${mascot("head")}Building</span>` : `<span class="v-serv">${I.spark}SERV builds the table</span>`}</div>
    ${d.phase === "empty" ? `<div class="v-prompt demo-prompt ${d.brief ? "" : "ph"}" id="prompt" style="font-size:${d.brief ? 15 : 20}px">${d.brief || "Paste a list (name, amount) or describe it"}</div>${d.brief ? "" : `<div class="v-chips"><button class="v-chip">${I.spark}Try an example</button><span class="v-chip">CSV: name, amount, contact</span></div>`}`
      : `<p class="v-prompt-text v-clamp">${d.brief.replace(/:\n/, ": ").replace(/\n/g, " · ")}</p>`}
  </div>
  <div class="v-link ${building ? "busy" : ""}"><span>${I.spark}</span></div>
  <div class="v-mod out">
    <div class="v-lbl">${filled ? `<span class="dt-head"><button class="dt-title">Top contributors · November${I.edit}</button><span class="dt-count">${d.rows.length} people</span></span>` : `<span>Everyone gets a link and a note</span><span class="v-chip">Up to 200 people</span>`}</div>
    <div class="v-split"><div>${filled ? `<div class="v-big num">${usd(t.sum)}</div>` : building ? `<div class="v-big"><span class="skel" style="width:150px;height:34px"></span></div>` : `<div class="v-big ph num">$0</div>`}<div class="v-sub num">Kite balance 174.30 USDC</div></div>${tok()}</div>
    ${filled ? `<div class="v-rows">${rows}${d.rows.length > 4 && !d.all ? `<button class="v-rw more">+ ${d.rows.length - 4} more · review every note</button>` : ""}</div>` : ""}
    ${building ? `<div class="v-rows">${[0, 1, 2].map(() => `<div class="v-rw"><span class="av"></span><span class="skel" style="width:240px"></span></div>`).join("")}</div>` : ""}
  </div>
  <div class="v-meta"><span class="num">${filled ? `You pay <b>${usd(t.total)}</b> · fee ${usd(t.fee)}` : "Fee 1% per person · gas covered"}</span><span class="v-exp"><span>Claim within</span>${EXP.map(([h, l]) => `<button class="${h === 168 ? "on" : ""}">${l}</button>`).join("")}</span></div>
  ${cta}</div>`;
}

function apiPanel() {
  return `<div class="v-api"><div class="v-mod"><div class="v-lbl"><span>Connect your agent</span></div><div class="v-conn">
    <div class="v-cb"><span class="lg">${V.term}</span><span><b>REST API</b><small>One call prepares a Gift or a Drop</small></span><button class="act">${I.copy}Copy curl</button></div>
    <div class="v-cb"><span class="lg">${V.fn}</span><span><b>Function calling</b><small>OpenAI, Gemini, Claude and others</small></span><button class="act">${I.copy}Copy schema</button></div>
    <div class="v-cb"><span class="lg">${V.plug}</span><span><b>MCP server</b><small>Claude, Cursor and any MCP client</small></span><span class="act soon">Coming soon</span></div>
  </div><p class="v-fine">Your agent prepares Gifts and Drops and sends you an approval link. Every payment still waits for your Kite passkey — the agent never holds your money.</p></div>
  <a class="v-cta" style="margin-top:4px">Create an API key</a></div>`;
}

function drawPanel() {
  $("#tabs").innerHTML = tabs();
  $("#panel").innerHTML = S.tab === "gift" ? giftPanel() : S.tab === "drop" ? dropPanel() : apiPanel();
}

/* modals, rendered into the page's .ov layer (fixed inside the browser window) */
const ov = (html) => { $(".win .ov, .phone .ov").innerHTML = html; };
const reviewGift = () => `<div class="scrim"><div class="modal">
  <div class="m-h"><span>Review gift</span><button class="x">${I.x}</button></div>
  <div class="lbl">You send</div><div class="amt-lg num">${usd(GIFT.amount + fee(GIFT.amount))}</div>
  <div class="sub">${usd(GIFT.amount)} gift + ${usd(fee(GIFT.amount))} fee · USDC from your Kite wallet</div>
  <div class="m-block"><div class="asset">${ti()}<div class="meta"><b class="num">${GIFT.amount.toFixed(2)} USDC</b><span>USD Coin · on Base</span></div><span class="usd num">${usd(GIFT.amount)}</span></div></div>
  <div class="kv"><span>To</span><b>${GIFT.name} · ${GIFT.occasion}</b></div>
  <div class="kv"><span>Lands on</span><b>${ci("base")}Base</b></div>
  <div class="kv"><span>Pay with</span><b>${brand("kite")}Kite Passport · Base</b></div>
  <div class="kv"><span>Network fees</span><b>Covered</b></div>
  <div class="kv"><span>If unclaimed</span><b>Take it back after 3 days</b></div>
  <div class="quote">“${GIFT.note}”</div>
  <button class="cta" id="approve">Approve with passkey</button>
  <p class="fine">You’ll approve this exact transfer with your passkey in Kite Passport.<br>Nothing moves until you approve.</p></div></div>`;
const reviewDrop = (t, n) => `<div class="scrim"><div class="modal">
  <div class="m-h"><span>Review Drop</span><button class="x">${I.x}</button></div>
  <div class="lbl">You send</div><div class="amt-lg num">${usd(t.total)}</div>
  <div class="sub">${usd(t.sum)} to ${n} people + ${usd(t.fee)} fee · USDC from your Kite wallet</div>
  <div class="kv"><span>Drop</span><b>Top contributors · November</b></div>
  <div class="kv"><span>Lands on</span><b>${ci("base")}Base</b></div>
  <div class="kv"><span>Pay with</span><b>${brand("kite")}Kite Passport · one approval</b></div>
  <div class="kv"><span>Network fees</span><b>Covered</b></div>
  <div class="kv"><span>If unclaimed</span><b>Take it back after 7 days</b></div>
  <button class="cta" id="approve">Approve with passkey</button>
  <p class="fine">One passkey approval pays for every link. Each person gets their own link and note.</p></div></div>`;
const kiteModal = (amount, forWhat) => `<div class="scrim"><div class="kite">
  <div class="kite-h"><span class="kite-id">${brand("kite")}<span>Kite Passport<small>agentpassport.ai</small></span></span><button class="x kx">${I.x}</button></div>
  <h4>Approve transfer</h4><p class="req">Approve it with your passkey on Kite Passport. This page updates by itself.</p>
  <div class="kite-amt num">${amount.toFixed(2)}<small>USDC</small></div>
  <div class="kite-box"><div class="kv"><span>Network</span><b>${ci("base")}Base</b></div><div class="kv"><span>To</span><b>Plot Twist</b></div><div class="kv"><span>For</span><b>${forWhat}</b></div></div>
  <a class="cta" id="openkite">Open Kite Passport${I.ext}</a><div class="kite-wait"><span class="spin"></span>Waiting for your passkey…</div>
  <p class="fine">Kite sends exactly this amount to Plot Twist — nothing else.</p></div></div>`;
const passkeyPrompt = (amount) => `<div class="passkey" id="pk"><div class="fp">${I.fp}</div><b>Use your passkey</b><p>agentpassport.ai wants to approve<br>${amount.toFixed(2)} USDC to Plot Twist on Base</p><button id="pkgo">Continue</button></div>`;
const sealing = (steps) => {
  const rows = [["Transfer approved in Kite Passport", "passkey"], [`${(GIFT.amount + fee(GIFT.amount)).toFixed(2)} USDC received on Base`, "0x9f2c…e41a"], [`${GIFT.amount.toFixed(2)} USDC reserved for ${GIFT.name}`, "Plot Twist"], ["Gift sealed · link created", "7f3c9a1e"]];
  return `<div class="scrim"><div class="modal"><div class="m-h"><span>Sealing your gift</span><span class="sub">~5 sec</span></div><div class="steps">${rows.map((r, i) => `<div class="stp ${steps[i]}"><span class="ic">${I.checkSm}</span><span class="st-t">${r[0]}</span>${steps[i] === "ok" ? `<small>${r[1]}</small>` : ""}</div>`).join("")}</div></div></div>`;
};
const ready = (copied) => `<div class="scrim"><div class="modal done">
  <div style="display:flex;justify-content:flex-end"><button class="x">${I.x}</button></div>${mascot("surprise", "pop-m")}
  <h3>Gift ready</h3><p>Send this link to ${GIFT.name}. It opens sealed.<br><small class="ready-exp">Not claimed within 3 days? You can take it back from your Dashboard.</small></p>
  <div class="qr">${window.QR_SVG}</div>
  <div class="linkbox"><span>plot-twist-zeta.vercel.app/g/7f3c9a1e5b2d4c6a8e0f…</span><button class="copy" id="copy">${copied ? "Copied" : "Copy"}</button></div>
  <div class="share"><button>Telegram</button><button>X</button><button>WhatsApp</button></div><a class="muted-link">View in Dashboard →</a></div></div>`;

/* claim page (phone) */
const C = { phase: "sealed", display: null, ask: false, answer: "", sheet: null, paste: "", pasted: "" };
const ANSWER = "USDC is a digital dollar: each one is backed 1:1 by US dollars held by Circle. Your $50 stays $50 — keep it, spend it, or pass it on.";
const PASTE_ADDR = "0x7cEa998F9d83aFEF6bDdA7C20546aBdfA5941de9";
function claimPage() {
  const head = `<div class="claim-h"><span class="from"><span class="ini">K</span><span><b>Kai</b> sent you a gift</span></span><span class="tag">Birthday</span></div>`;
  let card;
  if (C.phase === "sealed") card = `<div class="card claim">${head}<div class="seal">${mascot("secret", "seal-m")}<div class="amt-xl num blur">$50.00</div><div class="tok-line num blur">50.00 USDC</div></div>
    <button class="cta" id="reveal">${I.spark}Reveal gift</button><p class="foot">Digital dollars on ${ci("base").replace('class="ci"', 'class="ci xs"')}Base · Sent with Kite Passport · Claim within 2d</p></div>`;
  else if (C.phase === "claimed") card = `<div class="card claim">${head}<div class="claimed">${mascot("claimed", "claimed-m")}<h3 class="num">$50.00 claimed</h3><p>50.00 USDC sent to 0x7cEa…1de9 on Base</p></div>
    <div class="txs"><a class="tx">${ti()}<b class="num">50.00 USDC</b><span>BaseScan ${I.ext}</span></a></div><a class="cta" style="margin-top:10px">Send one back</a><p class="foot">It may take a few seconds to show in your wallet</p></div>`;
  else {
    const cta = C.phase === "connected" ? `<button class="cta" id="claimgo">Claim $50.00 to 0x7cE…1de9</button>` : C.phase === "claiming" ? `<button class="cta off"><span class="spin"></span>Claiming on Base</button>` : `<button class="cta" id="claim">Claim $50.00</button>`;
    card = `<div class="card claim">${head}<div class="opened">${C.burst ? mascot("surprise", "burst-m") : ""}<div class="amt-xl num" id="amt">${C.display ?? "$50.00"}</div><div class="tok-line">for Maya · 50.00 USDC on ${ci("base").replace('class="ci"', 'class="ci xs"')}Base</div></div>
      <div class="m-block" style="margin-top:16px"><div class="asset">${ti()}<div class="meta"><b class="num">50.00 USDC</b><span>USD Coin · on Base</span></div><span class="usd num">$50.00</span></div></div>
      <div class="quote">“${GIFT.note}”</div>${cta}
      ${C.phase === "connected" ? `<p class="foot paste-check">To <b class="num">${PASTE_ADDR}</b> on Base · <button class="link">Change</button></p>` : ""}
      <div class="ask" id="ask"><span>${I.spark.replace("<svg", '<svg class="s"')}Ask about this gift</span><span style="display:flex;${C.ask ? "transform:rotate(180deg)" : ""}">${I.chev}</span></div>
      ${C.ask ? `<div class="ask-open"><div class="chips"><button class="chip ${C.answer ? "on" : ""}" id="q1">What is USDC?</button><button class="chip">What can I do with it?</button></div>${C.answer ? `<div class="qa fill-in"><small>${I.spark}SERV</small><span id="ans">${C.answer}</span></div>` : ""}</div>` : ""}</div>`;
  }
  let sheet = "";
  if (C.sheet === "wallets") sheet = `<div class="sheet-scrim"></div><div class="sheet"><div class="grab"></div><div class="m-h" style="margin-bottom:2px"><span>Where should it go?</span><button class="x">${I.x}</button></div>
    <p class="sub">Your gift lands on ${ci("base").replace('class="ci"', 'class="ci xs"')}Base. No sign-up, no gas.</p><div class="wallets">
    ${[["MetaMask", "w_metamask.svg", true, "Popular"], ["Coinbase Wallet", "w_coinbase.svg", false, ""], ["Trust Wallet", "w_trust.svg", false, ""]].map(([n, f, pad, s]) => `<button class="wl"><span class="brand ${pad ? "pad" : ""}"><img src="${TK}${f}" alt=""></span>${n}<small>${s}</small></button>`).join("")}
    </div><div class="or-line"><span>or</span></div><button class="wl paste-wl" id="pastebtn"><span class="brand paste-ic">${I.copy}</span>Paste an address<small>Exchange or any wallet</small></button></div>`;
  if (C.sheet === "paste") sheet = `<div class="sheet-scrim"></div><div class="sheet"><div class="grab"></div><div class="m-h" style="margin-bottom:2px"><button class="x back">${I.chev}</button><span>Paste an address</span><button class="x">${I.x}</button></div>
    <p class="sub">A 0x… address that can receive <b>USDC on ${ci("base").replace('class="ci"', 'class="ci xs"')}Base</b>.</p>
    <label class="tu-amt"><span class="tu-addr num demo-addr" id="addr">${C.paste || '<span style="color:var(--dim)">0x… address</span>'}</span></label>
    <div class="paste-warn">${I.lock}<span>From an exchange? Use its <b>USDC deposit address on Base</b>. If the exchange doesn’t support Base, the gift can’t be recovered.</span></div>
    <button class="cta" id="continue">Continue</button></div>`;
  return `<div class="screen desk app m"><div class="ph-nav">${logo}<a class="btn sm sec">Send your own</a></div><div class="claim-wrap"><div class="col">${card}</div></div>${sheet}<div class="ov"></div></div>`;
}
const drawClaim = () => { $(".phone-scroll").innerHTML = claimPage(); };
function label(top, big, sub) { const el = $(".phone-label"); el.style.opacity = 0; setTimeout(() => { el.innerHTML = `${top}<b>${big}</b>${sub}`; el.style.opacity = 1; }, 180); }

/* Drop page */
const DP = { claimed: 0, reclaimable: false, takenBack: false, fresh: true };
function dropPage() {
  const rows = S.drop.rows;
  const t = dropTotals(rows);
  const status = (i) => (i < DP.claimed ? ["Claimed", "ok"] : DP.takenBack ? ["Taken back", "back"] : ["Waiting", "wait"]);
  const claimedAmt = rows.slice(0, DP.claimed).reduce((s, r) => s + r[2], 0);
  const open = t.sum - claimedAmt;
  return `<div class="screen desk app">${nav()}<main class="v-page">
  <a class="v-back">${I.back}Dashboard</a>
  ${DP.fresh ? `<div class="v-banner">${mascot("claimed")}<div><b>Your Drop is live</b><p>Send each person their own link — by DM, email or however you reach them. Each link opens their gift and note.</p></div></div>` : ""}
  <div class="v-card"><div class="v-dh"><span class="v-pi drop">${V.drop}</span><div><h1>Top contributors · November</h1><p>${ci("base")}Base · ${rows.length} people · ${DP.reclaimable ? "claim window ended" : "claim within 7d"}</p></div><div class="v-dh-r"><b class="num">${usd(t.sum)}</b><small class="num">+ ${usd(t.fee)} fee</small></div></div>
    <div class="v-stats"><div><small>Claimed</small><b class="num">${DP.claimed} / ${rows.length}</b><span class="num">${usd(claimedAmt)}</span></div><div><small>Waiting</small><b class="num">${usd(DP.takenBack ? 0 : open)}</b><span>${DP.takenBack ? "taken back" : DP.reclaimable ? "can be taken back" : "7d left"}</span></div><div><small>Paid with Kite</small><b class="num">${usd(t.total)}</b><a>View transaction ${I.ext}</a></div></div>
    <div class="v-progress"><i style="width:${(DP.claimed / rows.length) * 100}%"></i></div>
    <div class="v-actions"><button class="v-btn">${I.copy}Copy all links</button><button class="v-btn">Download CSV</button>${DP.reclaimable && !DP.takenBack ? `<button class="v-btn warn" id="takeback">Take back ${usd(open)} to 0xd8C3…1f48</button>` : ""}${DP.takenBack ? `<a class="v-btn">Take-back transaction ${I.ext}</a>` : ""}</div></div>
  <div class="v-card v-list">${rows.map((r, i) => { const [l, tone] = status(i); return `<div class="v-li" data-li="${i}"><span class="av">${r[0][0].toUpperCase()}</span><div class="v-who"><b>${r[0]}</b><small>${r[1]}</small><p>“${r[3]}”</p></div><span class="am num">${usd(r[2])}</span><span class="v-st ${tone}">${l}</span><button class="v-mini">${i < DP.claimed ? I.ext : I.copy}</button></div>`; }).join("")}</div>
  </main><div class="ov"></div></div>`;
}

/* Agent: approve page + Developers */
const AP = { phase: "pending" };
const LEO = { name: "Leo", amount: 25, note: "Happy birthday, Leo — the next jazz night is on me." };
function approvePage() {
  const total = LEO.amount + fee(LEO.amount);
  const live = AP.phase === "live";
  return `<div class="screen desk app">${nav()}<main class="v-page">
  <div class="v-banner">${mascot(live ? "claimed" : "sparkle")}<div><b>${live ? "Approved and paid" : "Your agent prepared this"}</b><p>${live ? "The link is ready — your agent picks it up from the API and delivers it." : "Nothing has been paid. Review it, then approve the exact total with your Kite passkey."}</p></div></div>
  <div class="v-card"><div class="v-dh"><span class="v-pi gift">${V.gift}</span><div><h1>Gift for ${LEO.name}</h1><p>${ci("base")}Base · Birthday · claim within 24 hours</p></div><div class="v-dh-r"><b class="num">${usd(total)}</b><small class="num">incl. ${usd(fee(LEO.amount))} fee</small></div></div>
    <div class="v-note" style="cursor:default"><p>“${LEO.note}”</p></div>
    <div style="margin-top:16px">${live ? `<div class="v-actions" style="margin-top:0"><button class="v-btn">${I.copy}Copy the link</button><a class="v-btn">Open the gift ${I.ext}</a></div>` : `<button class="v-cta" id="apgo">${brand("kite")}Approve ${usd(total)} with Kite</button>`}</div>
    <p class="v-fine" style="text-align:center">Prepared by your agent “Birthday agent” just now. Keys can prepare payments, never send them.</p></div>
  </main><div class="ov"></div></div>`;
}
const DAYS = 30;
const CHART = Array.from({ length: DAYS }, (_, i) => { const r = Math.round(18 + 26 * Math.abs(Math.sin(i * 0.45)) + i * 1.3); return [r, Math.round(r * (0.16 + 0.08 * Math.abs(Math.cos(i))))]; });
function developers(grow) {
  const max = Math.max(...CHART.map((c) => c[0]));
  const day = (i) => new Date(Date.UTC(2026, 9, 15 + i)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `<div class="screen desk app">${nav("dashboard")}<main class="wrap">
  <div class="page-h"><h2>Dashboard</h2><span style="display:flex;gap:8px"><a class="btn sm sec">Docs</a><button class="btn sm acc">+ Create API key</button></span></div>
  <div class="d-levels"><button>${V.user}Activity</button><button class="on">${V.code}Developers<span class="d-api">API</span></button></div>
  <div class="d-dev-h"><p>Agents use these keys to prepare Gifts and Drops for you. Every payment still waits for your passkey. <a>Read the docs →</a></p><span class="d-range"><button>7d</button><button class="on">30d</button><button>90d</button></span></div>
  <div class="d-kpis"><div><small>API requests</small><b class="num" data-count="1578">1,578</b><span class="up">+18% vs previous 30d</span></div><div><small>Prepared by agents</small><b class="num">46</b><span>38 Gifts · 8 Drops</span></div><div><small>Approved by you</small><b class="num">41</b><span>89% approval rate</span></div><div><small>Paid via API</small><b class="num">$3,420.00</b><span>$41.20 in fees</span></div></div>
  <div class="v-card"><div class="d-chart-h"><span>Requests per day</span><span class="d-legend"><span><i class="a"></i>Gifts &amp; Drops prepared</span><span><i class="b"></i>Other calls</span></span></div>
    <div class="d-chart">${CHART.map(([r, p], i) => `<div class="d-col"><i class="b" style="height:${grow ? ((r - p) / max) * 100 : 0}%;transition:height .8s ${i * 18}ms cubic-bezier(.2,.8,.2,1)"></i><i class="a" style="height:${grow ? (p / max) * 100 : 0}%;transition:height .8s ${i * 18 + 120}ms cubic-bezier(.2,.8,.2,1)"></i></div>`).join("")}</div>
    <div class="d-xaxis">${[0, 7, 14, 22, 29].map((i) => `<span>${day(i)}</span>`).join("")}</div></div>
  <div class="v-card"><div class="d-sec-h">API keys <small>2 of 10</small></div><div class="d-tbl-wrap"><table class="d-tbl"><thead><tr><th>Name</th><th>Key</th><th>Last 30 days</th><th class="num">Requests</th><th class="num">Prepared</th><th class="num">Paid</th><th>Last used</th><th></th></tr></thead><tbody>
    <tr><td><b>Birthday agent</b><small>Created Oct 12</small></td><td><code>pt_live_K0Gs…</code></td><td><span class="d-spark">${CHART.slice(-14).map((c) => `<i style="height:${3 + (c[0] / max) * 17}px"></i>`).join("")}</span></td><td class="num">1,124</td><td class="num">31</td><td class="num">$1,640.00</td><td>Just now</td><td><button class="v-btn warn d-sm">Revoke</button></td></tr>
    <tr><td><b>Community bot</b><small>Created Oct 28</small></td><td><code>pt_live_9xPa…</code></td><td><span class="d-spark">${CHART.slice(-14).map((c, i) => `<i style="height:${i > 3 ? 3 + (c[0] / max) * 12 : 3}px"></i>`).join("")}</span></td><td class="num">454</td><td class="num">15</td><td class="num">$1,780.00</td><td>Yesterday</td><td><button class="v-btn warn d-sm">Revoke</button></td></tr>
  </tbody></table></div><p class="d-note" id="freenote">The API is free. Plot Twist only earns its usual fee — 1.5% per Gift, 1% per Drop recipient — when you approve and pay.</p></div>
  </main><div class="ov"></div></div>`;
}

/* ---------- stage: scenes ---------- */
const stage = () => $("#scene");
const browser = (url, inner) => `<div class="win"><div class="win-bar"><i></i><i></i><i></i><div class="win-url">${I.lockUrl}${url}</div></div><div class="win-body"><div class="win-scroll">${inner}</div></div></div>`;
const phone = (inner) => `<div class="phone"><div class="phone-screen"><div class="phone-island"></div><div class="phone-status"><span>9:41</span><span>●●● ▮</span></div><div class="phone-scroll">${inner}</div></div></div>`;
const setUrl = (u) => { const el = $(".win-url"); if (el) el.innerHTML = I.lockUrl + u; };
const winScroll = () => $(".win-scroll");
async function scrollWin(y, dur = 700) {
  const el = winScroll(), from = el.scrollTop, t0 = performance.now();
  while (true) { const k = Math.min(1, (performance.now() - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTop = from + (y - from) * e; glassNav(); if (k >= 1) break; await sleep(16); }
}
function glassNav() { const n = $(".win-scroll .v-nav"); if (n) n.classList.toggle("glass", winScroll().scrollTop > 8); }

/* ---------- cursor, captions, narration ---------- */
let cx = 1500, cy = 1180;
const cursor = () => $("#cursor");
function placeCursor(x, y, dur) { const c = cursor(); c.style.transition = `transform ${dur}ms cubic-bezier(.45,.05,.25,1)`; c.style.transform = `translate(${x - 5}px, ${y - 3}px)`; cx = x; cy = y; }
const target = (t) => (typeof t === "string" ? document.querySelector(t) : t);
async function move(t, { dur = 650, dx = 0, dy = 0, at = "center" } = {}) {
  const el = target(t);
  if (!el) { console.warn("no target", t); return; }
  const r = el.getBoundingClientRect();
  const x = at === "left" ? r.left + 24 : r.left + r.width / 2 + dx, y = r.top + r.height / 2 + dy;
  placeCursor(x, y, dur);
  await sleep(dur);
}
async function click(t, opts = {}) {
  await move(t, opts);
  const c = cursor(); c.classList.add("down");
  const rp = document.createElement("div"); rp.className = "ripple"; rp.style.left = cx + "px"; rp.style.top = cy + "px"; $("#stage").appendChild(rp); setTimeout(() => rp.remove(), 600);
  await sleep(110); c.classList.remove("down"); await sleep(90);
}
async function typeInto(t, text, cps = 26, { html = (s) => s, caret = true } = {}) {
  const el = target(t); el.classList.remove("ph"); if (caret) el.classList.add("typing-caret");
  for (let i = 1; i <= text.length; i++) { el.innerHTML = html(text.slice(0, i)); await sleep((1000 / cps) * (0.7 + Math.random() * 0.6)); }
  el.classList.remove("typing-caret");
}

const VO = window.VO, TM = VO.timings, LINES = Object.fromEntries(VO.lines.map((l) => [l.id, l]));
let lineStart = 0, lineEnd = 0, cur = null, sound = false;
window.__marks = [];
async function say(id) {
  const wait = lineEnd + GAP - performance.now();
  if (lineEnd && wait > 0) await sleep(wait);
  cur = id; lineStart = performance.now(); lineEnd = lineStart + TM[id].dur * 1000;
  window.__marks.push({ id, t: performance.timeOrigin + lineStart });
  $("#cap").innerHTML = `<div class="en">${LINES[id].en}</div><div class="zh">${LINES[id].zh}</div>`;
  if (sound) new Audio(`../../video/out/vo/${id}.mp3`).play().catch(() => {});
}
/** Waits until the current line reaches a word (its n-th occurrence). */
async function at(word, n = 0) {
  const ws = TM[cur].words; let k = 0;
  for (const w of ws) if (w.w.replace(/[^a-z0-9$']/g, "").startsWith(word) && k++ === n) { const d = lineStart + w.t * 1000 - performance.now(); if (d > 0) await sleep(d); return; }
}
const lineDone = async (extra = 0) => { const d = lineEnd + extra - performance.now(); if (d > 0) await sleep(d); };
function toast(msg, host = $(".win-body")) { const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; host.appendChild(t); setTimeout(() => t.remove(), 2200); }
async function countUp(el, to, ms, fmt) { const t0 = performance.now(); while (true) { const k = Math.min(1, (performance.now() - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(to * e); if (k >= 1) break; await sleep(16); } }

/* ---------- chapters ---------- */
const CH = {};

CH.intro = {
  setup() { S.tab = "gift"; stage().innerHTML = browser("plot-twist-zeta.vercel.app", homeShell()); drawPanel(); placeCursor(1180, 760, 0); },
  async run() {
    await say("i1");
    await move("#tabs [data-tab=gift]", { dur: 1400 });
    await say("i2");
    await at("gift"); await move("#tabs [data-tab=gift]", { dur: 400 });
    await at("one"); await click("#tabs [data-tab=gift]");
    await at("whole"); await click("#tabs [data-tab=drop]"); S.tab = "drop"; drawPanel();
    await at("ai"); await click("#tabs [data-tab=api]"); S.tab = "api"; drawPanel();
    await lineDone(700);
  },
};

CH.gift = {
  setup() { S.tab = "gift"; Object.assign(S.gift, { phase: "empty", prompt: "", exp: 24 }); stage().innerHTML = browser("plot-twist-zeta.vercel.app", homeShell()); drawPanel(); placeCursor(1300, 700, 0); },
  async run() {
    await say("g1");
    await click("#prompt", { dur: 700, at: "left" });
    placeCursor(cx + 40, cy + 70, 350);
    await typeInto("#prompt", "Birthday gift for my sister Maya, around $50 — she just moved to Berlin.", 34);
    S.gift.prompt = "Birthday gift for my sister Maya, around $50 — she just moved to Berlin."; drawPanel();
    await lineDone();
    await say("g2");
    await click("#cta", { dur: 500 });
    S.gift.phase = "gen"; drawPanel();
    await sleep(1300);
    S.gift.phase = "filled"; drawPanel();
    scrollWin(150, 900);
    await at("who"); await move("#gname", { dur: 500 });
    await at("amount"); await move("#gamt", { dur: 450 });
    await at("note"); await move("#gnote", { dur: 550 });
    await lineDone();
    await say("g3");
    await click("#gnote .v-mini", { dur: 500 });
    await click("[data-exp='72']", { dur: 600 }); S.gift.exp = 72; drawPanel();
    await lineDone(150);
    await click("#cta", { dur: 600 });
    ov(reviewGift());
    await sleep(500);
    await say("g4");
    await click("#approve", { dur: 650 });
    ov(kiteModal(GIFT.amount + fee(GIFT.amount), `Gift for ${GIFT.name}`));
    await at("passkey"); await click("#openkite", { dur: 500 });
    $(".win-body").insertAdjacentHTML("beforeend", passkeyPrompt(GIFT.amount + fee(GIFT.amount)));
    await at("transfer"); await click("#pkgo", { dur: 600 });
    $("#pk").classList.add("ok"); await sleep(500); $("#pk").remove();
    await lineDone();
    await say("g5");
    const steps = ["ok", "run", "wait", "wait"];
    ov(sealing(steps)); await sleep(550);
    ov(sealing(["ok", "ok", "run", "wait"])); await sleep(550);
    ov(sealing(["ok", "ok", "ok", "run"])); await sleep(500);
    ov(sealing(["ok", "ok", "ok", "ok"])); await sleep(450);
    ov(ready(false));
    await at("share"); await click("#copy", { dur: 600 }); ov(ready(true));
    await lineDone(900);
  },
};

CH.claim = {
  setup() {
    Object.assign(C, { phase: "sealed", display: null, ask: false, answer: "", sheet: null, paste: "", burst: false });
    stage().innerHTML = `<div class="phone-label" style="left:260px"></div>${phone(claimPage())}`; label("Maya’s phone", "Opens the link", "Sealed until she reveals it");
    placeCursor(1250, 760, 0);
  },
  async run() {
    await say("c1");
    await move(".seal-m", { dur: 1200 });
    await lineDone();
    await say("c2"); label("Maya’s phone", "Reveals it", "…and asks SERV what it is");
    await click("#reveal", { dur: 600 });
    C.phase = "revealed"; C.burst = true; C.display = "$0.00"; drawClaim();
    await countUp($("#amt"), 50, 1000, (v) => "$" + v.toFixed(2));
    C.display = null; C.burst = false;
    await at("asks"); await click("#ask", { dur: 600 }); C.ask = true; drawClaim();
    await click("#q1", { dur: 500 }); C.answer = " "; drawClaim();
    await typeInto("#ans", ANSWER, 70, { caret: false });
    C.answer = ANSWER;
    await lineDone();
    await say("c3"); label("Maya’s phone", "Claims it", "Any wallet or an exchange address · gas covered");
    await click("#claim", { dur: 600 }); C.sheet = "wallets"; drawClaim();
    await at("exchange"); await click("#pastebtn", { dur: 600 }); C.sheet = "paste"; drawClaim();
    await click("#addr", { dur: 400 });
    $("#addr").textContent = PASTE_ADDR; C.paste = PASTE_ADDR;
    await at("gas"); await click("#continue", { dur: 500 }); C.sheet = null; C.phase = "connected"; drawClaim();
    await click("#claimgo", { dur: 600 }); C.phase = "claiming"; drawClaim(); await sleep(800);
    C.phase = "claimed"; drawClaim();
    await lineDone(1100);
  },
};

CH.drop = {
  setup() {
    S.tab = "drop"; Object.assign(S.drop, { phase: "empty", brief: "", rows: [], amountAt: null, anim: false });
    Object.assign(DP, { claimed: 0, reclaimable: false, takenBack: false, fresh: true });
    stage().innerHTML = browser("plot-twist-zeta.vercel.app/?tab=drop", homeShell()); drawPanel(); placeCursor(1300, 720, 0);
  },
  async run() {
    await say("d1");
    await click("#prompt", { dur: 700, at: "left" });
    placeCursor(cx + 40, cy + 90, 350);
    await at("paste"); S.drop.brief = DROP_BRIEF; drawPanel();
    $("#prompt").classList.add("anim-in");
    await lineDone();
    await say("d2");
    await click("#cta", { dur: 500 });
    S.drop.phase = "building"; drawPanel(); scrollWin(140, 700);
    await sleep(1200);
    S.drop.phase = "filled"; S.drop.rows = DROP_LIST.map((r) => [...r]); S.drop.anim = true; drawPanel(); S.drop.anim = false;
    await at("personal"); await move("[data-row='1'] .nt", { dur: 600 });
    await lineDone();
    await click("[data-amt='1']", { dur: 500 }); S.drop.amountAt = 1; drawPanel();
    const inp = $("#amtin"); inp.value = ""; await sleep(150); inp.value = "3"; await sleep(140); inp.value = "30"; await sleep(250);
    S.drop.rows[1][2] = 30; S.drop.amountAt = null; drawPanel();
    await say("d3");
    await scrollWin(330, 600);
    await click("#cta", { dur: 600 });
    const t = dropTotals(S.drop.rows);
    ov(reviewDrop(t, S.drop.rows.length)); await sleep(400);
    await click("#approve", { dur: 500 });
    ov(kiteModal(t.total, "Top contributors · 5 people"));
    await click("#openkite", { dur: 450 });
    $(".win-body").insertAdjacentHTML("beforeend", passkeyPrompt(t.total));
    await click("#pkgo", { dur: 450 }); $("#pk").classList.add("ok"); await sleep(400); $("#pk").remove();
    await lineDone();
    // the Drop's page
    setUrl("plot-twist-zeta.vercel.app/drops/c41e8f02"); winScroll().scrollTop = 0; winScroll().innerHTML = dropPage();
    await say("d4");
    for (let i = 1; i <= 3; i++) { await sleep(450); DP.claimed = i; winScroll().innerHTML = dropPage(); $(`[data-li='${i - 1}'] .v-st`).classList.add("anim-in"); }
    DP.fresh = false; DP.reclaimable = true; winScroll().innerHTML = dropPage(); toast("7 days later");
    await at("take"); await click("#takeback", { dur: 650 });
    DP.takenBack = true; winScroll().innerHTML = dropPage(); toast("$40.00 is on its way back");
    await lineDone(1000);
  },
};

const CURL = [
  ['<span class="p">$</span> curl -X POST https://plot-twist-zeta.vercel.app/api/v1/gifts \\', 0],
  ['    -H <span class="s">"Authorization: Bearer pt_live_K0Gs…"</span> \\', 0],
  ['    -d <span class="s">\'{"brief": "Birthday gift for Leo, $25 — he loves jazz"}\'</span>', 0],
];
const RESP = `
{
  <span class="k">"status"</span>: <span class="s">"pending_approval"</span>,
  <span class="k">"approveUrl"</span>: <span class="u" id="approveurl">"https://plot-twist-zeta.vercel.app/approve/9c41b7…"</span>,
  <span class="k">"gift"</span>: { <span class="k">"recipientName"</span>: <span class="s">"Leo"</span>, <span class="k">"amount"</span>: <span class="s">"25.00"</span>,
            <span class="k">"note"</span>: <span class="s">"Happy birthday, Leo — the next jazz night is on me."</span> }
}`;
CH.agent = {
  setup() {
    S.tab = "api"; AP.phase = "pending";
    stage().innerHTML = browser("plot-twist-zeta.vercel.app/?tab=api", homeShell()) + `<div class="term" style="transform:translateY(40px);opacity:0"><div class="term-bar"><i></i><i></i><i></i><span>birthday-agent — zsh</span></div><pre id="tp"></pre></div>`;
    drawPanel(); placeCursor(1250, 760, 0);
  },
  async run() {
    await say("a1");
    const term = $(".term"); term.style.transform = "none"; term.style.opacity = "1";
    $("#tp").innerHTML = '<span class="p">$</span> <span class="caret"></span>';
    await lineDone();
    await say("a2");
    // type the command line by line (plain text while typing, colored when done)
    const plain = CURL.map(([h]) => h.replace(/<[^>]+>/g, ""));
    let done = "";
    for (let i = 0; i < plain.length; i++) {
      const line = plain[i];
      for (let k = i === 0 ? 2 : 1; k <= line.length; k += 2) { $("#tp").innerHTML = done + line.slice(0, k).replace(/&/g, "&amp;").replace(/</g, "&lt;") + '<span class="caret"></span>'; await sleep(16); }
      done += CURL[i][0] + "\n";
    }
    $("#tp").innerHTML = done; await sleep(450);
    $("#tp").innerHTML = done + RESP;
    await lineDone();
    await say("a3");
    await click("#approveurl", { dur: 700 });
    term.style.transform = "translateY(30px)"; term.style.opacity = "0";
    setUrl("plot-twist-zeta.vercel.app/approve/9c41b7…"); winScroll().innerHTML = approvePage();
    await at("approve"); await click("#apgo", { dur: 650 });
    $(".win-body").insertAdjacentHTML("beforeend", passkeyPrompt(LEO.amount + fee(LEO.amount)));
    await at("key"); await click("#pkgo", { dur: 500 }); $("#pk").classList.add("ok"); await sleep(400); $("#pk").remove();
    AP.phase = "live"; winScroll().innerHTML = approvePage();
    await lineDone();
    setUrl("plot-twist-zeta.vercel.app/dashboard?view=developers"); winScroll().scrollTop = 0; winScroll().innerHTML = developers(false);
    await say("a4");
    await sleep(60); winScroll().innerHTML = developers(true);
    await countUp($("[data-count]"), 1578, 1100, (v) => Math.round(v).toLocaleString("en-US"));
    await scrollWin(330, 900);
    await at("we"); $("#freenote").classList.add("focus-ring"); await move("#freenote", { dur: 600 });
    await lineDone(1000);
  },
};

CH.outro = {
  setup() {
    stage().innerHTML = `<div class="card-title">${mascot("head", "head")}<h1>Send money<br><em>like a gift.</em></h1><div class="url">plot-twist-zeta.vercel.app</div>
      <div class="built">Built with <span class="w">${brand("kite")}Kite Passport</span><span class="w os">${brand("openserv")}</span></div></div>`;
    placeCursor(1500, 1200, 0);
  },
  async run() { await say("o1"); await lineDone(1800); },
};

const ORDER = ["intro", "gift", "claim", "drop", "agent", "outro"];

/* ---------- boot ---------- */
async function play(ids) {
  document.body.classList.remove("idle");
  for (const id of ids) {
    lineEnd = 0; CH[id].setup(); await sleep(350);
    window.__chapterStart = performance.timeOrigin + performance.now();
    await CH[id].run();
  }
  window.__done = true;
  if (!REC) document.body.classList.add("idle");
}
window.__play = () => play([params.get("ch") || "intro"]);

document.addEventListener("DOMContentLoaded", () => {
  if (REC) document.body.classList.add("rec");
  const ch = params.get("ch") || "intro";
  CH[ch].setup();
  window.__ready = true;
  if (!REC) {
    document.body.classList.add("idle");
    $("#ctl").innerHTML = ORDER.map((c) => `<button data-ch="${c}" class="${c === ch ? "on" : ""}">${c}</button>`).join("") + '<button data-ch="all">▶ all</button><button id="snd">🔈 sound off</button>';
    $("#ctl").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "snd") { sound = !sound; b.textContent = sound ? "🔊 sound on" : "🔈 sound off"; return; }
      const c = b.dataset.ch; history.replaceState(null, "", `#ch=${c === "all" ? "intro" : c}`);
      play(c === "all" ? ORDER : [c]);
    };
  }
});
