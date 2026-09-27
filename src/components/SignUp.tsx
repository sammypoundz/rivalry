import { useState, useMemo, useRef } from "react";
import { UserPlus, ChevronLeft, Camera, Sparkles } from "lucide-react";
import type { Contestant } from "../data";
import { register, listContests, submitContestant, uploadImage } from "../lib/api";
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
  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  // Pick a photo from the device, upload it to Cloudinary and use the CDN
  // URL as the contestant's hero image. Falls back to a URL paste for
  // desktop users who already have a link.
  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, etc.).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Photo is too large — please pick one under 8 MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file"));
        reader.readAsDataURL(file);
      });
      const res = await uploadImage(dataUrl);
      setForm((f) => ({ ...f, photo: res.url }));
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? `Photo upload failed: ${err.message}`
          : "Photo upload failed — please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

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
          // `number` is globally unique in the DB — wide-range pick avoids
          // colliding with existing contestants (backend also retries).
          number: 100000 + Math.floor(Math.random() * 899999),
          name: form.name.trim(),
          state: form.state.trim(),
          age: Number(form.age) || 21,
          occupation: form.occupation.trim() || "Contestant",
          bio:
            form.bio.trim() ||
            "New contestant on Rivalry — vote to push me to the top!",
          heroImage: form.photo.trim() || HERO_POOL[0],
          // The signup photo is also seeded into the gallery (the backend does
          // the same) so the owner can manage it from MySpace.
          gallery: [form.photo.trim() || HERO_POOL[0]],
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
        // The contestant's own photo lives in the gallery too so it can be
        // managed (liked/deleted) from MySpace. The public gallery view
        // filters the hero out, so it never renders twice on the profile.
        gallery: [hero],
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
            {uploading
              ? "Uploading photo..."
              : form.photo
                ? "Photo added ✓"
                : "Add a photo from your device (optional)"}
          </span>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={pickPhoto}
          />
          <button
            type="button"
            className="signup__photo-btn"
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
          >
            {form.photo ? "Change photo" : "Choose photo"}
          </button>
          {form.photo && (
            <img className="signup__photo-preview" src={form.photo} alt="Your photo" />
          )}
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
