// API client for the Rivalry backend (Express + Prisma).
//
// Environment switching:
// - Localhost dev: Vite proxies /api to http://localhost:5000 (see vite.config.ts),
//   so we use the relative "/api" path.
// - Production (deployed on Vercel): hit the online backend directly.
// - VITE_API_URL (set in .env / deployment settings) overrides everything.

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

// ---------- Contestants ----------
export async function listContestants(contestId: string) {
  return request<{ success: true; contestants: ApiContestant[] }>(
    `/contests/${contestId}/contestants`,
  );
}

export async function getContestant(id: string) {
  return request<{
    success: true;
    contestant: ApiContestant & { likes?: number };
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

/** The logged-in user's referral invites + total earnings. */
export async function listReferrals() {
  return request<{ success: true; referrals: ApiReferral[]; earned: number }>(
    "/users/me/referrals",
  );
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
