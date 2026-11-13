import { createLiveProvider, liveAvailable } from "./live";
import type { Provider } from "../lib/types";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Always the real PC. If the local service is not up yet (the desktop app is
 * still starting it), keep trying instead of showing made-up numbers.
 */
export async function createProvider(): Promise<Provider> {
  for (;;) {
    if (await liveAvailable()) {
      try {
        return await createLiveProvider();
      } catch {
        // Service answered but was not ready; try again.
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}
