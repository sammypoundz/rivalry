import { useQuery } from "@tanstack/react-query";
import {
  Wallet as WalletIcon,
  Gift,
  Trophy,
  Users,
  ArrowUpRight,
  Landmark,
  Swords,
} from "lucide-react";
import {
  listReferrals,
  type ApiReferral,
  type OrganiserEarnings,
} from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import WalletSkeleton from "./WalletSkeleton";
import "./Wallet.css";

const naira = (n: number) => `₦${n.toLocaleString()}`;

const statusChip: Record<string, string> = {
  Invited: "wallet__chip--invited",
  "Signed up": "wallet__chip--pending",
  Qualified: "wallet__chip--paid",
};

/**
 * Rivalry Wallet — the single place where everything the user earns on the
 * app is managed: referral rewards, contest prizes and (soon) withdrawals.
 */
export default function Wallet() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["referrals"],
    queryFn: listReferrals,
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 20_000,
  });

  const referrals: ApiReferral[] = data?.referrals ?? [];
  /** Status precedence — the best status a person reached wins the card. */
  const statusRank: Record<string, number> = {
    Invited: 0,
    "Signed up": 1,
    Qualified: 2,
  };

  /** ONE card per referred person. Rows can duplicate when the same contact
   *  was invited twice (or an "Invited" row plus the real signup row both
   *  exist): merge them by contact, keep the highest status reached and the
   *  biggest reward, so the status always reflects where the referral is NOW. */
  const unique: ApiReferral[] = [];
  const byContact = new Map<string, ApiReferral>();
  for (const r of referrals) {
    const key = (r.contact || r.name || r.id).trim().toLowerCase();
    const prev = byContact.get(key);
    if (!prev) {
      byContact.set(key, r);
      continue;
    }
    const better = (statusRank[r.status] ?? 0) >= (statusRank[prev.status] ?? 0) ? r : prev;
    const merged: ApiReferral = {
      ...better,
      reward: Math.max(r.reward || 0, prev.reward || 0),
      name: better.name || prev.name,
    };
    byContact.set(key, merged);
  }
  // Newest first, like the ledger
  unique.push(
    ...[...byContact.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  );

  const earned = unique.reduce((sum, r) => sum + (r.reward || 0), 0);
  /** Revenue from contests the user created — only shown to organisers. */
  const isOrganiser =
    user?.role === "organiser" || user?.role === "admin";
  const organiser: OrganiserEarnings = isOrganiser
    ? (data?.organiser ?? { total: 0, contests: [] })
    : { total: 0, contests: [] };
  const balance = earned + organiser.total;
  const qualified = unique.filter((r) => r.status === "Qualified").length;
  const pending = unique.filter((r) => r.status !== "Qualified").length;

  if (!user) return null;
  // First load with no cached data: show the card-type skeleton loader
  // (background refetches after this keep the live UI in place).
  if (isLoading) return <WalletSkeleton />;

  return (
    <div className="wallet app">
      <header className="wallet__head">
        <div className="wallet__badge">
          <WalletIcon size={18} />
        </div>
        <div>
          <h1 className="wallet__title">Rivalry Wallet</h1>
          <p className="wallet__sub">All your earnings in one place</p>
        </div>
      </header>

      {/* Balance card */}
      <section className="wallet__balance">
        <span className="wallet__balance-label">Available balance</span>
        <strong className="wallet__balance-amount">{naira(balance)}</strong>
        <span className="wallet__balance-note">
          {isOrganiser
            ? "Referral rewards + contest revenue in one balance"
            : "Earn ₦500 for every referral whose contestant reaches 5 votes"}
        </span>
      </section>

      {/* Quick summary */}
      <section className="wallet__summary">
        <div className="wallet__sumcard">
          <Users size={15} />
          <strong>{qualified}</strong>
          <span>Qualified</span>
        </div>
        <div className="wallet__sumcard">
          <Gift size={15} />
          <strong>{pending}</strong>
          <span>Pending</span>
        </div>
        <div className="wallet__sumcard">
          <Trophy size={15} />
          <strong>0</strong>
          <span>Prizes</span>
        </div>
      </section>

      {/* Referral earnings ledger */}
      <section className="wallet__section">
        <h2 className="wallet__heading">
          <Gift size={15} /> Referral earnings
        </h2>
        {unique.length === 0 ? (
          <p className="wallet__empty">
            No referrals yet — invite friends from the Earn tab to start
            earning.
          </p>
        ) : (
          <ul className="wallet__list">
            {unique.map((r) => (
              <li key={r.id} className="wallet__row">
                <div className="wallet__row-main">
                  <span className="wallet__row-name">{r.name}</span>
                  <span className="wallet__row-contact">{r.contact}</span>
                </div>
                <div className="wallet__row-side">
                  <span
                    className={`wallet__chip ${statusChip[r.status] ?? ""}`}
                  >
                    {r.status}
                  </span>
                  {r.reward > 0 && (
                    <span className="wallet__row-amount">
                      <ArrowUpRight size={12} /> {naira(r.reward)}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Organiser revenue — generated by contests this user created.
          Hidden entirely for regular users (non-organisers). */}
      {isOrganiser && organiser.contests.length > 0 && (
        <section className="wallet__section">
          <h2 className="wallet__heading">
            <Swords size={15} /> Contest revenue (organiser)
          </h2>
          <ul className="wallet__list">
            {organiser.contests.map((c) => (
              <li key={c.contestId} className="wallet__row">
                <div className="wallet__row-main">
                  <span className="wallet__row-name">{c.title}</span>
                  <span className="wallet__row-contact">
                    {c.votes.toLocaleString()} votes · {naira(c.voteRevenue)} votes +{" "}
                    {naira(c.entryRevenue)} entry
                  </span>
                </div>
                <span className="wallet__row-amount">
                  <ArrowUpRight size={12} /> {naira(c.amount)}
                </span>
              </li>
            ))}
          </ul>
          <p className="wallet__organiser-total">
            Organiser revenue total: <strong>{naira(organiser.total)}</strong>
          </p>
        </section>
      )}

      {/* Prize winnings — populated automatically as contests end */}
      <section className="wallet__section">
        <h2 className="wallet__heading">
          <Trophy size={15} /> Prize winnings
        </h2>
        <div className="wallet__prizes wallet__prizes--empty">
          <Landmark size={20} />
          <p>
            Contest prizes you win land here automatically. Keep your
            contestants voting — winners are credited when a contest ends.
          </p>
        </div>
      </section>

      {/* Withdrawals */}
      <section className="wallet__section">
        <h2 className="wallet__heading">
          <Landmark size={15} /> Withdraw
        </h2>
        <div className="wallet__prizes">
          <p>
            Withdrawals to your bank account are coming soon. Your balance is
            safe and keeps growing while you wait.
          </p>
          <button className="wallet__withdraw" disabled>
            Withdraw to bank — soon
          </button>
        </div>
      </section>

      <div className="app__footer-spacer" />
    </div>
  );
}
