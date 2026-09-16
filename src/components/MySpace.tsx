import { useEffect, useRef, useState } from "react";
import { Trophy, Plus, Trash2, Loader2, ImagePlus, Swords } from "lucide-react";
import {
  getMyContestants,
  addGalleryImage,
  removeGalleryImage,
  type ApiMyContestant,
} from "../lib/api";
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

  /** Every photo across all entries, tagged with its owner contestant. */
  const allPhotos = mine.flatMap((c) =>
    (c.gallery ?? []).map((img) => ({ img, contestantId: c.id })),
  );

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

  /** Delete a photo from any of my entries (not just the selected one). */
  const handleDeleteAcross = async (contestantId: string, image: string) => {
    const owner = mine.find((c) => c.id === contestantId);
    if (!owner) return;
    const prev = owner.gallery;
    setMine((list) =>
      list.map((c) =>
        c.id === contestantId
          ? { ...c, gallery: prev.filter((g) => g !== image) }
          : c,
      ),
    );
    try {
      const res = await removeGalleryImage(contestantId, image);
      setMine((list) =>
        list.map((c) =>
          c.id === contestantId ? { ...c, gallery: res.gallery } : c,
        ),
      );
    } catch (err) {
      setMine((list) =>
        list.map((c) =>
          c.id === contestantId ? { ...c, gallery: prev } : c,
        ),
      );
      flash(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleDelete = async (image: string) => {
    if (!active || uploading) return;
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

      {/* Gallery — every photo across all of my entries */}
      <section className="myspace__section">
        <h2 className="myspace__title">
          <ImagePlus size={14} /> My Gallery
          {active && <span className="myspace__title-sub">{active.name}</span>}
        </h2>
        {notice && <p className="myspace__notice">{notice}</p>}
        {error && <p className="myspace__error">{error}</p>}

        {/* Every uploaded photo across all entries — deletable */}
        {allPhotos.length > 0 && (
          <div className="myspace__grid">
            {allPhotos.map(({ img, contestantId }) => (
              <div key={img.slice(-24) + contestantId} className="myspace__cell">
                <img src={img} alt="" />
                <button
                  className="myspace__delete"
                  aria-label="Delete photo"
                  onClick={() => handleDeleteAcross(contestantId, img)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {active && (
          <>
            <div className="myspace__grid">
              {active.gallery.map((img) => (
                <div key={img.slice(-24)} className="myspace__cell">
                  <img src={img} alt="" />
                  <button
                    className="myspace__delete"
                    aria-label="Delete photo"
                    onClick={() => handleDelete(img)}
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
    </div>
  );
}
