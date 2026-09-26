import { useQuery } from "@tanstack/react-query";
import { listSupporters } from "../lib/api";
import { qk } from "../lib/queries";
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
  // Only fetch when the id is a valid MongoDB ObjectId (24-char hex).
  // Seed/fallback contestants have no apiId, so there is nothing to load.
  const isValidId = /^[0-9a-fA-F]{24}$/.test(contestantId);

  // Cached by React Query: a fresh vote (made here, via the vote modal, or on
  // another screen) invalidates this and the supporter board updates instantly.
  const { data, isLoading: loading, error } = useQuery({
    queryKey: qk.supporters(contestantId),
    queryFn: () => listSupporters(contestantId),
    enabled: isValidId,
    staleTime: 10_000,
    // Fresh votes update the supporter board in real time.
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
  const supporters: SupporterRow[] = data?.supporters ?? [];
  const errMessage = error instanceof Error ? error.message : null;

  return (
    <section className="supporters">
      <h2 className="supporters__title">Top Supporters</h2>
      {loading && <p className="supporters__empty">Loading supporters...</p>}
      {errMessage && <p className="supporters__empty">{errMessage}</p>}
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

