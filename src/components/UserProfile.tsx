import { useState } from "react";
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
  Pencil,
  X,
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
  const { user, signOut, updateProfile } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  // Cached + auto-refreshed by React Query: any vote/like/photo change
  // (anywhere in the app) invalidates this and the stats update instantly.
  const { data } = useQuery({
    queryKey: qk.myStats,
    queryFn: getMyStats,
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });
  const stats: ApiMyStats | null = data?.stats ?? null;

  if (!user) return null;

  // Accounts registered with only a phone (or only an email) carry synthetic
  // placeholder values like "080...@phone.rivalry" — never show those.
  const isSynthetic = (v?: string | null) =>
    Boolean(v && (v.endsWith("@phone.rivalry") || v.endsWith("@email.rivalry")));
  const email = isSynthetic(user.email) ? null : user.email;
  const phone = isSynthetic(user.phone) ? null : user.phone;

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
          {email && (
            <span className="userprofile__contact">
              <Mail size={12} /> {email}
            </span>
          )}
          {phone && (
            <span className="userprofile__contact">
              <Phone size={12} /> {phone}
            </span>
          )}
        </div>
        <button
          className="userprofile__logout"
          onClick={() => setConfirmLogout(true)}
          aria-label="Log out"
        >
          <LogOut size={15} /> Log out
        </button>
      </header>

      {/* Contact info card — tap "Edit" to change name/email/phone */}
      <section className="userprofile__info">
        <div className="userprofile__info-head">
          <h2>Account info</h2>
          <button
            className="userprofile__edit-btn"
            onClick={() => setEditingInfo(true)}
          >
            <Pencil size={12} /> Edit
          </button>
        </div>
        <div className="userprofile__info-grid">
          <div className="userprofile__info-row">
            <span className="userprofile__info-label">
              <UserIcon size={13} /> Full name
            </span>
            <span className="userprofile__info-value">{user.fullName}</span>
          </div>
          <div className="userprofile__info-row">
            <span className="userprofile__info-label">
              <Mail size={13} /> Email
            </span>
            <span className="userprofile__info-value">
              {email ?? <em className="userprofile__info-empty">Not set</em>}
            </span>
          </div>
          <div className="userprofile__info-row">
            <span className="userprofile__info-label">
              <Phone size={13} /> Phone
            </span>
            <span className="userprofile__info-value">
              {phone ?? <em className="userprofile__info-empty">Not set</em>}
            </span>
          </div>
        </div>
      </section>

      {stats && (
        <div className="userprofile__stats">
          <div className="userprofile__stat">
            <Vote size={16} />
            <strong>{stats.totalVotes.toLocaleString()}</strong>
            <span>Votes</span>
          </div>
          <div className="userprofile__stat">
            <Heart size={16} />
            <strong>{stats.totalLikes.toLocaleString()}</strong>
            <span>Likes</span>
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

      {confirmLogout && (
        <div className="userprofile__modal" role="dialog" aria-modal="true">
          <div
            className="userprofile__modal-backdrop"
            onClick={() => setConfirmLogout(false)}
          />
          <div className="userprofile__modal-card">
            <button
              className="userprofile__modal-close"
              onClick={() => setConfirmLogout(false)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
            <span className="userprofile__modal-icon">
              <LogOut size={22} />
            </span>
            <h3 className="userprofile__modal-title">Log out?</h3>
            <p className="userprofile__modal-text">
              You'll need to sign in again to manage your contests, votes and
              wallet.
            </p>
            <div className="userprofile__modal-actions">
              <button
                className="userprofile__modal-cancel"
                onClick={() => setConfirmLogout(false)}
              >
                Cancel
              </button>
              <button
                className="userprofile__modal-confirm"
                onClick={() => {
                  setConfirmLogout(false);
                  signOut();
                }}
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}

      {editingInfo && (
        <EditInfoModal
          onClose={() => setEditingInfo(false)}
          onSave={updateProfile}
          initial={{
            fullName: user.fullName,
            // Hide synthetic placeholder values but let the user add the
            // "missing" half of their identity (email or phone).
            email: isSynthetic(user.email) ? "" : (user.email ?? ""),
            phone: isSynthetic(user.phone) ? "" : (user.phone ?? ""),
            emailPlaceholder: isSynthetic(user.email) ? "Add email" : "",
            phonePlaceholder: isSynthetic(user.phone) ? "Add phone number" : "",
          }}
        />
      )}
    </div>
  );
}

interface EditInfoModalProps {
  onClose: () => void;
  onSave: (input: {
    fullName?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
  initial: {
    fullName: string;
    email: string;
    phone: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
  };
}

function EditInfoModal({ onClose, onSave, initial }: EditInfoModalProps) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    // Only send fields that actually changed.
    const patch: { fullName?: string; email?: string; phone?: string } = {};
    if (form.fullName.trim() !== initial.fullName)
      patch.fullName = form.fullName.trim();
    if (form.email.trim() !== initial.email && form.email.trim())
      patch.email = form.email.trim();
    if (form.phone.trim() !== initial.phone && form.phone.trim())
      patch.phone = form.phone.trim();
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await onSave(patch);
      setBusy(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="userprofile__modal" role="dialog" aria-modal="true">
      <div className="userprofile__modal-backdrop" onClick={onClose} />
      <div className="userprofile__modal-card">
        <button
          className="userprofile__modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} />
        </button>
        <h3 className="userprofile__modal-title">Edit account info</h3>
        <form className="userprofile__editform" onSubmit={submit}>
          <label className="userprofile__field">
            <UserIcon size={15} />
            <input
              type="text"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
              autoComplete="name"
            />
          </label>
          <label className="userprofile__field">
            <Mail size={15} />
            <input
              type="text"
              placeholder={initial.emailPlaceholder || "Email address"}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </label>
          <label className="userprofile__field">
            <Phone size={15} />
            <input
              type="text"
              placeholder={initial.phonePlaceholder || "Phone number"}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
            />
          </label>
          {error && <p className="userprofile__error">{error}</p>}
          <div className="userprofile__modal-actions">
            <button
              type="button"
              className="userprofile__modal-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="userprofile__modal-confirm"
              disabled={busy}
            >
              {busy ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
