import { useState, useEffect } from "react";
import { Heart, Share2, X, Copy, Check, Link2 } from "lucide-react";
import { profileShareLink } from "./ShareProfile";
import { toggleLike } from "../lib/api";
import "./HeroHeader.css";

interface HeroHeaderProps {
  image: string;
  name: string;
  /** API (ObjectId) id used for likes; empty in demo/seed mode */
  contestantId?: string;
  likeCount?: number;
  liked?: boolean;
  onBack: () => void;
}

export default function HeroHeader({
  image,
  name,
  contestantId = "",
  likeCount: initialLikes = 0,
  liked: initialLiked = false,
  onBack,
}: HeroHeaderProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [likePending, setLikePending] = useState(false);

  // When fresh data arrives from the React Query cache (e.g. this contestant
  // was liked on another screen or another device), keep the heart in sync.
  useEffect(() => {
    if (likePending) return;
    setLiked(initialLiked);
    setLikeCount(initialLikes);
  }, [initialLiked, initialLikes]);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharedTo, setSharedTo] = useState<string | null>(null);

  const toggleLikeLocal = async () => {
    if (likePending) return;
    // Optimistic flip
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    if (!/^[0-9a-fA-F]{24}$/.test(contestantId)) return; // demo mode — local only
    setLikePending(true);
    try {
      const res = await toggleLike(contestantId);
      setLiked(res.liked);
      setLikeCount(res.likes);
    } catch {
      // Revert on failure
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    } finally {
      setLikePending(false);
    }
  };

  // Build the share link from this contestant's real API id so the OG
  // preview resolves (falls back to the plain hash link in demo mode).
  const shareLink = profileShareLink(1, contestantId);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareVia = async (channel: string) => {
    const text = encodeURIComponent(`Vote for ${name} on Rivalry! 🏆`);
    const url = encodeURIComponent(shareLink);
    const targets: Record<string, string> = {
      WhatsApp: `https://wa.me/?text=${text}%20${url}`,
      X: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      Telegram: `https://t.me/share/url?url=${url}&text=${text}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    if (targets[channel]) window.open(targets[channel], "_blank");
    setSharedTo(channel);
    setTimeout(() => setShareOpen(false), 900);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vote ${name} on Rivalry`,
          text: `Vote for ${name} in the Rivalry contest! 🏆`,
          url: shareLink,
        });
        setShareOpen(false);
      } catch {
        /* dismissed */
      }
    }
  };

  return (
    <header className="hero">
      <img className="hero__image" src={image} alt={name} />
      <div className="hero__scrim" />

      <div className="hero__actions">
        <button className="hero__btn" aria-label="Back" onClick={onBack}>
          ←
        </button>
        <div className="hero__actions-right">
          <button
            className="hero__btn"
            aria-label="Share"
            onClick={() => setShareOpen(true)}
          >
            <Share2 size={17} />
          </button>
        </div>
      </div>

      <div className="hero__like-wrap">
        <button
          className={`hero__btn hero__btn--like${liked ? " hero__btn--fav" : ""}`}
          aria-label="Like"
          onClick={toggleLikeLocal}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
        </button>
        <span className="hero__like-count">{likeCount.toLocaleString()}</span>
      </div>

      {shareOpen && (
        <div className="share-modal" onClick={() => setShareOpen(false)}>
          <div
            className="share-modal__sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="share-modal__head">
              <h3>
                <Share2 size={15} /> Share to voters
              </h3>
              <button
                className="share-modal__close"
                aria-label="Close"
                onClick={() => setShareOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <p className="share-modal__text">
              Rally your people! Share {name}'s profile and turn every click
              into a vote. 🗳️
            </p>
            <div className="share-modal__link">
              <Link2 size={14} />
              <code>{shareLink}</code>
              <button onClick={copyLink} aria-label="Copy link">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            {typeof navigator.share === "function" && (
              <button className="share-modal__native" onClick={nativeShare}>
                <Share2 size={15} /> More sharing options
              </button>
            )}
            <div className="share-modal__channels">
              {["WhatsApp", "X", "Telegram", "Facebook"].map((c) => (
                <button key={c} onClick={() => shareVia(c)}>
                  {sharedTo === c ? <Check size={15} /> : null} {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="hero__crown">👑</div>
    </header>
  );
}
