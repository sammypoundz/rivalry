import { formatNaira } from "../data";
import "./StatsCard.css";

interface StatsCardProps {
  votes: number;
  rank: number;
  /** Prize pool in Naira. */
  prize: number;
}

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString();

export default function StatsCard({ votes, rank, prize }: StatsCardProps) {
  return (
    <div className="stats">
      <div className="stats__item">
        <span className="stats__value">{formatNumber(votes)}</span>
        <span className="stats__label">Total Votes</span>
      </div>
      <div className="stats__divider" />
      <div className="stats__item">
        <span className="stats__value stats__value--gold">#{rank}</span>
        <span className="stats__label">Current Rank</span>
      </div>
      <div className="stats__divider" />
      <div className="stats__item">
        <span className="stats__value">{formatNaira(prize)}</span>
        <span className="stats__label">Prize Pool</span>
      </div>
    </div>
  );
}
