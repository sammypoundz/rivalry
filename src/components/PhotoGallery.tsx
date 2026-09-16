import type { Contestant } from "../data";
import "./PhotoGallery.css";

export default function PhotoGallery({ contestant }: { contestant: Contestant }) {
  return (
    <section className="gallery">
      <h2 className="gallery__title">Gallery</h2>
      <div className="gallery__grid">
        {contestant.gallery.map((src, i) => (
          <div key={i} className="gallery__item">
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
