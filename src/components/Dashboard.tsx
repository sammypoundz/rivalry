import { contestants, type Contestant, type Contest } from "../data";
import { Swords, ChevronRight } from "lucide-react";
import "./Dashboard.css";

interface DashboardProps {
  onSelect: (contestant: Contestant) => void;
  joinedContest: Contest | null;
  onOpenContest: (contest: Contest) => void;
}

const medals = ["🥇", "🥈", "🥉"];

export default function Dashboard({ onSelect, joinedContest, onOpenContest }: DashboardProps) {
  const ranked = [...contestants].sort((a, b) => b.votes - a.votes);

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <h1 className="dashboard__title">Rivalry</h1>
        <p className="dashboard__subtitle">Season 1 — Vote for your queen</p>
      </header>

      {joinedContest && (
        <button
          className="joined-contest-banner"
          onClick={() => onOpenContest(joinedContest)}
        >
          <span className="joined-contest-banner__icon">
            <Swords size={18} />
          </span>
          <span className="joined-contest-banner__text">
            <strong>You're in: {joinedContest.title}</strong>
            <span>Tap to view votes, rewards &amp; standings</span>
          </span>
          <ChevronRight size={18} />
        </button>
      )}

      {/* Leaderboard */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Leaderboard</h2>
        <div className="dashboard__podium">
          {ranked.slice(0, 3).map((c, i) => (
            <button
              key={c.id}
              className={`podium-card podium-card--${i + 1}`}
              onClick={() => onSelect(c)}
            >
              <span className="podium-card__medal">{medals[i]}</span>
              <img
                className="podium-card__img"
                src={c.heroImage}
                alt={c.name}
              />
              <span className="podium-card__name">{c.name}</span>
              <span className="podium-card__votes">
                {c.votes.toLocaleString()} votes
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* All contestants */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Contestants</h2>
        <div className="dashboard__grid">
          {contestants.map((c) => (
            <button
              key={c.id}
              className="contestant-card"
              onClick={() => onSelect(c)}
            >
              <div className="contestant-card__img-wrap">
                <img
                  className="contestant-card__img"
                  src={c.heroImage}
                  alt={c.name}
                />
                <span className="contestant-card__number">#{c.number}</span>
              </div>
              <div className="contestant-card__body">
                <span className="contestant-card__name">{c.name}</span>
                <span className="contestant-card__state">{c.state}</span>
                <span className="contestant-card__votes">
                  {c.votes.toLocaleString()} votes
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
