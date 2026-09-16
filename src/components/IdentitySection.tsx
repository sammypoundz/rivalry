import type { Contestant } from "../data";
import "./IdentitySection.css";

export default function IdentitySection({ contestant }: { contestant: Contestant }) {
  return (
    <section className="identity">
      <h1 className="identity__name">{contestant.name}</h1>
      <p className="identity__tagline">
        {contestant.occupation} · {contestant.state}
      </p>
    </section>
  );
}
