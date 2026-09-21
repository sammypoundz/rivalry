import type { Contestant } from "../data";
import "./PhotoGallery.css";

export default function PhotoGallery({ contestant }: { contestant: Contestant }) {
  // De-duplicate: hide repeated URLs and the hero photo (already shown at the
  // top of the profile) so the gallery never shows the same image twice.
  const photos = Array.from(
    new Set(contestant.gallery.filter((u) => u && u !== contestant.heroImage)),
  );

  if (photos.length === 0) return null;

  return (
    <section className="gallery">
      <h2 className="gallery__title">Gallery</h2>
      <div className="gallery__grid">
        {photos.map((src, i) => (
          <div key={src.slice(-48) + i} className="gallery__item">
            <img
              src={src}
              alt={`${contestant.name} photo ${i + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
