import { useState } from "react";
import "./StickyVoteBar.css";

interface StickyVoteBarProps {
  votes: number;
  onVote?: () => void;
}

export default function StickyVoteBar({ votes, onVote }: StickyVoteBarProps) {
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
          setPressed(true);
          setTimeout(() => setPressed(false), 200);
          onVote?.();
        }}
      >
        Vote Now
      </button>
    </div>
  );
}
