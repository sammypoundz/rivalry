import { useState } from "react";
import { Link2, Copy, Check, Share2 } from "lucide-react";
import "./ShareProfile.css";

interface ShareProfileProps {
  contestantId: number;
  contestantName: string;
}

export const profileShareLink = (id: number) =>
  `${window.location.origin}${window.location.pathname}#/vote/${id}`;

export default function ShareProfile({
  contestantId,
  contestantName,
}: ShareProfileProps) {
  const [copied, setCopied] = useState(false);
  const link = profileShareLink(contestantId);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard unavailable — link still shown below */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vote ${contestantName} on Rivalry`,
          text: `Vote for ${contestantName} in the Rivalry contest! 🏆`,
          url: link,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  };

  return (
    <section className="share-card">
      <div className="share-card__head">
        <Link2 size={16} />
        <h3>Share your profile</h3>
      </div>
      <p className="share-card__sub">
        Anyone with this link lands straight on your profile and can vote for
        you.
      </p>
      <div className="share-card__row">
        <code className="share-card__link">{link}</code>
        <button
          className="share-card__btn"
          onClick={copy}
          aria-label="Copy link"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <button className="share-card__share" onClick={nativeShare}>
        <Share2 size={16} />
        {copied ? "Link copied!" : "Share & collect votes"}
      </button>
    </section>
  );
}
