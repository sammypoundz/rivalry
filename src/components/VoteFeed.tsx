import { useEffect, useRef, useState } from "react";
import { contestants } from "../data";
import { Vote, X } from "lucide-react";
import "./VoteFeed.css";

interface VoteEvent {
  id: number;
  contestantId: number;
  count: number;
  voter: string;
  at: number;
}

interface VoteFeedProps {
  onVote?: (contestantId: number, newTotal: number) => void;
  /** whether the feed may show on mobile (home page only) */
  mobileVisible?: boolean;
}

const NAMES = [
  "Chidi",
  "Amara",
  "Tunde",
  "Ngozi",
  "Emeka",
  "Fatima",
  "Kelechi",
  "Zainab",
  "Obinna",
  "Yemi",
  "Chinelo",
  "Sani",
  "Uche",
  "Bisi",
];

let nextId = 1;

export default function VoteFeed({ onVote, mobileVisible = true }: VoteFeedProps) {
  const [events, setEvents] = useState<VoteEvent[]>([]);
  const [now, setNow] = useState(Date.now());
  const [closed, setClosed] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const tick = () => {
      const c = contestants[Math.floor(Math.random() * contestants.length)];
      const count = 1 + Math.floor(Math.random() * 12);
      setEvents((prev) =>
        [
          {
            id: nextId++,
            contestantId: c.id,
            count,
            voter: NAMES[Math.floor(Math.random() * NAMES.length)],
            at: Date.now(),
          },
          ...prev,
        ].slice(0, 8),
      );
      onVote?.(c.id, c.votes + count);
      const delay = 1800 + Math.random() * 3200;
      timers.current.push(window.setTimeout(tick, delay));
      setNow(Date.now());
      setClosed(false);
      timers.current.push(
        window.setTimeout(() => setNow(Date.now()), 5100),
      );
    };
    timers.current.push(window.setTimeout(tick, 1200));
    return () => timers.current.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recent = events.filter((e) => now - e.at < 5000);

  if (closed) return null;

  return (
    <aside
      className={`vote-feed${mobileVisible ? "" : " vote-feed--mobile-hidden"}`}
    >
      <section className="vote-feed__section">
        <button
          className="vote-feed__close"
          aria-label="Close votes"
          onClick={() => setClosed(true)}
        >
          <X size={14} />
        </button>
        <h2 className="vote-feed__heading">
          <Vote size={14} /> Live Votes
          <span className="vote-feed__pulse" />
        </h2>
        <div className="vote-feed__list">
          {recent.map((e) => {
            const c = contestants.find((x) => x.id === e.contestantId)!;
            return (
              <div key={e.id} className="vote-feed__row">
                <img src={c.heroImage} alt={c.name} loading="lazy" />
                <div className="vote-feed__info">
                  <strong>
                    {e.voter} voted for {c.name}
                  </strong>
                  <span>
                    #{c.number} · {c.occupation}
                  </span>
                </div>
                <span className="vote-feed__count">+{e.count}</span>
              </div>
            );
          })}
          {events.length === 0 && (
            <p className="vote-feed__empty">Waiting for votes…</p>
          )}
        </div>
      </section>
    </aside>
  );
}
