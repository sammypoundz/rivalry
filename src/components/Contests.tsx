import "./Contests.css";
import { useEffect, useRef, useState } from "react";
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
      />
    );

  return (
    <main className="contests-page">
      <h1 className="contests-page__title">Contests</h1>
      <p className="contests-page__sub">
        Pick a contest, rally support, and win big.
      </p>
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
};

function ContestDetail({
  contest,
  onBack,
  onSelect,
  joined,
  onJoined,
  allContestants,
  onNavigate,
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
        <div className="contest-detail__roster">
          {list.slice(0, ROSTER_PREVIEW).map((c) => (
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
        {list.length > ROSTER_PREVIEW && (
          <button
            className="contest-detail__view-all"
            onClick={() =>
              onNavigate("all-contestants", { contestId: contest.id })
            }
          >
            <Users size={16} /> View all {list.length} contestants
          </button>
        )}
      </section>
    </main>
  );
}

/** Share sheet for referring a friend to this specific contest. */
function ReferContestModal({
  contest,
  onClose,
}: {
  contest: Contest;
  onClose: () => void;
}) {
  const link = `${window.location.origin}${window.location.pathname}#/contest/${contest.id}`;
  const text = `Come vote for me on Rivalry — ${contest.title}! 🏆`;

  const shareTargets = [
    {
      label: "WhatsApp",
      icon: "💬",
      url: `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`,
    },
    {
      label: "X / Twitter",
      icon: "𝕏",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`,
    },
    {
      label: "Facebook",
      icon: "f",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    },
    {
      label: "Telegram",
      icon: "✈️",
      url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
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
        <h3>Refer a Friend</h3>
        <p>Invite friends to discover and support {contest.title}.</p>
        {typeof navigator.share !== "undefined" && (
          <button className="share-sheet__native" onClick={nativeShare}>
            <Share2 size={16} /> Share via device…
          </button>
        )}
        <div className="share-sheet__targets">
          {shareTargets.map((t) => (
            <a
              key={t.label}
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="share-sheet__target"
            >
              <span className="share-sheet__target-icon">{t.icon}</span>
              {t.label}
            </a>
          ))}
        </div>
        <button className="share-sheet__copy" onClick={copy}>
          <Check size={15} /> Copy contest link
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
        <p className="join-flow__sub">Top prize {formatNaira(contest.rewards[0].amount)}</p>

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
