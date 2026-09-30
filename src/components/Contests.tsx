import "./Contests.css";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { formatNaira, type Contest, type Contestant } from "../data";
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
  ImagePlus,
  Loader2,
  Crown,
  UserPlus,
  Check,
  Share2,
  Gift,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { getMyContestants, submitContestant, uploadImage } from "../lib/api";
import AuthOverlay from "../auth/AuthOverlay";

interface ContestsProps {
  contest: Contest | null;
  onOpen: (c: Contest) => void;
  onBack: () => void;
  onSelect: (id: number) => void;
  /** Backend ids of contests the logged-in user has entered. */
  joinedContestIds: string[];
  /** Called after a successful join so the app can refresh everywhere. */
  onJoined: () => void;
  allContestants: Contestant[];
  /** Live contests from the backend (falls back to seed data). */
  contests: Contest[];
  /** Navigate to app screens (e.g. all-contestants). */
  onNavigate: (screen: string, opts?: { contestId?: string | number }) => void;
  /** Opens the organiser dashboard (top-left icon button on the contest page). */
  onOpenDashboard?: () => void;
}

const fmtLeft = (endsAt: number) => {
  const ms = endsAt - Date.now();
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  if (ms <= 0) return "Ended";
  if (d > 0) return `${d}d ${h}h left`;
  return `${h}h left`;
};

/** At most this many contestants shown on the contest page before "View all". */
const ROSTER_PREVIEW = 10;

