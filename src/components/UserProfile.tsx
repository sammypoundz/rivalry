import { useAuth } from "../auth/AuthProvider";
import {
  LogOut,
  User as UserIcon,
  Mail,
  Phone,
  Heart,
  Vote,
  Swords,
  ImagePlus,
} from "lucide-react";
import { getMyStats, type ApiMyStats, type ApiMyContestant } from "../lib/api";
import { useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queries";
import MySpace from "./MySpace";
import "./UserProfile.css";

interface UserProfileProps {
  /** Opens one of the user's joined contests in the Contests tab. */
  onOpenContest?: (contest: ApiMyContestant["contest"]) => void;
}

/**
 * The logged-in user's own profile (bottom-nav "Profile" tab).
 * Distinct from the public contestant profile, which voters reach by
 * tapping a contestant or opening a share link.
 */
export default function UserProfile({ onOpenContest }: UserProfileProps) {
  const { user, signOut } = useAuth();
  // Cached + auto-refreshed by React Query: any vote/like/photo change
  // (anywhere in the app) invalidates this and the stats update instantly.
  const { data } = useQuery({
    queryKey: qk.myStats,
    queryFn: getMyStats,
    enabled: !!user,
    staleTime: 10_000,
  });
  const stats: ApiMyStats | null = data?.stats ?? null;

  if (!user) return null;

  return (
    <div className="userprofile app">
      <header className="userprofile__header">
        {user.avatarUrl ? (
          <img
            className="userprofile__avatar"
            src={user.avatarUrl}
            alt={user.fullName}
          />
        ) : (
          <span className="userprofile__avatar userprofile__avatar--empty">
            <UserIcon size={26} />
          </span>
        )}
        <div className="userprofile__meta">
          <h1 className="userprofile__name">{user.fullName}</h1>
          {user.email && (
            <span className="userprofile__contact">
              <Mail size={12} /> {user.email}
            </span>
          )}
          {user.phone && (
            <span className="userprofile__contact">
              <Phone size={12} /> {user.phone}
            </span>
          )}
        </div>
        <button
          className="userprofile__logout"
          onClick={signOut}
          aria-label="Log out"
        >
          <LogOut size={15} /> Log out
        </button>
      </header>

      {stats && (
        <div className="userprofile__stats">
          <div className="userprofile__stat">
            <Vote size={16} />
            <strong>{stats.totalVotes.toLocaleString()}</strong>
            <span>Total votes</span>
          </div>
          <div className="userprofile__stat">
            <Heart size={16} />
            <strong>{stats.totalLikes.toLocaleString()}</strong>
            <span>Total likes</span>
          </div>
          <div className="userprofile__stat">
            <Swords size={16} />
            <strong>{stats.contestsJoined}</strong>
            <span>Contests</span>
          </div>
          <div className="userprofile__stat">
            <ImagePlus size={16} />
            <strong>{stats.totalPhotos}</strong>
            <span>Photos</span>
          </div>
        </div>
      )}

      <MySpace onOpenContest={onOpenContest} />

      <div className="app__footer-spacer" />
    </div>
  );
}
