import "./SupportProgress.css";

interface SupportProgressProps {
  votes: number;
  goal: number;
}

export default function SupportProgress({ votes, goal }: SupportProgressProps) {
  const pct = Math.min(100, (votes / goal) * 100);

  return (
    <section className="progress">
      <div className="progress__head">
        <span className="progress__title">Support Progress</span>
        <span className="progress__numbers">
          <strong>{votes.toLocaleString()}</strong> / {goal.toLocaleString()}
        </span>
      </div>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${pct}%` }}>
          <span className="progress__spark" />
        </div>
      </div>
      <span className="progress__hint">
        {Math.round(pct)}% of goal — {(goal - votes).toLocaleString()} votes to
        go!
      </span>
    </section>
  );
}
