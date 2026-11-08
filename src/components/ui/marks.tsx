import Link from "next/link";
import { NETWORKS, type NetworkId } from "@/lib/chains";
import { BRAND, type BrandKey } from "@/lib/brand";
import { CHAIN_UI, TOKEN_LOGO } from "@/lib/ui-assets";

/** Official brand mark (inline SVG). */
export const Brand = ({ k, className = "" }: { k: BrandKey; className?: string }) => (
  <span className={`brand ${className}`} dangerouslySetInnerHTML={{ __html: BRAND[k] }} />
);

export const TokenImg = ({ sym, className = "" }: { sym: keyof typeof TOKEN_LOGO; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <span className={`ti ${className}`}><img src={TOKEN_LOGO[sym]} alt={sym} /></span>
);

export const ChainImg = ({ id, className = "" }: { id: NetworkId; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <span className={`ci ${className}`}><img src={CHAIN_UI[id].logo} alt={NETWORKS[id].name} /></span>
);

const MASCOT_FILE: Record<string, string> = { main: "logo-head", head: "logo-head", icon: "app-icon" };

/** The user-generated mascot images, used as-is. */
export const Mascot = ({ pose = "main", className = "", style }: { pose?: string; className?: string; style?: React.CSSProperties }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img className={`mascot ${className}`} style={style} src={`/assets/${MASCOT_FILE[pose] || `m-${pose}`}.png`} alt="" draggable={false} />
);

export const Logo = ({ href = "/" }: { href?: string }) => (
  <Link className="logo" href={href}>
    <span className="mark img"><Mascot /></span>Plot Twist
  </Link>
);

export const usd = (n: number | string) =>
  "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
