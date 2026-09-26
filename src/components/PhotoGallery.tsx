import type { Contestant } from "../data";
import { useState, useEffect } from "react";
import { X, Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { imageLikesForViewer, likeImage } from "../lib/api";
import { qk, type ImageLikesData } from "../lib/queries";
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
  const queryClient = useQueryClient();

  // Per-image like state, cached in React Query so likes made here also
  // reflect in MySpace (owner view) and vice versa — no refresh needed.
  const { data: likesData } = useQuery({
    queryKey: qk.imageLikes(apiId),
    queryFn: () => imageLikesForViewer(apiId, [...photos]),
    enabled: valid && photos.length > 0,
    staleTime: 10_000,
    // Likes from other visitors show up without a reload.
    refetchInterval: 20_000,
    refetchIntervalInBackground: true,
  });
  const counts: Record<string, number> = likesData?.counts ?? {};
  const mine: Set<string> = new Set(likesData?.likedImages ?? []);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const handleLike = async (image: string) => {
    if (!valid) return; // demo/seed mode — local only
    const wasLiked = mine.has(image);
    // Optimistic toggle in the React Query cache
    queryClient.setQueryData<ImageLikesData>(qk.imageLikes(apiId), (prev) => ({
      success: true,
      likedImages: wasLiked
        ? (prev?.likedImages ?? []).filter((i) => i !== image)
        : [...(prev?.likedImages ?? []), image],
      counts: {
        ...(prev?.counts ?? {}),
        [image]: Math.max(0, (prev?.counts?.[image] ?? 0) + (wasLiked ? -1 : 1)),
      },
    }));
    try {
      await likeImage(apiId, image);
      // Mutation event invalidates caches → counts propagate to every screen.
    } catch {
      // Revert on failure
      queryClient.invalidateQueries({ queryKey: qk.imageLikes(apiId) });
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
  const liked = mine.has(src);

  // The "tap to unlike" hint flashes for a second after liking, then fades
  // out — the like state itself stays visible.
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (!liked) {
      setHintVisible(false);
      return;
    }
    setHintVisible(true);
    const t = setTimeout(() => setHintVisible(false), 1000);
    return () => clearTimeout(t);
  }, [liked, src]);

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
            <span>{mine.has(src) ? "Liked" : "Like"}</span>
            <span
              className={`lightbox__hint${hintVisible ? "" : " lightbox__hint--hide"}`}
              aria-hidden="true"
            >
              tap to unlike
            </span>
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
