import { useEffect, useState } from "react";
import "./CountdownTimer.css";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(endsAt: number): TimeLeft {
  const diff = Math.max(0, endsAt - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer({ endsAt }: { endsAt: number }) {
  const [time, setTime] = useState<TimeLeft>(() => getTimeLeft(endsAt));

  useEffect(() => {
    setTime(getTimeLeft(endsAt));
    const id = setInterval(() => setTime(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const units: Array<[string, number]> = [
    ["Days", time.days],
    ["Hours", time.hours],
    ["Mins", time.minutes],
    ["Secs", time.seconds],
  ];

  return (
    <div className="countdown">
      <span className="countdown__title">Voting closes in</span>
      <div className="countdown__row">
        {units.map(([label, value]) => (
          <div key={label} className="countdown__cell">
            <span className="countdown__value">
              {String(value).padStart(2, "0")}
            </span>
            <span className="countdown__label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
