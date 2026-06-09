export default function EndScreen({ selectedTeam, seriesResults, setScreen }) {
  const results = seriesResults.current || [];
  const goals = results.filter(r => r === 'goal').length;

  const messages = [
    '0/5 — Rough outing. Keep grinding! 💪',
    '1/5 — The keeper read you perfectly.',
    '2/5 — Getting there. More practice needed.',
    '3/5 — Solid effort! Keep pushing. 🙌',
    '4/5 — Great shooting! Almost flawless!',
    '5/5 — LEGENDARY PERFORMANCE! 🌟 Perfect score!',
  ];

  const scoreColor = goals >= 4 ? '#2563eb' : goals >= 2 ? '#f59e0b' : '#ef4444';

  return (
    <div className="end-screen">
      <div className="end-screen__card">

        {/* Confetti for high scores */}
        <div className="end-screen__confetti" aria-hidden="true">
          {goals >= 4 && ['🎉', '⭐', '🎊', '✨', '🌟'].map((e, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{ '--delay': `${i * 0.15}s`, '--x': `${15 + i * 18}%` }}
            >
              {e}
            </span>
          ))}
        </div>

        {/* Team identity */}
        <div className="end-screen__flag">{selectedTeam?.flag}</div>
        <h1 className="end-screen__team">{selectedTeam?.name}</h1>

        {/* Score */}
        <div className="end-screen__score-wrap">
          <span className="end-screen__score" style={{ color: scoreColor }}>{goals}</span>
          <span className="end-screen__score-denom"> / 5</span>
        </div>
        <p className="end-screen__label">Goals from 5 penalties</p>

        {/* Shot dots */}
        <div className="end-screen__dots">
          {results.map((r, i) => (
            <div
              key={i}
              className={`end-dot ${r === 'goal' ? 'end-dot--goal' : 'end-dot--miss'}`}
            >
              {r === 'goal' ? '⚽' : '✗'}
            </div>
          ))}
          {Array.from({ length: 5 - results.length }).map((_, i) => (
            <div key={`empty-${i}`} className="end-dot end-dot--empty" />
          ))}
        </div>

        {/* Message */}
        <div className="end-screen__message">{messages[goals]}</div>

        {/* Actions */}
        <div className="end-screen__actions">
          <button
            className="btn-secondary"
            onClick={() => setScreen('menu')}
          >
            ← Main Menu
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              seriesResults.current = [];
              setScreen('select');
            }}
          >
            ⚽ Play Again
          </button>
          <button
            className="btn-secondary"
            onClick={() => setScreen('board')}
          >
            🏆 View Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
}
