import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { listRecentVotes, type ApiRecentVote } from "../lib/api";
import {
  Vote,
  X,
  BellOff,
  Bell,
  ChevronRight,
  Clock,
  User,
  Hash,
  MapPin,
} from "lucide-react";
import "./VoteFeed.css";

interface VoteFeedProps {
  /** whether the feed may show on mobile (home page only) */
  mobileVisible?: boolean;
  /** Opens the contestant profile when a vote row / detail is tapped. */
  onOpenContestant?: (apiId: string) => void;
}

const WINDOW_DESKTOP = 3; // votes shown at once (tablet + desktop panel)
const WINDOW_MOBILE = 1; // mobile shows ONE toast at a time
/** Slow rotation — fast cycling read like the page was "reloading". */
const ROTATE_MS = 6000;
/** How often the feed re-syncs with the backend (realtime-ish). */
const LIVE_POLL_MS = 10_000;

const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/** Counts the value UP to `target` with a short stepped animation — used for
    the snoozed vote counter so new votes visibly tick the number upward. */
function useCountUp(target: number) {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = target;
    if (target <= from) {
      setDisplay(target);
      return;
    }
    const steps = 14;
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setDisplay(Math.round(from + ((target - from) * i) / steps));
      if (i >= steps) {
        setDisplay(target);
        window.clearInterval(t);
      }
    }, 40);
    return () => window.clearInterval(t);
  }, [target]);
  return display;
}

const voterLabel = (v: ApiRecentVote) => v.supporterName || "Someone";

/**
 * Live votes feed — driven by REAL Vote records from the backend
 * (GET /api/votes/recent, polled every few seconds). The feed rotates
 * through the votes one row at a time; when it has shown them all and
 * there are no new ones, it starts afresh from the top.
 *
 * Every row is clickable and opens a vote-details popup. The popup has a
 * Snooze option: the feed collapses into a small floating pill that shows
 * only a bell icon + the total votes seen; tapping it unsnoozes and the
 * rotation resumes.
 */
