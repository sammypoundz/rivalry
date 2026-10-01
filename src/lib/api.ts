// API client for the Rivalry backend (Express + Prisma).
//
// Environment switching:
// - Localhost dev: Vite proxies /api to http://localhost:5000 (see vite.config.ts),
//   so we use the relative "/api" path.
// - Production (deployed on Vercel): hit the online backend directly.
// - VITE_API_URL (set in .env / deployment settings) overrides everything.

import { MUTATED_EVENT } from "./queries";

const ONLINE_API = "https://rivalrybackend.onrender.com/api";

const isLocal =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|10\.|192\.168\.)$/.test(window.location.hostname);

const BASE = import.meta.env.VITE_API_URL || (isLocal ? "/api" : ONLINE_API);

export interface ApiUser {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string;
  avatarUrl: string | null;
  role: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(identifier: string) {
  return EMAIL_RE.test(identifier.trim());
}

export async function register(input: {
  email?: string;
  phone?: string;
  password: string;
  fullName: string;
  /** Mongo ObjectId of the user whose referral link was used (optional). */
  referredBy?: string;
}) {
  const data = await request<{ success: true; user: ApiUser; token: string }>(
    "/auth/register",
    { method: "POST", body: JSON.stringify(input) },
  );
  localStorage.setItem("rivalry_token", data.token);
  return data;
}

export interface ApiContestant {
  id: string;
  number: number;
  name: string;
  state: string;
  age: number;
  occupation: string;
  bio: string;
  heroImage: string;
  gallery: string[];
  votes: number;
  voteGoal: number;
  votingEndsAt: string; // ISO date
  rank?: number;
  prize?: number;
  likes?: number;
  contestId?: string;
  _count?: { votes: number; supporters: number };
}

export interface ApiContest {
  id: string;
  title: string;
  tagline: string;
  category: string;
  coverImage: string;
  status: "voting-live" | "upcoming" | "ended" | string;
  endsAt: string;
  votePrice?: number;
  entryFee?: number;
  totalVotes: number;
  rewards: { position: string; amount: number; perk: string }[];
  contestants?: ApiContestant[];
}

export interface ApiSupporter {
  id: string;
  name: string;
  initials: string;
  votes: number;
  badge: string;
}

// ---------- Device fingerprint (anonymous visitors) ----------
/**
 * A stable per-browser id stored in localStorage, used to key anonymous
 * likes (gallery photos, hero images) so a visitor sees their own likes
 * when they revisit, and can't like the same image twice.
 * Enriched with a few stable screen/locale signals so the id survives
 * localStorage clears in most cases (same browser, same device).
 */
export function getDeviceId(): string {
  const KEY = "rivalry_device_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    const seed = [
      navigator.userAgent,
      navigator.language,
      `${screen.width}x${screen.height}x${screen.colorDepth}`,
      new Date().getTimezoneOffset(),
    ].join("|");
    let hash = 5381;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 33) ^ seed.charCodeAt(i);
    }
    id = `fp_${Math.abs(hash).toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("rivalry_token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": getDeviceId(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || `Request failed (${res.status})`);
  }
  // Every successful mutation (POST/PUT/PATCH/DELETE) announces itself so the
  // React Query layer can invalidate caches — likes, votes, uploads, gallery
  // edits etc. then propagate to ALL screens instantly (see lib/queries.ts).
  if (options.method && options.method.toUpperCase() !== "GET") {
    window.dispatchEvent(new CustomEvent(MUTATED_EVENT));
  }
  return body as T;
}

// ---------- Auth ----------
export async function login(input: {
  email?: string;
  phone?: string;
  password: string;
}) {
  const data = await request<{ success: true; user: ApiUser; token: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify(input) },
  );
  localStorage.setItem("rivalry_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("rivalry_token");
}

export async function me() {
  return request<{ success: true; user: ApiUser }>("/auth/me");
}

// ---------- Contests ----------
export async function listContests() {
  return request<{ success: true; contests: ApiContest[] }>("/contests");
}

export async function getContest(id: string) {
  return request<{ success: true; contest: ApiContest }>(`/contests/${id}`);
}

// ---------- Organiser dashboard ----------

/**
 * Organiser application — a signed-in user applies; an admin must approve
 * before the account is upgraded to role=organiser.
 */
export interface OrganiserApplication {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | string;
  createdAt: string;
  reviewedAt?: string | null;
}

/** Submit an organiser application (idempotent while one is pending). */
export async function applyForOrganiser(input: {
  fullName: string;
  email: string;
  phone: string;
  reason: string;
}) {
  return request<{ success: true; application: OrganiserApplication }>(
    "/users/me/organiser-application",
    { method: "POST", body: JSON.stringify(input) },
  );
}

/** The logged-in user's latest organiser application (null = never applied). */
export async function getMyOrganiserApplication() {
  return request<{ success: true; application: OrganiserApplication | null }>(
    "/users/me/organiser-application",
  );
}

/** Admin: list organiser applications (optionally by status). */
export async function listOrganiserApplications(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ success: true; applications: OrganiserApplication[] }>(
    `/users/organiser-applications${q}`,
  );
}

/** Admin: approve an application — grants the organiser role. */
export async function approveOrganiserApplication(id: string) {
  return request<{ success: true; application: OrganiserApplication }>(
    `/users/organiser-applications/${id}/approve`,
    { method: "POST" },
  );
}

/** Admin: reject an application. */
export async function rejectOrganiserApplication(id: string) {
  return request<{ success: true; application: OrganiserApplication }>(
    `/users/organiser-applications/${id}/reject`,
    { method: "POST" },
  );
}

/** Compact contest shape used by the organiser dashboard list. */
export interface OrganiserContest {
  id: string;
  title: string;
  tagline: string;
  category: string;
  coverImage: string;
  status: string;
  startsAt?: string | null;
  endsAt: string;
  votePrice?: number;
  entryFee?: number;
  totalVotes: number;
  rewards: { position: string; amount: number; perk: string }[];
  contestantCount: number;
  contestants: {
    id: string;
    name: string;
    number: number;
    heroImage: string;
    votes: number;
  }[];
}

/** Contests the logged-in organiser (or admin) created. */
export async function listMyOrganisedContests() {
  return request<{ success: true; contests: OrganiserContest[] }>(
    "/users/me/organised-contests",
  );
}

export interface ContestInput {
  title: string;
  tagline?: string;
  category?: string;
  coverImage?: string;
  status?: "upcoming" | "voting-live" | "ended" | string;
  startsAt?: string;
  endsAt: string;
  /** Price per vote in Naira (defaults to ₦100 when omitted). */
  votePrice?: number;
  /** Entry fee in Naira (0/omitted = free to enter). */
  entryFee?: number;
  rewards?: { position: string; amount: number; perk: string }[];
}

export async function createContest(input: ContestInput) {
  return request<{ success: true; contest: OrganiserContest }>("/contests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateContest(id: string, input: Partial<ContestInput>) {
  return request<{ success: true; contest: OrganiserContest }>(
    `/contests/${id}`,
    { method: "PUT", body: JSON.stringify(input) },
  );
}

export async function deleteContest(id: string) {
  return request<{ success: true; message: string }>(`/contests/${id}`, {
    method: "DELETE",
  });
}

/** Revenue generated by one of the organiser's contests (owner-only). */
export interface ContestRevenue {
  votes: number;
  voteRevenue: number;
  contestants: number;
  entryRevenue: number;
  total: number;
}
export async function getContestRevenue(id: string) {
  return request<{ success: true; revenue: ContestRevenue }>(
    `/contests/${id}/revenue`,
  );
}

// ---------- Contestants ----------
export async function listContestants(contestId: string) {
  return request<{ success: true; contestants: ApiContestant[] }>(
    `/contests/${contestId}/contestants`,
  );
}

export async function getContestant(id: string) {
  return request<{
    success: true;
    contestant: ApiContestant & {
      likes?: number;
      /** Included by the backend (contest: true) — carries status + votePrice. */
      contest?: {
        votePrice?: number;
        status?: string;
        startsAt?: string | null;
        title?: string;
      };
    };
    likedByMe?: boolean;
  }>(`/contestants/${id}`);
}

/** Toggle a like on a contestant. Works for guests (fingerprint/IP keyed). */
export async function toggleLike(contestantId: string) {
  return request<{ success: true; liked: boolean; likes: number }>(
    `/contestants/${contestantId}/like`,
    { method: "POST" },
  );
}

// ---------- Gallery image likes ----------
/** Toggle a like on ONE image (gallery photo or hero). Tap again to unlike. */
export async function likeImage(contestantId: string, image: string) {
  return request<{ success: true; liked: boolean; imageLikes: number }>(
    `/contestants/${contestantId}/gallery/like`,
    { method: "POST", body: JSON.stringify({ image }) },
  );
}

/**
 * Which of these images has the current visitor already liked, plus the
 * total like count for each. Works for guests via device fingerprint.
 */
export async function imageLikesForViewer(contestantId: string, images: string[]) {
  return request<{
    success: true;
    likedImages: string[];
    counts: Record<string, number>;
  }>(`/contestants/${contestantId}/gallery/likes`, {
    method: "POST",
    body: JSON.stringify({ images }),
  });
}

// POST /api/contests/:contestId/contestants
export async function submitContestant(
  contestId: string,
  input: Record<string, unknown>,
) {
  return request<{ success: true; contestant: ApiContestant }>(
    `/contests/${contestId}/contestants`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// ---------- Voting ----------
export async function castVote(
  contestantId: string,
  input: {
    amount?: number;
    supporterName?: string;
    /** Payment reference from the gateway (optional, for reconciliation). */
    reference?: string;
  } = {},
) {
  return request<{
    success: true;
    vote: { id: string; amount: number };
    contestantVotes: number;
    supporter: { name: string; votes: number; badge: string } | null;
  }>(`/contestants/${contestantId}/vote`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listSupporters(contestantId: string) {
  return request<{ success: true; supporters: ApiSupporter[] }>(
    `/contestants/${contestantId}/supporters`,
  );
}

export async function listVotes(contestantId: string) {
  return request<{
    success: true;
    votes: {
      id: string;
      supporterName: string | null;
      amount: number;
      createdAt: string;
    }[];
  }>(`/contestants/${contestantId}/votes`);
}

/** One real vote with its contestant — a live-votes feed row. */
export interface ApiRecentVote {
  id: string;
  supporterName: string | null;
  amount: number;
  createdAt: string;
  contestant: {
    id: string;
    name: string;
    number: number;
    state: string;
    occupation: string;
    heroImage: string;
    votes: number;
    contestId: string;
  };
}

// ---------- Recent votes (live feed) ----------
export interface ApiRecentVote {
  id: string;
  supporterName: string | null;
  amount: number;
  createdAt: string;
  contestant: {
    id: string;
    name: string;
    number: number;
    state: string;
    occupation: string;
    heroImage: string;
    votes: number;
    contestId: string;
  };
}

/**
 * The most recent REAL votes across the app — powers the live votes feed.
 * Every row is an actual Vote record from the backend (nothing simulated).
 */
export async function listRecentVotes(contestId?: string) {
  const q = contestId ? `?contestId=${encodeURIComponent(contestId)}` : "";
  return request<{ success: true; votes: ApiRecentVote[] }>(`/votes/recent${q}`);
}

// ---------- My profile (logged-in user) ----------
export interface ApiMyContestant {
  id: string;
  number: number;
  name: string;
  heroImage: string;
  gallery: string[];
  votes: number;
  voteGoal: number;
  contest: {
    id: string;
    title: string;
    status: string;
    coverImage: string;
    endsAt: string;
    totalVotes: number;
  };
}

export async function getMyContestants() {
  return request<{ success: true; contestants: ApiMyContestant[] }>(
    "/users/me/contestants",
  );
}

export interface ApiMyStats {
  contestsJoined: number;
  totalVotes: number;
  totalLikes: number;
  totalPhotos: number;
}

/** Aggregate totals across all of the user's contestant entries. */
export async function getMyStats() {
  return request<{ success: true; stats: ApiMyStats }>("/users/me/stats");
}

/** Update the logged-in user's own details (name, email, phone). */
export async function updateProfile(input: {
  fullName?: string;
  email?: string;
  phone?: string;
}) {
  return request<{ success: true; user: ApiUser }>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addGalleryImage(contestantId: string, image: string) {
  return request<{ success: true; gallery: string[] }>(
    `/contestants/${contestantId}/gallery`,
    { method: "POST", body: JSON.stringify({ image }) },
  );
}

export async function removeGalleryImage(contestantId: string, image: string) {
  return request<{ success: true; gallery: string[] }>(
    `/contestants/${contestantId}/gallery`,
    { method: "DELETE", body: JSON.stringify({ image }) },
  );
}

/** Upload a device photo (data URL) to Cloudinary; returns the CDN URL. */
export async function uploadImage(image: string) {
  return request<{ success: true; url: string }>("/uploads/image", {
    method: "POST",
    body: JSON.stringify({ image }),
  });
}

/** Upload one or more device photos (data URLs) in a single request. */
export async function uploadImages(images: string[]) {
  return request<{ success: true; urls: string[] }>("/uploads/image", {
    method: "POST",
    body: JSON.stringify({ images }),
  });
}

// ---------- Admin dashboard ----------

export interface AdminStats {
  users: number;
  organisers: number;
  admins: number;
  contests: number;
  liveContests: number;
  contestants: number;
  votesTotal: number;
  votesThisMonth: number;
  votersThisMonth: number;
  votingVolume: number;
  entriesThisMonth: number;
  entryVolume: number;
  pendingApplications: number;
}

export async function adminStats() {
  return request<{ success: true; stats: AdminStats }>("/admin/stats");
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
}

export async function adminUsers(params: { query?: string; role?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
  return request<{ success: true; users: AdminUser[]; total: number; hasMore?: boolean }>(
    `/admin/users${qs ? `?${qs}` : ""}`,
  );
}

export async function adminSetRole(id: string, role: string) {
  return request<{ success: true; user: AdminUser }>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function adminApplications(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ success: true; applications: OrganiserApplication[] }>(
    `/admin/applications${q}`,
  );
}

export async function adminReviewApplication(id: string, action: "approve" | "reject") {
  return request<{ success: true; application: OrganiserApplication }>(
    `/admin/applications/${id}/${action}`,
    { method: "POST" },
  );
}

export interface AdminContest {
  id: string;
  title: string;
  tagline: string;
  category: string;
  coverImage: string;
  status: string;
  startsAt?: string | null;
  endsAt: string;
  votePrice?: number;
  entryFee?: number;
  totalVotes: number;
  contestantCount: number;
  organiser: { id: string; fullName: string; email: string } | null;
}

export interface AdminContestDetail extends AdminContest {
  rewards: { position: string; amount: number; perk: string }[];
  contestants: {
    id: string;
    name: string;
    number: number;
    state: string;
    heroImage: string;
    votes: number;
    likes: number;
  }[];
  voteRevenue: number;
  entryRevenue: number;
}

export async function adminContests(params: { status?: string; limit?: number; offset?: number } = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
  return request<{ success: true; contests: AdminContest[]; total: number; hasMore?: boolean }>(
    `/admin/contests${qs ? `?${qs}` : ""}`,
  );
}

/** Full detail of one contest — roster, rewards, revenue breakdown. */
export async function adminContest(id: string) {
  return request<{ success: true; contest: AdminContestDetail }>(
    `/admin/contests/${id}`,
  );
}

export async function adminUpdateContest(
  id: string,
  input: { title?: string; status?: string; votePrice?: number; entryFee?: number },
) {
  return request<{ success: true; contest: unknown }>(`/admin/contests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function adminDeleteContest(id: string) {
  return request<{ success: true; message: string }>(`/admin/contests/${id}`, {
    method: "DELETE",
  });
}

// ---------- Referrals ----------

export interface ApiReferral {
  id: string;
  name: string;
  contact: string;
  // "Invited" → "Signed up" (needs 5 votes) → "Qualified" (₦500 redeemable)
  status: "Invited" | "Signed up" | "Qualified" | string;
  reward: number;
  contestId?: string | null;
  createdAt: string;
}

/** Revenue one of the user's contests has generated (wallet breakdown). */
export interface OrganiserEarningRow {
  contestId: string;
  title: string;
  votes: number;
  voteRevenue: number;
  entryRevenue: number;
  amount: number;
}
export interface OrganiserEarnings {
  total: number;
  contests: OrganiserEarningRow[];
}

/** The logged-in user's referral invites + total earnings + organiser revenue. */
export async function listReferrals() {
  return request<{
    success: true;
    referrals: ApiReferral[];
    earned: number;
    organiser?: OrganiserEarnings;
  }>("/users/me/referrals");
}

/** Record an invite the user sent to someone (name + email/phone). */
export async function createReferral(input: {
  name: string;
  contact: string;
  contestId?: string;
}) {
  return request<{ success: true; referral: ApiReferral }>(
    "/users/me/referrals",
    { method: "POST", body: JSON.stringify(input) },
  );
}
