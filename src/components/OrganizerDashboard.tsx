import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Plus,
  Swords,
  Users,
  Vote,
  Clock,
  Trophy,
  Trash2,
  Pencil,
  Loader2,
  CalendarDays,
  ImagePlus,
  Ticket,
} from "lucide-react";
import {
  becomeOrganiser,
  createContest,
  deleteContest,
  listMyOrganisedContests,
  updateContest,
  uploadImage,
  type OrganiserContest,
} from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { qk } from "../lib/queries";
import "./OrganizerDashboard.css";

/** Contestant shown in the roster-preview info modal. */
interface RosterContestant {
  id: string;
  name: string;
  number: number;
  heroImage: string;
  votes: number;
}

/** At most this many contestants are previewed per contest card. */
const ROSTER_PREVIEW = 5;

const naira = (n: number) => `₦${n.toLocaleString()}`;
const toDateInput = (iso?: string | null) =>
  iso ? new Date(iso).toISOString().slice(0, 16) : "";
const fmtLeft = (iso: string) => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
};

const STATUS_OPTIONS = ["upcoming", "voting-live", "ended"] as const;
const CATEGORY_OPTIONS = [
  "Pageant",
  "Talent",
  "Fashion",
  "Vendor / Brand",
] as const;

/** Editable fields of one contest, driven by the create/edit form. */
interface Draft {
  title: string;
  tagline: string;
  category: string;
  coverImage: string;
  status: string;
  votePrice: string;
  isFree: boolean;
  entryFee: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  reward1: string;
  reward2: string;
  reward3: string;
}

const emptyDraft: Draft = {
  title: "",
  tagline: "",
  category: "Pageant",
  coverImage: "",
  status: "voting-live",
  votePrice: "100",
  isFree: true,
  entryFee: "",
  startsAt: "",
  endsAt: "",
  reward1: "",
  reward2: "",
  reward3: "",
};

/** Turn a stored contest into an editable draft for the form. */
const draftFrom = (c: OrganiserContest): Draft => ({
  title: c.title,
  tagline: c.tagline ?? "",
  category: c.category || "Pageant",
  coverImage: c.coverImage ?? "",
  status: c.status || "upcoming",
  votePrice: c.votePrice != null ? String(c.votePrice) : "100",
  isFree: !c.entryFee,
  entryFee: c.entryFee ? String(c.entryFee) : "",
  startsAt: toDateInput(c.startsAt),
  endsAt: toDateInput(c.endsAt),
  reward1: c.rewards[0] ? String(c.rewards[0].amount) : "",
  reward2: c.rewards[1] ? String(c.rewards[1].amount) : "",
  reward3: c.rewards[2] ? String(c.rewards[2].amount) : "",
});

