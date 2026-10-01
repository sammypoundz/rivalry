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
  Wallet,
  Eye,
} from "lucide-react";
import {
  applyForOrganiser,
  createContest,
  deleteContest,
  getContestRevenue,
  getMyOrganiserApplication,
  listContestants,
  listMyOrganisedContests,
  updateContest,
  uploadImage,
  type OrganiserContest,
} from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import { qk } from "../lib/queries";
import OrganizerDashboardSkeleton from "./OrganizerDashboardSkeleton";
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

export default function OrganizerDashboard({
  onBack,
  onOpenWallet,
}: {
  onBack: () => void;
  /** Open the Wallet tab (linked from the revenue modal). */
  onOpenWallet?: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["organised-contests"],
    queryFn: listMyOrganisedContests,
    enabled: !!user,
    staleTime: 10_000,
  });
  const applicationQuery = useQuery({
    queryKey: ["organiser-application"],
    queryFn: getMyOrganiserApplication,
    enabled: !!user && user.role !== "admin" && user.role !== "organiser",
  });
  const application = applicationQuery.data?.application ?? null;
  const contests = data?.contests ?? [];

  // The user's latest organiser application. While it's "pending" the
  // dashboard shows an under-review notice; an admin must approve before the
  // organiser tools appear. (When approved, role flips to organiser and the
  // gate disappears entirely.)
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    reason: "",
  });
  const [applying, setApplying] = useState(false);
  const [appError, setAppError] = useState("");
  /** Apply form is collapsed until the user taps the entry-point button. */
  const [showApply, setShowApply] = useState(false);
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

  /** Contest whose revenue breakdown is open (banknote icon tap). */
  const [revenueFor, setRevenueFor] = useState<OrganiserContest | null>(null);
  const revenueQuery = useQuery({
    queryKey: ["contest-revenue", revenueFor?.id],
    queryFn: () => getContestRevenue(revenueFor!.id),
    enabled: !!revenueFor,
  });
  /** Contest whose full contestant list is open ("View all" tap). */
  const [rosterFor, setRosterFor] = useState<OrganiserContest | null>(null);
  const rosterQuery = useQuery({
    queryKey: ["contest-roster", rosterFor?.id],
    queryFn: () => listContestants(rosterFor!.id),
    enabled: !!rosterFor,
  });
  /** Contest whose preview modal is open (cover tap). */
  const [previewContest, setPreviewContest] = useState<OrganiserContest | null>(
    null,
  );
  /** Which contest status button is mid-request — shows a preloader on it. */
  const [statusBusy, setStatusBusy] = useState<{ id: string; s: string } | null>(
    null,
  );

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

  const submitApplication = async () => {
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim() || !form.reason.trim()) {
      setAppError("Please fill in every field.");
      return;
    }
    setApplying(true);
    setAppError("");
    try {
      await applyForOrganiser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        reason: form.reason.trim(),
      });
      await applicationQuery.refetch();
      setForm({ fullName: "", email: "", phone: "", reason: "" });
    } catch (err) {
      setAppError(
        err instanceof Error ? err.message : "Could not submit your application",
      );
    } finally {
      setApplying(false);
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
        {/* "New contest" only for users who actually hold organiser
            privileges (admin / approved organiser) — while an application is
            pending the user is gated below and can't create contests. */}
        {mode === "list" &&
          user &&
          (user.role === "admin" || user.role === "organiser") && (
            <button className="orgdash__new" onClick={openCreate}>
              <Plus size={16} /> New contest
            </button>
          )}
      </header>

      {error && <p className="orgdash__error">{error}</p>}

      {/* Non-organiser gate: apply → under review → (admin approves) */}
      {user && user.role !== "admin" && user.role !== "organiser" && (
        <div className="orgdash__gate">
          <Swords size={20} />
          {application?.status === "pending" ? (
            <div>
              <h2>Application under review</h2>
              <p>
                Thanks for applying, {application.fullName}. Our team is
                reviewing your request — once approved you'll be able to create
                and manage your own contests right here.
              </p>
              <p className="orgdash__gate-applied">
                Submitted{"\u00A0"}
                {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : application?.status === "rejected" ? (
            <div>
              <h2>Application declined</h2>
              <p>
                Your previous organiser application was not approved. You can
                update your details and apply again below.
              </p>
            </div>
          ) : (
            <div>
              <h2>Become an organiser</h2>
              <p>
                Apply to unlock the ability to create and run your own
                contests. Applications are reviewed by our team before
                approval.
              </p>
            </div>
          )}
          {/* Entry point — the form stays collapsed until this is tapped */}
          {application?.status !== "pending" && (
            <button
              className="orgdash__upgrade"
              onClick={() => setShowApply((v) => !v)}
              aria-expanded={showApply}
            >
              {showApply ? "Hide form" : "Apply now"}
            </button>
          )}
          {/* The apply form collapses until the user taps the entry point —
              and stays hidden whenever there is already a pending application */}
          {showApply && application?.status !== "pending" && (
            <div className="orgdash__apply-form">
              <div className="orgdash__field-row">
                <label className="orgdash__field">
                  Full name
                  <input
                    value={form.fullName || application?.fullName || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    placeholder="Ada Obi"
                  />
                </label>
                <label className="orgdash__field">
                  Email
                  <input
                    type="email"
                    value={form.email || application?.email || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="ada@example.com"
                  />
                </label>
              </div>
              <div className="orgdash__field-row">
                <label className="orgdash__field">
                  Phone
                  <input
                    value={form.phone || application?.phone || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="0803 000 0000"
                  />
                </label>
                <label className="orgdash__field orgdash__apply-reason">
                  Why do you want to organise contests?
                  <textarea
                    value={form.reason || ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    placeholder="Tell us about the contests you plan to run…"
                    rows={3}
                  />
                </label>
              </div>
              {appError && <p className="orgdash__error">{appError}</p>}
              <button
                className="orgdash__upgrade"
                onClick={submitApplication}
                disabled={applying}
              >
                {applying ? (
                  <Loader2 size={16} className="orgdash__spin" />
                ) : (
                  "Apply"
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "list" && (
        <section className="orgdash__list">
          {isLoading && <OrganizerDashboardSkeleton cards={0} />}
          {!isLoading && contests.length === 0 && (
            <p className="orgdash__empty">
              You haven't created any contests yet. Tap "New contest" to start
              one.
            </p>
          )}
          {contests.map((c) => (
            <div key={c.id} className="orgdash__card">
              <div
                className="orgdash__card-cover"
                role="button"
                tabIndex={0}
                onClick={() => setPreviewContest(c)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setPreviewContest(c);
                }}
                aria-label={`Preview ${c.title}`}
                title="Preview contest"
              >
                <img src={c.coverImage} alt={c.title} loading="lazy" />
                <span className="orgdash__cover-eye">
                  <Eye size={16} /> Preview
                </span>
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
                      <button
                        className="orgdash__roster-more"
                        onClick={() => setRosterFor(c)}
                        aria-label={`View all ${c.contestantCount} contestants`}
                      >
                        +{c.contestantCount - ROSTER_PREVIEW} more
                      </button>
                    )}
                  </div>
                )}
                <div className="orgdash__card-actions">
                  {/* Manual status override — organiser can pin the contest
                      live/upcoming/ended regardless of the timeline. */}
                  {STATUS_OPTIONS.map((s) => {
                    const isBusy = statusBusy?.id === c.id && statusBusy.s === s;
                    return (
                    <button
                      key={s}
                      onClick={async () => {
                        if (s === c.status) return;
                        setStatusBusy({ id: c.id, s });
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
                          setStatusBusy(null);
                        }
                      }}
                      disabled={busy || !!statusBusy || s === c.status}
                      className={
                        s === c.status
                          ? "orgdash__status-btn orgdash__status-btn--active"
                          : "orgdash__status-btn"
                      }
                    >
                      {isBusy && (
                        <Loader2 size={12} className="orgdash__spin" />
                      )}
                      {s === "voting-live"
                        ? "Go Live"
                        : s === "upcoming"
                          ? "Upcoming"
                          : "End"}
                    </button>
                    );
                  })}
                  <button onClick={() => openEdit(c)} disabled={busy}>
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    className="orgdash__revenue-btn"
                    onClick={() => setRevenueFor(c)}
                    aria-label={`View revenue from ${c.title}`}
                    title="Revenue"
                  >
                    <Wallet size={14} /> Revenue
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

      {/* The create/edit form only for approved organisers/admins too —
          a non-organiser can never reach it via "New contest", and if mode
          was already "create" when their application appeared, this guard
          prevents the form from lingering under the pending gate. */}
      {(mode === "create" || mode === "edit") &&
        (!user || user.role === "admin" || user.role === "organiser") && (
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

      {/* Revenue breakdown modal — opened by the Wallet icon on a card */}
      {revenueFor && (
        <div className="orgdash__modal" onClick={() => setRevenueFor(null)}>
          <div
            className="orgdash__modal-card orgdash__revenue-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Revenue</h3>
            <p className="orgdash__info-contest">
              <Swords size={13} /> {revenueFor.title}
            </p>
            {revenueQuery.isLoading ? (
              <Loader2 size={20} className="orgdash__spin orgdash__revenue-loading" />
            ) : revenueQuery.error ? (
              <p className="orgdash__error">
                {revenueQuery.error instanceof Error
                  ? revenueQuery.error.message
                  : "Could not load revenue"}
              </p>
            ) : revenueQuery.data ? (
              <>
                <div className="orgdash__revenue-total">
                  <strong>{naira(revenueQuery.data.revenue.total)}</strong>
                  <span>Total generated</span>
                </div>
                <div className="orgdash__revenue-rows">
                  <div className="orgdash__revenue-row">
                    <span>Votes ({revenueQuery.data.revenue.votes.toLocaleString()} × {naira(revenueFor.votePrice ?? 100)})</span>
                    <strong>{naira(revenueQuery.data.revenue.voteRevenue)}</strong>
                  </div>
                  <div className="orgdash__revenue-row">
                    <span>
                      Entry fees ({revenueQuery.data.revenue.contestants} ×{" "}
                      {revenueFor.entryFee ? naira(revenueFor.entryFee) : "₦0"})
                    </span>
                    <strong>{naira(revenueQuery.data.revenue.entryRevenue)}</strong>
                  </div>
                </div>
                {!revenueFor.entryFee && (
                  <p className="orgdash__revenue-note">
                    Free-entry contest — no entry fees collected.
                  </p>
                )}
                {onOpenWallet && (
                  <button
                    className="orgdash__wallet-link"
                    onClick={() => {
                      setRevenueFor(null);
                      onOpenWallet();
                    }}
                  >
                    <Wallet size={14} /> View in Wallet
                  </button>
                )}
              </>
            ) : null}
            <button
              className="orgdash__modal-cancel orgdash__info-close"
              onClick={() => setRevenueFor(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Full contestant list modal — opened by the "+N more" roster button */}
      {rosterFor && (
        <div className="orgdash__modal" onClick={() => setRosterFor(null)}>
          <div
            className="orgdash__modal-card orgdash__roster-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Contestants</h3>
            <p className="orgdash__info-contest">
              <Swords size={13} /> {rosterFor.title}
            </p>
            {rosterQuery.isLoading ? (
              <Loader2 size={20} className="orgdash__spin orgdash__revenue-loading" />
            ) : rosterQuery.error ? (
              <p className="orgdash__error">
                {rosterQuery.error instanceof Error
                  ? rosterQuery.error.message
                  : "Could not load contestants"}
              </p>
            ) : (
              <ul className="orgdash__roster-list">
                {(rosterQuery.data?.contestants ?? []).map((ct) => (
                  <li key={ct.id} className="orgdash__roster-item">
                    <img src={ct.heroImage} alt={ct.name} loading="lazy" />
                    <div className="orgdash__roster-item-info">
                      <span>#{ct.number} {ct.name}</span>
                      <small>{ct.votes.toLocaleString()} votes</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              className="orgdash__modal-cancel orgdash__info-close"
              onClick={() => setRosterFor(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Contest preview modal — opened by tapping the cover */}
      {previewContest && (
        <div
          className="orgdash__modal"
          onClick={() => setPreviewContest(null)}
        >
          <div
            className="orgdash__modal-card orgdash__preview-card"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              className="orgdash__preview-cover"
              src={previewContest.coverImage}
              alt={previewContest.title}
            />
            <h3>{previewContest.title}</h3>
            <p className="orgdash__preview-tagline">
              {previewContest.tagline}
            </p>
            <div className="orgdash__info-stats">
              <div>
                <strong>{previewContest.contestantCount}</strong>
                <span>Contestants</span>
              </div>
              <div>
                <strong>
                  {previewContest.totalVotes.toLocaleString()}
                </strong>
                <span>Votes</span>
              </div>
              <div>
                <strong>
                  {previewContest.rewards[0]
                    ? naira(previewContest.rewards[0].amount)
                    : "—"}
                </strong>
                <span>Top prize</span>
              </div>
            </div>
            <p className="orgdash__info-meta">
              <Clock size={13} /> {fmtLeft(previewContest.endsAt)} ·{" "}
              <Vote size={13} /> {naira(previewContest.votePrice ?? 100)} / vote
            </p>
            {previewContest.contestants.length > 0 && (
              <div className="orgdash__card-roster orgdash__preview-roster">
                {previewContest.contestants
                  .slice(0, ROSTER_PREVIEW)
                  .map((ct) => (
                    <img
                      key={ct.id}
                      src={ct.heroImage}
                      alt={ct.name}
                      loading="lazy"
                    />
                  ))}
              </div>
            )}
            <div className="orgdash__preview-actions">
              <button
                className="orgdash__preview-edit"
                onClick={() => {
                  setPreviewContest(null);
                  openEdit(previewContest);
                }}
              >
                <Pencil size={14} /> Edit contest
              </button>
              <button
                className="orgdash__modal-cancel"
                onClick={() => setPreviewContest(null)}
              >
                Close
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
