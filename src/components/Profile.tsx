import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import type { Contestant } from "../data";
import { getContestant } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import VoteModal from "./VoteModal";
import HeroHeader from "./HeroHeader";
import IdentitySection from "./IdentitySection";
import CountdownTimer from "./CountdownTimer";
import StatsCard from "./StatsCard";
import VoteNowButton from "./VoteNowButton";
import AboutSection from "./AboutSection";
import PhotoGallery from "./PhotoGallery";
import SupportProgress from "./SupportProgress";
import Supporters from "./Supporters";
import StickyVoteBar from "./StickyVoteBar";
import ShareProfile from "./ShareProfile";
import "./Profile.css";

interface ProfileProps {
  contestant: Contestant;
  onBack: () => void;
}

export default function Profile({ contestant, onBack }: ProfileProps) {
  const { user, signOut } = useAuth();
  const [votes, setVotes] = useState(contestant.votes);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [likedByMe, setLikedByMe] = useState(false);
  const [likes, setLikes] = useState(contestant.likes ?? 0);
  const apiId = contestant.apiId ?? "";

  // Fetch the real like state when the profile mounts, so the heart doesn't
  // reset when navigating away and back.
  useEffect(() => {
    if (!/^[0-9a-fA-F]{24}$/.test(apiId)) return;
    let cancelled = false;
    getContestant(apiId)
      .then((res) => {
        if (cancelled) return;
        setLikedByMe(Boolean(res.likedByMe));
        setLikes(res.contestant.likes ?? 0);
      })
      .catch(() => {
        /* profile still works without like info */
      });
    return () => {
      cancelled = true;
    };
  }, [apiId]);

  const handleVote = () => setShowVoteModal(true);

  // Section components currently read the default contestant from data.ts;
  // this wrapper renders them for the profile screen.
  return (
    <div className="profile app">
      <HeroHeader
        image={contestant.heroImage}
        name={contestant.name}
        contestantId={contestant.apiId}
        likeCount={likes}
        liked={likedByMe}
        onBack={onBack}
      />
      <IdentitySection contestant={contestant} />
      <CountdownTimer endsAt={contestant.votingEndsAt} />
      <StatsCard
        votes={votes}
        rank={contestant.rank}
        prize={contestant.prize / 1000}
      />
      <VoteNowButton onClick={handleVote} />
      <AboutSection contestant={contestant} />
      <PhotoGallery contestant={contestant} />
      <SupportProgress votes={votes} goal={contestant.voteGoal} />
      <Supporters contestantId={contestant.apiId ?? String(contestant.id)} />
      <ShareProfile contestantId={contestant.id} contestantName={contestant.name} />
      <div className="app__footer-spacer" />
      {user && (
        <button
          className="profile__logout"
          onClick={signOut}
          aria-label="Log out"
        >
          <LogOut size={15} /> Log out
        </button>
      )}
      <StickyVoteBar votes={votes} onVote={handleVote} />
      {showVoteModal && (
        <VoteModal
          contestantId={contestant.apiId ?? ""}
          contestantName={contestant.name}
          contestantImage={contestant.heroImage}
          onClose={() => setShowVoteModal(false)}
          onVoted={(newTotal) => setVotes(newTotal)}
        />
      )}
    </div>
  );
}
