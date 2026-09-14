import "./Contests.css";
import { useState } from "react";
import { contests, contestants, formatNaira, type Contest } from "../data";
import {
  ChevronLeft,
  Users,
  Vote,
  Trophy,
  Clock,
  Flame,
  CalendarDays,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";

interface ContestsProps {
  contest: Contest | null;
  onOpen: (c: Contest) => void;
  onBack: () => void;
  onSelect: (id: number) => void;
  joinedContestId: number | null;
  onJoin: (contestId: number) => void;
}

const fmtLeft = (endsAt: number) => {
  const ms = endsAt - Date.now();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (ms <= 0) return "Ended";
  if (d > 0) return `${d}d ${h}h left`;
  return `${h}h left`;
};

export default function Contests({
  contest,
  onOpen,
  onBack,
  onSelect,
  joinedContestId,
  onJoin,
}: ContestsProps) {
  if (contest)
    return (
      <ContestDetail
        contest={contest}
        onBack={onBack}
        onSelect={onSelect}
        joined={joinedContestId === contest.id}
        onJoin={() => onJoin(contest.id)}
      />
    );

  return (
    <main className="contests-page">
      <h1 className="contests-page__title">Contests</h1>
      <p className="contests-page__sub">
        Pick a contest, rally support, and win big.
      </p>
      <div className="contests-page__grid">
        {contests.map((c) => (
          <button key={c.id} className="contest-card" onClick={() => onOpen(c)}>
            <div className="contest-card__media">
              <img src={c.coverImage} alt={c.title} loading="lazy" />
              <span
                className={`contest-card__badge contest-card__badge--${c.status}`}
              >
                {c.status === "voting-live" ? (
                  <>
                    <Flame size={12} /> Voting Live
                  </>
                ) : c.status === "upcoming" ? (
                  <>
                    <CalendarDays size={12} /> Upcoming
                  </>
                ) : (
                  "Ended"
                )}
              </span>
            </div>
            <div className="contest-card__body">
              <span className="contest-card__category">{c.category}</span>
              <h2 className="contest-card__title">{c.title}</h2>
              <p className="contest-card__tagline">{c.tagline}</p>
              <div className="contest-card__meta">
                <span>
                  <Users size={13} /> {c.contestantIds.length} contestants
                </span>
                <span>
                  <Vote size={13} /> {c.totalVotes.toLocaleString()} votes
                </span>
                <span>
                  <Clock size={13} /> {fmtLeft(c.endsAt)}
                </span>
              </div>
              <span className="contest-card__prize">
                <Trophy size={14} /> Top prize{" "}
                {formatNaira(c.rewards[0].amount)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}

function ContestDetail({
  contest,
  onBack,
  onSelect,
  joined,
  onJoin,
}: {
  contest: Contest;
  onBack: () => void;
  onSelect: (id: number) => void;
  joined: boolean;
  onJoin: () => void;
}) {
  const [showJoin, setShowJoin] = useState(false);
  const list = contestants
    .filter((c) => contest.contestantIds.includes(c.id))
    .sort((a, b) => b.votes - a.votes);

  return (
    <main className="contest-detail">
      <button className="contest-detail__back" onClick={onBack}>
        <ChevronLeft size={18} /> All Contests
      </button>

      <div className="contest-detail__hero">
        <img src={contest.coverImage} alt={contest.title} />
        <div className="contest-detail__hero-overlay">
          <span
            className={`contest-card__badge contest-card__badge--${contest.status}`}
          >
            {contest.status === "voting-live"
              ? "Voting Live"
              : contest.status === "upcoming"
                ? "Upcoming"
                : "Ended"}
          </span>
          <h1>{contest.title}</h1>
          <p>{contest.tagline}</p>
          <span className="contest-detail__timer">
            <Clock size={13} /> {fmtLeft(contest.endsAt)}
          </span>
          {joined ? (
            <span className="join-banner join-banner--joined">
              <CheckCircle2 size={14} /> You're competing in this contest
            </span>
          ) : (
            <button className="join-banner" onClick={() => setShowJoin(true)}>
              <Sparkles size={14} /> Join this contest
            </button>
          )}
        </div>
      </div>

      {showJoin && (
        <JoinFlow
          contest={contest}
          onClose={() => setShowJoin(false)}
          onDone={() => {
            onJoin();
            setShowJoin(false);
          }}
        />
      )}

      <section className="contest-detail__section">
        <h2>
          <Trophy size={17} /> Rewards
        </h2>
        <div className="reward-list">
          {contest.rewards.map((r) => (
            <div key={r.position} className="reward-row">
              <span className="reward-row__position">{r.position}</span>
              <span className="reward-row__amount">
                {formatNaira(r.amount)}
              </span>
              <span className="reward-row__perk">{r.perk}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="contest-detail__section">
        <h2>
          <Vote size={17} /> Votes &amp; Standings
        </h2>
        <div className="contest-detail__stats">
          <div>
            <strong>{contest.totalVotes.toLocaleString()}</strong>
            <span>Total votes</span>
          </div>
          <div>
            <strong>{contest.contestantIds.length}</strong>
            <span>Contestants</span>
          </div>
          <div>
            <strong>{formatNaira(contest.rewards[0].amount)}</strong>
            <span>Top prize</span>
          </div>
        </div>
      </section>

      <section className="contest-detail__section">
        <h2>
          <Users size={17} /> Contestants
        </h2>
        <div className="contest-detail__roster">
          {list.map((c) => (
            <button
              key={c.id}
              className="roster-row"
              onClick={() => onSelect(c.id)}
            >
              <img src={c.heroImage} alt={c.name} loading="lazy" />
              <div className="roster-row__info">
                <strong>
                  #{c.number} {c.name}
                </strong>
                <span>{c.occupation}</span>
              </div>
              <div className="roster-row__votes">
                <strong>{c.votes.toLocaleString()}</strong>
                <span>votes</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

function JoinFlow({
  contest,
  onClose,
  onDone,
}: {
  contest: Contest;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [occupation, setOccupation] = useState("");

  const valid = name.trim() && state.trim() && occupation.trim();

  return (
    <div className="join-flow__overlay" onClick={onClose}>
      <div className="join-flow" onClick={(e) => e.stopPropagation()}>
        <button className="join-flow__close" onClick={onClose}>
          <X size={16} />
        </button>

        <h2 className="join-flow__title">Join {contest.title}</h2>
        <p className="join-flow__sub">Top prize {formatNaira(contest.rewards[0].amount)}</p>

        {step === 1 && (
          <div className="join-flow__body">
            <div className="join-flow__progress">
              <span className="join-flow__dot join-flow__dot--active" />
              <span className="join-flow__dot" />
            </div>
            <label className="join-flow__field">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Amara Okafor" />
            </label>
            <label className="join-flow__field">
              State
              <input value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Lagos, Nigeria" />
            </label>
            <label className="join-flow__field">
              Occupation
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g. Architect & Model"
              />
            </label>
            <button className="join-flow__next" disabled={!valid} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="join-flow__body">
            <div className="join-flow__progress">
              <span className="join-flow__dot join-flow__dot--active" />
              <span className="join-flow__dot join-flow__dot--active" />
            </div>
            <div className="join-flow__summary">
              <div>
                <strong>{name}</strong>
                <span>{state}</span>
                <span>{occupation}</span>
              </div>
              <div className="join-flow__summary-contest">
                <span>{contest.category}</span>
                <strong>{contest.title}</strong>
                <span className="join-flow__summary-time">
                  <Clock size={12} /> {fmtLeft(contest.endsAt)}
                </span>
              </div>
            </div>
            <div className="join-flow__rules">
              <CheckCircle2 size={14} /> Your profile goes live immediately
            </div>
            <div className="join-flow__rules">
              <CheckCircle2 size={14} /> Supporters can vote for you right away
            </div>
            <div className="join-flow__rules">
              <CheckCircle2 size={14} /> Rewards are paid out in naira at contest end
            </div>
            <button className="join-flow__next" onClick={onDone}>
              <Sparkles size={15} /> Confirm &amp; Join Contest
            </button>
            <button className="join-flow__backlink" onClick={() => setStep(1)}>
              Edit details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