export default function VoteFeed({
  mobileVisible = true,
  onOpenContestant,
}: VoteFeedProps) {
  const { data } = useQuery({
    queryKey: ["recent-votes"],
    queryFn: () => listRecentVotes(),
    // Shorter staleness + faster interval so votes cast by OTHER people land
    // in the feed almost immediately — it behaves realtime.
    staleTime: 2_000,
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: true,
  });
  const votes = data?.votes ?? [];

  // Mobile shows one toast at a time, the desktop panel shows a few.
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const WINDOW = isMobile ? WINDOW_MOBILE : WINDOW_DESKTOP;

  const [start, setStart] = useState(0);
  const [snoozed, setSnoozed] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Rotate the visible window; wrapping around means "start afresh" once all
  // current votes have been shown and nothing new has arrived. Paused while
  // the details popup is open so the list doesn't churn underneath it.
  useEffect(() => {
    if (snoozed || detailId || votes.length === 0) return;
    const t = window.setInterval(
      () => setStart((s) => (s + 1 >= votes.length ? 0 : s + 1)),
      ROTATE_MS,
    );
    return () => window.clearInterval(t);
  }, [snoozed, detailId, votes.length]);

  // Keep the window in range if the list shrinks between refetches.
  useEffect(() => {
    if (start >= votes.length) setStart(0);
  }, [votes.length, start]);

  const visibleVotes = votes.slice(start, start + WINDOW);
  const totalSeen = votes.reduce((sum, v) => sum + v.amount, 0);
  const detail = votes.find((v) => v.id === detailId) ?? null;

  // The feed is visible when the home page rules allow it on MOBILE, and
  // ALWAYS on desktop/tablet — the side panel is part of the desktop layout
  // and must not disappear just because the user left the home page.
  const feedVisible = mobileVisible || !isMobile;

  // Close the details popup on Escape — keeps the feed non-intrusive.
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  // Hiding the feed (mobile, away from home) closes the details popup with
  // it, otherwise returning home reopens a stale popup.
  useEffect(() => {
    if (!feedVisible) setDetailId(null);
  }, [feedVisible]);

  // Snoozed is the only way to silence the feed (per product decision —
  // there is no separate "close notifications" button).
  const counted = useCountUp(totalSeen);

  // Mobile: the snoozed pill must sit JUST BENEATH the sticky joined-contest
  // block (banner + optional "See all …" button) when the page is scrolled —
  // and back at the top when the page is not scrolled. The block's height
  // varies, so measure it live and expose CSS variables:
  //   --snooze-top  → pill's `top`
  //   --detail-top  → vote-details popup's top padding (card starts below the
  //                   stuck banner, same layering as the pill)
  useEffect(() => {
    if (!isMobile) return;
    const update = () => {
      const el = document.querySelector(".joined-contest-banners");
      const root = document.documentElement.style;
      const r = el?.getBoundingClientRect();
      const stuck = r && r.top <= 0 && r.height > 0;
      root.setProperty("--snooze-top", stuck ? `${Math.round(r.bottom) + 14}px` : "12px");
      root.setProperty("--detail-top", stuck ? `${Math.round(r.bottom)}px` : "0px");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [isMobile]);

  // ---- Snoozed: tiny pill with bell icon + animated votes counter ----
  if (snoozed) {
    return (
      <button
        className={`vote-feed__snooze${feedVisible ? "" : " vote-feed--mobile-hidden"}`}
        onClick={() => setSnoozed(false)}
        title="Show live votes"
      >
        <Bell size={14} />
        <span key={totalSeen} className="vote-feed__snooze-count">
          {counted.toLocaleString()} votes
        </span>
      </button>
    );
  }


  return (
    <aside
      className={`vote-feed${feedVisible ? "" : " vote-feed--mobile-hidden"}`}
    >
      <section className="vote-feed__section">
        <div className="vote-feed__controls">
          <button
            className="vote-feed__snooze-btn"
            aria-label="Snooze live votes"
            title="Snooze — collapse to counter"
            onClick={() => setSnoozed(true)}
          >
            <BellOff size={13} />
          </button>
        </div>
        <h2 className="vote-feed__heading">
          <Vote size={14} /> Live Votes
          <span className="vote-feed__pulse" />
        </h2>
        <div className="vote-feed__list">
          {visibleVotes.map((v) => (
            <button
              key={v.id}
              className="vote-feed__row"
              onClick={() => setDetailId(v.id)}
              title="Tap for vote details"
            >
              <img
                src={v.contestant.heroImage}
                alt={v.contestant.name}
                loading="lazy"
              />
              <div className="vote-feed__info">
                <strong>
                  {voterLabel(v)} voted for {v.contestant.name}
                </strong>
                <span>
                  #{v.contestant.number} · {timeAgo(v.createdAt)}
                </span>
              </div>
              <span className="vote-feed__count">+{v.amount}</span>
              <ChevronRight size={13} className="vote-feed__chev" />
            </button>
          ))}
          {votes.length === 0 && (
            <p className="vote-feed__empty">Waiting for votes…</p>
          )}
        </div>
      </section>

      {/* ---- Vote details popup ----
          Rendered through a portal to <body>: the feed panel is a fixed
          narrow side column (transform/filter-free but a 260px box), and a
          popup nested inside it is squeezed into that width instead of
          covering the viewport. Portalling escapes the panel so the modal
          is full-width responsive on desktop too. */}
      {detail &&
        createPortal(
          <div
            className="vote-detail"
            role="dialog"
            aria-modal="true"
            onClick={() => setDetailId(null)}
          >
          <div
            className="vote-detail__card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="vote-detail__controls">
              <button
                className="vote-detail__snooze"
                onClick={() => {
                  setDetailId(null);
                  setSnoozed(true);
                }}
              >
                <BellOff size={13} /> <span>Snooze feed</span>
              </button>
              <button
                className="vote-detail__close"
                aria-label="Close"
                onClick={() => setDetailId(null)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="vote-detail__vote">
              <span className="vote-detail__amount">+{detail.amount}</span>
              <div className="vote-detail__votemeta">
                <strong>
                  <User size={12} /> {voterLabel(detail)}
                </strong>
                <span>
                  <Clock size={11} /> {timeAgo(detail.createdAt)} ·{" "}
                  {new Date(detail.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Contestant summary — tap to open their voting profile */}
            <button
              className="vote-detail__contestant"
              onClick={() => {
                setDetailId(null);
                onOpenContestant?.(detail.contestant.id);
              }}
            >
              <img
                src={detail.contestant.heroImage}
                alt={detail.contestant.name}
                loading="lazy"
              />
              <div className="vote-detail__cinfo">
                <strong>
                  <Hash size={11} />
                  {detail.contestant.number} {detail.contestant.name}
                </strong>
                <span>
                  <MapPin size={11} /> {detail.contestant.state} ·{" "}
                  {detail.contestant.occupation}
                </span>
                <em>{detail.contestant.votes.toLocaleString()} total votes</em>
              </div>
              <ChevronRight size={16} />
            </button>
            <p className="vote-detail__hint">
              Tap the contestant to open their profile
            </p>
            {/* Mobile: the close button lives at the END (bottom) of the modal
                — the top controls row only holds Snooze on small screens. */}
            <button
              className="vote-detail__close-bottom"
              onClick={() => setDetailId(null)}
            >
              Close
            </button>
          </div>
        </div>,
      document.body,
      )}
    </aside>
  );
}
