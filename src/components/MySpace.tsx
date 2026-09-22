import { useEffect, useRef, useState } from "react";
import { Trophy, Plus, Trash2, Loader2, ImagePlus, Swords } from "lucide-react";
import {
  getMyContestants,
  addGalleryImage,
  removeGalleryImage,
  imageLikesForViewer,
  likeImage,
  type ApiMyContestant,
} from "../lib/api";
import { Lightbox } from "./PhotoGallery";
import { Heart } from "lucide-react";
import "./MySpace.css";

export default function MySpace({ onOpenContest }: { onOpenContest?: (contest: ApiMyContestant["contest"]) => void }) {
  const [mine, setMine] = useState<ApiMyContestant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    getMyContestants()
      .then((res) => {
        if (cancelled) return;
        setMine(res.contestants);
        setActiveId(res.contestants[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load your profile",
          );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const active = mine.find((c) => c.id === activeId) ?? mine[0] ?? null;

  // Like state for my gallery photos (the owner can also like/unlike their
  // own photos — counts come from the same ImageLike store as the public
  // profile gallery).
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByMe, setLikedByMe] = useState<Set<string>>(new Set());
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    const photos = active?.gallery ?? [];
    if (!active || photos.length === 0) {
      setLikeCounts({});
      setLikedByMe(new Set());
      return;
    }
    let cancelled = false;
    imageLikesForViewer(active.id, [...photos])
      .then((res) => {
        if (cancelled) return;
        setLikeCounts(res.counts ?? {});
        setLikedByMe(new Set(res.likedImages ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.gallery.join("|")]);

  const toggleImageLike = async (image: string) => {
    if (!active) return;
    const wasLiked = likedByMe.has(image);
    setLikedByMe((s) => {
      const next = new Set(s);
      if (wasLiked) next.delete(image);
      else next.add(image);
      return next;
    });
    setLikeCounts((c) => ({
      ...c,
      [image]: Math.max(0, (c[image] ?? 0) + (wasLiked ? -1 : 1)),
    }));
    try {
      const res = await likeImage(active.id, image);
      setLikeCounts((c) => ({ ...c, [image]: res.imageLikes }));
      setLikedByMe((s) => {
        const next = new Set(s);
        if (res.liked) next.add(image);
        else next.delete(image);
        return next;
      });
    } catch {
      setLikedByMe((s) => {
        const next = new Set(s);
        if (wasLiked) next.add(image);
        else next.delete(image);
        return next;
      });
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
      setMine((list) =>
        list.map((c) =>
          c.id === active.id ? { ...c, gallery: res.gallery } : c,
        ),
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
    setMine((list) =>
      list.map((c) =>
        c.id === active.id
          ? { ...c, gallery: prev.filter((g) => g !== image) }
          : c,
      ),
    );
    try {
      const res = await removeGalleryImage(active.id, image);
      setMine((list) =>
        list.map((c) =>
          c.id === active.id ? { ...c, gallery: res.gallery } : c,
        ),
      );
    } catch (err) {
      // Restore on failure
      setMine((list) =>
        list.map((c) => (c.id === active.id ? { ...c, gallery: prev } : c)),
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
        {error && <p className="myspace__error">{error}</p>}

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
