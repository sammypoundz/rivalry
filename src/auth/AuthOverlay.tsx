import { useState } from "react";
import { Sparkles, Lock, Mail, Phone, User as UserIcon, X, Eye, EyeOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isEmail } from "../lib/api";
import "./AuthOverlay.css";

interface AuthOverlayProps {
  /** Called when the user dismisses without signing in (optional) */
  onDismiss?: () => void;
  /** Whether the overlay can be closed without signing in */
  dismissible?: boolean;
  /** Called after a successful sign-in/sign-up (optional) */
  onSuccess?: () => void;
}

export default function AuthOverlay({
  onDismiss,
  dismissible = false,
  onSuccess,
}: AuthOverlayProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ name: "", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const identifierIsEmail = isEmail(form.identifier);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const id = form.identifier.trim();
    if (!id || !form.password) {
      setError("Email/phone and password are required.");
      return;
    }
    if (mode === "signup" && !form.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // Validate: looks like an email OR a phone number (7-15 digits, may start with +)
    const digits = id.replace(/[\s\-().]/g, "");
    const validPhone = /^\+?\d{7,15}$/.test(digits);
    if (!isEmail(id) && !validPhone) {
      setError(
        /^\+?[\d\s\-().]+$/.test(id)
          ? "Please enter a valid phone number (7-15 digits)."
          : "Please enter a valid email address or phone number.",
      );
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(id, form.password, form.name.trim());
      } else {
        await signIn(id, form.password);
      }
      setBusy(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  };

  const switchMode = (m: "signin" | "signup") => {
    setMode(m);
    setError("");
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      <div
        className="auth-overlay__backdrop"
        onClick={dismissible ? onDismiss : undefined}
      />
      <div className="auth-overlay__card">
        {dismissible && (
          <button
            className="auth-overlay__close"
            onClick={onDismiss}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}

        <div className="auth-overlay__logo">
          <Sparkles size={18} />
        </div>
        <h2 className="auth-overlay__title">
          {mode === "signin" ? "Welcome back" : "Join Rivalry"}
        </h2>
        <p className="auth-overlay__subtitle">
          {mode === "signin"
            ? "Sign in to vote, join contests and track your favorite contestants."
            : "Create a free account to vote, join contests and win prizes."}
        </p>

        <div className="auth-overlay__tabs">
          <button
            className={`auth-overlay__tab ${mode === "signin" ? "auth-overlay__tab--active" : ""}`}
            onClick={() => switchMode("signin")}
          >
            Sign In
          </button>
          <button
            className={`auth-overlay__tab ${mode === "signup" ? "auth-overlay__tab--active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-overlay__form" onSubmit={submit}>
          {mode === "signup" && (
            <label className="auth-overlay__field">
              <UserIcon size={16} />
              <input
                type="text"
                placeholder="Full name"
                value={form.name}
                onChange={set("name")}
                autoComplete="name"
              />
            </label>
          )}
          <label className="auth-overlay__field">
            {identifierIsEmail || form.identifier.trim() === "" ? (
              <Mail size={16} />
            ) : (
              <Phone size={16} />
            )}
            <input
              type="text"
              placeholder="Email or phone number"
              value={form.identifier}
              onChange={set("identifier")}
              autoComplete="username"
            />
          </label>
          <label className="auth-overlay__field">
            <Lock size={16} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={set("password")}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />
            <button
              type="button"
              className="auth-overlay__eye"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </label>

          {error && <p className="auth-overlay__error">{error}</p>}

          <button
            className="auth-overlay__submit"
            type="submit"
            disabled={busy}
          >
            {busy
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="auth-overlay__switch">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => switchMode("signup")}>Sign up free</button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => switchMode("signin")}>Sign in</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
