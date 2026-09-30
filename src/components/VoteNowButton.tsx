import "./VoteNowButton.css";

interface VoteNowButtonProps {
  onClick?: () => void;
  /** Disable the button (e.g. while the contest hasn't started). */
  disabled?: boolean;
  /** Optional helper text shown under/inside the button. */
  label?: string;
}

export default function VoteNowButton({ onClick, disabled, label }: VoteNowButtonProps) {
  return (
    <button className="vote-now" onClick={onClick} disabled={disabled}>
      <span className="vote-now__inner">{label ?? "👑 Vote Now"}</span>
    </button>
  );
}
