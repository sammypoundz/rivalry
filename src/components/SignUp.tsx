import { useState, useMemo } from "react";
import { UserPlus, ChevronLeft, Camera, Sparkles } from "lucide-react";
import type { Contestant } from "../data";
import { register, listContests, submitContestant } from "../lib/api";
import "./SignUp.css";

interface SignUpProps {
  onBack: () => void;
  onComplete: (c: Contestant) => void;
}

const HERO_POOL = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-153142718661-ecfd6d936c79?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop",
];

export default function SignUp({ onBack, onComplete }: SignUpProps) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    occupation: "",
    age: "",
    category: "Pageant",
    bio: "",
    photo: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Referral: the signup link may carry ?ref=<userId> (from a contestant's
  // share link) — the new account is then linked to that referrer.
  const referrerId = useMemo(() => {
    const m = window.location.hash.match(/ref=([0-9a-fA-F]{24})/);
    return m ? m[1] : undefined;
  }, []);

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.state.trim()) {
      setError("Name, email and state are required.");
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError("Password is required (at least 6 characters).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      // 1. Create the user account (stores a JWT for future API calls)
      await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.name.trim(),
        referredBy: referrerId,
      });

      // 2. Create the contestant record under the first live contest
      const { contests } = await listContests();
      const contest =
        contests.find((c) => c.status === "voting-live") ?? contests[0];

      let created = null;
      if (contest) {
        const res = await submitContestant(contest.id, {
          number: 1 + (Math.floor(Math.random() * 100000) % 40),
          name: form.name.trim(),
          state: form.state.trim(),
          age: Number(form.age) || 21,
          occupation: form.occupation.trim() || "Contestant",
          bio:
            form.bio.trim() ||
            "New contestant on Rivalry — vote to push me to the top!",
          heroImage: form.photo.trim() || HERO_POOL[0],
          // Hero image is NOT duplicated into the gallery (it's rendered once
          // at the top of the profile) — an empty gallery stays empty.
          voteGoal: 25000,
          votingEndsAt: new Date(
            Date.now() + 2 * 24 * 3600 * 1000,
          ).toISOString(),
        });
        created = res.contestant;
      }

      const id = Math.floor(Math.random() * 100000);
      const hero =
        created?.heroImage || form.photo.trim() || HERO_POOL[id % HERO_POOL.length];
      const contestant: Contestant = {
        id,
        apiId: created?.id,
        number: created?.number ?? 1 + (id % 40),
        name: form.name.trim(),
        state: form.state.trim(),
        age: Number(form.age) || 21,
        occupation: form.occupation.trim() || "Contestant",
        bio:
          form.bio.trim() ||
          "New contestant on Rivalry — vote to push me to the top!",
        heroImage: hero,
        gallery: [], // hero already rendered above the gallery — no duplicates
        votes: 0,
        voteGoal: 25000,
        rank: 5,
        prize: 50000,
        votingEndsAt: Date.now() + 2 * 24 * 3600 * 1000,
      };
      onComplete(contestant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="signup app">
      <header className="signup__header">
        <button className="signup__back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <div className="signup__title">
          <Sparkles size={16} className="signup__spark" />
          <h1>Join the Contest</h1>
          <p>Create your contestant profile</p>
        </div>
      </header>

      <form className="signup__form" onSubmit={submit}>
        <label className="signup__photo">
          <Camera size={18} />
          <span>
            {form.photo ? "Photo URL set ✓" : "Add a hero photo URL (optional)"}
          </span>
          <input
            type="url"
            placeholder="https://..."
            value={form.photo}
            onChange={set("photo")}
          />
        </label>

        <div className="signup__row">
          <input
            className="signup__input"
            placeholder="Full name *"
            value={form.name}
            onChange={set("name")}
          />
          <input
            className="signup__input"
            placeholder="Age"
            type="number"
            min={16}
            max={60}
            value={form.age}
            onChange={set("age")}
          />
        </div>
        <div className="signup__row">
          <input
            className="signup__input"
            placeholder="Email *"
            type="email"
            value={form.email}
            onChange={set("email")}
          />
          <input
            className="signup__input"
            placeholder="Password *"
            type="password"
            value={form.password}
            onChange={set("password")}
          />
          <input
            className="signup__input"
            placeholder="Phone"
            value={form.phone}
            onChange={set("phone")}
          />
        </div>
        <div className="signup__row">
          <input
            className="signup__input"
            placeholder="State / City *"
            value={form.state}
            onChange={set("state")}
          />
          <input
            className="signup__input"
            placeholder="Occupation"
            value={form.occupation}
            onChange={set("occupation")}
          />
        </div>
        <select
          className="signup__input"
          value={form.category}
          onChange={set("category")}
        >
          <option>Pageant</option>
          <option>Talent</option>
          <option>Fashion</option>
          <option>Vendor / Brand</option>
        </select>
        <textarea
          className="signup__input signup__bio"
          placeholder="Tell voters why you deserve the crown..."
          rows={4}
          value={form.bio}
          onChange={set("bio")}
        />

        {referrerId && (
          <p className="signup__note">
            🎉 You were invited by a Rivalry contestant — your referral will be
            credited when you join!
          </p>
        )}

        {error && <p className="signup__error">{error}</p>}
        <button className="signup__submit" type="submit" disabled={submitting}>
          <UserPlus size={18} />
          {submitting ? "Creating profile..." : "Create my profile"}
        </button>
        <p className="signup__note">
          After signup you'll get a personal share link so anyone can vote for
          you instantly.
        </p>
      </form>
      <div className="app__footer-spacer" />
    </div>
  );
}
