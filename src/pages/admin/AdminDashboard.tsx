import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Crown,
  Swords,
  Vote,
  Wallet,
  UserCheck,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Search,
  Hourglass,
  LogOut,
  Trophy,
  Eye,
  X,
} from "lucide-react";
import {
  adminStats,
  adminUsers,
  adminSetRole,
  adminApplications,
  adminReviewApplication,
  adminContests,
  adminContest,
  adminUpdateContest,
  adminDeleteContest,
  type AdminUser,
  type AdminContest,
  type AdminStats,
  type OrganiserApplication,
} from "../../lib/api";
import { useAuth } from "../../auth/AuthProvider";
import AuthOverlay from "../../auth/AuthOverlay";
import { qk } from "../../lib/queries";
import AdminSkeleton from "./AdminSkeleton";
import "./AdminDashboard.css";

const naira = (n: number) => `₦${(n ?? 0).toLocaleString()}`;
const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n ?? 0);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const fmtLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  return d > 0 ? `${d}d left` : "Ending soon";
};

type Tab = "overview" | "users" | "contests";

/** Rows fetched per page/request in both list modes. */
const PER_PAGE = 10;

/**
 * Shared paged/infinite list query. Always uses useInfiniteQuery so switching
 * between the two modes (and the search/role filters) never refetches pages
 * that are already in cache: "pages" mode shows one window of items with
 * Prev/Next buttons, "infinite" mode appends pages as the sentinel scrolls
 * into view.
 */
function useAdminList<T extends { total: number }>(
  key: unknown[],
  fetcher: (opts: { offset: number; limit: number }) => Promise<T>,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) =>
      fetcher({ offset: Number(pageParam) || 0, limit: PER_PAGE }),
    initialPageParam: 0,
    enabled,
    staleTime: 10_000,
    getNextPageParam: (last, pages) => {
      const fetched = pages.length * PER_PAGE;
      return fetched < last.total ? fetched : undefined;
    },
  });
}

/**
 * Pagination / infinite-scroll control + rendering for a table. Pass the
 * flattened item list and a render prop; this decides WHICH items are shown
 * (a single page or everything loaded so far) and renders the toggle, pager
 * buttons and the scroll sentinel that pulls the next page in.
 */
