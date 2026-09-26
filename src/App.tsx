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
  const { loading } = useAuth();
  // The app itself works anonymously (voting needs no account). MainApp shows
  // the login overlay for regular visitors but lets #/vote/{id} deep links
  // straight through so shared voting links never demand a login.
  return <>{loading ? null : <MainApp />}</>;
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
  // Actions that need a real account (Earn, own Profile, joining a contest)
  // open the sign-in modal instead of doing the thing when there's no user.
  const [pendingAuthAction, setPendingAuthAction] = useState<null | "earn" | "profile" | "joinContest">(null);
  const live = useLiveData();
  const { contestants, contests } = live.usingFallback
    ? { contestants: [...seedContestants, ...extraContestants], contests: seedContests }
    : { contestants: [...live.contestants, ...extraContestants], contests: live.contests };
  const allContestants = contestants;
  const { user } = useAuth();

  // A shared voting link (#/vote/{id}) opens the contestant profile without
  // requiring an account — anyone can preview and vote anonymously.
  const [deepLinkVote, setDeepLinkVote] = useState(
    () => window.location.hash.startsWith("#/vote/"),
  );
  useEffect(() => {
    const onHash = () =>
      setDeepLinkVote(window.location.hash.startsWith("#/vote/"));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
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
      // Shared links carry either the numeric demo id or the real backend
      // ObjectId (the OG landing page deep-links with the apiId).
      const m =
        window.location.hash.match(/^#\/vote\/([0-9a-fA-F]{24})/) ||
        window.location.hash.match(/^#\/vote\/(\d+)/);
      if (m) {
        const id = m[1];
        const c = contestantsList.find(
          (x) => (x.apiId && x.apiId === id) || x.id === Number(id),
        );
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
    // Never remember "profile" as the return tab — that key means the user's
    // OWN profile in the bottom nav, not a contestant profile view.
    if (tab !== "profile" && tab !== "signup") setPrevTab(tab);
  }, [tab]);

  const openProfile = (c: Contestant) => {
    setSelected(c);
    setViewingProfile(true);
    setTab("profile");
  };

  /** Leaving a contestant profile — always back to the homepage. */
  const closeProfile = () => {
    setViewingProfile(false);
    setSelected(null);
    setTab("dashboard");
    // Clear a lingering #/vote/{id} hash so the URL matches the screen.
    // deepLinkVote stays true: a visitor who arrived via a voting link keeps
    // browsing the homepage without the sign-up wall slamming shut.
    if (window.location.hash.startsWith("#/vote/")) {
      history.replaceState(null, "", window.location.pathname);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, openContest]);

  // Anonymous regular visitors get a 10-second free preview of the site, then
  // the sign-up wall appears. Vote deep links skip the wall entirely, and a
  // Sign In button lets eager visitors trigger the wall themselves.
  const [showAuth, setShowAuth] = useState(false);
  const previewing = !user && !deepLinkVote;
  useEffect(() => {
    if (!previewing) {
      setShowAuth(false);
      return;
    }
    const t = setTimeout(() => setShowAuth(true), 10_000);
    return () => clearTimeout(t);
  }, [previewing]);

  // A gated action (earn/profile/join) was tapped while signed out: once the
  // visitor signs in or creates an account, run the action they were blocked on.
  useEffect(() => {
    if (!pendingAuthAction || !user) return;
    if (pendingAuthAction === "earn") setTab("earn");
    if (pendingAuthAction === "profile") setTab("profile");
    setPendingAuthAction(null);
  }, [user, pendingAuthAction]);

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
          contests={contests}
          allContestants={allContestants}
          onOpenContest={(c) => {
            setOpenContest(c);
            setTab("contests");
          }}
          onEarn={() => (user ? setTab("earn") : setPendingAuthAction("earn"))}
          // Mobile-only Sign in button (replaces Earn in the dashboard header)
          // for visitors who aren't logged in yet.
          onSignIn={user ? undefined : () => setShowAuth(true)}
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
          onBack={closeProfile}
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

      {!(tab === "profile" && viewingProfile && selected) && (
        <BottomNav
          // A public contestant profile is not the user's own profile —
          // highlight the tab it was opened from (or Home) instead.
          active={tab === "profile" && viewingProfile ? prevTab : tab}
          onChange={(t) => {
            if (!user && (t === "earn" || t === "profile")) {
              setPendingAuthAction(t);
              return;
            }
            setTab(t);
            setViewingProfile(false);
            if (t !== "contests") setOpenContest(null);
          }}
        />
      )}

      {/* Preview mode: visitors can open the login wall themselves at any time. */}
      {previewing && (
        <button
          className="preview-signin-btn"
          onClick={() => setShowAuth(true)}
        >
          Sign In
        </button>
      )}

      {previewing && showAuth && (
        <AuthOverlay
          dismissible
          onDismiss={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}

      {/* Gated action tapped while signed out — sign-in modal blocks it. */}
      {pendingAuthAction && !user && (
        <AuthOverlay
          dismissible
          onDismiss={() => setPendingAuthAction(null)}
          onSuccess={() => setPendingAuthAction(null)}
        />
      )}
    </>
  );
}
