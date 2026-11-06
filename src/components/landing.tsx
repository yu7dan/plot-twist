"use client";

import Link from "next/link";
import { useEffect, useRef, type MouseEvent } from "react";
import { BRAND } from "@/lib/brand";
import { NETWORKS, NETWORK_ORDER, type NetworkId } from "@/lib/chains";
import { I } from "./ui/icons";
import { Brand, ChainImg, Logo, Mascot, TokenImg } from "./ui/marks";
import { flash, Screen, useMobile } from "./ui/screen";

const FLOATERS: NetworkId[] = ["base", "solana", "polygon", "avalanche", "arc", "tempo"];
const KITE_WORD = BRAND.kiteWord.replace(/fill="black"/g, 'fill="#F5F5F6"');
const MOMENTS = [
  ["Birthday", "Fifty dollars and a note they’ll keep.", "Digital dollars"],
  ["Lunar New Year 红包", "Lucky red packets, unwrapped from a link.", "Digital dollars"],
  ["Thank you", "Say it with a little extra.", "Digital dollars"],
  ["Welcome to the team", "A first share in the company’s future.", "Stocks · soon"],
  ["Graduation", "A slice of the companies they’ll build with.", "Stocks · soon"],
];
const TICKERS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL"];
const FAQ = [
  ["What do they actually receive?", "Digital dollars in their own wallet — USDC, or USDG on Robinhood Chain — on the network you pick. Tokenized stocks are next."],
  ["Do they need an account or gas?", "No. They open the link and connect a wallet. Network fees are covered."],
  ["Will the value change?", "No. USDC and USDG are dollar stablecoins, so the amount they see is the amount they get."],
  ["How does the AI help?", "SERV reads your description, works out the person, the amount and the occasion, and writes the note. You can change anything before you send."],
];

function HeroGift() {
  return (
    <div className="hg">
      <div className="hg-h"><span className="from"><span className="ini">K</span><span><b>Kai</b> → Maya · Birthday</span></span></div>
      <div className="hg-amt num">$50.00</div>
      <div className="hg-sub"><ChainImg id="base" className="xs" />on Base · <span className="up">gas covered</span></div>
      <div className="hg-rows"><div className="hg-row"><TokenImg sym="USDC" /><b className="num">50.00 USDC</b><span>Digital dollars</span></div></div>
      <p className="hg-note">“A little something for the new chapter — new city, same you.”</p>
      <span className="hg-cta">{I.spark}Unwrap gift</span>
    </div>
  );
}

