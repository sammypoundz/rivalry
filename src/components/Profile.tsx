import { useState, useEffect, useMemo } from "react";
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
    // Real-time profile: votes/likes cast elsewhere update here in seconds.
    refetchInterval: 10_000,
    refetchIntervalInBackground: true,
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

  // One merged, live contestant object drives the WHOLE profile: cover photo,
  // countdown end, rank, prize pool and gallery all come from the cached
  // detail (kept fresh by the mutation bridge), so every section stays in sync
  // with votes/likes made anywhere — and with the leaderboard, which ranks by
  // live vote counts.
  const profile: Contestant = useMemo(() => {
    const d = detail?.contestant;
    return {
      ...contestant,
      heroImage: d?.heroImage ?? contestant.heroImage,
      gallery: d?.gallery ?? contestant.gallery,
      votes,
      rank: d?.rank ?? contestant.rank,
      prize: d?.prize ?? contestant.prize,
      votingEndsAt: d ? new Date(d.votingEndsAt).getTime() : contestant.votingEndsAt,
      likes,
    };
  }, [contestant, detail, votes, likes]);

  const handleVote = () => setShowVoteModal(true);

  // Section components currently read the default contestant from data.ts;
  // this wrapper renders them for the profile screen.
  return (
    <div className="profile app">
      <HeroHeader
        image={profile.heroImage}
        name={profile.name}
        contestantId={profile.apiId}
        likeCount={likes}
        liked={likedByMe}
        onBack={onBack}
      />
      <IdentitySection contestant={profile} />
      <CountdownTimer endsAt={profile.votingEndsAt} />
      <StatsCard
        votes={votes}
        rank={profile.rank}
        prize={profile.prize}
      />
      <VoteNowButton onClick={handleVote} />
      <AboutSection contestant={profile} />
      <PhotoGallery contestant={profile} />
      <SupportProgress votes={votes} goal={profile.voteGoal} />
      <Supporters contestantId={profile.apiId ?? String(profile.id)} />
      <ShareProfile contestantId={profile.id} apiId={profile.apiId} contestantName={profile.name} />
      <div className="app__footer-spacer" />
      <StickyVoteBar votes={votes} onVote={handleVote} />
      {showVoteModal && (
        <VoteModal
          contestantId={profile.apiId ?? ""}
          contestantName={profile.name}
          contestantImage={profile.heroImage}
          onClose={() => setShowVoteModal(false)}
          onVoted={(newTotal) => setLocalVotes(newTotal)}
        />
      )}
    </div>
  );
}
