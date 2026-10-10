// One stroke-based icon set, drawn on a 24 grid so every glyph lines up.
// Usage: <Icon name="bell" className="h-5 w-5" />
const PATHS = {
  cap: (
    <>
      <path d="M12 3 1.5 8 12 13l10.5-5L12 3Z" />
      <path d="M5.5 10.2V15c0 1.8 2.9 3.5 6.5 3.5s6.5-1.7 6.5-3.5v-4.8" />
      <path d="M21.5 8v5" />
    </>
  ),
  scroll: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2.5 2.5H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
  user: (
    <>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 20.5c1.8-3.2 4.3-4.8 7.5-4.8s5.7 1.6 7.5 4.8" />
    </>
  ),
  users: (
    <>
      <path d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M2.5 20.5c1.5-2.8 3.7-4.2 6.5-4.2s5 1.4 6.5 4.2" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.8M17.5 16.6c1.6.7 2.9 2 4 3.9" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M4.5 12.5l5 5 10-11" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  alert: (
    <>
      <path d="M12 3 2.5 19.5h19L12 3Z" />
      <path d="M12 9.5V14" />
      <path d="M12 17v.2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <path d="M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 8.5 12 3.5l5 5" />
      <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
    </>
  ),
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  clock: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 7v5l3.2 2.2" />
    </>
  ),
  calendar: (
    <>
      <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v14a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 20V6A1.5 1.5 0 0 1 5 4.5Z" />
      <path d="M3.5 9.5h17M8 2.8V6M16 2.8V6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V9M17 20V4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  search: (
    <>
      <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
      <path d="M16.2 16.2 21 21" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3 8 7.5 9.8 4.5-1.8 7.5-5.2 7.5-9.8v-6L12 2.5Z" />
      <path d="M8.8 11.6l2.3 2.3 4.2-4.6" />
    </>
  ),
  flag: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4.5c4-2 7 2 11 .5v8c-4 1.5-7-2.5-11-.5" />
    </>
  ),
  mail: (
    <>
      <path d="M4 5h16a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-11A1.5 1.5 0 0 1 4 5Z" />
      <path d="M3.5 6.5 12 13l8.5-6.5" />
    </>
  ),
  info: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 11v5M12 7.6v.2" />
    </>
  ),
  hourglass: (
    <>
      <path d="M5 22h14M5 2h14" />
      <path d="M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" />
      <path d="M7 22v-4.2a2 2 0 0 1 .6-1.4L12 12l4.4 4.4a2 2 0 0 1 .6 1.4V22" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.8 17.5a9.2 9.2 0 1 1 16.4 0" />
      <path d="M12 13.8 15.5 9" />
    </>
  ),
  sliders: (
    <>
      <path d="M3 6h3.8M11.2 6H21M3 12h9.8M17.2 12H21M3 18h1.8M9.2 18H21" />
      <path d="M9 6a1.6 1.6 0 1 0 0 .01M15 12a1.6 1.6 0 1 0 0 .01M7 18a1.6 1.6 0 1 0 0 .01" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  refresh: (
    <>
      <path d="M20.5 11.5A8.5 8.5 0 1 0 12 20.5" />
      <path d="M20.5 4v7.5H13" />
    </>
  ),
  send: (
    <>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3l-6.8 18-3.7-7.5L3 10.8 21 3Z" />
    </>
  ),
  star: <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" />,
  circleCheck: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M8.2 12.4l2.6 2.6 5-5.4" />
    </>
  ),
  circleX: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  circleAlert: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 8v5M12 16.4v.2" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  lifebuoy: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
    </>
  ),
  sparkle: <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3ZM19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8L19 16Z" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  bookmark: <path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9Z" />,
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a16.6 16.6 0 0 1-3.1 3.9M6.6 6.6C4.2 8.2 3 12 3 12s3.5 7 9 7a9.4 9.4 0 0 0 4.4-1.1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  trending: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  circleClock: (
    <>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
};

export const ICON_NAMES = Object.keys(PATHS);

export default function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.9 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name] || PATHS.info}
    </svg>
  );
}