function Land({ m }: { m: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const land = ref.current;
    if (!land) return;
    const secs = [...land.querySelectorAll<HTMLElement>(".rv")];
    land.classList.add("anim");
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }), { threshold: 0.12 });
    secs.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const toHow = (e: MouseEvent) => {
    e.preventDefault();
    document.getElementById("how-sec")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={ref} className={`land ${m ? "lm" : ""}`}>
      <div className="l-bg" aria-hidden="true"><i className="au a1" /><i className="au a2" /><i className="au a3" /><div className="l-grid" /></div>
      {m ? (
        <header className="ph-nav"><Logo /><span className="nav-r"><Link className="btn sm sec" href="/dashboard">Sign in</Link><Link className="btn sm acc" href="/create">Launch app</Link></span></header>
      ) : (
        <header className="nav">
          <Logo />
          <div className="nav-r"><a className="btn sm sec" href="#how-sec" onClick={toHow}>How it works</a><Link className="btn sm sec" href="/dashboard">Dashboard</Link><Link className="btn sm acc" href="/create">Launch app</Link></div>
        </header>
      )}
      <section className="l-hero">
        <div className="l-copy">
          <span className="eyebrow"><Brand k="kite" />AI gift concierge · Built on Kite Passport · Powered by SERV</span>
          <h1>Every gift deserves<br /><span className="acc">a plot twist.</span></h1>
          <p>Tell us who it’s for in one sentence. AI designs the gift and writes the note, Kite Passport handles the payment, and they unwrap it from a single link.</p>
          <div className="cta-row"><Link className="btn acc" href="/create">Create a gift {I.right}</Link><Link className="btn sec" href="/create?example=1">Try the example</Link></div>
          <div className="l-cats"><span className="cat is-live"><i />Digital dollars · live</span><span className="cat">Stocks · coming soon</span></div>
        </div>
        <div className="hv2">
          <div className="hv-floaters">{FLOATERS.map((id, i) => <span key={id} className={`fl f${i}`}><ChainImg id={id} className="ti" /></span>)}</div>
          <div className="hv-prompt"><span className="hp-who">{I.spark}You</span><p>Birthday gift for my sister Maya, ~$50 — she just moved to Berlin.</p></div>
          <span className="chipf c1">{I.spark}Designed by SERV</span>
          <div className="hv-gift"><HeroGift /></div>
          <Mascot pose="head" className="hv-head" />
          <span className="chipf c2"><Brand k="kite" />Approved with passkey</span>
          <span className="chipf c3">{I.lock}Exact amount · $51.00</span>
        </div>
      </section>

      <section className="l-sec rv">
        <div className="l-in">
          <span className="kicker">The problem</span>
          <h2>Digital money made giving instant — and forgettable.</h2>
          <p className="l-p">A transfer is an address and a number. No context, no surprise, nothing to unwrap.</p>
          <div className="vs">
            <div className="vs-a">
              <span className="vs-l">A transfer</span>
              <div className="tf"><span>To</span><b className="mono">0x8f3a…c21e</b></div>
              <div className="tf"><span>Amount</span><b>50 USDC</b></div>
              <div className="tf"><span>Memo</span><b className="dim">—</b></div>
              <div className="tf-s">{I.checkSm} Sent.</div>
            </div>
            <div className="vs-b">
              <span className="vs-l acc">A plot twist</span>
              <div className="vs-gift"><Mascot pose="secret" className="vs-m" /><div><b>Kai sent you a gift</b><span>Birthday · sealed</span></div></div>
              <div className="vs-tok"><TokenImg sym="USDC" /><span>50 USDC · with a note and a reveal</span></div>
              <p className="vs-n">“A little something for the new chapter — new city, same you.”</p>
              <span className="vs-btn">{I.spark} Tap to reveal</span>
            </div>
          </div>
        </div>
      </section>

      <section className="l-sec rv" id="how-sec">
        <div className="l-in">
          <span className="kicker">How it works</span>
          <h2>One sentence in. One surprise out.</h2>
          <div className="steps3">
            <div className="s3"><span className="s3-n">01</span><b>Describe it</b><p>“Birthday gift for my sister, about $50.” SERV works out who it’s for, the amount and the occasion, and writes the note.</p><div className="s3-ui">{I.spark}<span>Designed by SERV</span></div></div>
            <div className="s3"><span className="s3-n">02</span><b>Approve once</b><p>Kite Passport shows exactly how much goes where. One passkey tap — Plot Twist never touches your keys.</p><div className="s3-ui"><Brand k="kite" /><span>51.00 USDC · Base</span></div></div>
            <div className="s3"><span className="s3-n">03</span><b>They unwrap &amp; claim</b><p>Share one link anywhere. They watch the reveal and claim to their own wallet — no gas, no sign-up.</p><div className="s3-ui"><Mascot pose="claimed" className="s3-m" /><span>Claimed in seconds</span></div></div>
          </div>
        </div>
      </section>

      <section className="l-sec rv">
        <div className="l-in">
          <span className="kicker">What can be a plot twist?</span>
          <h2>Real value, wrapped as a surprise.</h2>
          <p className="l-p">We start where gifting is most broken — digital dollars. More categories follow, all with the same describe, approve, unwrap flow.</p>
          <div className="cats">
            <div className="catc is-live">
              <div className="catc-h"><b>Digital dollars</b><span className="badge is-live"><i />Live</span></div>
              <p><TokenImg sym="USDC" className="xs" />USDC on six networks and <TokenImg sym="USDG" className="xs" />USDG on Robinhood Chain — the stablecoins Kite Passport holds natively. $50 stays $50.</p>
              <div className="l-chains">{NETWORK_ORDER.map((id) => <span key={id} className="lc"><ChainImg id={id} />{NETWORKS[id].name}</span>)}</div>
            </div>
            <div className="catc">
              <div className="catc-h"><b>Stocks</b><span className="badge">Coming soon</span></div>
              <p>A slice of the companies they love, gifted the same way — tokenized stocks they can hold or sell.</p>
              <div className="tickers">{TICKERS.map((t) => <span key={t}>{t}</span>)}</div>
              <button type="button" className="btn sm sec" onClick={() => flash("You're on the Stocks waitlist")}>Join the waitlist</button>
            </div>
          </div>
        </div>
      </section>

      <section className="l-sec rv">
        <div className="l-in">
          <span className="kicker">Made for moments</span>
          <h2>Every occasion, its own twist.</h2>
          <div className="cases">
            {MOMENTS.map(([t, p, k]) => (
              <div key={t} className="case"><b>{t}</b><p>{p}</p><span className={`case-k ${k.includes("soon") ? "soon" : ""}`}>{k}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-sec rv">
        <div className="l-in two">
          <div>
            <span className="kicker">Safe by design</span>
            <h2>You approve the budget, not the gift.</h2>
            <p className="l-p">The AI is creative. Your money is not. Every gift runs inside limits you set.</p>
          </div>
          <div className="safe">
            <div><b><Brand k="kite" />Exact-amount approvals</b><p>Every payment is one passkey-approved transfer: one amount, one address.</p></div>
            <div><b>{I.lock}Passkey approval</b><p>Nothing moves until you confirm with Face ID or your security key.</p></div>
            <div><b>{I.checkSm}Reserved at send</b><p>The full amount is set aside the moment you approve. $50 stays $50.</p></div>
            <div><b>{I.ext}On-chain receipts</b><p>Every payment and claim is a verifiable transaction.</p></div>
          </div>
        </div>
      </section>

      <section className="l-sec rv">
        <div className="l-in faq">
          {FAQ.map(([q, a]) => <div key={q}><b>{q}</b><p>{a}</p></div>)}
          <div className="built">
            <span>Built with</span>
            <span className="bw kite-w" dangerouslySetInnerHTML={{ __html: KITE_WORD }} />
            <span className="bw os-w" dangerouslySetInnerHTML={{ __html: BRAND.openserv }} />
          </div>
        </div>
      </section>

      <section className="l-end rv">
        <Mascot pose="surprise" className="end-m" />
        <h2>Make someone’s day a plot twist.</h2>
        <Link className="btn acc" href="/create">Create a gift {I.right}</Link>
      </section>
      <footer className="l-foot"><Logo /><span>You approve the budget, not the gift.</span></footer>
    </div>
  );
}

export function Landing() {
  const m = useMobile();
  return (
    <Screen>
      {m ? <div className="ph-body"><Land key="m" m /></div> : <Land key="d" m={false} />}
    </Screen>
  );
}
