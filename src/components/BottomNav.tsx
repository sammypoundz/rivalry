import "./BottomNav.css";
import { Home, Swords, User, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export type Tab = "dashboard" | "contests" | "leaderboard" | "earn" | "signup" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const items: { key: Tab; Icon: typeof Home; label: string }[] = [
  { key: "dashboard", Icon: Home, label: "Home" },
  { key: "contests", Icon: Swords, label: "Contests" },
  { key: "profile", Icon: User, label: "Profile" },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { signOut } = useAuth();
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
      {/* Logout sits after Profile, at the end of the nav. */}
      <button className="bottom-nav__item bottom-nav__item--logout" onClick={signOut}>
        <span className="bottom-nav__icon">
          <LogOut size={19} strokeWidth={2.1} />
        </span>
        <span className="bottom-nav__label">Logout</span>
      </button>
    </nav>
  );
}
