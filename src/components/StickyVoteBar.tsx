import { useState } from "react";
import "./StickyVoteBar.css";

interface StickyVoteBarProps {
  votes: number;
  onVote?: () => void;
  /** Disable the CTA (e.g. while the contest hasn't started). */
  disabled?: boolean;
  /** Optional helper text shown on the CTA instead of "Vote Now". */
  label?: string;
}

export default function StickyVoteBar({ votes, onVote, disabled, label }: StickyVoteBarProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <div className={`sticky-bar${pressed ? " sticky-bar--active" : ""}`}>
      <div className="sticky-bar__votes">
        <span className="sticky-bar__count">{votes.toLocaleString()}</span>
        <span className="sticky-bar__label">votes</span>
      </div>
      <button
        className="sticky-bar__cta"
        onClick={() => {
          if (disabled) return;
          setPressed(true);
          setTimeout(() => setPressed(false), 200);
          onVote?.();
        }}
        disabled={disabled}
      >
        {label ?? "Vote Now"}
      </button>
    </div>
  );
}
