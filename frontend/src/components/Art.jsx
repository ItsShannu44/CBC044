// Brand artwork drawn in SVG: the logo mark and the layered night scene
// (sky, ridges, hills, the book stack with the cap) used by the parallax hero
// and the sign-in panel. Each layer is its own component so it can move at
// its own depth.
import { useId } from 'react';

// The mark: an open book (vidya, knowledge) with a gold thread (sutra) rising
// from its spine in the shape of an S and ending in a knotted bead.
// `animated` turns it into the loading mark: the thread draws itself on a loop.
const THREAD = 'M30.6 11.2C28.2 7.9 17.6 7.8 17.6 13.9 17.6 20.2 30.4 19.1 30.4 25.6 30.4 29.4 26.6 31.7 24 33.4';
export function LogoMark({ className = 'h-9 w-9', animated = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#17897e" /><stop offset="1" stopColor="#0a3034" /></linearGradient>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f8dc98" /><stop offset="1" stopColor="#d9982a" /></linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id}t)`} />
      <rect x=".75" y=".75" width="46.5" height="46.5" rx="12.3" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="1.5" />
      <path d="M6.5 32.6c5.6-2.5 11.4-2.3 17.5 1v7c-6.1-3.3-11.9-3.5-17.5-1Z" fill="#f6eedb" />
      <path d="M41.5 32.6c-5.6-2.5-11.4-2.3-17.5 1v7c6.1-3.3 11.9-3.5 17.5-1Z" fill="#dcefea" />
      {animated && <path d={THREAD} fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="3.4" strokeLinecap="round" />}
      <path d={THREAD} fill="none" stroke={`url(#${id}g)`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
        pathLength="100" className={animated ? 'thread-draw' : undefined} />
      <circle cx="31.4" cy="11.6" r="3.3" fill="#f8dc98" className={animated ? 'bead-pulse' : undefined} />
    </svg>
  );
}

export function Wordmark({ light = true, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className={`font-[family-name:var(--font-display)] text-[1.22rem] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
        Vidya<span className="text-thread">Sutra</span>
      </span>
    </span>
  );
}

// Twinkling stars at fixed pseudo-random positions (deterministic, no flicker between renders).
const STARS = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => { const v = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
  return { x: r(1) * 100, y: r(2) * 70, s: 1 + r(3) * 2.2, d: r(4) * 4 };
});
export function Stars({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`} aria-hidden="true">
      {STARS.map((s, i) => (
        <span key={i} className="twinkle absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s`, boxShadow: s.s > 2.4 ? '0 0 6px #fff' : 'none' }} />
      ))}
    </div>
  );
}

export function Moon({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="moonGlow"><stop offset="0" stopColor="#f8e7b5" stopOpacity=".55" /><stop offset="1" stopColor="#f8e7b5" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(#moonGlow)" />
      <circle cx="100" cy="100" r="30" fill="#fbefc9" />
      <circle cx="112" cy="92" r="27" fill="#0b3a3d" opacity=".9" />
    </svg>
  );
}

// Far ridge line, cool and faint.
export function Ridges({ className = '' }) {
  return (
    <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 210 120 150 220 190 340 110 470 180 560 130 700 200 820 120 960 185 1080 140 1200 175V300H0Z" fill="#0e4446" opacity=".75" />
      <path d="M0 240 150 190 260 230 400 170 520 225 650 175 790 235 930 180 1060 220 1200 200V300H0Z" fill="#0b383b" />
    </svg>
  );
}

// Near hills with pine silhouettes.
function Pine({ x, y, s = 1 }) {
  return <path d={`M${x} ${y - 46 * s} L${x - 13 * s} ${y - 14 * s} H${x - 6 * s} L${x - 17 * s} ${y} H${x + 17 * s} L${x + 6 * s} ${y - 14 * s} H${x + 13 * s} Z`} fill="#06282b" />;
}
export function Hills({ className = '' }) {
  return (
    <svg viewBox="0 0 1200 260" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M0 150C180 100 320 170 520 130S880 80 1200 140V260H0Z" fill="#082c2f" />
      {[60, 110, 150, 980, 1040, 1100, 1150].map((x, i) => <Pine key={x} x={x} y={150 - (i % 3) * 6} s={0.9 + (i % 2) * 0.35} />)}
      <path d="M0 200C240 165 420 215 640 190S1000 160 1200 195V260H0Z" fill="#061f22" />
    </svg>
  );
}

// The hero object: three books, the cap on top, a warm glow and the gold thread.
export function BooksCap({ className = '' }) {
  const id = useId();
  return (
    <svg viewBox="0 0 360 330" className={className} role="img" aria-label="A graduation cap resting on a stack of books">
      <defs>
        <radialGradient id={`${id}glow`} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#f6c86a" stopOpacity=".55" />
          <stop offset="1" stopColor="#f6c86a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}cap`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163c40" /><stop offset="1" stopColor="#0a2427" />
        </linearGradient>
        <linearGradient id={`${id}b1`} x1="0" x2="1"><stop offset="0" stopColor="#1d6b67" /><stop offset="1" stopColor="#124b4a" /></linearGradient>
        <linearGradient id={`${id}b2`} x1="0" x2="1"><stop offset="0" stopColor="#d9a441" /><stop offset="1" stopColor="#a8761f" /></linearGradient>
        <linearGradient id={`${id}b3`} x1="0" x2="1"><stop offset="0" stopColor="#2f8f86" /><stop offset="1" stopColor="#1c625d" /></linearGradient>
      </defs>
      <ellipse cx="180" cy="200" rx="175" ry="130" fill={`url(#${id}glow)`} />
      {/* light rays */}
      <g opacity=".1" fill="#f8dc9a">
        <path d="M180 120 120 0h24Z" /><path d="M180 120 216 0h22Z" /><path d="M180 120 60 30l14-12Z" /><path d="M180 120 300 25l10 14Z" />
      </g>
      {/* shadow */}
      <ellipse cx="180" cy="306" rx="130" ry="14" fill="#031416" opacity=".55" />
      {/* bottom book */}
      <rect x="62" y="252" width="236" height="46" rx="7" fill={`url(#${id}b1)`} />
      <rect x="70" y="258" width="222" height="8" rx="3" fill="#f3ead2" opacity=".9" />
      <rect x="62" y="270" width="236" height="4" fill="#0c3a39" opacity=".6" />
      {/* middle book */}
      <rect x="84" y="210" width="200" height="42" rx="7" fill={`url(#${id}b2)`} />
      <rect x="92" y="216" width="186" height="7" rx="3" fill="#fff6dd" opacity=".9" />
      <rect x="110" y="232" width="56" height="4" rx="2" fill="#5e3f08" opacity=".45" />
      {/* top book */}
      <rect x="74" y="172" width="214" height="38" rx="7" fill={`url(#${id}b3)`} />
      <rect x="82" y="177" width="200" height="7" rx="3" fill="#f3ead2" opacity=".9" />
      <rect x="226" y="190" width="44" height="4" rx="2" fill="#0d3c39" opacity=".5" />
      {/* cap */}
      <path d="M128 150c0-10 23-18 52-18s52 8 52 18v18c0 8-23 14-52 14s-52-6-52-14Z" fill={`url(#${id}cap)`} />
      <path d="M180 96 76 134l104 36 104-36Z" fill="#174448" />
      <path d="M180 96 76 134l104 36 104-36Z" fill="none" stroke="#2b6a6b" strokeWidth="1.5" />
      <circle cx="180" cy="133" r="5" fill="#e9b44c" />
      <path d="M180 133 C230 140 250 150 256 166 L256 196" stroke="#e9b44c" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M249 196h14l-3 22h-8Z" fill="#e9b44c" />
    </svg>
  );
}
