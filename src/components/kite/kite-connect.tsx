"use client";

import { useEffect, useState } from "react";
import { I } from "../ui/icons";
import { Brand } from "../ui/marks";

type Step = "email" | "code" | "signup";

/**
 * Connect Kite Passport with an email code. New emails go through Kite's sign-up:
 * a verification link (where the passkey is created) plus a code. Plot Twist never holds keys.
 */
export function KiteConnect({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loginId, setLoginId] = useState("");
  const [signupId, setSignupId] = useState("");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong");
    return d;
  }

  // New Passport: wait for the user to open Kite's link and create their passkey.
  useEffect(() => {
    if (step !== "signup" || verified) return;
    const t = setInterval(async () => {
      const d = await fetch(`/api/kite/signup-status?signupId=${encodeURIComponent(signupId)}`).then((r) => r.json()).catch(() => null);
      if (d?.status === "verified") setVerified(true);
      if (d?.status === "expired") { setError("The link expired. Start again."); setStep("email"); }
    }, 3000);
    return () => clearInterval(t);
  }, [step, verified, signupId]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const d = await post("/api/kite/login", { email });
      setCode("");
      if (d.mode === "signup") { setSignupId(d.signupId); setVerified(false); setStep("signup"); }
      else { setLoginId(d.loginId); setStep("code"); }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await post("/api/kite/verify", step === "signup" ? { signupId, code, email } : { loginId, code, email });
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't work");
      setBusy(false);
    }
  }

  const codeInput = (
    <input className="kc-code-in num" autoFocus required maxLength={8} minLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\s/g, "").toUpperCase())} aria-label="Code" />
  );
  const back = <button type="button" className="kc-back" onClick={() => { setStep("email"); setError(""); }}>Use a different email</button>;

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="kite kc">
        <div className="kite-url">{I.lock}Connect Kite Passport</div>
        <div className="kite-h">
          <span className="kite-id"><Brand k="kite" /><span>Connect Kite Passport<small>Pay for gifts from your Passport wallet</small></span></span>
          <button className="x kx" onClick={onClose} aria-label="Close">{I.x}</button>
        </div>
        {step === "email" && (
          <form onSubmit={sendCode}>
            <h4>Sign in with email</h4>
            <p className="req">New to Kite Passport? Use any email — we’ll set one up.</p>
            <label className="kc-in">
              <span>Email</span>
              <input className="kc-field" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </label>
            <button className="cta" type="submit" disabled={busy}>{busy ? <><span className="spin" />Sending code</> : "Continue"}</button>
          </form>
        )}
        {step === "code" && (
          <form onSubmit={verify}>
            <h4>Check your email</h4>
            <p className="req">Kite sent an 8-character code to <b>{email}</b>.</p>
            {codeInput}
            <button className="cta" type="submit" disabled={busy || code.length !== 8}>{busy ? <><span className="spin" />Connecting</> : "Verify and connect"}</button>
            {back}
          </form>
        )}
        {step === "signup" && (
          <form onSubmit={verify}>
            <h4>Create your Passport</h4>
            <p className="req">Kite sent an email to <b>{email}</b>. Two quick steps:</p>
            <div className="kc-steps">
              <div className={`kc-step${verified ? " ok" : ""}`}>
                <span className="n">{verified ? I.checkSm : "1"}</span>
                <span>Open the link in the email and create your passkey (Face ID, fingerprint or Windows Hello).<small>{verified ? "Done" : "Waiting for you…"}</small></span>
              </div>
              <div className="kc-step">
                <span className="n">2</span>
                <span>Enter the 8-character code from the same email.</span>
              </div>
            </div>
            {codeInput}
            <button className="cta" type="submit" disabled={busy || code.length !== 8}>{busy ? <><span className="spin" />Connecting</> : "Create and connect"}</button>
            {back}
          </form>
        )}
        {error && <p className="err-line">{error}</p>}
        <p className="fine">Plot Twist never holds your keys. Every payment still needs your passkey.</p>
      </div>
    </div>
  );
}
