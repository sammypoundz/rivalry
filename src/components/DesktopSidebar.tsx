import { contestants, contests, formatNaira } from "../data";
import { Trophy, Swords, ChevronRight, Users, Clock } from "lucide-react";
import type { Contest, Contestant } from "../data";
import "./DesktopSidebar.css";

interface DesktopSidebarProps {
  onOpenContest: (c: Contest) => void;
  onSelectContestant: (c: Contestant) => void;
}

const fmtLeft = (endsAt: number) => {
  const ms = endsAt - Date.now();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (ms <= 0) return "Ended";
  if (d > 0) return `${d}d ${h}h left`;
  return `${h}h left`;
};

export default function DesktopSidebar({
  onOpenContest,
  onSelectContestant,
}: DesktopSidebarProps) {
  const ranked = [...contestants].sort((a, b) => b.votes - a.votes).slice(0, 5);

  return (
    <aside className="desktop-sidebar">
      <section className="desktop-sidebar__section">
        <h2 className="desktop-sidebar__heading">
          <Swords size={14} /> Contests
        </h2>
        <div className="desktop-sidebar__list">
          {contests.map((c) => (
            <button
              key={c.id}
              className="desktop-sidebar__row"
              onClick={() => onOpenContest(c)}
            >
              <img src={c.coverImage} alt={c.title} loading="lazy" />
              <div className="desktop-sidebar__info">
                <strong>{c.title}</strong>
                <span>
                  <Clock size={11} /> {fmtLeft(c.endsAt)} ·{" "}
                  {formatNaira(c.rewards[0].amount)}
                </span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </section>

      <section className="desktop-sidebar__section">
        <h2 className="desktop-sidebar__heading">
          <Trophy size={14} /> Leaderboard
        </h2>
        <div className="desktop-sidebar__list">
          {ranked.map((c, i) => (
            <button
              key={c.id}
              className="desktop-sidebar__row"
              onClick={() => onSelectContestant(c)}
            >
              <span className="desktop-sidebar__rank">{i + 1}</span>
              <img src={c.heroImage} alt={c.name} loading="lazy" />
              <div className="desktop-sidebar__info">
                <strong>{c.name}</strong>
                <span>
                  <Users size={11} /> {c.votes.toLocaleString()} votes
                </span>
              </div>
              <ChevronRight size={14} />
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
