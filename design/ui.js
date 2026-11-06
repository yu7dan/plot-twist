/* Plot Twist — UI templates shared by the design board and the walkthrough. */
(function () {
  const B = window.BRAND;
  const brand = (k, cls = "") => `<span class="brand ${cls}">${B[k]}</span>`;
  const tok = (k) => `<span class="ti">${B[k]}</span>`;

  const I = {
    search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    spark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>',
    chev: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
    down: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    checkSm: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    right: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    refresh: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    lock: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    ext: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    fp: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/></svg>',
    signal: '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
    battery: '<svg width="26" height="12" viewBox="0 0 26 12" fill="none"><rect x=".5" y=".5" width="22" height="11" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/><rect x="24" y="4" width="1.6" height="4" rx=".8" fill="currentColor" opacity=".4"/></svg>',
  };

  /* Logo concepts */
  const LOGOS = {
    line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 18H9.5C12.8 18 15 15.8 15 12.6C15 9.8 13.3 7.9 11.2 7.9C9 7.9 7.4 9.7 7.4 12.2C7.4 15.6 10 18 13.6 18C17.4 18 19.6 13.6 21.5 6"/></svg>',
    seal: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.6" fill="currentColor"/><path d="M12 5.6l1.55 4.85L18.4 12l-4.85 1.55L12 18.4l-1.55-4.85L5.6 12l4.85-1.55Z" fill="var(--knock, #0A0A0B)"/></svg>',
    bow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12.5C9.6 8.4 4.3 7.7 4 10.6c-.3 2.9 4.6 3.6 8 1.9 3.4 1.7 8.3 1 8-1.9-.3-2.9-5.6-2.2-8 1.9Z"/><path d="M12 12.5 8.6 20M12 12.5l3.4 7.5"/></svg>',
  };
  let logoKey = "mascot";
  const ASSET = "assets/";
  const MASCOT_FILE = { main: "logo-head", head: "logo-head", icon: "app-icon" };
  const mascot = (pose = "main", cls = "") => `<img class="mascot ${cls}" src="${ASSET}${MASCOT_FILE[pose] || "m-" + pose}.png" alt="" draggable="false" />`;
  const mark = () => `<span class="mark img">${mascot("main")}</span>`;
  const logo = (id = "logo") => `<a class="logo" data-id="${id}">${mark()}Plot Twist</a>`;

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const C = window.CHAINS, TL = window.TOKEN_LOGO, W = window.WALLETS;
  const CHAIN_ORDER = ["base", "solana", "polygon", "avalanche", "arc", "tempo", "robinhood"];
  const tokImg = (sym, cls = "") => `<span class="ti ${cls}"><img src="${TL[sym]}" alt="${sym}" /></span>`;
  const chainImg = (id, cls = "") => `<span class="ci ${cls}"><img src="${C[id].logo}" alt="" /></span>`;
  const assetOf = (chain) => C[chain].asset.sym;

  /* ---------- money ---------- */
  const money = (n) => Number(n).toFixed(2);
  const usd = (n) => "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fee = (total) => Math.max(Math.round(total * 1.5) / 100, 1);
  const BAL0 = { base: 124.3, solana: 80, polygon: 35, avalanche: 0, arc: 0, tempo: 15, robinhood: 60 };
  let bal = { ...BAL0 };
  let kiteOn = false;
  const balOf = (chain) => bal[chain] || 0;
  const balTotal = () => Object.values(bal).reduce((a, b) => a + b, 0);
  const need = (amount) => Number(amount) + fee(Number(amount));
  const canPay = (chain, amount) => balOf(chain) + 1e-9 >= need(amount);
  const maxGift = (chain = "base") => { const b = balOf(chain); return Math.max(0, Math.floor(Math.min(b / 1.015, b - 1) * 100) / 100); };
  const KC_EMAIL = "kai.lin@gmail.com";

  const PROMPT = "Birthday gift for my sister Maya, around $50 — she just moved to Berlin.";
  const NOTE = "A little something for the new chapter — new city, same you. Happy birthday, Maya.";
  const DEFAULT = { name: "Maya", occasion: "Birthday", amount: 50, chain: "base", note: NOTE, prompt: PROMPT, sender: "Kai", code: "b40804fd", insight: "" };
  const gift = (g) => Object.assign({}, DEFAULT, g || {});
  const addrFor = (chain) => (chain === "solana" ? "7xKX…q9Fd" : "0x12f…a34");

  /* ---------- nav & network menu ---------- */
  const chainPill = (chain, id = "chain-btn", compact = false) => `<button class="pill chain-pill" data-id="${id}">${chainImg(chain)}${compact ? "" : C[chain].name}${I.chev}</button>`;
  const kitePill = (m) => kiteOn
    ? `<span class="pill kite-pill">${brand("kite")}${m ? "" : `Kite · <span class="num">${usd(balTotal())}</span>`}</span>`
    : `<button class="pill kite-pill off" data-id="kite-connect">${brand("kite")}${m ? "Connect" : "Connect Kite"}</button>`;
  function nav({ tab = "create", chain = "base", m = false } = {}) {
    if (m) {
      return `<header class="ph-nav">${logo()}<div class="nav-r">${chainPill(chain, "chain-btn", true)}${kitePill(true)}</div></header>
        <div class="tabs-m"><button class="${tab === "create" ? "on" : ""}" data-id="tab-create">Create</button><button class="${tab === "gifts" ? "on" : ""}" data-id="tab-gifts">My gifts</button></div>`;
    }
    return `
    <header class="nav">
      <div class="nav-l">${logo()}
        <nav class="tabs"><a class="${tab === "create" ? "on" : ""}" data-id="tab-create">Create</a><a class="${tab === "gifts" ? "on" : ""}" data-id="tab-gifts">My gifts</a></nav></div>
      <div class="nav-r">${chainPill(chain)}${kitePill()}</div>
    </header>`;
  }
  const networkMenu = (sel, amount = 0) => `
    <div class="netmenu" data-id="netmenu">
      <div class="nm-h">Gift network</div>
      ${CHAIN_ORDER.map((id) => C[id]).map((c) => {
        const low = kiteOn && amount > 0 && !canPay(c.id, amount);
        const sub = kiteOn ? `${c.asset.sym} · Balance ${money(balOf(c.id))}` : `${c.asset.sym}${c.isNew ? " · newer network" : ""}`;
        const right = c.id === sel ? `<i>${I.checkSm}</i>` : low ? `<em class="nb">Not enough</em>` : "";
        return `<button class="${c.id === sel ? "on" : ""}${low ? " low" : ""}" data-id="net-${c.id}"${low ? " disabled" : ""}>${chainImg(c.id)}<span>${c.name}<small>${tokImg(c.asset.sym, "xs")}${sub}</small></span>${right}</button>`;
      }).join("")}
      <p class="nm-f">${kiteOn ? "You pay and they receive on the same network. Gas is covered." : "Connect Kite Passport to see your balance on each network."}</p>
    </div>`;

  /* ---------- create card ---------- */
  /* s: { g, phase: empty|typing|generating|filled, editable, promptText, typed, ready, focus, animate, editingNote, m } */
  function createCard(s = {}) {
    const g = gift(s.g);
    const phase = s.phase || "filled";
    const total = Number(g.amount) || 0;
    const filled = phase === "filled";
    const gen = phase === "generating";
    const fi = filled && s.animate ? " fill-in" : "";
    const skel = (w) => `<span class="skel" style="width:${w}px"></span>`;
    const typingPhase = phase === "empty" || phase === "typing";
    const editable = !!s.editable;
    const ch = C[g.chain], asset = ch.asset;

    let promptBody;
    if (editable && typingPhase) {
      promptBody = `<textarea class="prompt-input" data-id="prompt-input" rows="2" placeholder="Who’s it for, what’s the occasion, how much?">${esc(s.promptText || "")}</textarea>
        ${s.promptText ? "" : `<button class="ex" data-id="example">${I.spark}Try an example</button>`}`;
    } else if (phase === "empty") promptBody = `<p class="prompt-text ph">Who’s it for, what’s the occasion, how much?</p>`;
    else if (phase === "typing") promptBody = `<p class="prompt-text"><span data-id="typed">${esc(s.typed || "")}</span><span class="caret"></span></p>`;
    else promptBody = `<p class="prompt-text">${esc(g.prompt)}</p>`;

    const promptRight = filled
      ? `<span style="display:flex;gap:6px;align-items:center"><span class="tag${fi}">${I.spark}Designed by SERV</span>${editable ? `<button class="mini icon" data-id="regen" title="Rewrite note">${I.refresh}</button>` : ""}</span>`
      : gen ? `<span class="lbl" style="color:var(--muted)">${mascot("main", "bob")}Designing</span>` : "";

    let amount;
    if (filled && editable) amount = `<label class="amt-wrap${fi}"><span class="amt num">$</span><input class="amt num amt-in" data-id="amount-input" inputmode="decimal" value="${esc(g.amountStr ?? g.amount)}" /></label>`;
    else if (filled) amount = `<span class="amt num${fi}">$${total}</span>`;
    else if (gen) amount = skel(120);
    else amount = `<span class="amt num ph">$0</span>`;

    let receive;
    if (filled) {
      receive = `
        <div class="rcv${fi}">
          ${tokImg(asset.sym)}
          <div class="meta"><b class="num">${money(total)} ${asset.sym}</b><span>${asset.name} · 1 ${asset.sym} ≈ $1</span></div>
          <button class="chain-sel" data-id="chain-btn2">${chainImg(g.chain)}<span>${ch.name}</span>${I.chev}</button>
        </div>
        ${ch.isNew ? `<div class="hint-line">${I.lock}${ch.name} is a newer network — ${esc(g.name)}’s wallet may ask to add it once.</div>` : ""}
        ${g.insight ? `<div class="insight${fi}">${I.spark}<span>${esc(g.insight)}</span></div>` : ""}`;
    } else {
      receive = `<div class="rcv">${tokImg(asset.sym)}<div class="meta">${gen ? skel(140) : `<b class="num" style="color:var(--dim)">0.00 ${asset.sym}</b>`}</div><span class="chain-sel ro">${chainImg(g.chain)}<span>${ch.name}</span></span></div>`;
    }

    const v = (val, w) => (filled ? `<b class="${fi.trim()}">${esc(val)}</b>` : gen ? `<b>${skel(w)}</b>` : `<b class="ph">—</b>`);
    let noteVal;
    if (filled && s.editingNote) noteVal = `<input class="note-in" data-id="note-input" value="${esc(g.note)}" maxlength="140" />`;
    else if (filled) noteVal = `<b class="${fi.trim()}">“${esc(g.note)}”</b>`;
    else if (gen) noteVal = `<b>${skel(200)}</b>`;
    else noteVal = `<b class="ph">Written by AI, or type your own</b>`;
    const noteIcon = filled && s.editingNote ? `<button class="note-ok" data-id="note-save">${I.checkSm}</button>` : `<button class="note-edit" data-id="note-edit">${I.edit}</button>`;

    const f = fee(total);
    let cta;
    if (phase === "empty") cta = `<button class="cta off" data-id="cta" disabled>Describe your gift</button>`;
    else if (phase === "typing") cta = s.ready ? `<button class="cta" data-id="cta">${I.spark}Design gift</button>` : `<button class="cta off" data-id="cta" disabled>Describe your gift</button>`;
    else if (gen) cta = `<button class="cta off" data-id="cta" disabled><span class="spin"></span>Designing your gift</button>`;
    else if (total < 5) cta = `<button class="cta off" data-id="cta" disabled>Minimum gift is $5</button>`;
    else if (!kiteOn) cta = `<button class="cta" data-id="cta">${brand("kite")}Connect Kite Passport</button>`;
    else if (!canPay(g.chain, total)) cta = `<button class="cta warn" data-id="cta">Not enough ${asset.sym} on ${ch.name} · Switch network</button>`;
    else cta = `<button class="cta" data-id="cta">Create gift</button>`;

    return `
      <div class="card">
        <div class="mod prompt${s.focus ? " focus" : ""}" data-id="prompt">
          <div class="mod-h"><span class="lbl">${I.spark}Describe the gift</span>${promptRight}</div>
          ${promptBody}
        </div>
        <div class="mod">
          <div class="lbl">You send</div>
          <div class="row-amt">${amount}<span class="token">${tokImg(asset.sym)}${asset.sym}</span></div>
          <div class="row-sub">${kiteOn
            ? `<span class="num">from Kite · ${ch.name}</span><span class="num">Balance ${money(balOf(g.chain))}<b class="max" data-id="max">Max</b></span>`
            : `<span class="num">from Kite Passport</span><b class="max" data-id="kite-connect">Connect to see balance</b>`}</div>
        </div>
        <div class="swap-arrow"><div>${I.down}</div></div>
        <div class="mod">
          <div class="mod-h"><span class="lbl">${filled ? `${esc(g.name)} receives` : "They receive"}</span><span class="tag ghost">Gas covered</span></div>
          <div style="margin-top:8px">${receive}</div>
        </div>
        <div class="mod list">
          <div class="li"><span>To</span>${v(g.name, 60)}</div>
          <div class="li"><span>Occasion</span>${v(g.occasion, 80)}</div>
          <div class="li note"><span>Note</span>${noteVal}${filled && editable ? noteIcon : I.edit}</div>
        </div>
        <div class="details"><span>Total <b class="num">${filled ? usd(total + f) : "—"}</b></span><span class="r">Fee ${filled ? usd(f) : "1.5%"} · paid with Kite</span></div>
        ${cta}
      </div>`;
  }

  /* ---------- review / kite / sealing / ready ---------- */
  const assetRow = (g) => { const a = C[g.chain].asset; return `<div class="asset">${tokImg(a.sym)}<div class="meta"><b class="num">${money(g.amount)} ${a.sym}</b><span>${a.name} · on ${C[g.chain].name}</span></div><span class="usd num">${usd(g.amount)}</span></div>`; };
  const reviewModal = (g0) => {
    const g = gift(g0);
    const f = fee(g.amount);
    return `
      <div class="modal">
        <div class="m-h"><span>Review gift</span><button class="x" data-id="close">${I.x}</button></div>
        <div class="lbl">You send</div>
        <div class="amt-lg num">${usd(g.amount + f)}</div>
        <div class="sub">${usd(g.amount)} gift + ${usd(f)} fee · ${assetOf(g.chain)} from your Kite wallet</div>
        <div class="m-block">${assetRow(g)}</div>
        <div class="kv"><span>To</span><b>${esc(g.name)} · ${esc(g.occasion)}</b></div>
        <div class="kv"><span>Lands on</span><b>${chainImg(g.chain)}${C[g.chain].name}</b></div>
        <div class="kv"><span>Pay with</span><b>${brand("kite")}Kite Passport · ${C[g.chain].name}</b></div>
        <div class="kv"><span>Network fees</span><b>Covered</b></div>
        <div class="quote">“${esc(g.note)}”</div>
        <button class="cta" data-id="approve">Approve with passkey</button>
        <p class="fine">You’ll approve this exact transfer with your passkey in Kite Passport.<br />Nothing moves until you approve.</p>
      </div>`;
  };

  const kiteSheet = (g0) => {
    const g = gift(g0);
    const sol = g.chain === "solana";
    return `
    <div class="kite">
      <div class="kite-url">${I.lock}agentpassport.ai/wallet/send/approve</div>
      <div class="kite-h">
        <span class="kite-id">${brand("kite")}<span>Kite Passport<small>agentpassport.ai</small></span></span>
        <span style="display:flex;align-items:center;gap:10px"><span class="kite-lock">${I.lock}Secure</span><button class="x kx" data-id="close">${I.x}</button></span>
      </div>
      <h4>Approve transfer</h4>
      <p class="req"><b>Plot Twist</b> is asking to send from your Passport wallet.</p>
      <div class="kite-amt num">${money(need(g.amount))}<small>${assetOf(g.chain)}</small></div>
      <div class="kite-box">
        <div class="kv"><span>Network</span><b>${chainImg(g.chain)}${C[g.chain].name}</b></div>
        <div class="kv"><span>From</span><b class="num">Your Passport · ${sol ? "FZge…PXZm" : "0xd8C3…1f48"}</b></div>
        <div class="kv"><span>To</span><b class="num">Plot Twist · ${sol ? "9pTw…Gf7k" : "0x8507…E8B5"}</b></div>
        <div class="kv"><span>For</span><b>Gift for ${esc(g.name)}</b></div>
      </div>
      <button class="cta" data-id="kite-approve">Approve with passkey</button>
      <p class="fine">Kite sends exactly this amount to this address — nothing else.</p>
    </div>`;
  };

  /* Connect Kite Passport (email code) — step: email | sending | code | linking */
  const kiteConnect = (step = "email") => {
    const codeStep = step === "code" || step === "linking";
    const body = codeStep ? `
        <h4>Check your email</h4>
        <p class="req">Kite sent an 8-character code to <b>${KC_EMAIL}</b>.</p>
        <div class="kc-code num">${"K7Q2X9PL".split("").map((c) => `<span>${c}</span>`).join("")}</div>
        <button class="cta" data-id="kc-verify"${step === "linking" ? " disabled" : ""}>${step === "linking" ? '<span class="spin"></span>Connecting' : "Verify and connect"}</button>`
      : `
        <h4>Sign in with email</h4>
        <p class="req">Use the email of your Kite Passport account.</p>
        <div class="kc-in"><span>Email</span><b>${KC_EMAIL}</b></div>
        <button class="cta" data-id="kc-send"${step === "sending" ? " disabled" : ""}>${step === "sending" ? '<span class="spin"></span>Sending code' : "Send code"}</button>`;
    return `
    <div class="kite kc">
      <div class="kite-url">${I.lock}plottwist.gift · Connect Kite Passport</div>
      <div class="kite-h">
        <span class="kite-id">${brand("kite")}<span>Connect Kite Passport<small>Pay for gifts from your Passport wallet</small></span></span>
        <button class="x kx" data-id="close">${I.x}</button>
      </div>${body}
      <p class="fine">Plot Twist never holds your keys. Every payment still needs your passkey.</p>
    </div>`;
  };

  const passkey = (phase = "idle") => `
    <div class="passkey">
      <div class="fp ${phase === "scan" ? "scan" : phase === "ok" ? "ok" : ""}">${phase === "ok" ? I.check : I.fp}</div>
      <b>${phase === "ok" ? "Approved" : phase === "scan" ? "Verifying…" : "Confirm it’s you"}</b>
      <p>${phase === "ok" ? "Transfer approved." : "Use your passkey to approve on agentpassport.ai"}</p>
      ${phase === "idle" ? `<div class="pk-b"><button data-id="pk-cancel">Cancel</button><button class="pri" data-id="pk-go">Continue</button></div>` : ""}
    </div>`;

  const sealing = (st = ["run", "wait", "wait", "wait"], g0) => {
    const g = gift(g0);
    const a = assetOf(g.chain);
    const rows = [
      ["Transfer approved in Kite Passport", "passkey"],
      [`${money(need(g.amount))} ${a} received on ${C[g.chain].name}`, "0x9f2c…e41a"],
      [`${money(g.amount)} ${a} reserved for ${g.name}`, "Plot Twist"],
      ["Gift sealed · link created", g.code],
    ];
    return `
      <div class="modal">
        <div class="m-h"><span>Sealing your gift</span><span class="sub">~5 sec</span></div>
        <div class="steps">${rows.map((r, i) => `<div class="stp ${st[i] || "wait"}"><span class="ic">${I.checkSm}</span><span class="st-t">${r[0]}</span>${st[i] === "ok" ? `<small>${r[1]}</small>` : ""}</div>`).join("")}</div>
      </div>`;
  };

  const readyModal = (g0, { copied = false } = {}) => {
    const g = gift(g0);
    return `
    <div class="modal done">
      <div style="display:flex;justify-content:flex-end"><button class="x" data-id="close">${I.x}</button></div>
      ${mascot("surprise", "pop-m")}
      <h3>Gift ready</h3>
      <p>Send this link to ${esc(g.name)}. It opens sealed.</p>
      <div class="qr" data-qr></div>
      <div class="linkbox"><span>plottwist.gift/g/${g.code}</span><button class="copy" data-id="copy">${copied ? "Copied" : "Copy"}</button></div>
      <div class="share"><button data-id="share-tg">Telegram</button><button data-id="share-x">X</button><button data-id="share-wa">WhatsApp</button></div>
      <a class="muted-link" data-id="to-gifts">View in My gifts →</a>
    </div>`;
  };

  /* ---------- claim ---------- */
  function claimCard(s = {}) {
    const g = gift(s.g);
    const phase = s.phase || "revealed";
    const ch = C[g.chain], a = ch.asset;
    const head = `<div class="claim-h"><span class="from"><span class="ini">${esc(g.sender[0])}</span><span><b>${esc(g.sender)}</b> sent you a gift</span></span><span class="tag">${esc(g.occasion)}</span></div>`;
    if (phase === "sealed") {
      return `<div class="card claim">${head}
        <div class="seal" data-id="seal">${mascot("secret", "seal-m")}<div class="amt-xl num blur">${usd(g.amount)}</div><div class="tok-line num blur">${money(g.amount)} ${a.sym}</div></div>
        <button class="cta" data-id="reveal">${I.spark}Reveal gift</button>
        <p class="foot">Digital dollars on ${chainImg(g.chain, "xs")}${ch.name} · Sent with Kite Passport</p></div>`;
    }
    if (phase === "claimed") {
      return `<div class="card claim">${head}
        <div class="claimed">${mascot("claimed", "claimed-m")}<h3 class="num">${usd(g.amount)} claimed</h3><p>${money(g.amount)} ${a.sym} sent to ${addrFor(g.chain)} on ${ch.name}</p></div>
        <div class="txs"><a class="tx" data-id="tx-0">${tokImg(a.sym)}<b class="num">${money(g.amount)} ${a.sym}</b><span>${ch.explorer} ${I.ext}</span></a></div>
        <button class="cta" data-id="send-back">Send one back</button>
        <p class="foot">It may take a few seconds to show in your wallet</p></div>`;
    }
    let cta;
    if (phase === "revealed") cta = `<button class="cta" data-id="connect">Connect wallet to claim</button>`;
    else if (phase === "connected") cta = `<button class="cta" data-id="claim">Claim ${usd(g.amount)} to ${addrFor(g.chain)}</button>`;
    else cta = `<button class="cta off" disabled><span class="spin"></span>Claiming on ${ch.name}</button>`;

    let ask = s.ask;
    if (ask === "open") ask = {};
    if (ask === "answered") ask = { why: true };
    const spark = `<svg class="s" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>`;
    const whyA = `${a.sym} is a digital dollar issued by ${a.issuer} — 1 ${a.sym} is designed to stay worth $1. ${esc(g.sender)} sent it on ${ch.name}, so it lands in your wallet there, no gas needed.`;
    const whatA = "Keep it as dollars, spend it, or move it to an exchange. There’s no rush — it’s yours. (Not financial advice.)";
    const askHtml = ask
      ? `<div class="ask" data-id="ask"><span>${spark}Ask about this gift</span><span style="transform:rotate(180deg);display:flex">${I.chev}</span></div>
         <div class="ask-open">
           <div class="chips"><button class="chip ${ask.why ? "on" : ""}" data-id="ask-why">What is ${a.sym}?</button><button class="chip ${ask.what ? "on" : ""}" data-id="ask-what">What can I do with it?</button></div>
           ${ask.why ? `<div class="qa fill-in"><small>${I.spark}SERV</small>${whyA}</div>` : ""}
           ${ask.what ? `<div class="qa fill-in"><small>${I.spark}SERV</small>${whatA}</div>` : ""}
         </div>`
      : `<div class="ask" data-id="ask"><span>${spark}Ask about this gift</span>${I.chev}</div>`;

    return `<div class="card claim">${head}
      <div class="opened">${s.burst ? mascot("surprise", "burst-m") : ""}<div class="amt-xl num" data-id="amount">${s.display != null ? "$" + s.display : usd(g.amount)}</div>
        <div class="tok-line">for ${esc(g.name)} · ${money(g.amount)} ${a.sym} on ${chainImg(g.chain, "xs")}${ch.name}</div></div>
      <div class="m-block" style="margin-top:16px">${assetRow(g)}</div>
      <div class="quote">“${esc(g.note)}”</div>
      ${cta}
      ${askHtml}</div>`;
  }

  const walletSheet = (chain = "base", sel = "") => {
    const ch = C[chain];
    return `
    <div class="sheet-scrim" data-id="sheet-close"></div>
    <div class="sheet">
      <div class="grab"></div>
      <div class="m-h" style="margin-bottom:2px"><span>Connect a wallet</span><button class="x" data-id="sheet-close">${I.x}</button></div>
      <p class="sub">Your gift lands on ${chainImg(chain, "xs")}${ch.name}. No sign-up, no gas.</p>
      <div class="wallets">
        ${ch.wallets.map((k, i) => `<button class="wl ${sel === k ? "on" : ""}" data-id="w-${k}"><span class="brand ${W[k].pad ? "pad" : ""}"><img src="${W[k].icon}" alt="" /></span>${W[k].name}<small>${sel === k ? (ch.isNew ? `Adding ${ch.name}…` : "Connecting…") : i === 0 ? "Popular" : ""}</small></button>`).join("")}
      </div>
      ${ch.isNew ? `<p class="fine" style="text-align:left;margin-top:12px">${ch.name} is a newer network. Your wallet will ask once to add it.</p>` : ""}
    </div>`;
  };

  const phone = (inner, { time = "9:41" } = {}) => `
    <div class="phone"><div class="island"></div>
      <div class="screen glow m">
        <div class="sbar"><span>${time}</span><span class="icons">${I.signal}${I.battery}</span></div>
        ${inner}
      </div>
    </div>`;
  const phNav = (right) => `<div class="ph-nav">${logo("ph-logo")}${right}</div>`;

  const chat = (n = 3, g0) => {
    const g = gift(g0);
    return `
    <div class="chat">
      <div class="sbar"><span>9:41</span><span class="icons">${I.signal}${I.battery}</span></div>
      <div class="chat-h"><span style="color:var(--soft)">${I.back}</span><span class="ini" style="width:38px;height:38px">${esc(g.sender[0])}</span><span><b>${esc(g.sender)}</b><small>online</small></span></div>
      <div class="chat-body">
        <span class="day">Today</span>
        ${n >= 1 ? `<div class="bub">Happy ${esc(g.occasion.toLowerCase())} ${esc(g.name)}!! 🎉<time>9:40</time></div>` : ""}
        ${n >= 2 ? `<div class="bub">Open this one 👀<time>9:40</time></div>` : ""}
        ${n >= 3 ? `<button class="lp" data-id="link-card"><div class="lp-img">${mascot("main", "lp-m")}<b>${esc(g.sender)} sent you a gift</b><span>Sealed · tap to open</span></div><div class="lp-t"><small>plottwist.gift</small><b>A plot twist for ${esc(g.name)}</b><p>Open the envelope to reveal it.</p></div></button>` : ""}
      </div>
      <div class="chat-in">Message</div>
    </div>`;
  };

  /* ---------- my gifts ---------- */
  const OTHERS = [
    { name: "Leo", occasion: "New job", amount: 25, chain: "solana", when: "Nov 3" },
    { name: "Mom", occasion: "Thank you", amount: 100, chain: "base", when: "Oct 30" },
    { name: "Sam", occasion: "Lunar New Year", amount: 35, chain: "robinhood", when: "Oct 28" },
  ];
  const giftsPage = ({ maya = "wait", toast = false, g: g0, m = false } = {}) => {
    const g = gift(g0);
    const rows = [{ ...g, when: "Today", status: maya, hl: true }, ...OTHERS.map((o) => ({ ...o, status: "done" }))];
    const total = rows.reduce((acc, r) => acc + Number(r.amount), 0);
    const statusHtml = (s) => `<span class="status ${s}"><span class="d"></span>${s === "done" ? "Claimed" : s === "unpaid" ? "Draft" : "Waiting"}</span>`;
    const assetCell = (r) => `<span class="as-cell">${tokImg(assetOf(r.chain))}<span>${assetOf(r.chain)}</span><span class="on-chain">${chainImg(r.chain, "xs")}${C[r.chain].name}</span></span>`;
    const toastHtml = toast ? `<div class="toast">${mascot("claimed", "toast-m")}<div><b>${esc(g.name)} claimed your gift</b><span>${usd(g.amount)} · just now</span></div></div>` : "";
    const stats = `<div class="stats">
        <div class="stat"><span>Total sent</span><b class="num">${usd(total)}</b></div>
        <div class="stat"><span>Gifts</span><b class="num">4</b></div>
        <div class="stat"><span>Claimed</span><b class="num">${maya === "done" ? "4" : "3"} <small>of 4</small></b></div>
      </div>`;
    if (m) {
      return `${nav({ tab: "gifts", chain: g.chain, m: true })}${toastHtml}
      <div class="ph-body"><div class="wrap m-wrap">
        ${stats}
        ${rows.map((r) => `<div class="gcard ${r.hl ? "hl" : ""}"><span class="ini">${esc(r.name[0])}</span><div class="gc-m"><b>${esc(r.name)}</b><small>${esc(r.occasion)} · ${r.when}</small><span class="gc-t">${tokImg(assetOf(r.chain))}${chainImg(r.chain, "xs")}<small>${C[r.chain].name}</small></span></div><div class="gc-r"><b class="num">${usd(r.amount)}</b>${statusHtml(r.status)}</div></div>`).join("")}
        <button class="cta" data-id="new-gift" style="margin-top:10px">New gift</button>
      </div></div>`;
    }
    return `
    ${nav({ tab: "gifts", chain: g.chain })}
    ${toastHtml}
    <main class="wrap">
      <div class="page-h"><h2>My gifts</h2><a class="btn sm acc" data-id="new-gift">New gift</a></div>
      ${stats}
      <div class="table">
        <div class="tr head"><span>Recipient</span><span>Amount</span><span>Asset · network</span><span>Status</span><span>Sent</span><span></span></div>
        ${rows.map((r, i) => `
          <div class="tr ${r.hl ? "hl" : ""}">
            <div class="who"><span class="ini">${esc(r.name[0])}</span><div><b>${esc(r.name)}</b><small>${esc(r.occasion)}</small></div></div>
            <span class="num">${usd(r.amount)}</span>
            <div class="mix">${assetCell(r)}</div>
            ${statusHtml(r.status)}
            <span class="date">${r.when}</span>
            <button class="icon-btn" data-id="${i === 0 ? "row-copy" : ""}">${I.copy}</button>
          </div>`).join("")}
      </div>
    </main>`;
  };

  /* ---------- landing (platform narrative) ---------- */
  function heroGift() {
    return `
      <div class="hg">
        <div class="hg-h"><span class="from"><span class="ini">K</span><span><b>Kai</b> → Maya · Birthday</span></span></div>
        <div class="hg-amt num">$50.00</div>
        <div class="hg-sub">${chainImg("base", "xs")}on Base · <span class="up">gas covered</span></div>
        <div class="hg-rows"><div class="hg-row">${tokImg("USDC")}<b class="num">50.00 USDC</b><span>Digital dollars</span></div></div>
        <p class="hg-note">“A little something for the new chapter — new city, same you.”</p>
        <span class="hg-cta">${I.spark}Unwrap gift</span>
      </div>`;
  }
  function landing({ m = false } = {}) {
    const chainsRow = CHAIN_ORDER.map((id) => `<span class="lc">${chainImg(id)}${C[id].name}</span>`).join("");
    const floaters = ["base", "solana", "polygon", "avalanche", "arc", "tempo"].map((id, i) => `<span class="fl f${i}">${chainImg(id, "ti")}</span>`).join("");
    const kiteWord = B.kiteWord.replace(/fill="black"/g, 'fill="#F5F5F6"');
    const moments = [
      ["Birthday", "Fifty dollars and a note they’ll keep.", "Digital dollars"],
      ["Lunar New Year 红包", "Lucky red packets, unwrapped from a link.", "Digital dollars"],
      ["Thank you", "Say it with a little extra.", "Digital dollars"],
      ["Welcome to the team", "A first share in the company’s future.", "Stocks · soon"],
      ["Graduation", "A slice of the companies they’ll build with.", "Stocks · soon"],
    ];
    return `
    <div class="land ${m ? "lm" : ""}">
      <div class="l-bg" aria-hidden="true"><i class="au a1"></i><i class="au a2"></i><i class="au a3"></i><div class="l-grid"></div></div>
      ${m ? `<header class="ph-nav">${logo()}<a class="btn sm acc" data-id="launch">Launch app</a></header>` : `<header class="nav">${logo()}<div class="nav-r"><a class="btn sm sec" data-id="how">How it works</a><a class="btn sm acc" data-id="launch">Launch app</a></div></header>`}
      <section class="l-hero">
        <div class="l-copy">
          <span class="eyebrow">${brand("kite")}AI gift concierge · Built on Kite Passport · Powered by SERV</span>
          <h1>Every gift deserves<br /><span class="acc">a plot twist.</span></h1>
          <p>Tell us who it’s for in one sentence. AI designs the gift and writes the note, Kite Passport handles the payment, and they unwrap it from a single link.</p>
          <div class="cta-row"><a class="btn acc" data-id="hero-cta">Create a gift ${I.right}</a><a class="btn sec" data-id="example-cta">Try the example</a></div>
          <div class="l-cats"><span class="cat is-live"><i></i>Digital dollars · live</span><span class="cat">Stocks · coming soon</span></div>
        </div>
        <div class="hv2">
          <div class="hv-floaters">${floaters}</div>
          <div class="hv-prompt"><span class="hp-who">${I.spark}You</span><p>Birthday gift for my sister Maya, ~$50 — she just moved to Berlin.</p></div>
          <span class="chipf c1">${I.spark}Designed by SERV</span>
          <div class="hv-gift">${heroGift()}</div>
          ${mascot("head", "hv-head")}
          <span class="chipf c2">${brand("kite")}Approved with passkey</span>
          <span class="chipf c3">${I.lock}Exact amount · $51.00</span>
        </div>
      </section>

      <section class="l-sec rv">
        <div class="l-in">
          <span class="kicker">The problem</span>
          <h2>Digital money made giving instant — and forgettable.</h2>
          <p class="l-p">A transfer is an address and a number. No context, no surprise, nothing to unwrap.</p>
          <div class="vs">
            <div class="vs-a">
              <span class="vs-l">A transfer</span>
              <div class="tf"><span>To</span><b class="mono">0x8f3a…c21e</b></div>
              <div class="tf"><span>Amount</span><b>50 USDC</b></div>
              <div class="tf"><span>Memo</span><b class="dim">—</b></div>
              <div class="tf-s">${I.checkSm} Sent.</div>
            </div>
            <div class="vs-b">
              <span class="vs-l acc">A plot twist</span>
              <div class="vs-gift">${mascot("secret", "vs-m")}<div><b>Kai sent you a gift</b><span>Birthday · sealed</span></div></div>
              <div class="vs-tok">${tokImg("USDC")}<span>50 USDC · with a note and a reveal</span></div>
              <p class="vs-n">“A little something for the new chapter — new city, same you.”</p>
              <span class="vs-btn">${I.spark} Tap to reveal</span>
            </div>
          </div>
        </div>
      </section>

      <section class="l-sec rv" data-id="how-sec">
        <div class="l-in">
          <span class="kicker">How it works</span>
          <h2>One sentence in. One surprise out.</h2>
          <div class="steps3">
            <div class="s3"><span class="s3-n">01</span><b>Describe it</b><p>“Birthday gift for my sister, about $50.” SERV works out who it’s for, the amount and the occasion, and writes the note.</p><div class="s3-ui">${I.spark}<span>Designed by SERV</span></div></div>
            <div class="s3"><span class="s3-n">02</span><b>Approve once</b><p>Kite Passport shows exactly how much goes where. One passkey tap — Plot Twist never touches your keys.</p><div class="s3-ui">${brand("kite")}<span>51.00 USDC · Base</span></div></div>
            <div class="s3"><span class="s3-n">03</span><b>They unwrap & claim</b><p>Share one link anywhere. They watch the reveal and claim to their own wallet — no gas, no sign-up.</p><div class="s3-ui">${mascot("claimed", "s3-m")}<span>Claimed in seconds</span></div></div>
          </div>
        </div>
      </section>

      <section class="l-sec rv">
        <div class="l-in">
          <span class="kicker">What can be a plot twist?</span>
          <h2>Real value, wrapped as a surprise.</h2>
          <p class="l-p">We start where gifting is most broken — digital dollars. More categories follow, all with the same describe, approve, unwrap flow.</p>
          <div class="cats">
            <div class="catc is-live">
              <div class="catc-h"><b>Digital dollars</b><span class="badge is-live"><i></i>Live</span></div>
              <p>${tokImg("USDC", "xs")}USDC on six networks and ${tokImg("USDG", "xs")}USDG on Robinhood Chain — the stablecoins Kite Passport holds natively. $50 stays $50.</p>
              <div class="l-chains">${chainsRow}</div>
            </div>
            <div class="catc">
              <div class="catc-h"><b>Stocks</b><span class="badge">Coming soon</span></div>
              <p>A slice of the companies they love, gifted the same way — tokenized stocks they can hold or sell.</p>
              <div class="tickers">${["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL"].map((t) => `<span>${t}</span>`).join("")}</div>
              <a class="btn sm sec" data-id="waitlist">Join the waitlist</a>
            </div>
          </div>
        </div>
      </section>

      <section class="l-sec rv">
        <div class="l-in">
          <span class="kicker">Made for moments</span>
          <h2>Every occasion, its own twist.</h2>
          <div class="cases">${moments.map((c) => `<div class="case"><b>${c[0]}</b><p>${c[1]}</p><span class="case-k ${c[2].includes("soon") ? "soon" : ""}">${c[2]}</span></div>`).join("")}</div>
        </div>
      </section>

      <section class="l-sec rv">
        <div class="l-in two">
          <div>
            <span class="kicker">Safe by design</span>
            <h2>You approve the budget, not the gift.</h2>
            <p class="l-p">The AI is creative. Your money is not. Every gift runs inside limits you set.</p>
          </div>
          <div class="safe">
            <div><b>${brand("kite")}Exact-amount approvals</b><p>Every payment is one passkey-approved transfer: one amount, one address.</p></div>
            <div><b>${I.lock}Passkey approval</b><p>Nothing moves until you confirm with Face ID or your security key.</p></div>
            <div><b>${I.checkSm}Reserved at send</b><p>The full amount is set aside the moment you approve. $50 stays $50.</p></div>
            <div><b>${I.ext}On-chain receipts</b><p>Every payment and claim is a verifiable transaction.</p></div>
          </div>
        </div>
      </section>

      <section class="l-sec rv">
        <div class="l-in faq">
          ${[
            ["What do they actually receive?", "Digital dollars in their own wallet — USDC, or USDG on Robinhood Chain — on the network you pick. Tokenized stocks are next."],
            ["Do they need an account or gas?", "No. They open the link and connect a wallet. Network fees are covered."],
            ["Will the value change?", "No. USDC and USDG are dollar stablecoins, so the amount they see is the amount they get."],
            ["How does the AI help?", "SERV reads your description, works out the person, the amount and the occasion, and writes the note. You can change anything before you send."],
          ].map((q) => `<div><b>${q[0]}</b><p>${q[1]}</p></div>`).join("")}
          <div class="built"><span>Built with</span><span class="bw kite-w">${kiteWord}</span><span class="bw os-w">${B.openserv}</span></div>
        </div>
      </section>

      <section class="l-end rv">
        ${mascot("surprise", "end-m")}
        <h2>Make someone’s day a plot twist.</h2>
        <a class="btn acc" data-id="hero-cta2">Create a gift ${I.right}</a>
      </section>
      <footer class="l-foot">${logo("logo-f")}<span>You approve the budget, not the gift.</span></footer>
    </div>`;
  }

  const createScreen = (s = {}) => s.m
    ? `${nav({ tab: "create", chain: gift(s.g).chain, m: true })}<div class="ph-body"><div class="stage">${createCard(s)}</div></div>`
    : `${nav({ tab: "create", chain: gift(s.g).chain })}
    <div class="stage"><div style="width:464px" data-id="card">${createCard(s)}</div>
      <div class="under"><span>Paid with Kite Passport</span><i>·</i><span>Designed by</span><span class="brand os">${B.openserv}</span><i>·</i><span>Lands on ${C[gift(s.g).chain].name}</span></div>
    </div>`;

  function qr(el) {
    const n = 25;
    let seed = 7;
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="#0A0A0B"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#0A0A0B"/>`;
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
    let cells = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="#0A0A0B"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">${cells}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
  }
  const hydrate = (root = document) => root.querySelectorAll("[data-qr]").forEach(qr);

  window.UI = {
    I, LOGOS, brand, tok, tokImg, chainImg, mascot, mark, logo, nav, networkMenu, fee, money, usd, esc, assetOf, addrFor,
    CHAIN_ORDER, PROMPT, NOTE, DEFAULT, gift,
    createCard, createScreen, reviewModal, kiteSheet, kiteConnect, passkey, sealing, readyModal,
    claimCard, walletSheet, phone, phNav, chat, giftsPage, landing, hydrate,
    setLogo: (k) => { logoKey = k; },
    get logoKey() { return logoKey; },
    resetBalances: () => { bal = { ...BAL0 }; },
    spend: (chain, n) => { bal[chain] = Math.max(0, Math.round((balOf(chain) - n) * 100) / 100); },
    setKite: (v) => { kiteOn = !!v; },
    get kiteOn() { return kiteOn; },
    balOf, canPay, need, maxGift,
  };
})();
