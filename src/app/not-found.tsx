import Link from "next/link";
import { Logo, Mascot } from "@/components/ui/marks";

export default function NotFound() {
  return (
    <div className="screen desk app glow">
      <header className="nav"><Logo /></header>
      <div className="g-empty" style={{ maxWidth: 440, margin: "80px auto 0" }}>
        <Mascot pose="wink" className="g-empty-m" />
        <b style={{ color: "var(--text)", fontSize: 20 }}>This gift link doesn’t open.</b>
        <span>It may not be paid yet, or the code is wrong. Ask the sender for a fresh link.</span>
        <Link className="cta" href="/">Create a gift</Link>
      </div>
    </div>
  );
}