export default function OrganizerDashboard({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["organised-contests"],
    queryFn: listMyOrganisedContests,
    enabled: !!user,
    staleTime: 10_000,
  });
  const contests = data?.contests ?? [];

  const [upgrading, setUpgrading] = useState(false);
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** Contestant whose info card is open (roster avatar tap). */
  const [preview, setPreview] = useState<{
    contestant: RosterContestant;
    contest: OrganiserContest;
  } | null>(null);

  const set = (k: keyof Draft) => (v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const openCreate = () => {
    setDraft({ ...emptyDraft });
    setEditingId(null);
    setMode("create");
    setError("");
  };

  const openEdit = (c: OrganiserContest) => {
    setDraft(draftFrom(c));
    setEditingId(c.id);
    setMode("edit");
    setError("");
  };

  const upgradeToOrganiser = async () => {
    setUpgrading(true);
    setError("");
    try {
      await becomeOrganiser();
      await refetch();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not become an organiser",
      );
    } finally {
      setUpgrading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.title.trim() || !draft.endsAt) {
      setError("Title and end date are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const rewards = [draft.reward1, draft.reward2, draft.reward3]
        .map((v, i) => ({
          position: `${i + 1}st Place`
            .replace("1st", "1st")
            .replace(/^2st/, "2nd")
            .replace(/^3st/, "3rd"),
          amount: Number(v) || 0,
          perk: "",
        }))
        .filter((r) => r.amount > 0);
      const input = {
        title: draft.title.trim(),
        tagline:
          draft.tagline.trim() || "Join the contest and rally your supporters!",
        category: draft.category,
        coverImage: draft.coverImage.trim() || undefined,
        status: draft.status,
        votePrice: Number(draft.votePrice) || 100,
        entryFee: draft.isFree ? 0 : Number(draft.entryFee) || 0,
        startsAt: draft.startsAt
          ? new Date(draft.startsAt).toISOString()
          : undefined,
        endsAt: new Date(draft.endsAt).toISOString(),
        rewards,
      };
      if (mode === "edit" && editingId) {
        await updateContest(editingId, input);
      } else {
        await createContest(input);
      }
      setMode("list");
      setEditingId(null);
      await refetch();
      // The public contest list (Home/Contests screens) caches under qk.contests
      // — invalidate it so the new/edited contest shows up WITHOUT a page
      // refresh. The mutation event alone can miss it while this screen's own
      // query is mid-refetch, so invalidate explicitly.
      await queryClient.invalidateQueries({ queryKey: qk.contests });
      await queryClient.invalidateQueries({ queryKey: ["organised-contests"] });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the contest",
      );
    } finally {
      setBusy(false);
    }
  };

  /** Pick a cover image from the device and upload it to the CDN. */
  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setUploadingCover(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the image"));
        reader.readAsDataURL(file);
      });
      const { url } = await uploadImage(dataUrl);
      setDraft((d) => ({ ...d, coverImage: url }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Image upload failed",
      );
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setBusy(true);
    setError("");
    try {
      await deleteContest(deletingId);
      setDeletingId(null);
      await refetch();
      // Keep the public contest list in sync after a deletion too.
      await queryClient.invalidateQueries({ queryKey: qk.contests });
      await queryClient.invalidateQueries({ queryKey: ["organised-contests"] });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete the contest",
      );
      setDeletingId(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="orgdash app">
      <header className="orgdash__header">
        <button className="orgdash__back" onClick={onBack} aria-label="Back">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="orgdash__title">Organiser Dashboard</h1>
          <p className="orgdash__sub">Create and manage your contests</p>
        </div>
        {mode === "list" && (
          <button className="orgdash__new" onClick={openCreate}>
            <Plus size={16} /> New contest
          </button>
        )}
      </header>

      {error && <p className="orgdash__error">{error}</p>}

      {/* Signed-in user who is not yet an organiser: self-upgrade gate */}
      {user && user.role !== "admin" && user.role !== "organiser" && (
        <div className="orgdash__gate">
          <Swords size={20} />
          <div>
            <h2>Become an organiser</h2>
            <p>
              Unlock the ability to create and run your own contests. Any
              signed-in account can upgrade instantly.
            </p>
          </div>
          <button
            className="orgdash__upgrade"
            onClick={upgradeToOrganiser}
            disabled={upgrading}
          >
            {upgrading ? (
              <Loader2 size={16} className="orgdash__spin" />
            ) : (
              "Upgrade"
            )}
          </button>
        </div>
      )}

      {mode === "list" && (
        <section className="orgdash__list">
          {isLoading && (
            <p className="orgdash__loading">Loading your contests…</p>
          )}
          {!isLoading && contests.length === 0 && (
            <p className="orgdash__empty">
              You haven't created any contests yet. Tap "New contest" to start
              one.
            </p>
          )}
          {contests.map((c) => (
            <div key={c.id} className="orgdash__card">
              <div className="orgdash__card-cover">
                <img src={c.coverImage} alt={c.title} loading="lazy" />
                <span className={`orgdash__badge orgdash__badge--${c.status}`}>
                  {c.status === "voting-live"
                    ? "Voting Live"
                    : c.status === "upcoming"
                      ? "Upcoming"
                      : "Ended"}
                </span>
                <span
                  className={`orgdash__badge orgdash__badge--entry ${
                    c.entryFee ? "orgdash__badge--paid" : "orgdash__badge--free"
                  }`}
                >
                  {c.entryFee ? `₦${c.entryFee.toLocaleString()} entry` : "Free entry"}
                </span>
              </div>
              <div className="orgdash__card-body">
                <h2>{c.title}</h2>
                <p className="orgdash__card-tagline">{c.tagline}</p>
                <div className="orgdash__card-meta">
                  <span>
                    <Users size={13} /> {c.contestantCount} contestants
                  </span>
                  <span>
                    <Vote size={13} /> {c.totalVotes.toLocaleString()} votes
                  </span>
                  <span>
                    <Clock size={13} /> {fmtLeft(c.endsAt)}
                  </span>
                  <span>
                    <Vote size={13} /> {naira(c.votePrice ?? 100)} / vote
                  </span>
                </div>
                {c.rewards.length > 0 && (
                  <p className="orgdash__card-prize">
                    <Trophy size={13} /> Top prize {naira(c.rewards[0].amount)}
                  </p>
                )}
                {c.contestants.length > 0 && (
                  <div className="orgdash__card-roster">
                    {c.contestants.slice(0, ROSTER_PREVIEW).map((ct) => (
                      <button
                        key={ct.id}
                        className="orgdash__roster-btn"
                        onClick={() => setPreview({ contestant: ct, contest: c })}
                        aria-label={`View ${ct.name}`}
                      >
                        <img
                          src={ct.heroImage}
                          alt={ct.name}
                          loading="lazy"
                        />
                      </button>
                    ))}
                    {c.contestantCount > ROSTER_PREVIEW && (
                      <span className="orgdash__card-more">
                        +{c.contestantCount - ROSTER_PREVIEW}
                      </span>
                    )}
                  </div>
                )}
                <div className="orgdash__card-actions">
                  {/* Manual status override — organiser can pin the contest
                      live/upcoming/ended regardless of the timeline. */}
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={async () => {
                        if (s === c.status) return;
                        setBusy(true);
                        setError("");
                        try {
                          await updateContest(c.id, { status: s });
                          await refetch();
                          await queryClient.invalidateQueries({
                            queryKey: qk.contests,
                          });
                        } catch (err) {
                          setError(
                            err instanceof Error
                              ? err.message
                              : "Could not update status",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={busy || s === c.status}
                      className={
                        s === c.status
                          ? "orgdash__status-btn orgdash__status-btn--active"
                          : "orgdash__status-btn"
                      }
                    >
                      {s === "voting-live"
                        ? "Go Live"
                        : s === "upcoming"
                          ? "Upcoming"
                          : "End"}
                    </button>
                  ))}
                  <button onClick={() => openEdit(c)} disabled={busy}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="orgdash__delete"
                    onClick={() => setDeletingId(c.id)}
                    disabled={busy}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {(mode === "create" || mode === "edit") && (
        <section className="orgdash__form">
          <h2>{mode === "create" ? "Create contest" : "Edit contest"}</h2>
          <label className="orgdash__field">
            Title *
            <input
              value={draft.title}
              onChange={(e) => set("title")(e.target.value)}
              placeholder="e.g. Face of Rivalry 2025"
            />
          </label>
          <label className="orgdash__field">
            Tagline
            <input
              value={draft.tagline}
              onChange={(e) => set("tagline")(e.target.value)}
              placeholder="One line to sell the contest"
            />
          </label>
          <div className="orgdash__field-row">
            <label className="orgdash__field">
              Category
              <select
                value={draft.category}
                onChange={(e) => set("category")(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="orgdash__field">
              Status
              <select
                value={draft.status}
                onChange={(e) => set("status")(e.target.value)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "voting-live"
                      ? "Voting live"
                      : s === "upcoming"
                        ? "Upcoming"
                        : "Ended"}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="orgdash__field-row">
            <label className="orgdash__field">
              <CalendarDays size={13} /> Starts
              <input
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => set("startsAt")(e.target.value)}
              />
            </label>
            <label className="orgdash__field">
              <CalendarDays size={13} /> Ends *
              <input
                type="datetime-local"
                value={draft.endsAt}
                onChange={(e) => set("endsAt")(e.target.value)}
              />
            </label>
          </div>
          <label className="orgdash__field orgdash__cover-field">
            Cover image
            <div className="orgdash__cover-picker">
              {draft.coverImage ? (
                <img
                  className="orgdash__cover-preview"
                  src={draft.coverImage}
                  alt="Cover preview"
                />
              ) : (
                <div className="orgdash__cover-preview orgdash__cover-preview--empty">
                  <ImagePlus size={22} />
                  <span>No image yet</span>
                </div>
              )}
              <button
                type="button"
                className="orgdash__cover-btn"
                onClick={() => coverFileRef.current?.click()}
                disabled={uploadingCover || busy}
              >
                {uploadingCover ? (
                  <Loader2 size={15} className="orgdash__spin" />
                ) : (
                  <ImagePlus size={15} />
                )}
                {uploadingCover ? "Uploading…" : "Upload from device"}
              </button>
              <input
                ref={coverFileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickCover(e.target.files?.[0])}
              />
            </div>
          </label>
          <p className="orgdash__field-label">Prize rewards (₦)</p>
          <div className="orgdash__field-row">
            <label className="orgdash__field">
              Vote price (₦)
              <input
                type="number"
                min={1}
                max={100000}
                value={draft.votePrice}
                onChange={(e) => set("votePrice")(e.target.value)}
                placeholder="100"
              />
            </label>
            <label className="orgdash__field">
              1st place
              <input
                type="number"
                min={0}
                value={draft.reward1}
                onChange={(e) => set("reward1")(e.target.value)}
                placeholder="5000000"
              />
            </label>
            <label className="orgdash__field">
              2nd place
              <input
                type="number"
                min={0}
                value={draft.reward2}
                onChange={(e) => set("reward2")(e.target.value)}
                placeholder="2000000"
              />
            </label>
            <label className="orgdash__field">
              3rd place
              <input
                type="number"
                min={0}
                value={draft.reward3}
                onChange={(e) => set("reward3")(e.target.value)}
                placeholder="1000000"
              />
            </label>
          </div>
          <div className="orgdash__entry-toggle">
            <button
              type="button"
              className={`orgdash__entry-opt${draft.isFree ? " orgdash__entry-opt--active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, isFree: true }))}
            >
              <Ticket size={14} /> Free entry
            </button>
            <button
              type="button"
              className={`orgdash__entry-opt${!draft.isFree ? " orgdash__entry-opt--active" : ""}`}
              onClick={() => setDraft((d) => ({ ...d, isFree: false }))}
            >
              <Ticket size={14} /> Entry fee
            </button>
            {!draft.isFree && (
              <label className="orgdash__field orgdash__entry-amount">
                Amount (₦)
                <input
                  type="number"
                  min={1}
                  max={1000000}
                  value={draft.entryFee}
                  onChange={(e) => set("entryFee")(e.target.value)}
                  placeholder="e.g. 1000"
                />
              </label>
            )}
          </div>
          <div className="orgdash__form-actions">
            <button
              className="orgdash__save"
              onClick={saveDraft}
              disabled={busy}
            >
              {busy ? <Loader2 size={16} className="orgdash__spin" /> : null}
              {mode === "create" ? "Create contest" : "Save changes"}
            </button>
            <button
              className="orgdash__cancel"
              onClick={() => {
                setMode("list");
                setEditingId(null);
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Delete confirmation */}
      {deletingId && (
        <div className="orgdash__modal" onClick={() => setDeletingId(null)}>
          <div
            className="orgdash__modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete this contest?</h3>
            <p>
              The contest and its roster will be removed permanently. This
              cannot be undone.
            </p>
            <div className="orgdash__modal-actions">
              <button
                className="orgdash__modal-cancel"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
              <button
                className="orgdash__modal-danger"
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 size={15} className="orgdash__spin" />
                ) : (
                  <Trash2 size={15} />
                )}{" "}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contestant info modal — opened by tapping a roster avatar */}
      {preview && (
        <div className="orgdash__modal" onClick={() => setPreview(null)}>
          <div
            className="orgdash__modal-card orgdash__info-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="orgdash__info-photo"
              src={preview.contestant.heroImage}
              alt={preview.contestant.name}
            />
            <h3>
              #{preview.contestant.number} {preview.contestant.name}
            </h3>
            <p className="orgdash__info-contest">
              <Swords size={13} /> {preview.contest.title}
            </p>
            <div className="orgdash__info-stats">
              <div>
                <strong>{preview.contestant.votes.toLocaleString()}</strong>
                <span>Votes</span>
              </div>
              <div>
                <strong>
                  {preview.contest.totalVotes
                    ? Math.round(
                        (preview.contestant.votes /
                          preview.contest.totalVotes) *
                          100,
                      )
                    : 0}
                  %
                </strong>
                <span>Of contest total</span>
              </div>
              <div>
                <strong>{preview.contest.contestantCount}</strong>
                <span>Contestants</span>
              </div>
            </div>
            <p className="orgdash__info-meta">
              <Vote size={13} /> {naira(preview.contest.votePrice ?? 100)} per vote
              · <Clock size={13} /> {fmtLeft(preview.contest.endsAt)}
            </p>
            <button
              className="orgdash__modal-cancel orgdash__info-close"
              onClick={() => setPreview(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="app__footer-spacer" />
    </div>
  );
}
