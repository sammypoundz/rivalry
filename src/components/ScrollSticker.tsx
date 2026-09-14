import { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import "./ScrollSticker.css";

export default function ScrollSticker() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`scroll-sticker${stuck ? " scroll-sticker--stuck" : ""}`}
      aria-hidden={!stuck}
    >
      <div className="scroll-sticker__ring">
        <div className="scroll-sticker__spin">
          <svg viewBox="0 0 100 100" className="scroll-sticker__arc">
            <defs>
              <path
                id="sticker-circle"
                d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
              />
            </defs>
            <text className="scroll-sticker__arc-text">
              <textPath href="#sticker-circle">
                RIVALRY · SEASON 1 · VOTE FOR YOUR QUEEN ·
              </textPath>
            </text>
          </svg>
        </div>
        <Crown className="scroll-sticker__crown" size={22} strokeWidth={1.8} />
      </div>
    </div>
  );
}
