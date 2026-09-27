import "./BottomNav.css";
import { Home, Swords, User, Wallet, LogIn } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export type Tab =
  | "dashboard"
  | "contests"
  | "leaderboard"
  | "earn"
  | "signup"
  | "profile"
  | "wallet";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  /** Called when a signed-out visitor taps the Login item. */
  onLogin?: () => void;
}

const items: { key: Tab; Icon: typeof Home; label: string }[] = [
  { key: "dashboard", Icon: Home, label: "Home" },
  { key: "contests", Icon: Swords, label: "Contests" },
  { key: "profile", Icon: User, label: "Profile" },
];

export default function BottomNav({ active, onChange, onLogin }: BottomNavProps) {
  const { user } = useAuth();
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
      {/* Signed in: the Wallet is the entry point for all earnings
          (referral rewards, prizes, etc.). Signed out: a plain Login
          item that opens the sign-in overlay. */}
      {user ? (
        <button
          className={`bottom-nav__item ${active === "wallet" ? "bottom-nav__item--active" : ""}`}
          onClick={() => onChange("wallet")}
        >
          <span className="bottom-nav__icon">
            <Wallet size={19} strokeWidth={2.1} />
          </span>
          <span className="bottom-nav__label">Wallet</span>
        </button>
      ) : (
        <button className="bottom-nav__item" onClick={() => onLogin?.()}>
          <span className="bottom-nav__icon">
            <LogIn size={19} strokeWidth={2.1} />
          </span>
          <span className="bottom-nav__label">Login</span>
        </button>
      )}
    </nav>
  );
}
