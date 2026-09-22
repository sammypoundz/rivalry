import type { Contestant } from "../data";
import { useEffect, useState } from "react";
import { X, Heart } from "lucide-react";
import { imageLikesForViewer, likeImage } from "../lib/api";
import "./PhotoGallery.css";

interface ViewerState {
  index: number;
}

export default function PhotoGallery({ contestant }: { contestant: Contestant }) {
  // De-duplicate: hide repeated URLs and the hero photo (already shown at the
  // top of the profile) so the gallery never shows the same image twice.
  const photos = Array.from(
    new Set(contestant.gallery.filter((u) => u && u !== contestant.heroImage)),
  );
  const apiId = contestant.apiId ?? "";
  const valid = /^[0-9a-fA-F]{24}$/.test(apiId);

  // Per-image like state, loaded from the backend (works for anonymous
  // visitors via their device fingerprint).
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  useEffect(() => {
    if (!valid || photos.length === 0) return;
    let cancelled = false;
    imageLikesForViewer(apiId, [...photos])
      .then((res) => {
        if (cancelled) return;
        setCounts(res.counts ?? {});
        setMine(new Set(res.likedImages ?? []));
      })
      .catch(() => {
        /* gallery still renders without like data */
      });
    return () => {
      cancelled = true;
    };
  }, [apiId, photos.join("|")]);

  const handleLike = async (image: string) => {
    const wasLiked = mine.has(image);
    // Optimistic toggle
    setMine((s) => {
      const next = new Set(s);
      if (wasLiked) next.delete(image);
      else next.add(image);
      return next;
    });
    setCounts((c) => ({
      ...c,
      [image]: Math.max(0, (c[image] ?? 0) + (wasLiked ? -1 : 1)),
    }));
    if (!valid) return; // demo/seed mode — local only
    try {
      const res = await likeImage(apiId, image);
      setCounts((c) => ({ ...c, [image]: res.imageLikes }));
      setMine((s) => {
        const next = new Set(s);
        if (res.liked) next.add(image);
        else next.delete(image);
        return next;
      });
    } catch {
      // Revert on failure
      setMine((s) => {
        const next = new Set(s);
        if (wasLiked) next.add(image);
        else next.delete(image);
        return next;
      });
      setCounts((c) => ({
        ...c,
        [image]: Math.max(0, (c[image] ?? 0) + (wasLiked ? 1 : -1)),
      }));
    }
  };

  if (photos.length === 0) return null;

  return (
    <section className="gallery">
      <h2 className="gallery__title">Gallery</h2>
      <div className="gallery__grid">
        {photos.map((src, i) => (
          <div
            key={src.slice(-48) + i}
            className="gallery__item"
            onClick={() => setViewer({ index: i })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setViewer({ index: i })}
          >
            <img src={src} alt={`${contestant.name} photo ${i + 1}`} loading="lazy" />
            <button
              className={`gallery__like${mine.has(src) ? " gallery__like--on" : ""}`}
              aria-label={mine.has(src) ? "Liked" : "Like photo"}
              onClick={(e) => {
                e.stopPropagation();
                handleLike(src);
              }}
            >
              <Heart size={14} fill={mine.has(src) ? "currentColor" : "none"} />
              <span>{(counts[src] ?? 0).toLocaleString()}</span>
            </button>
          </div>
        ))}
      </div>

      {viewer && (
        <Lightbox
          images={photos}
          startIndex={viewer.index}
          counts={counts}
          mine={mine}
          onLike={handleLike}
          onClose={() => setViewer(null)}
          name={contestant.name}
        />
      )}
    </section>
  );
}

export function Lightbox({
  images,
  startIndex,
  counts,
  mine,
  onLike,
  onClose,
  name,
}: {
  images: string[];
  startIndex: number;
  counts: Record<string, number>;
  mine: Set<string>;
  onLike: (image: string) => void;
  onClose: () => void;
  name: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const src = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, onClose]);

  return (
    <div className="lightbox" onClick={onClose} role="dialog" aria-modal="true">
      <div className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
        <button className="lightbox__close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
        <img className="lightbox__img" src={src} alt={`${name} photo ${index + 1}`} />
        <div className="lightbox__bar">
          {index > 0 && (
            <button className="lightbox__nav" onClick={() => setIndex((i) => i - 1)} aria-label="Previous">
              ‹
            </button>
          )}
          <button
            className={`lightbox__like${mine.has(src) ? " lightbox__like--on" : ""}`}
            onClick={() => onLike(src)}
          >
            <Heart size={18} fill={mine.has(src) ? "currentColor" : "none"} />
            <span>{mine.has(src) ? "Liked — tap to unlike" : "Like"}</span>
            <strong>{(counts[src] ?? 0).toLocaleString()}</strong>
          </button>
          {index < images.length - 1 && (
            <button className="lightbox__nav" onClick={() => setIndex((i) => i + 1)} aria-label="Next">
              ›
            </button>
          )}
        </div>
        <span className="lightbox__count">{index + 1} / {images.length}</span>
      </div>
    </div>
  );
}
