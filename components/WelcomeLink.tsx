"use client";

import { openWelcome } from "./Welcome";

export function WelcomeLink() {
  return (
    <button type="button" className="link hover:text-ink" onClick={openWelcome}>
      How it works
    </button>
  );
}
