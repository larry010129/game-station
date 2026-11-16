// Live theme catalog overlay from CMS release themes (status / group / palette).
import test from "node:test";
import assert from "node:assert/strict";

import {
  clearAppliedRelease,
  hydrateContentFromStore,
  writeAppliedRelease,
} from "../../src/content/contentStore.ts";
import { BUNDLED_CONTENT, resetContent, validateContent } from "../../src/state/gachaContent.ts";
import {
  CATALOG,
  clearReleaseThemes,
  getCatalog,
  isDrawableTheme,
  parseReleaseTheme,
  setReleaseThemes,
  themeStatus,
} from "../../src/state/themeCatalog.ts";

function mockStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => {
      store.set(k, String(v));
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  };
}

test.beforeEach(() => {
  mockStorage();
  resetContent();
  clearAppliedRelease();
  clearReleaseThemes();
});

test("parseReleaseTheme maps CMS Brand + Available onto a known id", () => {
  const t = parseReleaseTheme({
    id: "netflix-cinema",
    name: "Netflix Cinema",
    group: "Brand",
    status: "Available",
    palette: {
      bg: "#141414",
      card: "#221f1f",
      text: "#ffffff",
      muted: "#808080",
      accent: "#e50914",
      caution: "#f0893a",
      alert: "#b20710",
      border: "#3a3333",
      radius: "0.25rem",
    },
  });
  assert.ok(t);
  assert.equal(t.group, "Brand");
  assert.equal(themeStatus(t), "Available");
  assert.equal(t.palette?.accent, "#e50914");
});

test("setReleaseThemes replaces listed catalog; empty keeps bundled", () => {
  assert.equal(getCatalog(), CATALOG);
  setReleaseThemes([
    {
      id: "charcoal",
      name: "Charcoal",
      group: "Regular",
      status: "Available",
      palette: null,
    },
    {
      id: "new-cms-look",
      name: "CMS Look",
      group: "Regular",
      status: "Available",
      palette: {
        bg: "#111",
        card: "#222",
        text: "#eee",
        muted: "#888",
        accent: "#5b8def",
        caution: "#f0b429",
        alert: "#e5484d",
        border: "#333",
        radius: "0.5rem",
      },
    },
  ]);
  const live = getCatalog();
  assert.equal(live.length, 2);
  const added = live.find((t) => t.id === "new-cms-look");
  assert.ok(added);
  assert.equal(themeStatus(added), "Available");
  // First 30 catalog rows are free — a 2-row overlay leaves both unlocked, so not drawable.
  assert.equal(isDrawableTheme(added), false);

  setReleaseThemes([]);
  assert.equal(getCatalog(), CATALOG);
});

test("hydrateContentFromStore restores release themes into the live catalog", () => {
  assert.ok(validateContent(BUNDLED_CONTENT));
  assert.ok(
    writeAppliedRelease({
      number: 3,
      content: BUNDLED_CONTENT,
      themes: [
        {
          id: "spotify-night",
          name: "Spotify Night",
          group: "Brand",
          status: "Available",
          palette: {
            bg: "#191414",
            card: "#282828",
            text: "#ffffff",
            muted: "#b3b3b3",
            accent: "#1db954",
            caution: "#f0b429",
            alert: "#e5484d",
            border: "#3e3e3e",
            radius: "0.5rem",
          },
        },
      ],
      files: [],
      changelog: { notes: "theme overlay" },
      notes: "theme overlay",
      appliedAt: new Date().toISOString(),
    }),
  );
  clearReleaseThemes();
  assert.equal(getCatalog(), CATALOG);

  const h = hydrateContentFromStore();
  assert.equal(h.fromStore, true);
  assert.equal(h.number, 3);
  const live = getCatalog();
  assert.equal(live.length, 1);
  assert.equal(live[0].id, "spotify-night");
  assert.equal(themeStatus(live[0]), "Available");
});
