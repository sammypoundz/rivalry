import { useRef, useState } from "react";
import { Trophy, Plus, Trash2, Loader2, ImagePlus, Swords } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyContestants,
  addGalleryImage,
  removeGalleryImage,
  imageLikesForViewer,
  likeImage,
  type ApiMyContestant,
} from "../lib/api";
import { qk, type ImageLikesData } from "../lib/queries";
import { Lightbox } from "./PhotoGallery";
import { Heart } from "lucide-react";
import "./MySpace.css";

export default function MySpace({ onOpenContest }: { onOpenContest?: (contest: ApiMyContestant["contest"]) => void }) {
  const queryClient = useQueryClient();
  // Cached + invalidated by React Query: gallery uploads, likes and votes made
  // anywhere (public profile, Contests, VoteModal) reflect here instantly.
  const { data: mineData, isLoading: loading } = useQuery({
    queryKey: qk.myContestants,
    queryFn: getMyContestants,
    staleTime: 10_000,
    // Keep own entries (votes, photos, joined contests) fresh in real time.
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
  const mine: ApiMyContestant[] = mineData?.contestants ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const active =
    mine.find((c) => c.id === activeId) ?? mine[0] ?? null;

  // Like state for my gallery photos, held in the React Query cache so likes
  // from the public profile gallery and this owner view stay in sync.
  const activeIdResolved = active?.id ?? "";
  const { data: likesData } = useQuery({
    queryKey: qk.imageLikes(activeIdResolved),
    queryFn: () => imageLikesForViewer(activeIdResolved, [...(active?.gallery ?? [])]),
    enabled: !!active && (active?.gallery ?? []).length > 0,
    staleTime: 10_000,
    // Likes on photos by other visitors appear without a reload.
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  });
  const likeCounts: Record<string, number> = likesData?.counts ?? {};
  const likedByMe: Set<string> = new Set(likesData?.likedImages ?? []);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const toggleImageLike = async (image: string) => {
    if (!active) return;
    const wasLiked = likedByMe.has(image);
    // Optimistic update in the cache
    queryClient.setQueryData<ImageLikesData>(
      qk.imageLikes(activeIdResolved),
      (prev) => ({
        success: true,
        likedImages: wasLiked
          ? (prev?.likedImages ?? []).filter((i) => i !== image)
          : [...(prev?.likedImages ?? []), image],
        counts: {
          ...(prev?.counts ?? {}),
          [image]: Math.max(0, (prev?.counts?.[image] ?? 0) + (wasLiked ? -1 : 1)),
        },
      }),
    );
    try {
      await likeImage(active.id, image);
      // Mutation event invalidates the cache → authoritative counts reappear.
    } catch {
      queryClient.invalidateQueries({ queryKey: qk.imageLikes(activeIdResolved) });
    }
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const handleUpload = async (file: File) => {
    if (!active || uploading) return;
    if (file.size > 2 * 1024 * 1024) {
      flash("Image too large — max 2MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await addGalleryImage(active.id, dataUrl);
      // Optimistic cache update; the mutation event also invalidates, so the
      // new photo shows up in MySpace, the public profile and stats at once.
      queryClient.setQueryData<{ success: true; contestants: ApiMyContestant[] }>(
        qk.myContestants,
        (prev) =>
          prev && {
            ...prev,
            contestants: prev.contestants.map((c) =>
              c.id === active.id ? { ...c, gallery: res.gallery } : c,
            ),
          },
      );
      flash("Photo added to your gallery");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (image: string) => {
    if (!active || uploading) return;
    // Ask before removing — a tap on the trash icon must not nuke a photo
    if (
      !window.confirm(
        "Delete this photo from your gallery? This can't be undone.",
      )
    )
      return;
    // Optimistic removal
    const prev = active.gallery;
    queryClient.setQueryData<{ success: true; contestants: ApiMyContestant[] }>(
      qk.myContestants,
      (old) =>
        old && {
          ...old,
          contestants: old.contestants.map((c) =>
            c.id === active.id
              ? { ...c, gallery: prev.filter((g) => g !== image) }
              : c,
          ),
        },
    );
    try {
      const res = await removeGalleryImage(active.id, image);
      queryClient.setQueryData<{ success: true; contestants: ApiMyContestant[] }>(
        qk.myContestants,
        (old) =>
          old && {
            ...old,
            contestants: old.contestants.map((c) =>
              c.id === active.id ? { ...c, gallery: res.gallery } : c,
            ),
          },
      );
    } catch (err) {
      // Restore on failure
      queryClient.setQueryData<{ success: true; contestants: ApiMyContestant[] }>(
        qk.myContestants,
        (old) =>
          old && {
            ...old,
            contestants: old.contestants.map((c) =>
              c.id === active.id ? { ...c, gallery: prev } : c,
            ),
          },
      );
      flash(err instanceof Error ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="myspace myspace--loading">
        <Loader2 size={18} className="myspace__spinner" /> Loading your space…
      </div>
    );
  }

  if (mine.length === 0) {
    return (
      <div className="myspace">
        <h2 className="myspace__title">Your Contests</h2>
        <div className="myspace__empty">
          <Swords size={20} />
          <p>
            You haven't entered a contest yet. Sign up as a contestant and your
            contests and gallery will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="myspace">
      {/* Contests entered */}
      <section className="myspace__section">
        <h2 className="myspace__title">
          <Trophy size={14} /> Your Contests
        </h2>
        <div className="myspace__contests">
          {mine.map((c) => (
            <div
              key={c.id}
              className="myspace-contest"
              role={onOpenContest ? "button" : undefined}
              style={onOpenContest ? { cursor: "pointer" } : undefined}
              onClick={onOpenContest ? () => onOpenContest(c.contest) : undefined}
            >
              <img src={c.contest.coverImage} alt="" loading="lazy" />
              <div className="myspace-contest__info">
                <strong>{c.contest.title}</strong>
                <span>
                  #{c.number} · {c.votes.toLocaleString()} votes ·{" "}
                  {c.contest.status === "voting-live"
                    ? "Voting live"
                    : c.contest.status}
                </span>
              </div>
              {mine.length > 1 && (
                <button
                  className={`myspace-contest__pick${c.id === active?.id ? " is-active" : ""}`}
                  onClick={() => setActiveId(c.id)}
                >
                  {c.id === active?.id ? "Selected" : "Select"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Gallery — photos for the currently selected entry */}
      <section className="myspace__section">
        <h2 className="myspace__title">
          <ImagePlus size={14} /> My Gallery
          {active && <span className="myspace__title-sub">{active.name}</span>}
        </h2>
        {notice && <p className="myspace__notice">{notice}</p>}

        {active && (
          <>
            <div className="myspace__grid">
              {active.gallery.map((img, i) => (
                <div
                  key={img.slice(-24) + i}
                  className="myspace__cell myspace__cell--viewable"
                  onClick={() => setViewerIndex(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setViewerIndex(i)}
                >
                  <img src={img} alt="" />
                  <button
                    className={`myspace__like${likedByMe.has(img) ? " myspace__like--on" : ""}`}
                    aria-label={likedByMe.has(img) ? "Unlike" : "Like"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImageLike(img);
                    }}
                  >
                    <Heart size={12} fill={likedByMe.has(img) ? "currentColor" : "none"} />
                    <span>{(likeCounts[img] ?? 0).toLocaleString()}</span>
                  </button>
                  <button
                    className="myspace__delete"
                    aria-label="Delete photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(img);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                className="myspace__add"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={20} className="myspace__spinner" />
                ) : (
                  <Plus size={20} />
                )}
                <span>{uploading ? "Uploading…" : "Add photo"}</span>
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
            <p className="myspace__hint">
              Photos appear on your public profile. Max 20 photos, up to 2MB
              each.
            </p>
          </>
        )}
      </section>

      {/* Full-screen viewer with like toggle for my gallery photos */}
      {viewerIndex !== null && active && active.gallery.length > 0 && (
        <Lightbox
          images={active.gallery}
          startIndex={Math.min(viewerIndex, active.gallery.length - 1)}
          counts={likeCounts}
          mine={likedByMe}
          onLike={toggleImageLike}
          onClose={() => setViewerIndex(null)}
          name={active.name}
        />
      )}
    </div>
  );
}
