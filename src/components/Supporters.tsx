import { supporters } from "../data";
import "./Supporters.css";

const medals = ["🥇", "🥈", "🥉"];

export default function Supporters() {
  return (
    <section className="supporters">
      <h2 className="supporters__title">Top Supporters</h2>
      <div className="supporters__list">
        {supporters.map((s, i) => (
          <div key={s.name} className="supporters__row">
            <span className="supporters__medal">{medals[i] ?? "🎖"}</span>
            <div className="supporters__info">
              <span className="supporters__name">{s.name}</span>
              <span className="supporters__badge">{s.badge}</span>
            </div>
            <span className="supporters__votes">
              {s.votes.toLocaleString()} votes
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

