import { useState } from "react";
import "./HeroHeader.css";

interface HeroHeaderProps {
  image: string;
  name: string;
}

export default function HeroHeader({ image, name }: HeroHeaderProps) {
  const [favorited, setFavorited] = useState(false);

  return (
    <header className="hero">
      <img className="hero__image" src={image} alt={name} />
      <div className="hero__scrim" />

      <div className="hero__actions">
        <button className="hero__btn" aria-label="Back">
          ←
        </button>
        <div className="hero__actions-right">
          <button className="hero__btn" aria-label="Share">
            ↗
          </button>
          <button
            className={`hero__btn${favorited ? " hero__btn--fav" : ""}`}
            aria-label="Favorite"
            onClick={() => setFavorited((f) => !f)}
          >
            {favorited ? "★" : "☆"}
          </button>
        </div>
      </div>

      <div className="hero__crown">👑</div>
    </header>
  );
}
