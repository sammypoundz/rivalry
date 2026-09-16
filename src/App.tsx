import { useEffect, useState, useCallback } from "react";
import { contestants as seedContestants, contests, type Contestant, type Contest } from "./data";
import Dashboard from "./components/Dashboard";
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile";
import Contests from "./components/Contests";
import SignUp from "./components/SignUp";
import Earn from "./components/Earn";
import BottomNav, { type Tab } from "./components/BottomNav";
import DesktopSidebar from "./components/DesktopSidebar";
import VoteFeed from "./components/VoteFeed";
import ScrollSticker from "./components/ScrollSticker";
import "./App.css";

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selected, setSelected] = useState<Contestant | null>(null);
  const [openContest, setOpenContest] = useState<Contest | null>(null);
  const [joinedContestId, setJoinedContestId] = useState<number | null>(null);
  const [prevTab, setPrevTab] = useState<Tab>("dashboard");
  const [extraContestants, setExtraContestants] = useState<Contestant[]>([]);
  const allContestants = [...seedContestants, ...extraContestants];

  // Shared profile links look like .../#/vote/{id}
  const openProfileFromHash = useCallback(
    (contestantsList: Contestant[]) => {
      const m = window.location.hash.match(/^#\/vote\/(\d+)/);
      if (m) {
        const c = contestantsList.find((x) => x.id === Number(m[1]));
        if (c) {
          setSelected(c);
          setTab("profile");
          return true;
        }
      }
      return false;
    },
    []
  );

  useEffect(() => {
    const onHash = () => openProfileFromHash([...seedContestants, ...extraContestants]);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openProfileFromHash, extraContestants]);

  useEffect(() => {
    if (tab !== "profile") setPrevTab(tab);
  }, [tab]);

  const openProfile = (c: Contestant) => {
    setSelected(c);
    setTab("profile");
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, openContest]);

  return (
    <>
      <DesktopSidebar
        onOpenContest={(c) => {
          setOpenContest(c);
          setTab("contests");
        }}
        onSelectContestant={openProfile}
      />
      <VoteFeed mobileVisible={tab === "dashboard"} />
      {tab === "dashboard" && <ScrollSticker />}
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
            const c = allContestants.find((x) => x.id === id);
            if (c) openProfile(c);
          }}
        />
      )}
      {tab === "leaderboard" && <Leaderboard onSelect={openProfile} />}
      {tab === "signup" && (
        <SignUp
          onBack={() => setTab(prevTab)}
          onComplete={(c) => {
            setExtraContestants((list) => [...list, c]);
            setSelected(c);
            setTab("profile");
          }}
        />
      )}
      {tab === "earn" && <Earn />}
      {tab === "profile" && (
        <Profile
          contestant={selected ?? allContestants[0]}
          onBack={() => setTab(prevTab)}
        />
      )}

      {tab !== "profile" && (
      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t);
          if (t !== "contests") setOpenContest(null);
          if (t === "profile") setSelected((s) => s ?? allContestants[0]);
        }}
      />
      )}
    </>
  );
}
