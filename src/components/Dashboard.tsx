import { type Contestant, type Contest, formatNaira } from "../data";
import { rosterOf } from "../lib/queries";
import {
  Swords,
  ChevronRight,
  Gift,
  LogIn,
  ExternalLink,
  Users,
  Vote,
  Trophy,
} from "lucide-react";
import "./Dashboard.css";

interface DashboardProps {
  onSelect: (contestant: Contestant) => void;
  /** All contests the user has joined — each gets a banner. */
  joinedContests: Contest[];
  onOpenContest: (contest: Contest) => void;
  contests: Contest[];
  /** Full contestant list (live data or seed) used to build each contest roster. */
  allContestants: Contestant[];
  onEarn: () => void;
  /** Opens the full "My Contests" screen listing every joined contest at once. */
  onSeeAllJoined?: () => void;
  /** Opens the sign-in overlay (shown on mobile in place of the Earn button). */
  onSignIn?: () => void;
  /** Opens the full contestant grid for a contest (AllContestants page). */
  onViewAllContestants?: (contestId: number) => void;
}

const medals = ["🥇", "🥈", "🥉"];


export default function Dashboard({ onSelect, joinedContests, onOpenContest, contests, allContestants, onEarn, onSignIn, onViewAllContestants, onSeeAllJoined }: DashboardProps) {
  const banners = joinedContests ?? [];
  // Show ONE joined-contest banner at a time — when the user has joined more
  // than one contest, a "View all" button (onSeeAllJoined) opens the full
  // My Contests screen instead of paginating banners and pushing content down.
  const banner = banners[0] ?? null;

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-row">
          <div>
            <h1 className="dashboard__title">Rivalry</h1>
            <p className="dashboard__subtitle">Season 1 — Vote for your queen</p>
          </div>
          {onSignIn ? (
            <button className="dashboard__signin" onClick={onSignIn}>
              <LogIn size={16} strokeWidth={2.1} />
              Sign in
            </button>
          ) : null}
          <button className="dashboard__earn" onClick={onEarn}>
            <Gift size={16} strokeWidth={2.1} />
            Earn
          </button>
        </div>
      </header>

      {/* ONE banner — when the user is in several contests a "See all"
          button opens the full My Contests screen (no pager). */}
      {banner && (
        <div className="joined-contest-banners">
          <button
            className="joined-contest-banner"
            onClick={() => onOpenContest(banner)}
          >
            <span className="joined-contest-banner__icon">
              <Swords size={18} />
            </span>
            <span className="joined-contest-banner__text">
              <strong>You're in: {banner.title}</strong>
              <span>Tap to view votes, rewards &amp; standings</span>
            </span>
            <ChevronRight size={18} />
          </button>
          {banners.length > 1 && (
            <button
              className="joined-contest-seeall"
              onClick={() => onSeeAllJoined?.()}
            >
              See all {banners.length} joined contest{banners.length === 1 ? "" : "s"}
              <ChevronRight size={13} strokeWidth={2.2} />
            </button>
          )}
        </div>
      )}

      {/* One preview block per contest — cover, standings & its own roster */}
      <section className="dashboard__section">
        <h2 className="dashboard__section-title">Contests</h2>
        <div className="dashboard__contest-list">
          {contests.map((contest) => {
            const roster = rosterOf(contest, allContestants);
            return (
              <div key={contest.id} className="home-contest">
                {/* The whole cover is a tap target — opens the contest */}
                <button
                  className="home-contest__cover"
                  onClick={() => onOpenContest(contest)}
                  aria-label={`Open ${contest.title}`}
                >
                  <img src={contest.coverImage} alt={contest.title} loading="lazy" />
                  <div className="home-contest__cover-overlay">
                    <span className={`contest-card__badge contest-card__badge--${contest.status}`}>
                      {contest.status === "voting-live"
                        ? "Voting Live"
                        : contest.status === "upcoming"
                          ? "Upcoming"
                          : "Ended"}
                    </span>
                    <h3 className="home-contest__title">{contest.title}</h3>
                    <p className="home-contest__tagline">{contest.tagline}</p>
                    <div className="home-contest__meta">
                      <span>
                        <Users size={12} /> {roster.length} contestants
                      </span>
                      <span>
                        <Vote size={12} /> {contest.totalVotes.toLocaleString()} votes
                      </span>
                      <span>
                        <Trophy size={12} /> {contest.rewards[0] ? formatNaira(contest.rewards[0].amount) : "—"}
                      </span>
                    </div>
                  </div>
                </button>

                <div className="home-contest__inner">
                  {/* Per-contest leaderboard (top 3) */}
                  <h4 className="home-contest__heading">
                    <Trophy size={13} /> Leaderboard
                  </h4>
                  <div className="home-contest__podium">
                    {roster.slice(0, 3).map((c, i) => (
                      <button
                        key={c.id}
                        className={`home-podium home-podium--${i + 1}`}
                        onClick={() => onSelect(c)}
                      >
                        <span className="home-podium__medal">{medals[i]}</span>
                        <img
                          className="home-podium__img"
                          src={c.heroImage}
                          alt={c.name}
                          loading="lazy"
                        />
                        <span className="home-podium__name">{c.name}</span>
                        <span className="home-podium__votes">{c.votes.toLocaleString()} votes</span>
                      </button>
                    ))}
                  </div>

                  {/* Per-contest contestants — former card-grid layout, summary only */}
                  <h4 className="home-contest__heading">
                    <Users size={13} /> Contestants
                  </h4>
                  <div className="dashboard__grid home-contest__grid">
                    {roster.slice(0, 4).map((c) => (
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
                            loading="lazy"
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

                  <div className="home-contest__actions">
                    <button
                      className="home-contest__view-all"
                      onClick={() =>
                        onViewAllContestants
                          ? onViewAllContestants(contest.id)
                          : onOpenContest(contest)
                      }
                    >
                      View all {roster.length} contestants
                      <ChevronRight size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      className="contest-preview__open home-contest__open"
                      onClick={() => onOpenContest(contest)}
                    >
                      <ExternalLink size={14} strokeWidth={2.1} />
                      Open contest
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
