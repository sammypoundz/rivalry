import { useState, useEffect } from "react";
import type { Contestant } from "../data";
import { getContestant } from "../lib/api";
import { useQuery } from "@tanstack/react-query";
import { qk } from "../lib/queries";
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
  const [showVoteModal, setShowVoteModal] = useState(false);
  const apiId = contestant.apiId ?? "";

  // Real like state + live vote total, cached by React Query. Any like/vote
  // made anywhere invalidates this (via the mutation event), so the profile
  // header, stats and progress bar stay current without a page refresh.
  const { data: detail } = useQuery({
    queryKey: qk.contestant(apiId),
    queryFn: () => getContestant(apiId),
    enabled: /^[0-9a-fA-F]{24}$/.test(apiId),
    staleTime: 10_000,
  });
  const likedByMe = Boolean(detail?.likedByMe);
  const likes = detail?.contestant.likes ?? contestant.likes ?? 0;
  // Votes: live detail value if available, otherwise the list value; a fresh
  // vote also overrides optimistically via onVoted → setLocalVotes.
  const [localVotes, setLocalVotes] = useState<number | null>(null);
  const votes = localVotes ?? detail?.contestant.votes ?? contestant.votes;
  useEffect(() => {
    setLocalVotes(null);
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
      <ShareProfile contestantId={contestant.id} apiId={contestant.apiId} contestantName={contestant.name} />
      <div className="app__footer-spacer" />
      <StickyVoteBar votes={votes} onVote={handleVote} />
      {showVoteModal && (
        <VoteModal
          contestantId={contestant.apiId ?? ""}
          contestantName={contestant.name}
          contestantImage={contestant.heroImage}
          onClose={() => setShowVoteModal(false)}
          onVoted={(newTotal) => setLocalVotes(newTotal)}
        />
      )}
    </div>
  );
}
