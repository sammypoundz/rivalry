import type { Contestant } from "../data";
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
import "./Profile.css";

interface ProfileProps {
  contestant: Contestant;
}

export default function Profile({ contestant }: ProfileProps) {
  // Section components currently read the default contestant from data.ts;
  // this wrapper renders them for the profile screen.
  return (
    <div className="profile app">
      <HeroHeader image={contestant.heroImage} name={contestant.name} />
      <IdentitySection />
      <CountdownTimer />
      <StatsCard
        votes={contestant.votes}
        rank={contestant.rank}
        prize={contestant.prize / 1000}
      />
      <VoteNowButton />
      <AboutSection />
      <PhotoGallery />
      <SupportProgress votes={contestant.votes} goal={contestant.voteGoal} />
      <Supporters />
      <div className="app__footer-spacer" />
      <StickyVoteBar votes={contestant.votes} />
    </div>
  );
}
