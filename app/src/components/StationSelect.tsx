import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as KeyEvt } from "react";
import { createPortal } from "react-dom";
import "../styles/select.css";

export interface StationOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: StationOption[];
  /** Accessible name, same role the old label played. */
  label?: string;
  disabled?: boolean;
  /** field matches meta filters; pill is game mode; compact is the deck map; chip is the layout look. */
  variant?: "field" | "pill" | "compact" | "chip";
  className?: string;
  /** Adds a search box at the top of the open list: type to filter, Enter picks the first match. */
  searchable?: boolean;
}

interface Box {
  left: number;
  minWidth: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

/**
 * Closed control plus a dark list. A native select popup stays an OS menu on Windows,
 * so the open list is drawn here and portaled out of the card (cards clip overflow).
 */
export function StationSelect({ value, onChange, options, label, disabled, variant = "field", className, searchable }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options.find((o) => o.value === value)?.label ?? value;
  const q = query.trim().toLowerCase();
  const list = searchable && q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const activeIndex = list.length ? Math.min(active, list.length - 1) : 0;

  const show = (index: number) => {
    if (disabled || options.length === 0) return;
    setActive(index);
    setQuery("");
    setBox(null);
    setOpen(true);
  };
  const hide = () => setOpen(false);

  const choose = (index: number) => {
    const next = list[index];
    if (next && next.value !== value) onChange(next.value);
    hide();
  };

  useLayoutEffect(() => {
    if (!open) return;
    let tries = 0;
    const place = () => {
      if (!btnRef.current || !menuRef.current) {
        if (tries++ < 5) requestAnimationFrame(place);
        return;
      }
      const btn = btnRef.current;
      const menu = menuRef.current;
      const margin = 8;
      const gap = 4;
      const r = btn.getBoundingClientRect();
      const below = window.innerHeight - r.bottom - margin - gap;
      const above = r.top - margin - gap;
      const up = below < 160 && above > below;
      const maxHeight = Math.max(96, Math.min(280, up ? above : below));
      menu.style.minWidth = `${Math.round(r.width)}px`;
      const width = menu.offsetWidth;
      let left = r.left;
      const maxLeft = window.innerWidth - margin - width;
      if (left > maxLeft) left = Math.max(margin, maxLeft);
      const next: Box = {
        left,
        minWidth: r.width,
        maxHeight,
        top: up ? undefined : r.bottom + gap,
        bottom: up ? window.innerHeight - r.top + gap : undefined,
      };
      setBox((prev) =>
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.bottom === next.bottom &&
        prev.minWidth === next.minWidth &&
        prev.maxHeight === next.maxHeight
          ? prev
          : next,
      );
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length, list.length]);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const el = menu?.querySelector<HTMLElement>('[data-active="true"]');
    if (!menu || !el) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }, [open, activeIndex, box]);

  // The list is hidden until it is placed, and a hidden input cannot take focus, so focus once it shows.
  useEffect(() => {
    if (open && box && searchable) searchRef.current?.focus();
  }, [open, box, searchable]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Closing the list is all this Escape does: it must not also leave layout editing.
        e.stopImmediatePropagation();
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const onKeyDown = (e: KeyEvt<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        show(selectedIndex);
        return;
      }
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const n = list.length;
      if (n) setActive((i) => (Math.min(i, n - 1) + dir + n) % n);
    } else if (e.key === "Home") {
      if (!open || searchable) return;
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      if (!open || searchable) return;
      e.preventDefault();
      setActive(Math.max(list.length - 1, 0));
    } else if ((e.key === "Enter" || (e.key === " " && !searchable)) && open) {
      e.preventDefault();
      choose(activeIndex);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
    } else if (e.key === "Tab") {
      hide();
    }
  };

  const rootClass = ["ssel", variant, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <button
        ref={btnRef}
        type="button"
        className="ssel-btn"
        aria-label={label ? `${label}, ${current}` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-opt-${activeIndex}` : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => (open ? hide() : show(selectedIndex))}
        onKeyDown={onKeyDown}
      >
        <span className="ssel-label">{current}</span>
        <svg className="ssel-chev" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        createPortal(
          <ul
            id={listId}
            ref={menuRef}
            className={box ? "ssel-menu" : "ssel-menu ssel-menu-wait"}
            role="listbox"
            aria-label={label}
            style={
              box
                ? { top: box.top, bottom: box.bottom, left: box.left, minWidth: box.minWidth, maxHeight: box.maxHeight }
                : undefined
            }
          >
            {searchable && (
              <li role="presentation" className="ssel-search">
                <input
                  ref={searchRef}
                  value={query}
                  placeholder="Type to search"
                  aria-label={label ? `Search ${label}` : "Search"}
                  aria-controls={listId}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
                      e.preventDefault();
                      if (e.key === "Enter") choose(activeIndex);
                      else if (list.length) setActive((i) => (Math.min(i, list.length - 1) + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length);
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      hide();
                      btnRef.current?.focus();
                    }
                  }}
                />
              </li>
            )}
            {searchable && list.length === 0 && <li role="presentation" className="ssel-none">No match</li>}
            {list.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={o.value === value}
                data-active={i === activeIndex ? "true" : undefined}
                className="ssel-opt"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                {o.label}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
