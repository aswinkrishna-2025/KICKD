import { useEffect, useState } from 'react';
import './LoadingScreen.css';

export default function LoadingScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  // Phase 0 = blank → 1 = line draws → 2 = logo in → 3 = sub text → 4 = credits → 5 = exit

  useEffect(() => {
    const timings = [
      [120,  () => setPhase(1)],  // rule draws
      [680,  () => setPhase(2)],  // brand reveals
      [1300, () => setPhase(3)],  // tagline fades up
      [1900, () => setPhase(4)],  // credits appear
      [5500, () => setPhase(5)],  // exit fade-out starts
      [6200, () => onDone()],     // app mounts
    ];
    const timers = timings.map(([ms, fn]) => setTimeout(fn, ms));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className={`ls ls--p${phase}`}>
      {/* Ambient gradient background */}
      <div className="ls__ambient" />

      {/* Fine diagonal lines (luxury texture) */}
      <div className="ls__texture" />

      {/* Center column */}
      <div className="ls__col">

        {/* Horizontal rule that draws itself */}
        <div className="ls__rule-wrap">
          <div className="ls__rule ls__rule--left"  />
          <div className="ls__rule-dot"              />
          <div className="ls__rule ls__rule--right" />
        </div>

        {/* Brand name */}
        <div className="ls__brand-wrap">
          <h1 className="ls__brand">KICKD</h1>
          <div className="ls__brand-underline" />
        </div>

        {/* Tagline */}
        <p className="ls__tag">Penalty Shootout · World Cup 2026</p>

        {/* Separator */}
        <div className="ls__sep">
          <span className="ls__sep-line" />
          <span className="ls__sep-label">In Collaboration With</span>
          <span className="ls__sep-line" />
        </div>

        {/* Partners */}
        <div className="ls__partners">
          <div className="ls__partner">
            <span className="ls__partner-name">Framedrop Interactive</span>
          </div>
          <div className="ls__partner-x">×</div>
          <div className="ls__partner">
            <span className="ls__partner-name">MuPlay</span>
          </div>
        </div>

        {/* College */}
        <div className="ls__college">
          <div className="ls__college-bar" />
          <p className="ls__college-text">College of Engineering Pathanapuram</p>
        </div>

        {/* Progress */}
        <div className="ls__progress">
          <div className="ls__progress-fill" />
        </div>

      </div>
    </div>
  );
}
