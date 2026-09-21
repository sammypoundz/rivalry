import { useState } from "react";
import {
  Copy,
  Check,
  Share2,
  UserPlus,
  Users,
  BadgePercent,
  Wallet,
  TrendingUp,
  Gift,
} from "lucide-react";
import { formatNaira, contests } from "../data";
import { useAuth } from "../auth/AuthProvider";
import { listReferrals, createReferral, type ApiReferral } from "../lib/api";
import { useEffect } from "react";
import "./Earn.css";

/* ---------- Vendor / friend referral (for contestants & users) ---------- */

function VendorReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<ApiReferral[]>([]);
  const [earned, setEarned] = useState(0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  // The referral link carries the current user's id — anyone who signs up
  // through it is linked to them as a referral on the backend.
  const link = `${window.location.origin}${window.location.pathname}#/join?ref=${user?.id ?? ""}`;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listReferrals()
      .then((res) => {
        if (cancelled) return;
        setReferrals(res.referrals);
        setEarned(res.earned);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || sending) return;
    setSending(true);
    try {
      const res = await createReferral({
        name: name.trim(),
        contact: contact.trim(),
      });
      setReferrals((r) => [res.referral, ...r]);
      setName("");
      setContact("");
    } catch {
      /* invite stays local-only if the API fails */
      setReferrals((r) => [
        {
          id: `local-${Date.now()}`,
          name: name.trim(),
          contact: contact.trim(),
          status: "Invited",
          reward: 0,
          createdAt: new Date().toISOString(),
        },
        ...r,
      ]);
      setName("");
      setContact("");
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="earn__panel">
      <div className="earn__panel-head">
        <Users size={17} />
        <h2>Refer friends</h2>
      </div>
      <p className="earn__sub">
        Refer your friends to join this contest — earn <strong>₦500</strong>{" "}
        per referral, redeemable once they collect <strong>5 votes</strong>.
      </p>

      <div className="earn__linkbox">
        <code>{link}</code>
        <button onClick={copy} aria-label="Copy referral link">
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <form className="earn__invite" onSubmit={invite}>
       <input placeholder="Friend's name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          placeholder="Email or phone"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <button type="submit" disabled={sending}>
          <UserPlus size={15} /> {sending ? "Sending..." : "Send invite"}
        </button>
      </form>

      <div className="earn__total">
        <Gift size={15} /> Referral earnings:{" "}
        <strong>{formatNaira(earned)}</strong>
      </div>

      <ul className="earn__list">
        {referrals.map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <span>{r.contact}</span>
            </div>
            <em
              className={`earn__status earn__status--${
                r.status === "Qualified"
                  ? "joined"
                  : r.status.toLowerCase().replace(" ", "-")
              }`}
            >
              {r.status === "Qualified"
                ? `Qualified · ${formatNaira(r.reward)}`
                : r.status === "Signed up"
                  ? "Signed up · needs 5 votes"
                  : r.status}
            </em>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Affiliate program ---------- */

interface Affiliate {
  code: string;
  name: string;
  clicks: number;
  signups: number;
  commissionRate: number; // percent
  balance: number;
  paidOut: number;
}

function AffiliatePanel() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const code =
      "AFF-" +
      name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 5) +
      (Math.floor(Math.random() * 90) + 10);
    setAffiliate({
      code,
      name: name.trim(),
      clicks: 0,
      signups: 0,
      commissionRate: 10,
      balance: 0,
      paidOut: 0,
    });
  };

  if (!affiliate) {
    return (
      <section className="earn__panel">
        <div className="earn__panel-head">
          <BadgePercent size={17} />
          <h2>Become an affiliate</h2>
        </div>
        <p className="earn__sub">
          Promote contests and earn a <strong>10% commission</strong> on every
          entry fee or vote bundle purchased through your link. Top affiliates
          move up to 25%.
        </p>

        <div className="earn__tiers">
          <div>
            <strong>10%</strong>
            <span>Starter — ₦0+</span>
          </div>
          <div>
            <strong>15%</strong>
            <span>Silver — ₦50K earned</span>
          </div>
          <div>
            <strong>25%</strong>
            <span>Gold — ₦250K earned</span>
          </div>
        </div>

        <form className="earn__invite" onSubmit={join}>
          <input
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit">
            <BadgePercent size={15} /> Sign up as affiliate
          </button>
        </form>
      </section>
    );
  }

  const link = `${window.location.origin}${window.location.pathname}#/contest?aff=${affiliate.code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* ignore */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const simulate = () =>
    setAffiliate((a) =>
      a
        ? {
            ...a,
            clicks: a.clicks + Math.floor(Math.random() * 40) + 10,
            signups: a.signups + 1,
            balance:
              a.balance +
              Math.round(
                contests[0].rewards[0].amount *
                  0.001 *
                  (a.commissionRate / 100),
              ),
          }
        : a,
    );

  return (
    <section className="earn__panel">
      <div className="earn__panel-head">
        <BadgePercent size={17} />
        <h2>Affiliate dashboard</h2>
      </div>
      <p className="earn__sub">
        Welcome back, {affiliate.name}. Your code:{" "}
        <code className="earn__code">{affiliate.code}</code>
      </p>

      <div className="earn__linkbox">
        <code>{link}</code>
        <button onClick={copy} aria-label="Copy affiliate link">
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>

      <div className="earn__stats">
        <div>
          <TrendingUp size={15} />
          <strong>{affiliate.clicks.toLocaleString()}</strong>
          <span>Link clicks</span>
        </div>
        <div>
          <Users size={15} />
          <strong>{affiliate.signups}</strong>
          <span>Sign-ups</span>
        </div>
        <div>
          <Wallet size={15} />
          <strong>{formatNaira(affiliate.balance)}</strong>
          <span>Unpaid commission</span>
        </div>
      </div>

      <div className="earn__actions">
        <button onClick={simulate}>
          <Share2 size={15} /> Promote Face of Rivalry 2025
        </button>
        <button
          className="earn__payout"
          disabled={affiliate.balance < 5000}
          onClick={() =>
            setAffiliate((a) =>
              a ? { ...a, paidOut: a.paidOut + a.balance, balance: 0 } : a,
            )
          }
        >
          <Wallet size={15} />
          {affiliate.balance < 5000
            ? "Min payout ₦5,000"
            : `Withdraw ${formatNaira(affiliate.balance)}`}
        </button>
      </div>
      <p className="earn__paid">
        Lifetime paid out: {formatNaira(affiliate.paidOut)}
      </p>
    </section>
  );
}

export default function Earn() {
  return (
    <div className="earn app">
      <header className="earn__hero">
        <h1>Earn with Rivalry</h1>
        <p>
          Refer vendors to the contest — or join the affiliate program and earn
          commissions.
        </p>
      </header>
      <VendorReferrals />
      <AffiliatePanel />
      <div className="app__footer-spacer" />
    </div>
  );
}
