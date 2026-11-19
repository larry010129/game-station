import { useState, type FormEvent } from "react";
import { applyCreatorCode, useCreatorUnlock } from "../state/creatorAccess";
import { factoryReset } from "../state/factoryReset";

/** Vault section: one code field. The right code turns the local creator unlock on or off. */
export function CreatorSettings() {
  const unlocked = useCreatorUnlock();
  const [code, setCode] = useState("");
  const [note, setNote] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = applyCreatorCode(code);
    if (result === "unlock") {
      setCode("");
      setNote({ kind: "ok", text: "Creator unlock is on for this PC." });
    } else if (result === "reset") {
      if (!window.confirm("Factory reset this PC? Income, quests, draws, unlocked themes, the creator unlock, themes, layouts and every saved setting go back to a fresh install. This cannot be undone.")) {
        setNote({ kind: "ok", text: "Reset cancelled. Nothing was changed." });
        return;
      }
      setCode("");
      setNote({ kind: "ok", text: "Resetting…" });
      void factoryReset();
    } else {
      setNote({ kind: "bad", text: "That code does not match." });
    }
  };

  return (
    <section className="vault-card" aria-label="Creator">
      <h3>Creator</h3>
      <div className="vault-row">
        <div>
          <h3>Creator code</h3>
          <p className="hint">
            {unlocked
              ? "Creator unlock is on for this PC. Locked themes, card skins and the brand editor are open."
              : "A code opens locked themes, card skins and the brand editor on this PC. It does not add Income. The reset code puts this PC back to a fresh install."}
          </p>
        </div>
        <form className="vault-field" onSubmit={submit}>
          <div className="vault-field btns">
            <input
              value={code}
              placeholder="Code"
              maxLength={40}
              aria-label="Creator code"
              aria-invalid={note?.kind === "bad" || undefined}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => {
                setCode(e.target.value);
                setNote(null);
              }}
            />
            <button type="submit" className="pill-btn" disabled={!code.trim()}>
              Submit
            </button>
          </div>
          {note && (
            <p className={note.kind === "bad" ? "err" : "hint"} role={note.kind === "bad" ? "alert" : "status"}>
              {note.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
