import type { PlayOption } from "../types/chart";
import { OPTION_LABELS } from "../types/chart";

interface OptionBadgeProps {
  option: PlayOption;
  variant?: "recommend" | "avoid" | "neutral";
}

export function OptionBadge({ option, variant = "neutral" }: OptionBadgeProps) {
  return (
    <span className={`option-badge option-badge--${variant}`} aria-label={option}>
      {OPTION_LABELS[option]}
    </span>
  );
}

interface UnsetBadgeProps {
  label: string;
}

export function UnsetBadge({ label }: UnsetBadgeProps) {
  return <span className="option-badge option-badge--unset">{label}</span>;
}
