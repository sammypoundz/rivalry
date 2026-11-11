import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Minus,
  Plus,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Copy,
  Landmark,
  RefreshCw,
} from "lucide-react";
import {
  createVoteAccount,
  getContestant,
  getPaymentStatus,
  verifyPayment,
  type ApiPaymentIntent,
} from "../lib/api";
import { formatNaira } from "../data";
import "./VoteModal.css";

/** Fallback price per vote in Naira when a contest doesn't set its own. */
export const VOTE_PRICE = 100;

interface VoteModalProps {
  contestantId: string; // API (ObjectId) id used for voting
  contestantName: string;
  contestantImage: string;
  /** Price per vote for this contest (set by its organiser). */
  votePrice?: number;
  onClose: () => void;
  onVoted: (newTotal: number, votesAdded: number) => void;
}

type Stage = "form" | "generating" | "transfer" | "done";

export default function VoteModal({
  contestantId,
  contestantName,
  contestantImage,
  votePrice,
  onClose,
  onVoted,
}: VoteModalProps) {
  const [name, setName] = useState("");
  const [votes, setVotes] = useState(10);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [totalAfter, setTotalAfter] = useState(0);
  const [payment, setPayment] = useState<ApiPaymentIntent | null>(null);
  const [copied, setCopied] = useState<"account" | "amount" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyNote, setVerifyNote] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Lock body scroll while the modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Escape to close (only before payment starts)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stage === "transfer") cancelPayment();
      else if (stage === "form" || stage === "done") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onClose]);

  // Stop polling if the modal unmounts
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  const price = votePrice && votePrice > 0 ? votePrice : VOTE_PRICE;

  const total = useMemo(() => votes * price, [votes, price]);

  const isValidId = /^[0-9a-fA-F]{24}$/.test(contestantId);

  /**
   * Step 1 of payment: ask the backend for a DYNAMIC virtual account from
   * KoboPoint, dedicated to exactly this vote batch. Once shown, we poll the
   * payment status until the transfer lands (webhook or verification).
   */
  const generateAccount = async () => {
    if (stage !== "form") return;
    if (!isValidId) {
      setError("Demo mode: voting opens when connected to the live contest.");
      return;
    }
    setStage("generating");
    setError(null);
    try {
      const res = await createVoteAccount({
        contestantId,
        votes,
        supporterName: name.trim() || "Anonymous",
      });
      setPayment(res.payment);
      setStage("transfer");
      startPolling(res.payment.reference);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate a payment account. Please try again.",
      );
      setStage("form");
    }
  };

  /**
   * Step 2: watch the payment until the transfer arrives, then credit the
   * votes locally (the backend has already credited them by this point).
   * Polls every 3s AND the supporter can force a check with the button.
   */
  const startPolling = (reference: string) => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await getPaymentStatus(reference);
        if (res.payment.status === "paid") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          markPaid(res.payment);
        }
      } catch {
        /* transient network errors — keep polling */
      }
    }, 3000);
  };

  /** Flip to the success screen once the backend reports the votes paid. */
  const markPaid = (p: ApiPaymentIntent) => {
    setPayment(p);
    setTotalAfter(p.votes);
    setStage("done");
    // Fetch the contestant's fresh total (backend already credited it)
    getContestant(contestantId)
      .then((c) => onVoted(c.contestant.votes, p.votes))
      .catch(() => onVoted(p.votes, p.votes));
  };

  /**
   * The supporter taps this after sending the transfer — actively asks the
   * backend to check KoboPoint for the payment and credit instantly.
   */
  const manualVerify = async () => {
    if (!payment || verifying) return;
    setVerifying(true);
    setVerifyNote(null);
    try {
      const res = await verifyPayment(payment.reference);
      if (res.payment.status === "paid") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        markPaid(res.payment);
      } else {
        setVerifyNote(
          "No payment found yet. If you've just sent it, give it ~30 seconds and try again — transfers can take a minute to reflect.",
        );
      }
    } catch {
      setVerifyNote("Couldn't check right now — please try again in a moment.");
    } finally {
      setVerifying(false);
    }
  };

  const copy = async (text: string, which: "account" | "amount") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  /** While waiting for a transfer, closing means cancelling — stop polling
   *  and go back to the form (or leave the modal entirely). */
  const cancelPayment = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    setPayment(null);
    setError(null);
    setStage("form");
  };

  // Can leave the modal entirely: before starting, or once finished.
  const closable = stage === "form" || stage === "done";

  const quick = [10, 50, 100, 500];

  return (
    <div
      className="vote-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Vote for ${contestantName}`}
    >
      <div className="vote-modal__backdrop" onClick={closable ? onClose : undefined} />
      <div className="vote-modal__card">
        <button
          className="vote-modal__close"
          aria-label={closable ? "Close" : "Cancel this payment"}
          onClick={closable ? onClose : cancelPayment}
          disabled={!closable && stage === "generating"}
        >
          <X size={16} />
        </button>

        <div className="vote-modal__head">
          <img src={contestantImage} alt={contestantName} />
          <div>
            <h3>Vote for {contestantName}</h3>
            <p>No account needed — vote as a guest</p>
          </div>
        </div>

        {stage === "done" ? (
          <div className="vote-modal__success">
            <CheckCircle2 size={44} />
            <h4>Thank you! 🎉</h4>
            <p>
              Your {votes} vote{votes > 1 ? "s" : ""} ({formatNaira(total)}) for{" "}
              {contestantName} was successful.
            </p>
            <p className="vote-modal__success-total">
              New total: <strong>{totalAfter.toLocaleString()} votes</strong>
            </p>
            <button className="vote-modal__pay" onClick={onClose}>
              Done
            </button>
          </div>
        ) : stage === "transfer" && payment ? (
          <div className="vote-modal__transfer">
            <p className="vote-modal__transfer-hint">
              Transfer <strong>{formatNaira(payment.amount)}</strong> to this
              one-time account. Your {payment.votes} vote
              {payment.votes > 1 ? "s" : ""} will be credited automatically
              the moment it lands.
            </p>
            <div className="vote-modal__account">
              <div className="vote-modal__account-row">
                <Landmark size={16} />
                <span>{payment.bankName || "Bank"}</span>
              </div>
              <button
                className="vote-modal__account-number"
                onClick={() => copy(payment.accountNumber, "account")}
                title="Tap to copy"
              >
                {payment.accountNumber}
                {copied === "account" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <Copy size={14} />
                )}
              </button>
              <p className="vote-modal__account-name">{payment.accountName}</p>
              <button
                className="vote-modal__copy-amount"
                onClick={() => copy(String(payment.amount), "amount")}
              >
                {copied === "amount" ? "Copied ✓" : `Copy ${formatNaira(payment.amount)}`}
              </button>
            </div>
            <div className="vote-modal__waiting">
              <Loader2 size={14} className="vote-modal__spinner" />
              Waiting for your transfer…
            </div>

            <button
              className="vote-modal__verify"
              onClick={manualVerify}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 size={16} className="vote-modal__spinner" />
                  Checking payment…
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  I've sent the money — Verify now
                </>
              )}
            </button>
            {verifyNote && <p className="vote-modal__verify-note">{verifyNote}</p>}
            <p className="vote-modal__note">
              This account is for this payment only and expires in 60 minutes.
              Transfer the exact amount from any Nigerian bank app.
            </p>
            <button className="vote-modal__cancel" onClick={cancelPayment}>
              Cancel this payment
            </button>
          </div>
        ) : (
          <>
            <label className="vote-modal__label" htmlFor="vm-name">
              Display name on the vote
            </label>
            <input
              id="vm-name"
              className="vote-modal__input"
              placeholder="e.g. Chidi Oke"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              disabled={stage !== "form"}
            />

            <label className="vote-modal__label">Number of votes</label>
            <div className="vote-modal__stepper">
              <button
                aria-label="Decrease votes"
                onClick={() => setVotes((v) => Math.max(1, v - 1))}
                disabled={stage !== "form" || votes <= 1}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                max={1000}
                value={votes}
                onChange={(e) =>
                  setVotes(
                    Math.max(1, Math.min(1000, Number(e.target.value) || 1)),
                  )
                }
                disabled={stage !== "form"}
              />
              <button
                aria-label="Increase votes"
                onClick={() => setVotes((v) => Math.min(1000, v + 1))}
                disabled={stage !== "form"}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="vote-modal__quick">
              {quick.map((q) => (
                <button
                  key={q}
                  className={votes === q ? "is-active" : ""}
                  onClick={() => setVotes(q)}
                  disabled={stage !== "form"}
                >
                  {q} votes
                </button>
              ))}
            </div>

            <div className="vote-modal__summary">
              <div className="vote-modal__line">
                <span>
                  {votes} vote{votes > 1 ? "s" : ""} × {formatNaira(price)}
                </span>
                <strong>{formatNaira(total)}</strong>
              </div>
              <div className="vote-modal__line vote-modal__line--total">
                <span>Total to pay</span>
                <strong>{formatNaira(total)}</strong>
              </div>
            </div>

            {error && <p className="vote-modal__error">{error}</p>}

            <button
              className="vote-modal__pay"
              onClick={generateAccount}
              disabled={stage === "generating"}
            >
              {stage === "generating" ? (
                <>
                  <Loader2 size={16} className="vote-modal__spinner" />
                  Generating account…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Continue — Pay {formatNaira(total)}
                </>
              )}
            </button>
            {!isValidId && (
              <p className="vote-modal__note">
                Demo mode: voting opens when connected to the live contest.
              </p>
            )}
            <p className="vote-modal__secure">
              <ShieldCheck size={12} /> Secured payment · votes are credited
              instantly
            </p>
          </>
        )}
      </div>
    </div>
  );
}
