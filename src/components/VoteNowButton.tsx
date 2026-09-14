import "./VoteNowButton.css";

interface VoteNowButtonProps {
  onClick?: () => void;
}

export default function VoteNowButton({ onClick }: VoteNowButtonProps) {
  return (
    <button className="vote-now" onClick={onClick}>
      <span className="vote-now__inner">👑 Vote Now</span>
    </button>
  );
}
