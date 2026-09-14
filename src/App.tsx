import { useEffect, useState } from "react";
import { contestants, contests, type Contestant, type Contest } from "./data";
import Dashboard from "./components/Dashboard";
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile";
import Contests from "./components/Contests";
import BottomNav, { type Tab } from "./components/BottomNav";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selected, setSelected] = useState<Contestant | null>(null);
  const [openContest, setOpenContest] = useState<Contest | null>(null);
  const [joinedContestId, setJoinedContestId] = useState<number | null>(null);

  const openProfile = (c: Contestant) => {
    setSelected(c);
    setTab("profile");
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, openContest]);

  return (
    <>
      {tab === "dashboard" && (
        <Dashboard
          onSelect={openProfile}
          joinedContest={contests.find((c) => c.id === joinedContestId) ?? null}
          onOpenContest={(c) => {
            setOpenContest(c);
            setTab("contests");
          }}
        />
      )}
      {tab === "contests" && (
        <Contests
          contest={openContest}
          onOpen={(c) => setOpenContest(c)}
          onBack={() => setOpenContest(null)}
          joinedContestId={joinedContestId}
          onJoin={(id) => setJoinedContestId(id)}
          onSelect={(id) => {
            const c = contestants.find((x) => x.id === id);
            if (c) openProfile(c);
          }}
        />
      )}
      {tab === "leaderboard" && <Leaderboard onSelect={openProfile} />}
      {tab === "profile" && (
        <Profile contestant={selected ?? contestants[0]} />
      )}

      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t !== "contests") setOpenContest(null);
          if (t === "profile") setSelected((s) => s ?? contestants[0]);
        }}
      />
    </>
  );
}
