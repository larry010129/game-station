/**
 * The player's profile in numbers: lifetime totals and small labels. Data and plain functions only (no React or
 * storage), so the Node tests can load it.
 */
import type { QuestState } from "./questEngine.ts";

/** Whole hours from counted minutes, one decimal under ten hours ("2.5 h", "14 h"). */
export function hoursLabel(minutes: number): string {
  const h = minutes / 60;
  return h < 10 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h)} h`;
}

/** Days with a check-in among the days the quest log still keeps. */
export function checkinDays(s: Pick<QuestState, "days">): number {
  return Object.values(s.days).filter((d) => d.checkin).length;
}

/** One or two letters for the monogram: the first letters of the first two words, or "?" with no name. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const letters = words.length > 1 ? [words[0][0], words[1][0]] : [...words[0]].slice(0, 2);
  return letters.join("").toUpperCase();
}

/** Session key another page sets to open one Profile section once (the Season Pass opens Perks). */
export const PROFILE_SECTION_KEY = "cs-profile-section";
