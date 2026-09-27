import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLiveData, contestants as seedContestants, contests as seedContests, type Contestant, type Contest } from "./data";
import Dashboard from "./components/Dashboard";
import MyContests from "./components/MyContests";
import AllContestants from "./components/AllContestants";
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
import { rosterOf } from "./lib/queries";
import UserProfile from "./components/UserProfile";
import Wallet from "./components/Wallet";
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
  const [allContestantsScreen, setAllContestantsScreen] = useState<Contest | null>(null);
  /** Full-screen list of ALL contests the user has joined at once. */
  const [showMyContests, setShowMyContests] = useState(false);
  const [joinedContestIds, setJoinedContestIds] = useState<string[]>([]);
  const [prevTab, setPrevTab] = useState<Tab>("dashboard");
  const [extraContestants, setExtraContestants] = useState<Contestant[]>([]);
  // Actions that need a real account (Earn, own Profile, joining a contest)
  // open the sign-in modal instead of doing the thing when there's no user.
  const [pendingAuthAction, setPendingAuthAction] = useState<
    null | "earn" | "profile" | "joinContest" | "login"
  >(null);
  const live = useLiveData();
  // Memoized so the arrays keep a STABLE identity between renders — two
  // useEffects below depend on `allContestants`, and a fresh array literal
  // every render made those effects re-run (and setState) on every render.
  const { contestants, contests } = useMemo(
    () =>
      live.usingFallback
        ? { contestants: [...seedContestants, ...extraContestants], contests: seedContests }
        : { contestants: [...live.contestants, ...extraContestants], contests: live.contests },
    [live.usingFallback, live.contestants, live.contests, extraContestants],
  );
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

  // The view-all contestants page is a full screen of its own — when a
  // contestant profile opens over it, the grid must UNMOUNT (otherwise it
  // keeps rendering and pushes the profile to the bottom of the page).
  // We remember which contest was open so closing the profile restores it.
  const [hiddenAllContestants, setHiddenAllContestants] = useState<Contest | null>(null);

  const openProfile = (c: Contestant) => {
    if (allContestantsScreen) {
      setHiddenAllContestants(allContestantsScreen);
      setAllContestantsScreen(null);
    }
    setSelected(c);
    setViewingProfile(true);
    setTab("profile");
  };

  /** Leaving a contestant profile — back to the view-all page if that's
      where it was opened from, otherwise the homepage. */
  const closeProfile = () => {
    setViewingProfile(false);
    setSelected(null);
    if (hiddenAllContestants) {
      setAllContestantsScreen(hiddenAllContestants);
      setHiddenAllContestants(null);
      setTab(prevTab);
    } else {
      setTab("dashboard");
    }
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

  // ---- Navigation memory -------------------------------------------------
  // Every screen change pushes a snapshot of where the user is onto the
  // history stack. Pressing the browser/phone BACK button pops that snapshot
  // and restores the exact place they were (tab, open contest, contestant
  // profile, view-all page) instead of dumping them somewhere random.
  const listsRef = useRef({ contests, allContestants });
  listsRef.current = { contests, allContestants };

  const navSnapshot = useCallback(() => ({
    tab,
    openContestId: openContest ? String(openContest.apiId ?? openContest.id) : null,
    selectedId: selected ? String(selected.apiId ?? selected.id) : null,
    viewingProfile,
    allContestantsId: allContestantsScreen ? String(allContestantsScreen.apiId ?? allContestantsScreen.id) : null,
  }), [tab, openContest, selected, viewingProfile, allContestantsScreen]);

  // Seed the current history entry so the very first BACK returns here.
  useEffect(() => {
    if (!history.state?.nav) history.replaceState({ nav: navSnapshot() }, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoringNav = useRef(false);
  useEffect(() => {
    if (restoringNav.current) {
      restoringNav.current = false;
      return;
    }
    const snap = navSnapshot();
    if (JSON.stringify(history.state?.nav) !== JSON.stringify(snap)) {
      history.pushState({ nav: snap }, "");
    }
  }, [navSnapshot]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const nav = e.state?.nav;
      if (!nav) return; // hash deep links etc. — let the hash handlers run
      restoringNav.current = true;
      const { contests: cs, allContestants: ac } = listsRef.current;
      const findContest = (id: string) =>
        cs.find((c) => String(c.apiId ?? c.id) === id) ?? null;
      const findContestant = (id: string) =>
        ac.find((c) => String(c.apiId ?? c.id) === id) ?? null;
      const sel = nav.selectedId ? findContestant(nav.selectedId) : null;
      setTab(nav.tab);
      setOpenContest(nav.openContestId ? findContest(nav.openContestId) : null);
      setSelected(sel);
      setViewingProfile(Boolean(nav.viewingProfile && sel));
      setAllContestantsScreen(
        nav.allContestantsId ? findContest(nav.allContestantsId) : null,
      );
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
    // "login" was just a gate — the visitor is signed in now, stay put.
    if (pendingAuthAction !== "login") {
      if (pendingAuthAction === "earn") setTab("earn");
      if (pendingAuthAction === "profile") setTab("profile");
    }
    setPendingAuthAction(null);
  }, [user, pendingAuthAction]);

  // First load: wait for REAL data instead of flashing the hardcoded seed
  // content. Once the fetch resolves (or fails offline), render the app.
  const booting = live.loading && !live.usingFallback && !live.contests.length;

  if (booting) {
    return (
      <div className="app-boot">
        <span className="app-boot__logo">R</span>
        <span className="app-boot__label">Loading Rivalry…</span>
      </div>
    );
  }

  return (
    <>
      <DesktopSidebar
        onOpenContest={(c) => {
          setOpenContest(c);
          setTab("contests");
        }}
        onSelectContestant={openProfile}
      />
      {/* The live-votes ticker stays on the homepage only — it must not
          appear over the "view all contestants" page. */}
      <VoteFeed
        mobileVisible={tab === "dashboard" && !allContestantsScreen}
        onOpenContestant={(apiId) => {
          const found =
            allContestants.find((c) => String(c.apiId ?? "") === String(apiId)) ??
            allContestants.find((c) => String(c.id) === String(apiId));
          if (found) openProfile(found);
        }}
      />
      {tab === "dashboard" && <ScrollSticker />}
      {tab === "dashboard" && !allContestantsScreen && (
        <Dashboard
          onSelect={openProfile}
          joinedContests={contests.filter((c) =>
            joinedContestIds.includes(c.apiId ?? ""),
          )}
          onSeeAllJoined={() => setShowMyContests(true)}
          contests={contests}
          allContestants={allContestants}
          onOpenContest={(c) => {
            setOpenContest(c);
            setTab("contests");
          }}
          onViewAllContestants={(contestId) => {
            const contest = contests.find(
              (c) => (c.apiId ?? "") === String(contestId) || c.id === contestId,
            );
            if (contest) setAllContestantsScreen(contest);
          }}
          onEarn={() => (user ? setTab("earn") : setPendingAuthAction("earn"))}
          // Mobile-only Sign in button (replaces Earn in the dashboard header)
          // for visitors who aren't logged in yet.
          onSignIn={user ? undefined : () => setShowAuth(true)}
        />
      )}
      {tab === "contests" && !allContestantsScreen && (
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
          onNavigate={(screen, opts) => {
            if (screen !== "all-contestants" || !opts) return;
            const contestId = String(opts.contestId ?? "");
            const contest = contests.find(
              (c) =>
                String(c.id) === contestId ||
                (c.apiId && c.apiId === contestId),
            );
            if (contest) setAllContestantsScreen(contest);
          }}
        />
      )}
      {showMyContests && (
        <MyContests
          joined={contests.filter((c) => joinedContestIds.includes(c.apiId ?? ""))}
          allContestants={allContestants}
          onOpenContest={(c) => {
            setShowMyContests(false);
            setOpenContest(c);
            setTab("contests");
          }}
          onViewAllContestants={(contest) => {
            setShowMyContests(false);
            setAllContestantsScreen(contest);
          }}
          onSelectContestant={openProfile}
          onBack={() => setShowMyContests(false)}
        />
      )}
      {allContestantsScreen && (
        <AllContestants
          contest={allContestantsScreen}
          roster={
            allContestantsScreen
              ? rosterOf(allContestantsScreen, allContestants)
              : []
          }
          onSelect={(c) => openProfile(c)}
          onBack={() => setAllContestantsScreen(null)}
        />
      )}
      {tab === "leaderboard" && (
        <Leaderboard onSelect={openProfile} contestants={allContestants} />
      )}
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
      {tab === "wallet" && user && <Wallet />}
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
          onLogin={() => setPendingAuthAction("login")}
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
