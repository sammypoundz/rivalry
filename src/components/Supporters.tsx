import { useEffect, useState } from "react";
import { listSupporters } from "../lib/api";
import "./Supporters.css";

const medals = ["🥇", "🥈", "🥉"];

interface SupporterRow {
  id: string;
  name: string;
  votes: number;
  badge: string;
  initials: string;
}

export default function Supporters({ contestantId }: { contestantId: string }) {
  const [supporters, setSupporters] = useState<SupporterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only fetch when the id is a valid MongoDB ObjectId (24-char hex).
  // Seed/fallback contestants have no apiId, so there is nothing to load.
  const isValidId = /^[0-9a-fA-F]{24}$/.test(contestantId);

  useEffect(() => {
    if (!isValidId) {
      setSupporters([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listSupporters(contestantId)
      .then((res) => {
        if (!cancelled) setSupporters(res.supporters);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load supporters");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contestantId, isValidId]);

  return (
    <section className="supporters">
      <h2 className="supporters__title">Top Supporters</h2>
      {loading && <p className="supporters__empty">Loading supporters...</p>}
      {error && <p className="supporters__empty">{error}</p>}
      {!loading && !error && supporters.length === 0 && (
        <p className="supporters__empty">No supporters yet — be the first to vote!</p>
      )}
      <div className="supporters__list">
        {supporters.map((s, i) => (
          <div key={s.id} className="supporters__row">
            <span className="supporters__medal">{medals[i] ?? "🎖"}</span>
            <div className="supporters__info">
              <span className="supporters__name">{s.name}</span>
              <span className="supporters__badge">{s.badge}</span>
            </div>
            <span className="supporters__votes">
              {s.votes.toLocaleString()} votes
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

