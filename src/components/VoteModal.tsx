import { useEffect, useMemo, useState } from "react";
import {
  X,
  Minus,
  Plus,
  ShieldCheck,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { castVote } from "../lib/api";
import { formatNaira } from "../data";
import "./VoteModal.css";

/** Price per vote in Naira. */
export const VOTE_PRICE = 100;

/**
 * SIMULATED PAYMENT — replace this with your real gateway (Paystack,
 * Flutterwave, etc.). It should resolve when payment succeeds and reject
 * when it fails/cancelled. The rest of the flow stays the same.
 */
function processPayment(_amountNaira: number): Promise<{ reference: string }> {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ reference: `SIM-${Date.now().toString(36).toUpperCase()}` }),
      1400,
    );
  });
}

interface VoteModalProps {
  contestantId: string; // API (ObjectId) id used for voting
  contestantName: string;
  contestantImage: string;
  onClose: () => void;
  onVoted: (newTotal: number, votesAdded: number) => void;
}

type Stage = "form" | "paying" | "done";

export default function VoteModal({
  contestantId,
  contestantName,
  contestantImage,
  onClose,
  onVoted,
}: VoteModalProps) {
  const [name, setName] = useState("");
  const [votes, setVotes] = useState(10);
  const [stage, setStage] = useState<Stage>("form");
  const [error, setError] = useState<string | null>(null);
  const [totalAfter, setTotalAfter] = useState(0);

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
      if (e.key === "Escape" && stage === "form") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, onClose]);

  const total = useMemo(() => votes * VOTE_PRICE, [votes]);

  const isValidId = /^[0-9a-fA-F]{24}$/.test(contestantId);

  const processVote = async () => {
    if (stage !== "form") return;
    if (!isValidId) {
      setError("Demo mode: voting opens when connected to the live contest.");
      return;
    }
    setStage("paying");
    setError(null);
    try {
      // 1. Take the payment (simulated for now)
      const payment = await processPayment(total);
      // 2. Credit the votes on the backend
      const res = await castVote(contestantId, {
        amount: votes,
        supporterName: name.trim() || "Anonymous",
        reference: payment.reference,
      });
      setTotalAfter(res.contestantVotes);
      setStage("done");
      onVoted(res.contestantVotes, votes);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Payment could not be completed. Please try again.",
      );
      setStage("form");
    }
  };

  const quick = [10, 50, 100, 500];

  return (
    <div
      className="vote-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Vote for ${contestantName}`}
    >
      <div
        className="vote-modal__backdrop"
        onClick={stage === "form" ? onClose : undefined}
      />
      <div className="vote-modal__card">
        <button
          className="vote-modal__close"
          aria-label="Close"
          onClick={stage === "form" ? onClose : undefined}
          disabled={stage !== "form"}
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
                  {votes} vote{votes > 1 ? "s" : ""} × {formatNaira(VOTE_PRICE)}
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
              onClick={processVote}
              disabled={stage === "paying"}
            >
              {stage === "paying" ? (
                <>
                  <Loader2 size={16} className="vote-modal__spinner" />
                  Processing payment…
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Pay {formatNaira(total)} &amp; Vote
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
