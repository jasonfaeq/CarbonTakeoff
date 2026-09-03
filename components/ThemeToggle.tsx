"use client";

import { nextTheme, setTheme, useTheme, type Theme } from "@/lib/theme";
import { Icon, type IconName } from "./Icon";

const ICON: Record<Theme, IconName> = { system: "monitor", light: "sun", dark: "moon" };
const LABEL: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

export function ThemeToggle() {
  const theme = useTheme();
  return (
    <button
      className="btn btn-ghost btn-icon"
      onClick={() => setTheme(nextTheme(theme))}
      aria-label={`Theme: ${LABEL[theme]}. Switch theme`}
      title={`Theme: ${LABEL[theme]}`}
    >
      <Icon name={ICON[theme]} size={17} />
    </button>
  );
}
