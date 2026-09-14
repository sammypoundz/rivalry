import { contestant } from "../data";
import VoteBadge from "./VoteBadge";
import "./ProfileHeader.css";

export default function ProfileHeader() {
  return (
    <header className="profile-header">
      <div className="profile-header__image-wrap">
        <img
          className="profile-header__image"
          src={contestant.heroImage}
          alt={contestant.name}
        />
        <div className="profile-header__gradient" />
      </div>
      <div className="profile-header__content">
        <VoteBadge />
        <h1 className="profile-header__name">{contestant.name}</h1>
        <p className="profile-header__meta">
          {contestant.age} yrs · {contestant.occupation} · {contestant.state}
        </p>
      </div>
    </header>
  );
}
