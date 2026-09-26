// Central TanStack Query setup: shared QueryClient, query keys, and the
// "mutated" event that keeps every part of the app in sync after ANY action
// (vote, like, image like, gallery upload/remove, contest entry, referral…).
//
// How cross-screen persistence works:
// 1. All server data is read through React Query caches (see useLiveData etc.).
// 2. lib/api.ts dispatches `rivalry:mutated` after every successful non-GET
//    request. A listener inside <QueryBridge> invalidates all queries, so every
//    mounted screen re-renders with fresh data immediately — no manual refresh.
// 3. The same invalidation happens on window focus and on a light interval
//    (see main.tsx defaults), so votes/likes made elsewhere show up too.

import { QueryClient } from "@tanstack/react-query";
import type { Contest, Contestant } from "../data";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache-and-stale: served from cache instantly (fast loads), refreshed
      // in the background when stale.
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      // Coming back to the tab / refocusing always re-syncs.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

/** Standard query keys. */
export const qk = {
  contests: ["contests"] as const,
  contestant: (id: string) => ["contestant", id] as const,
  myContestants: ["my-contestants"] as const,
  myStats: ["my-stats"] as const,
  referrals: ["referrals"] as const,
  imageLikes: (contestantId: string) => ["image-likes", contestantId] as const,
  supporters: (contestantId: string) => ["supporters", contestantId] as const,
};

/** Contestants belonging to a contest, ranked by votes (shared helper). */
export function rosterOf(
  contest: Contest,
  allContestants: Contestant[],
): Contestant[] {
  const list = contest.contestantApiIds?.length
    ? allContestants.filter(
        (c) => c.apiId ? contest.contestantApiIds!.includes(c.apiId) : false,
      )
    : allContestants.filter((c) => contest.contestantIds.includes(c.id));
  return [...list].sort((a, b) => b.votes - a.votes);
}

/** Event name fired by lib/api.ts after a successful mutation. */
export const MUTATED_EVENT = "rivalry:mutated";

/** Shape of the /gallery/likes response, cached per contestant. */
export interface ImageLikesData {
  success: true;
  likedImages: string[];
  counts: Record<string, number>;
}

/**
 * Invalidate every query. Called after any mutation so likes, votes, gallery
 * changes, uploads, etc. propagate to all screens at once (leaderboard,
 * dashboard, vote feed, profile stats…).
 */
export function invalidateAll() {
  void queryClient.invalidateQueries();
}
