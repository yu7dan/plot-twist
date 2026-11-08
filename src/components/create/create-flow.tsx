"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isNetworkId, NETWORKS, type NetworkId } from "@/lib/chains";
import { feeFor } from "@/lib/pricing";
import { DEFAULT_EXPIRY } from "@/lib/types";
import { KiteConnect } from "../kite/kite-connect";
import { Nav } from "../nav";
import { Brand } from "../ui/marks";
import { flash, Screen, useMobile } from "../ui/screen";
import { useKite } from "../use-kite";
import { CreateCard, EXAMPLE_PROMPT, type Draft, type EditField, type Phase } from "./create-card";
import { ApproveModal, NetworkMenu, ReadyModal, ReviewModal, SealingModal, type SealStep } from "./overlays";
import { AddFunds } from "../kite/add-funds";

const EMPTY: Draft = { recipientName: "", occasion: "", amountStr: "50", network: "base", note: "", insight: "", expiresIn: DEFAULT_EXPIRY };

async function post<T>(url: string, body: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d as T;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function CreateFlow() {
  const router = useRouter();
  const m = useMobile();
  const kite = useKite();
  const [phase, setPhase] = useState<Phase>("empty");
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [animate, setAnimate] = useState(false);
  const [editing, setEditing] = useState<EditField | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [topUp, setTopUp] = useState(false);
  const [modal, setModal] = useState<null | "review" | "approve" | "sealing" | "ready">(null);
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [gift, setGift] = useState<{ code: string; approvalUrl: string } | null>(null);
  const [failed, setFailed] = useState("");
  const [steps, setSteps] = useState<SealStep[]>(["ok", "run", "wait", "wait"]);
  const [txHash, setTxHash] = useState<string>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of ?example=1 from the landing page
    if (new URLSearchParams(window.location.search).get("example")) setPrompt(EXAMPLE_PROMPT);
  }, []);

  async function design() {
    setPhase("generating"); setError(""); setEditing(null);
    try {
      const d = await post<{ recipientName: string; occasion: string; amount: string; network: string; note: string; insight: string }>("/api/design", { prompt });
      setDraft((cur) => ({
        expiresIn: cur.expiresIn,
        recipientName: d.recipientName,
        occasion: d.occasion,
        amountStr: String(Number(d.amount)),
        network: isNetworkId(d.network) ? d.network : "base",
        note: d.note,
        insight: d.insight,
      }));
      setPhase("filled"); setAnimate(true);
      setTimeout(() => setAnimate(false), 1200);
    } catch (e) {
      setPhase("empty");
      setError(e instanceof Error ? e.message : "SERV couldn't design this one");
    }
  }

  async function rewrite() {
    setNoteBusy(true);
    try {
      const d = await post<{ note: string }>("/api/design/note", { prompt, recipientName: draft.recipientName, occasion: draft.occasion, note: draft.note });
      setDraft((g) => ({ ...g, note: d.note }));
    } catch (e) {
      flash(e instanceof Error ? e.message : "Couldn't rewrite the note");
    } finally {
      setNoteBusy(false);
    }
  }

  function pickNetwork(id: NetworkId) {
    setDraft((g) => ({ ...g, network: id, insight: g.network === id ? g.insight : "" }));
    setMenu(false);
  }

  function maxGift() {
    const b = kite.balances[draft.network] ?? 0;
    // Largest gift whose amount + fee still fits the balance.
    let a = Math.floor((b - 1) * 100) / 100;
    while (a > 0 && a + feeFor(a, draft.network) > b + 1e-9) a = Math.round((a - 0.01) * 100) / 100;
    setDraft((g) => ({ ...g, amountStr: String(Math.max(0, a)) }));
  }

  async function approve() {
    // Open the Kite tab inside the click so pop-up blockers allow it; point it at the approval page once we have it.
    const tab = window.open("", "kite-approve");
    setBusy(true); setReviewError("");
    try {
      const g = draft;
      const d = await post<{ code: string; approvalUrl: string }>("/api/gifts", {
        prompt, recipientName: g.recipientName, occasion: g.occasion, amount: Number(g.amountStr), network: g.network, note: g.note, expiresInHours: g.expiresIn,
      });
      setGift(d); setFailed("");
      if (tab) tab.location.href = d.approvalUrl;
      setModal("approve");
    } catch (e) {
      tab?.close();
      setReviewError(e instanceof Error ? e.message : "Couldn't start the transfer");
    } finally {
      setBusy(false);
    }
  }

  // Poll the payment while the sender approves on Kite.
  useEffect(() => {
    if (modal !== "approve" || !gift || failed) return;
    let stop = false;
    const tick = async () => {
      while (!stop) {
        await wait(2500);
        if (stop) return;
        const r = await fetch(`/api/gifts/${gift.code}/payment`, { cache: "no-store" }).then((x) => x.json()).catch(() => null);
        if (stop || !r) continue;
        if (r.status === "payment_failed") { setFailed(r.error ? `Kite: ${r.error}` : "The transfer didn't go through."); return; }
        if (r.status === "sealed") {
          setTxHash(r.txHash);
          setSteps(["ok", "ok", "run", "wait"]); setModal("sealing");
          await wait(800); setSteps(["ok", "ok", "ok", "run"]);
          await wait(800); setSteps(["ok", "ok", "ok", "ok"]);
          await wait(700); setModal("ready");
          kite.refresh();
          return;
        }
      }
    };
    tick();
    return () => { stop = true; };
  }, [modal, gift, failed, kite]);

  const link = gift ? `${typeof window === "undefined" ? "" : window.location.origin}/g/${gift.code}` : "";

  function reset() {
    setModal(null); setGift(null); setPhase("empty"); setPrompt(""); setDraft(EMPTY); setFailed(""); setTxHash(undefined);
  }

  const card = (
    <CreateCard
      phase={phase} prompt={prompt} draft={draft} animate={animate} kite={kite}
      editing={editing} noteBusy={noteBusy} error={error}
      onPrompt={setPrompt}
      onEditPrompt={() => { setPhase("empty"); setEditing(null); }}
      onDesign={design}
      onDraft={(patch) => setDraft((g) => ({ ...g, ...patch }))}
      onEdit={setEditing}
      onRewrite={rewrite}
      onMax={maxGift}
      onNetwork={() => setMenu(true)}
      onConnect={() => setConnectOpen(true)}
      onTopUp={() => setTopUp(true)}
      onCreate={() => { setEditing(null); setReviewError(""); setModal("review"); }}
    />
  );

  return (
    <Screen>
      <Nav tab="create" kite={kite} onConnect={() => setConnectOpen(true)} network={draft.network} onNetwork={() => setMenu(true)} />
      {m ? (
        <div className="stage">{card}</div>
      ) : (
        <div className="stage">
          <div style={{ width: 464 }}>{card}</div>
          <div className="under">
            <span>Paid with Kite Passport</span><i>·</i><span>Designed by</span><Brand k="openserv" className="os" /><i>·</i><span>Lands on {NETWORKS[draft.network].name}</span>
          </div>
        </div>
      )}

      {menu && <NetworkMenu selected={draft.network} amount={Number(draft.amountStr) || 0} kite={kite} onPick={pickNetwork} onClose={() => setMenu(false)} />}
      {topUp && <AddFunds kite={kite} gift={{ network: draft.network, amount: Number(draft.amountStr) || 0 }} onClose={() => setTopUp(false)} onFunded={() => setTopUp(false)} />}
      {connectOpen && <KiteConnect onClose={() => setConnectOpen(false)} onConnected={() => { setConnectOpen(false); kite.refresh(); flash("Kite Passport connected"); }} />}
      {modal === "review" && <ReviewModal draft={draft} busy={busy} error={reviewError} onClose={() => setModal(null)} onApprove={approve} />}
      {modal === "approve" && gift && (
        <ApproveModal draft={draft} approvalUrl={gift.approvalUrl} failed={failed}
          onClose={() => { setModal(null); if (!failed) flash("You can finish it later from your Dashboard"); }}
          onRetry={() => { setGift(null); setFailed(""); setModal("review"); }} />
      )}
      {modal === "sealing" && gift && <SealingModal draft={draft} steps={steps} txHash={txHash} code={gift.code} />}
      {modal === "ready" && gift && <ReadyModal draft={draft} link={link} onClose={reset} onGifts={() => router.push("/dashboard")} />}
    </Screen>
  );
}

