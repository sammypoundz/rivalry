import { contestant } from "../data";
import "./VoteBadge.css";

export default function VoteBadge() {
  return (
    <div className="vote-badge">
      <span className="vote-badge__label">Contestant</span>
      <span className="vote-badge__number">#{contestant.number}</span>
    </div>
  );
}