function ListControls({
  items,
  total,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  children,
}: {
  items: unknown[];
  total: number;
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  children: (visible: unknown[]) => React.ReactNode;
}) {
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  // The list is ALWAYS rendered as one continuous scroll. Each "page" is a
  // section of PER_PAGE rows inside the same flow, so pages only exist as
  // scroll landmarks — not as windows that hide the rest of the data.
  // Items are de-duplicated by id first: the server orders by non-unique
  // keys (votes, dates), so consecutive offset windows can overlap and the
  // same row would otherwise appear on two consecutive "pages".
  const seenIds = new Set<string>();
  const unique: unknown[] = [];
  for (const it of items) {
    const id = (it as { id?: string } | null)?.id;
    if (id == null) {
      unique.push(it);
    } else if (!seenIds.has(id)) {
      seenIds.add(id);
      unique.push(it);
    }
  }
  const loadedPages = Math.max(1, Math.ceil(unique.length / PER_PAGE));
  const chunks: unknown[][] = [];
  for (let i = 0; i < unique.length; i += PER_PAGE) {
    chunks.push(unique.slice(i, i + PER_PAGE));
  }

  // Scroll spy: whichever page-section the viewport is currently in becomes
  // the active page number in the rail.
  const [activePage, setActivePage] = useState(0);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement | null>(null);
  const scrollingToRef = useRef(false);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (chunks.length === 0) return;
    const groups = groupRefs.current.slice(0, chunks.length);
    if (groups.some((g) => !g)) return;
    const io = new IntersectionObserver(
      () => {
        if (scrollingToRef.current) return;
        // Pick the section whose top is closest above the viewport top edge.
        let best = 0;
        let bestTop = -Infinity;
        for (let i = 0; i < groups.length; i++) {
          const top = groups[i]!.getBoundingClientRect().top;
          if (top <= 140 && top > bestTop) {
            bestTop = top;
            best = i;
          }
        }
        setActivePage(best);
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 },
    );
    groups.forEach((g) => g && io.observe(g));
    return () => io.disconnect();
  }, [chunks.length]);

  // Keep the active number visible inside the rail (handles many pages).
  useEffect(() => {
    railRef.current
      ?.querySelector(".admindash__pager-num--active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activePage]);

  // Infinite scroll: when the LAST loaded page-section scrolls into view,
  // pull the next page and it seamlessly continues the same flow. The ref
  // guard keeps a fast scroll from firing fetchNextPage twice in a row
  // (React state updates lag one frame behind the observer callback).
  useEffect(() => {
    if (!hasNextPage) return;
    const el = groupRefs.current[chunks.length - 1];
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((e) => e.isIntersecting) &&
          !fetchingRef.current &&
          !isFetchingNextPage
        ) {
          fetchingRef.current = true;
          fetchNextPage();
          window.setTimeout(() => {
            fetchingRef.current = false;
          }, 800);
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, chunks.length]);

  const scrollToPage = (p: number) => {
    const el = groupRefs.current[p];
    if (!el) {
      // Not loaded yet (beyond the fetched window) — nothing to scroll to.
      return;
    }
    scrollingToRef.current = true;
    setActivePage(p);
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      scrollingToRef.current = false;
    }, 700);
  };

  const rail = (
    <nav
      className="admindash__pager-rail"
      ref={railRef}
      role="navigation"
      aria-label="Page navigation"
    >
      {Array.from({ length: pageCount }, (_, p) =>
        p < loadedPages ? (
          <button
            key={p}
            className={
              p === activePage
                ? "admindash__pager-num admindash__pager-num--active"
                : "admindash__pager-num"
            }
            onClick={() => scrollToPage(p)}
            aria-label={`Go to page ${p + 1}`}
            aria-current={p === activePage ? "true" : undefined}
          >
            {p + 1}
          </button>
        ) : (
          <span
            key={p}
            className="admindash__pager-num admindash__pager-num--more"
            title="Keep scrolling to load more"
          >
            {p + 1}
          </span>
        ),
      )}
    </nav>
  );

  return (
    <div className="admindash__list-layout">
      {pageCount > 1 && rail}
      <div className="admindash__list-main">
        <div className="admindash__table-toolbar">
          <span className="admindash__pager-label">
            Page {Math.min(activePage + 1, loadedPages)} of {pageCount} ·{" "}
            {total.toLocaleString()} total
          </span>
        </div>
        {chunks.length === 0
          ? children([])
          : chunks.map((chunk, p) => (
              <div
                key={p}
                className="admindash__page-group"
                data-page={p + 1}
                ref={(el) => {
                  groupRefs.current[p] = el;
                }}
              >
                {children(chunk)}
              </div>
            ))}
        {isFetchingNextPage && (
          <div className="admindash__loading admindash__loading--inline">
            <Loader2 size={18} className="admindash__spin" /> Loading more…
          </div>
        )}
        {!hasNextPage && items.length > 0 && (
          <p className="admindash__end-note">
            All {total.toLocaleString()} loaded
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * KPI strip — live platform numbers against the Year-1 targets, so an admin
 * can see at a glance where the platform stands on its growth plan.
 */
function KpiStrip({ stats }: { stats: AdminStats }) {
  const kpis: {
    label: string;
    value: string;
    target: string;
    icon: JSX.Element;
  }[] = [
    {
      label: "Registered users",
      value: stats.users.toLocaleString(),
      target: "Y1: 50k–100k",
      icon: <Users size={15} />,
    },
    {
      label: "Organisers",
      value: stats.organisers.toLocaleString(),
      target: "Y1: 200–500",
      icon: <Crown size={15} />,
    },
    {
      label: "Contests created",
      value: stats.contests.toLocaleString(),
      target: "Y1: 500–1,500",
      icon: <Swords size={15} />,
    },
    {
      label: "Active contestants",
      value: stats.contestants.toLocaleString(),
      target: "Y1: 10k+",
      icon: <UserCheck size={15} />,
    },
    {
      label: "Voters (30d)",
      value: compact(stats.votersThisMonth),
      target: "Y1: 10k–25k /mo",
      icon: <Vote size={15} />,
    },
    {
      label: "Voting volume (30d)",
      value: naira(stats.votingVolume),
      target: "Y1: ₦10m–₦50m /mo",
      icon: <Wallet size={15} />,
    },
    {
      label: "Entry volume (30d)",
      value: naira(stats.entryVolume),
      target: "Entry fees collected",
      icon: <Wallet size={15} />,
    },
    {
      label: "Live contests",
      value: `${stats.liveContests}`,
      target: `of ${stats.contests} total`,
      icon: <Swords size={15} />,
    },
  ];
  return (
    <section className="admindash__kpis">
      {kpis.map((k) => (
        <div key={k.label} className="admindash__kpi">
          <strong>{k.value}</strong>
          <span className="admindash__kpi-label">
            {k.icon} {k.label}
          </span>
          <small>{k.target}</small>
        </div>
      ))}
    </section>
  );
}

/** Users directory: search, filter by role, promote/demote with one tap. */
function UsersTable({ query }: { query: string }) {
  const [roleFilter, setRoleFilter] = useState("");
  const list = useAdminList(
    ["admin-users", query, roleFilter],
    ({ offset, limit }) =>
      adminUsers({ query, role: roleFilter, limit, offset }),
  );
  const users: AdminUser[] = useMemo(
    () => list.data?.pages.flatMap((p) => p.users) ?? [],
    [list.data],
  );
  const total = list.data?.pages[0]?.total ?? 0;

  const changeRole = async (u: AdminUser, role: string) => {
    if (u.role === role) return;
    try {
      await adminSetRole(u.id, role);
      await list.refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not update the role");
    }
  };

  return (
    <div className="admindash__table-card">
      <div className="admindash__table-toolbar admindash__table-toolbar--split">
        <div className="admindash__role-filter">
          {["", "user", "organiser", "admin"].map((r) => (
            <button
              key={r || "all"}
              className={
                roleFilter === r
                  ? "admindash__filter-btn admindash__filter-btn--active"
                  : "admindash__filter-btn"
              }
              onClick={() => setRoleFilter(r)}
            >
              {r || "All"}
            </button>
          ))}
        </div>
        {list.isFetching && (
          <Loader2 size={15} className="admindash__spin" />
        )}
      </div>
      {list.isLoading ? (
        <div className="admindash__loading">
          <Loader2 size={22} className="admindash__spin" />
        </div>
      ) : users.length === 0 ? (
        <p className="admindash__empty">No users match this filter.</p>
      ) : (
        <ListControls
          items={users}
          total={total}
          hasNextPage={list.hasNextPage}
          fetchNextPage={() => void list.fetchNextPage()}
          isFetchingNextPage={list.isFetchingNextPage}
        >
          {(visible) => (
            <ul className="admindash__rows">
              {(visible as AdminUser[]).map((u) => (
                <li key={u.id} className="admindash__row admindash__user-row">
                  <div className="admindash__user-main">
                    <strong>{u.fullName}</strong>
                    <small>{u.email ?? u.phone ?? "—"}</small>
                  </div>
                  <span className="admindash__user-date">
                    {fmtDate(u.createdAt)}
                  </span>
                  <span
                    className={`admindash__badge admindash__badge--${u.role}`}
                  >
                    {u.role}
                  </span>
                  <div className="admindash__user-actions">
                    {["user", "organiser", "admin"].map((r) => (
                      <button
                        key={r}
                        className={
                          u.role === r
                            ? "admindash__role-btn admindash__role-btn--active"
                            : "admindash__role-btn"
                        }
                        onClick={() => changeRole(u, r)}
                        title={`Set role to ${r}`}
                      >
                        {r === "admin"
                          ? "Admin"
                          : r === "organiser"
                            ? "Organiser"
                            : "User"}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ListControls>
      )}
    </div>
  );
}

/** Contest detail — opened by clicking a row; fetches the full roster. */
function ContestDetailModal({
  contestId,
  onClose,
}: {
  contestId: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-contest", contestId],
    queryFn: () => adminContest(contestId),
    staleTime: 10_000,
  });
  const c = data?.contest;

  return (
    <div className="admindash__modal" onClick={onClose}>
      <div
        className="admindash__modal-card admindash__detail-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="admindash__detail-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
        {isLoading ? (
          <div className="admindash__loading">
            <Loader2 size={22} className="admindash__spin" />
          </div>
        ) : error || !c ? (
          <p className="admindash__error">
            {error instanceof Error ? error.message : "Could not load contest"}
          </p>
        ) : (
          <>
            <div className="admindash__detail-hero">
              <img src={c.coverImage} alt="" loading="lazy" />
              <span
                className={`admindash__badge admindash__badge--${c.status}`}
              >
                {c.status === "voting-live"
                  ? "Live"
                  : c.status === "upcoming"
                    ? "Upcoming"
                    : "Ended"}
              </span>
            </div>
            <h3>{c.title}</h3>
            <p className="admindash__detail-tagline">{c.tagline}</p>
            <div className="admindash__detail-grid">
              <div>
                <small>Organiser</small>
                <strong>
                  {c.organiser ? c.organiser.fullName : "— (platform)"}
                </strong>
              </div>
              <div>
                <small>Category</small>
                <strong>{c.category}</strong>
              </div>
              <div>
                <small>Starts</small>
                <strong>{c.startsAt ? fmtDate(c.startsAt) : "—"}</strong>
              </div>
              <div>
                <small>Ends</small>
                <strong>{fmtDate(c.endsAt)}</strong>
              </div>
              <div>
                <small>Votes</small>
                <strong>{c.totalVotes.toLocaleString()}</strong>
              </div>
              <div>
                <small>Contestants</small>
                <strong>{c.contestantCount}</strong>
              </div>
              <div>
                <small>Vote price</small>
                <strong>{naira(c.votePrice ?? 0)}</strong>
              </div>
              <div>
                <small>Entry fee</small>
                <strong>{c.entryFee ? naira(c.entryFee) : "Free"}</strong>
              </div>
              <div>
                <small>Vote revenue</small>
                <strong>{naira(c.voteRevenue)}</strong>
              </div>
              <div>
                <small>Entry revenue</small>
                <strong>{naira(c.entryRevenue)}</strong>
              </div>
            </div>
            {c.rewards.length > 0 && (
              <div className="admindash__detail-rewards">
                <h4>
                  <Trophy size={13} /> Rewards
                </h4>
                <ul>
                  {c.rewards.map((r) => (
                    <li key={r.position}>
                      <span>{r.position}</span>
                      <strong>{naira(r.amount)}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="admindash__detail-roster">
              <h4>Contestants ({c.contestantCount})</h4>
              {c.contestants.length === 0 ? (
                <p className="admindash__empty">No contestants yet.</p>
              ) : (
                <ul>
                  {c.contestants.map((ct, i) => (
                    <li key={ct.id}>
                      <span className="admindash__detail-rank">#{i + 1}</span>
                      <img src={ct.heroImage} alt="" loading="lazy" />
                      <div className="admindash__user-main">
                        <strong>{ct.name}</strong>
                        <small>{ct.state || `No. ${ct.number}`}</small>
                      </div>
                      <span className="admindash__detail-votes">
                        <Vote size={12} /> {ct.votes.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Contests moderation: pagination, clickable rows, edit & delete. */
function ContestsTable({ query }: { query: string }) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<AdminContest | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: "",
    votePrice: "",
    entryFee: "",
    status: "",
  });
  const [deleting, setDeleting] = useState<AdminContest | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const list = useAdminList(
    ["admin-contests", statusFilter],
    ({ offset, limit }) => adminContests({ status: statusFilter, limit, offset }),
  );
  const all: AdminContest[] = useMemo(
    () => list.data?.pages.flatMap((p) => p.contests) ?? [],
    [list.data],
  );
  const total = list.data?.pages[0]?.total ?? 0;
  const contests = useMemo(() => {
    // Client-side search within the loaded rows (server-side pages stay stable).
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.organiser?.fullName ?? "").toLowerCase().includes(q) ||
        (c.organiser?.email ?? "").toLowerCase().includes(q),
    );
  }, [all, query]);

  const openEdit = (c: AdminContest) => {
    setEditing(c);
    setEditDraft({
      title: c.title,
      votePrice: String(c.votePrice ?? ""),
      entryFee: String(c.entryFee ?? ""),
      status: c.status,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await adminUpdateContest(editing.id, {
        title: editDraft.title.trim(),
        votePrice: Number(editDraft.votePrice) || 0,
        entryFee: Number(editDraft.entryFee) || 0,
        status: editDraft.status,
      });
      setEditing(null);
      await list.refetch();
      await queryClient.invalidateQueries({ queryKey: qk.contests });
      await queryClient.invalidateQueries({ queryKey: ["admin-contest", editing.id] });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not update the contest",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await adminDeleteContest(deleting.id);
      setDeleting(null);
      await list.refetch();
      await queryClient.invalidateQueries({ queryKey: qk.contests });
      await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not delete the contest",
      );
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admindash__table-card">
      <div className="admindash__table-toolbar admindash__table-toolbar--split">
        <div className="admindash__role-filter">
          {["", "voting-live", "upcoming", "ended"].map((s) => (
            <button
              key={s || "all"}
              className={
                statusFilter === s
                  ? "admindash__filter-btn admindash__filter-btn--active"
                  : "admindash__filter-btn"
              }
              onClick={() => setStatusFilter(s)}
            >
              {s === "voting-live"
                ? "Live"
                : s === "upcoming"
                  ? "Upcoming"
                  : s === "ended"
                    ? "Ended"
                    : "All"}
            </button>
          ))}
        </div>
      </div>
      {list.isLoading ? (
        <div className="admindash__loading">
          <Loader2 size={22} className="admindash__spin" />
        </div>
      ) : contests.length === 0 ? (
        <p className="admindash__empty">No contests match this filter.</p>
      ) : (
        <ListControls
          items={contests}
          total={total}
          hasNextPage={list.hasNextPage}
          fetchNextPage={() => void list.fetchNextPage()}
          isFetchingNextPage={list.isFetchingNextPage}
        >
          {(visible) => (
            <ul className="admindash__rows">
              {(visible as AdminContest[]).map((c) => (
                <li
                  key={c.id}
                  className="admindash__row admindash__contest-row admindash__row--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailId(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setDetailId(c.id);
                  }}
                  aria-label={`View details of ${c.title}`}
                >
                  <img
                    className="admindash__contest-cover"
                    src={c.coverImage}
                    alt=""
                    loading="lazy"
                  />
                  <div className="admindash__user-main">
                    <strong>{c.title}</strong>
                    <small>
                      {c.organiser ? `${c.organiser.fullName} · ` : ""}
                      {c.contestantCount} contestants ·{" "}
                      {c.totalVotes.toLocaleString()} votes
                    </small>
                  </div>
                  <span className="admindash__user-date">
                    {fmtLeft(c.endsAt)}
                  </span>
                  <span
                    className={`admindash__badge admindash__badge--${c.status}`}
                  >
                    {c.status === "voting-live"
                      ? "Live"
                      : c.status === "upcoming"
                        ? "Upcoming"
                        : "Ended"}
                  </span>
                  <span className="admindash__row-eye" title="View details">
                    <Eye size={14} />
                  </span>
                  <div
                    className="admindash__user-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="admindash__role-btn"
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      className="admindash__role-btn admindash__role-btn--danger"
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ListControls>
      )}

      {detailId && (
        <ContestDetailModal
          contestId={detailId}
          onClose={() => setDetailId(null)}
        />
      )}

      {editing && (
        <div className="admindash__modal" onClick={() => setEditing(null)}>
          <div
            className="admindash__modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Edit contest</h3>
            <label className="admindash__field">
              Title
              <input
                value={editDraft.title}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, title: e.target.value }))
                }
              />
            </label>
            <div className="admindash__field-row">
              <label className="admindash__field">
                Vote price (₦)
                <input
                  type="number"
                  min={0}
                  value={editDraft.votePrice}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, votePrice: e.target.value }))
                  }
                />
              </label>
              <label className="admindash__field">
                Entry fee (₦)
                <input
                  type="number"
                  min={0}
                  value={editDraft.entryFee}
                  onChange={(e) =>
                    setEditDraft((d) => ({ ...d, entryFee: e.target.value }))
                  }
                />
              </label>
            </div>
            <label className="admindash__field">
              Status
              <select
                value={editDraft.status}
                onChange={(e) =>
                  setEditDraft((d) => ({ ...d, status: e.target.value }))
                }
              >
                <option value="voting-live">Voting live</option>
                <option value="upcoming">Upcoming</option>
                <option value="ended">Ended</option>
              </select>
            </label>
            <div className="admindash__modal-actions">
              <button
                className="admindash__modal-cancel"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="admindash__modal-confirm"
                onClick={saveEdit}
                disabled={busy}
              >
                {busy && <Loader2 size={14} className="admindash__spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="admindash__modal" onClick={() => setDeleting(null)}>
          <div
            className="admindash__modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete this contest?</h3>
            <p>
              "{deleting.title}" and its roster will be removed permanently.
              This cannot be undone.
            </p>
            <div className="admindash__modal-actions">
              <button
                className="admindash__modal-cancel"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                className="admindash__modal-confirm admindash__modal-confirm--danger"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 size={14} className="admindash__spin" />
                ) : (
                  <Trash2 size={14} />
                )}{" "}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Organiser applications: approve grants the organiser role, reject denies. */
function ApplicationsList() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-applications", statusFilter],
    queryFn: () => adminApplications(statusFilter),
    staleTime: 5_000,
  });
  const applications: OrganiserApplication[] = data?.applications ?? [];

  const review = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      await adminReviewApplication(id, action);
      await refetch();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Could not review the application",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admindash__table-card">
      <div className="admindash__table-toolbar">
        <div className="admindash__role-filter">
          {["pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              className={
                statusFilter === s
                  ? "admindash__filter-btn admindash__filter-btn--active"
                  : "admindash__filter-btn"
              }
              onClick={() => setStatusFilter(s)}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="admindash__loading">
          <Loader2 size={22} className="admindash__spin" />
        </div>
      ) : applications.length === 0 ? (
        <p className="admindash__empty">No {statusFilter} applications.</p>
      ) : (
        <ul className="admindash__rows">
          {applications.map((a) => (
            <li key={a.id} className="admindash__row admindash__app-row">
              <div className="admindash__user-main">
                <strong>{a.fullName}</strong>
                <small>
                  {a.email} · {a.phone}
                </small>
                {a.reason && (
                  <p className="admindash__app-reason">“{a.reason}”</p>
                )}
              </div>
              <span className="admindash__user-date">
                {fmtDate(a.createdAt)}
              </span>
              <span
                className={`admindash__badge admindash__badge--${a.status}`}
              >
                {a.status}
              </span>
              {a.status === "pending" && (
                <div className="admindash__user-actions">
                  <button
                    className="admindash__role-btn admindash__role-btn--approve"
                    onClick={() => review(a.id, "approve")}
                    disabled={busyId === a.id}
                  >
                    {busyId === a.id ? (
                      <Loader2 size={13} className="admindash__spin" />
                    ) : (
                      <ShieldCheck size={13} />
                    )}{" "}
                    Approve
                  </button>
                  <button
                    className="admindash__role-btn admindash__role-btn--danger"
                    onClick={() => review(a.id, "reject")}
                    disabled={busyId === a.id}
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");

  const isAdmin = user?.role === "admin";

  const statsQuery = useQuery({
    queryKey: ["admin-stats"],
    queryFn: adminStats,
    enabled: !!isAdmin,
    staleTime: 15_000,
  });

  if (!isAdmin) {
    return (
      <div className="admindash app">
        <header className="admindash__header">
          <div>
            <h1 className="admindash__title">Admin Dashboard</h1>
            <p className="admindash__sub">Platform overview and moderation</p>
          </div>
        </header>
        <div className="admindash__gate">
          <ShieldCheck size={22} />
          <div>
            <h2>Admins only</h2>
            <p>
              This dashboard is restricted to Rivalry administrators. Please
              sign in with an admin account, or contact the platform owner if
              you should have access.
            </p>
          </div>
        </div>
        {/* The admin route is a standalone screen — it has no bottom nav or
            login wall, so the sign-in overlay is offered right here. */}
        <AuthOverlay
          dismissible
          onDismiss={() => {}}
          onSuccess={() => {}}
        />
      </div>
    );
  }

  const stats = statsQuery.data?.stats;

  return (
    <div className="admindash app">
      <header className="admindash__header">
        <div>
          <h1 className="admindash__title">Admin Dashboard</h1>
          <p className="admindash__sub">
            Platform KPIs, users, contests & organiser approvals
          </p>
        </div>
        <button
          className="admindash__refresh"
          onClick={() => statsQuery.refetch()}
          aria-label="Refresh stats"
        >
          <RefreshCw size={16} />
        </button>
        <button
          className="admindash__logout"
          onClick={signOut}
          aria-label="Log out"
          title="Log out"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </header>

      {statsQuery.isLoading ? (
        <AdminSkeleton rows={3} />
      ) : statsQuery.error ? (
        <p className="admindash__error">
          Could not load stats:{" "}
          {statsQuery.error instanceof Error ? statsQuery.error.message : ""}
        </p>
      ) : stats ? (
        <KpiStrip stats={stats} />
      ) : null}

      {stats && stats.pendingApplications > 0 && tab !== "overview" && (
        <button
          className="admindash__pending-pill"
          onClick={() => setTab("overview")}
        >
          <Hourglass size={13} /> {stats.pendingApplications} organiser
          {stats.pendingApplications === 1
            ? " application"
            : " applications"}{" "}
          awaiting review
        </button>
      )}

      <div className="admindash__tabs" role="tablist">
        {(
          [
            [
              "overview",
              "Overview" +
                (stats?.pendingApplications
                  ? ` (${stats.pendingApplications})`
                  : ""),
            ],
            ["users", "Users"],
            ["contests", "Contests"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={
              tab === t
                ? "admindash__tab admindash__tab--active"
                : "admindash__tab"
            }
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "users" || tab === "contests") && (
        <div className="admindash__search-wrap">
          <Search size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              tab === "users"
                ? "Search by name, email or phone…"
                : "Search by title or organiser…"
            }
          />
        </div>
      )}

      {tab === "overview" && (
        <>
          <h2 className="admindash__section-title">Organiser applications</h2>
          <ApplicationsList />
        </>
      )}
      {tab === "users" && <UsersTable query={search} />}
      {tab === "contests" && <ContestsTable query={search} />}

      <div className="app__footer-spacer" />
    </div>
  );
}
