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
import "./Earn.css";

/* ---------- Vendor / friend referral (for contestants & users) ---------- */

interface Referral {
  id: number;
  name: string;
  contact: string;
  status: "Joined" | "Invited" | "Signed up";
  reward: number;
}

const seedReferrals: Referral[] = [
  {
    id: 1,
    name: "Konga Foods",
    contact: "vendor@konga.ng",
    status: "Joined",
    reward: 2000,
  },
  {
    id: 2,
    name: "Slice Beauty Bar",
    contact: "0803 442 1188",
    status: "Signed up",
    reward: 2000,
  },
  {
    id: 3,
    name: "Tobi Threads",
    contact: "tobi@mail.com",
    status: "Invited",
    reward: 0,
  },
];

function VendorReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>(seedReferrals);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${window.location.pathname}#/join?ref=RV-${referrals.length + 100}`;

  const totalEarned = referrals.reduce((s, r) => s + r.reward, 0);

  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setReferrals((r) => [
      {
        id: Date.now(),
        name: name.trim(),
        contact: contact.trim(),
        status: "Invited",
        reward: 0,
      },
      ...r,
    ]);
    setName("");
    setContact("");
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
        Refer your friends to join this contest and earn up to{" "}
        <strong>₦2,000</strong> per referral.
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
        <button type="submit">
          <UserPlus size={15} /> Send invite
        </button>
      </form>

      <div className="earn__total">
        <Gift size={15} /> Referral earnings:{" "}
        <strong>{formatNaira(totalEarned)}</strong>
      </div>

      <ul className="earn__list">
        {referrals.map((r) => (
          <li key={r.id}>
            <div>
              <strong>{r.name}</strong>
              <span>{r.contact}</span>
            </div>
            <em
              className={`earn__status earn__status--${r.status.toLowerCase().replace(" ", "-")}`}
            >
              {r.status}
              {r.reward ? ` · ${formatNaira(r.reward)}` : ""}
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
