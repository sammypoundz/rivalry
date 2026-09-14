import "./BottomNav.css";
import { Home, Trophy, Swords, User } from "lucide-react";

export type Tab = "dashboard" | "contests" | "leaderboard" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const items: { key: Tab; Icon: typeof Home; label: string }[] = [
  { key: "dashboard", Icon: Home, label: "Home" },
  { key: "contests", Icon: Swords, label: "Contests" },
  { key: "leaderboard", Icon: Trophy, label: "Ranks" },
  { key: "profile", Icon: User, label: "Profile" },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {items.map(({ key, Icon, label }) => (
        <button
          key={key}
          className={`bottom-nav__item ${active === key ? "bottom-nav__item--active" : ""}`}
          onClick={() => onChange(key)}
        >
          <span className="bottom-nav__icon">
            <Icon size={19} strokeWidth={2.1} />
          </span>
          <span className="bottom-nav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
