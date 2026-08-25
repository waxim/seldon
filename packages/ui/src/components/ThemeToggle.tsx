import { cn } from "../lib/cn.js";
import { THEMES, type ThemePreference } from "../lib/theme.js";
import { useTheme } from "../lib/useTheme.js";

const GLYPH: Record<ThemePreference, string> = {
  dark: "M13.2 9.6A5.4 5.4 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z",
  light:
    "M8 3.4V1.6M8 14.4v-1.8M3.7 3.7 2.4 2.4M13.6 13.6l-1.3-1.3M3.4 8H1.6M14.4 8h-1.8M3.7 12.3l-1.3 1.3M13.6 2.4l-1.3 1.3",
  system: "M2.4 3.2h11.2v7.2H2.4zM5.6 13.2h4.8",
};

const LABEL: Record<ThemePreference, string> = {
  dark: "Dark theme",
  light: "Light theme",
  system: "Follow the system theme",
};

/**
 * Dark by default, with a supported light theme and "follow the machine".
 * Built from real radio inputs, so arrow keys move between the options
 * without any JavaScript of ours.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <fieldset className="m-0 flex items-center gap-0.5 rounded-full border border-hairline bg-surface p-0.5">
      <legend className="sr-only">Theme</legend>
      {THEMES.map((option) => {
        const active = option === preference;
        return (
          <label
            key={option}
            title={LABEL[option]}
            className={cn(
              "grid size-7 cursor-pointer place-items-center rounded-full",
              "transition-colors duration-(--motion-fast) ease-(--ease-out-seldon)",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-radiant",
              active
                ? "bg-ink/[0.07] text-radiant"
                : "text-ink-faint hover:text-ink",
            )}
          >
            <input
              type="radio"
              name="seldon-theme"
              value={option}
              checked={active}
              onChange={() => setPreference(option)}
              className="sr-only"
            />
            <span className="sr-only">{LABEL[option]}</span>
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill={option === "dark" ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {option === "light" ? <circle cx="8" cy="8" r="3" /> : null}
              <path d={GLYPH[option]} />
            </svg>
          </label>
        );
      })}
    </fieldset>
  );
}
