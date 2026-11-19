import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** cms/ package root */
export const CMS_ROOT = path.resolve(here, "..");
/**
 * Data folder (draft, releases, signing keys, uploads). COMMAND_CMS_DATA moves it:
 * the desktop Command CMS points it at %APPDATA%\CommandCMS\data so updates never touch it.
 */
export const DATA_DIR = process.env.COMMAND_CMS_DATA
  ? path.resolve(process.env.COMMAND_CMS_DATA)
  : path.join(CMS_ROOT, "data");
export const KEYS_DIR = path.join(DATA_DIR, "keys");
export const RELEASES_DIR = path.join(DATA_DIR, "releases");
export const BY_NUMBER_DIR = path.join(RELEASES_DIR, "by-number");
export const BLOBS_DIR = path.join(RELEASES_DIR, "blobs");
export const CURRENT_PATH = path.join(RELEASES_DIR, "current.json");
/** Editor draft (CmsDraft) — shared with UI scaffold. */
export const DRAFT_PATH = path.join(DATA_DIR, "draft.json");
export const DRAFT_ASSETS_DIR = path.join(DATA_DIR, "assets");
/** Local CMS uploads (banner art, etc.) — served at /uploads/*. */
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const BANNERS_UPLOAD_DIR = path.join(UPLOADS_DIR, "banners");
export const PRIVATE_KEY_PATH = path.join(KEYS_DIR, "ed25519-private.pem");
export const PUBLIC_KEY_PATH = path.join(KEYS_DIR, "ed25519-public.pem");
