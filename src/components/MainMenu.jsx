import framedropLogo from '../assets/framedrop_logo.png';
import './MainMenu.css';

export default function MainMenu({ setScreen }) {
  return (
    <div className="mm">
      {/* Background */}
      <div className="mm__bg" />

      <div className="mm__content">

        {/* Top badge */}
        <div className="mm__badge">⚽ FIFA World Cup 2026</div>

        {/* Hero */}
        <div className="mm__hero">
          <h1 className="mm__brand">KICKD</h1>
          <p className="mm__tagline">Take the perfect penalty. Show what you're made of.</p>
        </div>

        {/* Play CTA */}
        <button className="mm__play-btn" onClick={() => setScreen('select')}>
          <span className="mm__play-icon">▶</span>
          Play Now
        </button>

        {/* Partners section */}
        <div className="mm__partners">

          <div className="mm__partner-card">
            <img src={framedropLogo} className="mm__partner-logo mm__partner-logo--img" alt="Framedrop Interactive Logo" />
            <div className="mm__partner-body">
              <h3 className="mm__partner-name">Framedrop Interactive</h3>
              <p className="mm__partner-tag">Independent Game Studio · Est. 2025 · Kerala</p>
              <p className="mm__partner-desc">
                We build worlds that refuse to be forgotten. Story-driven games with raw cinematic vision —
                built in Kerala, felt everywhere. Every mechanic serves the story. Every pixel is a creative decision.
              </p>
            </div>
          </div>

          <div className="mm__divider">
            <span className="mm__divider-line" />
            <span className="mm__divider-x">×</span>
            <span className="mm__divider-line" />
          </div>

          <div className="mm__partner-card">
            <div className="mm__partner-logo mm__partner-logo--mp">μ</div>
            <div className="mm__partner-body">
              <h3 className="mm__partner-name">MuPlay — by MuLearn</h3>
              <p className="mm__partner-desc">
                MuPlay is a dedicated section of <strong style={{color:'rgba(255,255,255,0.7)'}}>MuLearn</strong> focused on game development. 
                We bring together students passionate about building games, interactive experiences, 
                and creative tech — right here at College of Engineering Pathanapuram.
              </p>
            </div>
          </div>

        </div>

        {/* College footer */}
        <div className="mm__college">
          <span className="mm__college-icon">🏛️</span>
          <span>College of Engineering Pathanapuram</span>
        </div>

      </div>
    </div>
  );
}
