/* Icons for the v2 site (nav, home panel, product tiles). Lucide-style strokes. */
const s = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const V = {
  gift: (<svg aria-hidden="true" {...s}><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>),
  drop: (<svg aria-hidden="true" {...s}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>),
  api: (<svg aria-hidden="true" {...s}><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4M8 16h.01M16 16h.01" /></svg>),
  sun: (<svg aria-hidden="true" {...s}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>),
  moon: (<svg aria-hidden="true" {...s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>),
  burger: (<svg aria-hidden="true" {...s}><path d="M4 7h16M4 12h16M4 17h16" /></svg>),
  plug: (<svg aria-hidden="true" {...s}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" /></svg>),
  term: (<svg aria-hidden="true" {...s}><path d="m4 17 6-6-6-6M12 19h8" /></svg>),
  fn: (<svg aria-hidden="true" {...s}><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" /></svg>),
  arrow: (<svg aria-hidden="true" {...s} strokeWidth={2.4}><path d="M5 12h14M13 6l6 6-6 6" /></svg>),
};

export const ProductIcon = ({ k }: { k: "gift" | "drop" | "api" }) => <span className={`v-pi ${k}`}>{V[k]}</span>;
