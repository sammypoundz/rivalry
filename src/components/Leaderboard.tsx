import type { Contestant } from "../data";
import "./Leaderboard.css";

interface LeaderboardProps {
  onSelect: (contestant: Contestant) => void;
  /** Live contestant list (ranked by live vote counts). */
  contestants: Contestant[];
}

export default function Leaderboard({ onSelect, contestants }: LeaderboardProps) {
  const ranked = [...contestants].sort((a, b) => b.votes - a.votes);
  const max = ranked[0]?.votes || 1;

  return (
    <div className="leaderboard">
      <header className="leaderboard__header">
        <h1 className="leaderboard__title">Leaderboard</h1>
        <p className="leaderboard__subtitle">
          Live rankings — updated in real time
        </p>
      </header>

      <div className="leaderboard__list">
        {ranked.map((c, i) => (
          <button
            key={c.id}
            className="leaderboard__row"
            onClick={() => onSelect(c)}
          >
            <span className="leaderboard__rank">{i + 1}</span>
            <img className="leaderboard__img" src={c.heroImage} alt={c.name} />
            <div className="leaderboard__info">
              <span className="leaderboard__name">{c.name}</span>
              <div className="leaderboard__bar-track">
                <div
                  className="leaderboard__bar"
                  style={{ width: `${(c.votes / max) * 100}%` }}
                />
              </div>
              <span className="leaderboard__votes">
                {c.votes.toLocaleString()} votes
              </span>
            </div>
            <span className="leaderboard__chevron">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
