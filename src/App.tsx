import { contestant } from "./data";
import HeroHeader from "./components/HeroHeader";
import IdentitySection from "./components/IdentitySection";
import CountdownTimer from "./components/CountdownTimer";
import StatsCard from "./components/StatsCard";
import VoteNowButton from "./components/VoteNowButton";
import AboutSection from "./components/AboutSection";
import PhotoGallery from "./components/PhotoGallery";
import SupportProgress from "./components/SupportProgress";
import Supporters from "./components/Supporters";
import StickyVoteBar from "./components/StickyVoteBar";
import "./App.css";

export default function App() {
  return (
    <div className="app">
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
