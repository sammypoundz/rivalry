import type { Contestant } from "../data";
import "./AboutSection.css";

export default function AboutSection({ contestant }: { contestant: Contestant }) {
  return (
    <section className="about">
      <h2 className="about__title">About</h2>
      <p className="about__bio">{contestant.bio}</p>
      <div className="about__facts">
        <div className="about__fact">
          <span className="about__fact-label">Age</span>
          <span className="about__fact-value">{contestant.age}</span>
        </div>
        <div className="about__fact">
          <span className="about__fact-label">Occupation</span>
          <span className="about__fact-value">{contestant.occupation}</span>
        </div>
        <div className="about__fact">
          <span className="about__fact-label">State</span>
          <span className="about__fact-value">{contestant.state}</span>
        </div>
      </div>
    </section>
  );
}
