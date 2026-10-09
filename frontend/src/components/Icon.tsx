/** Minimal consistent stroke icon set (24x24, currentColor). */
const PATHS: Record<string, string> = {
  camera: "M3 7h3l2-3h8l2 3h3v13H3z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  cameraOff: "M3 3l18 18 M7 4h9l2 3h3v11 M3 7v13h15 M9.5 10.5a4 4 0 0 0 5 5",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h3v16H7z M14 4h3v16h-3z",
  stop: "M6 6h12v12H6z",
  replay: "M3 12a9 9 0 1 0 3-6.7 M3 4v5h5",
  copy: "M9 9h11v11H9z M5 15H4V4h11v1",
  volume: "M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M19 6a8 8 0 0 1 0 12",
  trash: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13",
  check: "M5 12l5 5 9-10",
  alert: "M12 3l10 18H2z M12 10v5 M12 18v.5",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 11v6 M12 7v.5",
  x: "M6 6l12 12 M18 6L6 18",
  plus: "M12 5v14 M5 12h14",
  refresh: "M20 11a8 8 0 0 0-14.9-3 M4 4v4h4 M4 13a8 8 0 0 0 14.9 3 M20 20v-4h-4",
  record: "M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
  hand: "M8 13V5a1.5 1.5 0 0 1 3 0v6 M11 11V3.5a1.5 1.5 0 0 1 3 0V11 M14 11V5a1.5 1.5 0 0 1 3 0v8 M17 9.5a1.5 1.5 0 0 1 3 0V14a8 8 0 0 1-8 8h-1a7 7 0 0 1-5.6-2.8L3 15.5a1.6 1.6 0 0 1 2.5-2L8 16",
  text: "M4 6V4h16v2 M12 4v16 M9 20h6",
  database: "M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3z M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5 M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  flask: "M9 3h6 M10 3v6L4 19a2 2 0 0 0 1.7 3h12.6a2 2 0 0 0 1.7-3L14 9V3 M7 15h10",
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z",
  mic: "M12 15a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v7a3 3 0 0 0 3 3z M19 11a7 7 0 0 1-14 0 M12 18v4",
  edit: "M4 20h4L19 9l-4-4L4 16z M14 6l4 4",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  face: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M8 14s1.5 2 4 2 4-2 4-2 M9 9h.01 M15 9h.01",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 13.7H3a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10.3 3V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
  layers: "M12 2l10 5-10 5L2 7z M2 12l10 5 10-5 M2 17l10 5 10-5",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
