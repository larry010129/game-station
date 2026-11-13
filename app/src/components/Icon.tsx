const PATHS = {
  power: (
    <>
      <path d="M12 3v9" />
      <path d="M6.3 7.3a8 8 0 1 0 11.4 0" />
    </>
  ),
  motion: <path d="M5 12h8M5 7h12M5 17h5" />,
  layout: (
    <>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="6" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
      <rect x="3" y="15" width="8" height="6" rx="1.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" />
      <circle cx="10" cy="7.2" r="1" />
      <circle cx="14.5" cy="7.2" r="1" />
    </>
  ),
  out: <path d="M8 16 16 8M10 8h6v6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l-2.5 2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, small }: { name: IconName; small?: boolean }) {
  return (
    <svg className={`i${small ? " s" : ""}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
