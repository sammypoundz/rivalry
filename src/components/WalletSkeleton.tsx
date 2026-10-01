import { Wallet as WalletIcon } from "lucide-react";
import "./Wallet.css";

/**
 * Skeleton "UI card" loader for the Wallet page.
 * Used both as the React.lazy/Suspense fallback (while the Wallet chunk is
 * downloading) and inside the Wallet while the earnings query is in flight —
 * it mirrors the real layout (header, balance card, summary, ledger rows) so
 * the page doesn't jump when data arrives.
 */
export default function WalletSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="wallet app" aria-busy="true" aria-label="Loading wallet">
      <header className="wallet__head">
        <div className="wallet__badge wallet__skl wallet__skl--badge">
          <WalletIcon size={18} className="wallet__skl-ghost" />
        </div>
        <div>
          <div className="wallet__skl wallet__skl--title" />
          <div className="wallet__skl wallet__skl--sub" />
        </div>
      </header>

      <section className="wallet__balance wallet__skl-block">
        <div className="wallet__skl wallet__skl--label" />
        <div className="wallet__skl wallet__skl--amount" />
        <div className="wallet__skl wallet__skl--note" />
      </section>

      <section className="wallet__summary">
        {[0, 1, 2].map((i) => (
          <div key={i} className="wallet__sumcard wallet__skl-block">
            <div className="wallet__skl wallet__skl--sumnum" />
            <div className="wallet__skl wallet__skl--sumlabel" />
          </div>
        ))}
      </section>

      <section className="wallet__section">
        <div className="wallet__skl wallet__skl--heading" />
        <ul className="wallet__list">
          {Array.from({ length: rows }).map((_, i) => (
            <li key={i} className="wallet__row wallet__skl-block">
              <div className="wallet__row-main">
                <div className="wallet__skl wallet__skl--rowname" />
                <div className="wallet__skl wallet__skl--rowcontact" />
              </div>
              <div className="wallet__skl wallet__skl--rowamount" />
            </li>
          ))}
        </ul>
      </section>

      <div className="app__footer-spacer" />
    </div>
  );
}