export default function Contests({
  contest,
  onOpen,
  onBack,
  onSelect,
  joinedContestIds,
  onJoined,
  allContestants,
  contests,
  onNavigate,
  onOpenDashboard,
}: ContestsProps) {
  const list = contests;
  if (contest)
    return (
      <ContestDetail
        contest={contest}
        onBack={onBack}
        onSelect={onSelect}
        joined={joinedContestIds.includes(contest.apiId ?? "__none__")}
        onJoined={onJoined}
        allContestants={allContestants}
        onNavigate={onNavigate}
        onOpenDashboard={onOpenDashboard}
      />
    );

  return (
    <main className="contests-page">
      <div className="contests-page__head">
        <div>
          <h1 className="contests-page__title">Contests</h1>
          <p className="contests-page__sub">
            Pick a contest, rally support, and win big.
          </p>
        </div>
      </div>
      <div className="contests-page__grid">
        {list.map((c) => (
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
              <span
                className={`contest-card__badge contest-card__badge--entry ${
                  c.entryFee ? "contest-card__badge--paid" : "contest-card__badge--free"
                }`}
              >
                {c.entryFee
                  ? `₦${c.entryFee.toLocaleString()} entry`
                  : "Free entry"}
              </span>
            </div>
            <div className="contest-card__body">
              <span className="contest-card__category">{c.category}</span>
              <h2 className="contest-card__title">{c.title}</h2>
              <p className="contest-card__tagline">{c.tagline}</p>
              <div className="contest-card__meta">
                <span>
                  <Users size={13} /> {(c.contestantApiIds?.length ?? c.contestantIds.length)} contestants
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

type ContestDetailProps = {
  contest: Contest;
  onBack: () => void;
  onSelect: (id: number) => void;
  joined: boolean;
  onJoined: () => void;
  allContestants: Contestant[];
  onNavigate: (
    screen: "all-contestants",
    opts: { contestId: number },
  ) => void;
  /** Opens the organiser dashboard (top-left icon button). */
  onOpenDashboard?: () => void;
};

function ContestDetail({
  contest,
  onBack,
  onSelect,
  joined,
  onJoined,
  allContestants,
  onNavigate,
  onOpenDashboard,
}: ContestDetailProps) {
  const [showJoin, setShowJoin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [referOpen, setReferOpen] = useState(false);
  const { user } = useAuth();
  // Live roster: when the contest knows its backend contestant ids, filter the
  // live contestant list by them; fall back to numeric-id matching for seed data.
  const list = (
    contest.contestantApiIds?.length
      ? allContestants.filter((c) =>
          c.apiId ? contest.contestantApiIds!.includes(c.apiId) : false,
        )
      : allContestants.filter((c) => contest.contestantIds.includes(c.id))
  ).sort((a, b) => b.votes - a.votes);
  // Search replaces pagination — type a name/number/state to narrow the list.
  const [query, setQuery] = useState("");
  useEffect(() => setQuery(""), [contest.id]);
  const q = query.trim().toLowerCase();
  const searched = q
    ? list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          String(c.number).includes(q) ||
          c.state.toLowerCase().includes(q) ||
          (c.occupation ?? "").toLowerCase().includes(q),
      )
    : list;
  // No pagination: show the first few ranked contestants, plus the
  // "View all" button for the complete grid.
  const rosterVisible = searched.slice(0, ROSTER_PREVIEW);

  return (
    <main className="contest-detail">
      <div className="contest-detail__topbar">
        <button className="contest-detail__back" onClick={onBack}>
          <ChevronLeft size={18} /> All Contests
        </button>
        {onOpenDashboard && (
          <button
            className="contest-detail__dashbtn"
            onClick={onOpenDashboard}
            aria-label="Organiser dashboard"
            title="Organiser dashboard"
          >
            <LayoutDashboard size={17} />
          </button>
        )}
      </div>

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
            <button className="join-banner" onClick={() => (user ? setShowJoin(true) : setShowAuth(true))}>
              <Sparkles size={14} /> Join this contest
            </button>
          )}
        </div>
        {/* Bouncing refer-a-friend button on the cover photo */}
        <button
          className="contest-detail__refer"
          aria-label="Refer a friend to this contest"
          title="Refer a friend to this contest"
          onClick={() => setReferOpen(true)}
        >
          <UserPlus size={17} />
          <span>Refer a Friend</span>
        </button>
      </div>

      {referOpen && (
        <ReferContestModal contest={contest} onClose={() => setReferOpen(false)} />
      )}

      {showAuth && (
        <AuthOverlay
          dismissible
          onDismiss={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}

      {showJoin && (
        <JoinFlow
          contest={contest}
          onClose={() => setShowJoin(false)}
          onDone={() => {
            onJoined();
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
            <strong>{list.length}</strong>
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
        <div className="contest-detail__search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${list.length} contestants…`}
          />
          {query && (
            <button
              className="contest-detail__search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <div className="contest-detail__roster">
          {rosterVisible.map((c) => (
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
          {searched.length === 0 && (
            <p className="contest-detail__search-empty">
              No contestant matches “{query}”.
            </p>
          )}
        </div>
        <button
          className="contest-detail__view-all"
          onClick={() =>
            onNavigate("all-contestants", { contestId: contest.id })
          }
        >
          <Users size={16} /> View all {list.length} contestant{list.length === 1 ? "" : "s"}
        </button>
      </section>
    </main>
  );
}

/** Share sheet for referring a friend to this specific contest.
 *
 * Fully wired into the referral system: when the visitor is signed in, the
 * shared link carries their `?ref={userId}` — anyone who signs up through it
 * is credited to them on the backend (invite flips to "Signed up", then the
 * ₦500 reward unlocks once the new contestant reaches 5 votes — see
 * maybeQualifyReferral in the vote controller). The invite is also recorded
 * here so it shows up in the Earn page immediately.
 */
function ReferContestModal({
  contest,
  onClose,
}: {
  contest: Contest;
  onClose: () => void;
}) {
  const { user } = useAuth();
  // The referral link goes through the OG landing page (/og/contest/:id) so
  // social apps (WhatsApp/X/Facebook) show the contest's cover image as the
  // link preview. The OG route preserves ?ref= and deep-links into the join
  // flow, so the referral is still attributed when the friend signs up.
  // Without a session the plain contest OG link is shared (no earning is
  // attributed).
  const ogBase = `${window.location.origin}/og/contest/${contest.apiId}`;
  const link = user?.id ? `${ogBase}?ref=${user.id}` : ogBase;
  const text = `Come join ${contest.title} with me on Rivalry! 🏆`;
  // NOTE: we intentionally do NOT record an invite when the link is merely
  // copied or shared — a referral is only recorded on the backend when the
  // friend actually registers through the link (register controller).

  // Official brand marks (inline SVG) with each network's real colors.
  const brandIcons: Record<string, { svg: JSX.Element; bg: string; color: string }> = {
    WhatsApp: {
      svg: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
      bg: "#25D366",
      color: "#fff",
    },
    "X / Twitter": {
      svg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      bg: "#000000",
      color: "#fff",
    },
    Facebook: {
      svg: (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      bg: "#1877F2",
      color: "#fff",
    },
    Telegram: {
      svg: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
      bg: "#26A5E4",
      color: "#fff",
    },
  };

  // Telegram caches link previews per-URL and never re-crawls a URL it has
  // already seen — even one whose first crawl timed out (common while the
  // backend cold-starts). The cache-buster forces a fresh crawl per share.
  const telegramBust = `${link}${link.includes("?") ? "&" : "?"}tg=${Date.now().toString(36)}`;
  const shareTargets = [
    {
      label: "WhatsApp",
      url: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
    },
    {
      label: "X / Twitter",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
    },
    {
      label: "Facebook",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    },
    {
      label: "Telegram",
      url: `https://t.me/share/url?url=${encodeURIComponent(telegramBust)}&text=${encodeURIComponent(text)}`,
    },
  ];

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: contest.title, text, url: link });
        onClose();
        return;
      } catch {
        /* user dismissed */
      }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      onClose();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="share-sheet__grabber" />
        <button
          className="share-sheet__dismiss"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={15} />
        </button>
        <div className="share-sheet__head">
          <span className="share-sheet__head-icon"><Gift size={22} /></span>
          <div>
            <h3>Refer a Friend, Earn ₦500</h3>
            <p>
              Invite friends to join <strong>{contest.title}</strong>.
              {user?.id
                ? " You earn ₦500 for every friend who signs up with your link and collects 5 votes."
                : " Sign in first so your referrals are credited to you."}
            </p>
          </div>
        </div>
        <ol className="share-sheet__steps">
          <li><span className="share-sheet__step-num">1</span><span><strong>Share your link</strong> with friends via WhatsApp, X or copy it below.</span></li>
          <li><span className="share-sheet__step-num">2</span><span><strong>They sign up</strong> and join a contest using your link.</span></li>
          <li><span className="share-sheet__step-num">3</span><span><strong>They collect 5 votes</strong> — ₦500 lands in your Rivalry Wallet.</span></li>
        </ol>
        {typeof navigator.share !== "undefined" && (
          <button className="share-sheet__native" onClick={nativeShare}>
            <Share2 size={16} /> Share via device…
          </button>
        )}
        <div className="share-sheet__targets">
          {shareTargets.map((t) => {
            const brand = brandIcons[t.label];
            return (
              <a
                key={t.label}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="share-sheet__target"
              >
                <span
                  className="share-sheet__target-icon"
                  style={{ background: brand.bg, color: brand.color, border: "none" }}
                >
                  {brand.svg}
                </span>
                {t.label}
              </a>
            );
          })}
        </div>
        <button className="share-sheet__copy" onClick={copy}>
          <Check size={15} /> Copy {user?.id ? "referral link" : "contest link"}
        </button>
        <button className="share-sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
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
  const { user } = useAuth();
  const [step, setStep] = useState(1); // 1 details · 2 images · 3 confirm
  const [name, setName] = useState(user?.fullName ?? "");
  const [state, setState] = useState("");
  const [occupation, setOccupation] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");

  // Images: picked from the user's existing gallery or uploaded from device
  const [cover, setCover] = useState<string | null>(null); // hero/cover photo
  const [gallery, setGallery] = useState<string[]>([]); // extra photos
  const [existing, setExisting] = useState<string[]>([]); // gallery in the app
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Load the user's existing photos (across all their contestant entries)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyContestants()
      .then((res) => {
        if (cancelled) return;
        const urls = res.contestants
          .flatMap((c) => [c.heroImage, ...(c.gallery ?? [])])
          .filter((u) => !!u);
        setExisting(Array.from(new Set(urls)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const valid =
    name.trim() && state.trim() && occupation.trim() && Number(age) > 0 && cover;

  const handleUpload = async (file: File) => {
    if (uploading) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image too large — max 2MB");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await uploadImage(dataUrl);
      setExisting((e) => [res.url, ...e]);
      if (!cover) setCover(res.url);
      else setGallery((g) => [...g, res.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleExtra = (url: string) => {
    setGallery((g) =>
      g.includes(url) ? g.filter((x) => x !== url) : [...g, url],
    );
  };

  const submitJoin = async () => {
    if (submitting || !valid || !contest.apiId) return;
    setSubmitting(true);
    setError("");
    try {
      await submitContestant(contest.apiId, {
        // `number` is globally unique in the DB — use a wide-range pick (with a
        // backend retry on collision) so joining multiple contests never fails.
        number: 100000 + Math.floor(Math.random() * 899999),
        name: name.trim(),
        state: state.trim(),
        age: Number(age) || 21,
        occupation: occupation.trim() || "Contestant",
        bio: bio.trim() || "New contestant on Rivalry — vote to push me to the top!",
        heroImage: cover,
        gallery: gallery,
        voteGoal: 25000,
        votingEndsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the contest");
      setSubmitting(false);
    }
  };

  const stepDots = (
    <div className="join-flow__progress">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`join-flow__dot${step >= n ? " join-flow__dot--active" : ""}`}
        />
      ))}
    </div>
  );

  return (
    <div className="join-flow__overlay" onClick={onClose}>
      <div className="join-flow" onClick={(e) => e.stopPropagation()}>
        <button className="join-flow__close" onClick={onClose}>
          <X size={16} />
        </button>

        <h2 className="join-flow__title">Join {contest.title}</h2>
        <p className="join-flow__sub">
          {contest.entryFee
            ? `Entry fee ₦${contest.entryFee.toLocaleString()} · Top prize ${formatNaira(contest.rewards[0].amount)}`
            : `Free to enter · Top prize ${formatNaira(contest.rewards[0].amount)}`}
        </p>

        {/* Step 1 — contestant details */}
        {step === 1 && (
          <div className="join-flow__body">
            {stepDots}
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
            <label className="join-flow__field">
              Age
              <input
                type="number"
                min={16}
                max={80}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 24"
              />
            </label>
            <label className="join-flow__field">
              Short bio (optional)
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell voters what you're about…"
              />
            </label>
            <button className="join-flow__next" disabled={!name.trim() || !state.trim() || !occupation.trim() || !Number(age)} onClick={() => setStep(2)}>
              Continue to photos
            </button>
          </div>
        )}

        {/* Step 2 — choose cover + gallery images */}
        {step === 2 && (
          <div className="join-flow__body">
            {stepDots}

            <p className="join-flow__label">Cover photo (your main image)</p>
            {cover ? (
              <div className="join-flow__cover-preview">
                <img src={cover} alt="Cover" />
                <button onClick={() => setCover(null)}>Change</button>
              </div>
            ) : (
              <p className="join-flow__hint">Pick one below or upload from your device.</p>
            )}

            <p className="join-flow__label">Your gallery in the app</p>
            {existing.length === 0 && !uploading && (
              <p className="join-flow__hint">
                No photos yet — upload one from your device below.
              </p>
            )}
            <div className="join-flow__photo-grid">
              {existing.map((url) => (
                <button
                  key={url.slice(-40)}
                  className={`join-flow__photo${cover === url ? " is-cover" : ""}${gallery.includes(url) ? " is-picked" : ""}`}
                  onClick={() => {
                    if (cover === url) {
                      setCover(null);
                    } else if (gallery.includes(url)) {
                      toggleExtra(url);
                    } else if (!cover) {
                      setCover(url);
                    } else {
                      toggleExtra(url);
                    }
                  }}
                >
                  <img src={url} alt="" loading="lazy" />
                  {cover === url && (
                    <span className="join-flow__photo-tag">
                      <Crown size={11} /> Cover
                    </span>
                  )}
                  {cover !== url && gallery.includes(url) && (
                    <span className="join-flow__photo-tag">
                      <CheckCircle2 size={11} /> Added
                    </span>
                  )}
                </button>
              ))}
              <button
                className="join-flow__photo join-flow__photo--add"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 size={20} className="join-flow__spin" /> : <ImagePlus size={20} />}
                <span>{uploading ? "Uploading…" : "Upload from device"}</span>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />

            {gallery.length > 0 && (
              <p className="join-flow__hint">
                {gallery.length} extra photo{gallery.length > 1 ? "s" : ""} will be added to your gallery.
              </p>
            )}

            {error && <p className="join-flow__error">{error}</p>}
            <button className="join-flow__next" disabled={!cover || uploading} onClick={() => setStep(3)}>
              Continue
            </button>
            <button className="join-flow__backlink" onClick={() => setStep(1)}>
              Edit details
            </button>
          </div>
        )}

        {/* Step 3 — confirm & join */}
        {step === 3 && (
          <div className="join-flow__body">
            {stepDots}
            <div className="join-flow__summary">
              <div>
                <strong>{name}</strong>
                <span>{state}</span>
                <span>{occupation} · {age} yrs</span>
              </div>
              {cover && <img className="join-flow__summary-img" src={cover} alt="" />}
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
            {error && <p className="join-flow__error">{error}</p>}
            <button className="join-flow__next" disabled={submitting} onClick={submitJoin}>
              {submitting ? (
                <>
                  <Loader2 size={15} className="join-flow__spin" /> Joining…
                </>
              ) : (
                <>
                  <Sparkles size={15} /> Confirm &amp; Join Contest
                </>
              )}
            </button>
            <button className="join-flow__backlink" onClick={() => setStep(2)}>
              Change photos
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
