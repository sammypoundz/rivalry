import { useEffect, useState, useCallback } from "react";
import { useLiveData, contestants as seedContestants, contests as seedContests, type Contestant, type Contest } from "./data";
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
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import AuthOverlay from "./auth/AuthOverlay";
import { getMyContestants } from "./lib/api";
import UserProfile from "./components/UserProfile";
import "./App.css";

function AppShell() {
  const { user, loading } = useAuth();
  return (
    <>
      {loading ? null : user ? (
        <MainApp />
      ) : (
        <AuthOverlay />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

function MainApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selected, setSelected] = useState<Contestant | null>(null);
  const [openContest, setOpenContest] = useState<Contest | null>(null);
  const [viewingProfile, setViewingProfile] = useState(false);
  const [joinedContestIds, setJoinedContestIds] = useState<string[]>([]);
  const [prevTab, setPrevTab] = useState<Tab>("dashboard");
  const [extraContestants, setExtraContestants] = useState<Contestant[]>([]);
  const live = useLiveData();
  const { contestants, contests } = live.usingFallback
    ? { contestants: [...seedContestants, ...extraContestants], contests: seedContests }
    : { contestants: [...live.contestants, ...extraContestants], contests: live.contests };
  const allContestants = contestants;
  const { user } = useAuth();

  // Load the contests the user has actually entered (synced everywhere) and
  // refresh whenever auth or the live data changes.
  useEffect(() => {
    if (!user) {
      setJoinedContestIds([]);
      return;
    }
    let cancelled = false;
    getMyContestants()
      .then((res) => {
        if (!cancelled)
          setJoinedContestIds(res.contestants.map((c) => c.contest.id));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, live.contests]);

  // Shared profile links look like .../#/vote/{id}
  // Referral join links look like .../#/join?ref={userId}
  const openProfileFromHash = useCallback(
    (contestantsList: Contestant[]) => {
      const joinM = window.location.hash.match(/^#\/join(\?.*)?$/);
      if (joinM) {
        setViewingProfile(false);
        setTab("signup");
        return true;
      }
      const m = window.location.hash.match(/^#\/vote\/(\d+)/);
      if (m) {
        const c = contestantsList.find((x) => x.id === Number(m[1]));
        if (c) {
          setSelected(c);
          setViewingProfile(true);
          setTab("profile");
          return true;
        }
      }
      return false;
    },
    []
  );

  useEffect(() => {
    const onHash = () => openProfileFromHash(allContestants);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openProfileFromHash, allContestants]);

  // When live data arrives/refreshes, re-point `selected` at the matching
  // live contestant so a profile opened during the loading window (seed data,
  // no apiId) doesn't stay stale and break voting afterwards.
  useEffect(() => {
    setSelected((s) => {
      if (!s) return s;
      const match = allContestants.find(
        (c) => (s.apiId && c.apiId === s.apiId) || c.id === s.id,
      );
      return match ?? s;
    });
  }, [allContestants]);

  useEffect(() => {
    if (tab !== "profile") setPrevTab(tab);
  }, [tab]);

  const openProfile = (c: Contestant) => {
    setSelected(c);
    setViewingProfile(true);
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
          joinedContest={contests.find((c) => joinedContestIds.includes(c.apiId ?? "")) ?? null}
          onOpenContest={(c) => {
            setOpenContest(c);
            setTab("contests");
          }}
          onEarn={() => setTab("earn")}
        />
      )}
      {tab === "contests" && (
        <Contests
          contest={openContest}
          onOpen={(c) => setOpenContest(c)}
          onBack={() => setOpenContest(null)}
          joinedContestIds={joinedContestIds}
          onJoined={() => live.refresh()}
          allContestants={allContestants}
          contests={contests}
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
            setViewingProfile(true);
            setTab("profile");
          }}
        />
      )}
      {tab === "earn" && <Earn />}
      {tab === "profile" && viewingProfile && selected && (
        <Profile
          key={selected.id}
          contestant={selected}
          onBack={() => {
            setViewingProfile(false);
            setTab(prevTab);
          }}
        />
      )}
      {tab === "profile" && !(viewingProfile && selected) && (
        <UserProfile
          onOpenContest={(contest) => {
            // Prefer the live contest object (full roster/rewards); construct a
            // minimal one as fallback so the detail view still opens.
            const liveContest = contests.find((c) => c.apiId === contest.id);
            setOpenContest(
              liveContest ?? {
                ...contest,
                apiId: contest.id,
                contestantIds: [],
                rewards: [],
                totalVotes: 0,
              } as unknown as Contest,
            );
            setTab("contests");
          }}
        />
      )}

      <BottomNav
        active={tab}
        onChange={(t) => {
          setTab(t);
          setViewingProfile(false);
          if (t !== "contests") setOpenContest(null);
        }}
      />
    </>
  );
}
