export default function ResultFlash({ result }) {
  if (!result) return null;

  const config = {
    goal: {
      bg: 'rgba(0,232,122,0.15)',
      border: '#00e87a',
      color: '#00e87a',
      icon: '⚽',
      text: 'GOAL!',
      sub: 'Net Ripples!',
    },
    saved: {
      bg: 'rgba(245,197,24,0.15)',
      border: '#f5c518',
      color: '#f5c518',
      icon: '🧤',
      text: 'SAVED',
      sub: 'Keeper denies you',
    },
    missed: {
      bg: 'rgba(230,57,70,0.15)',
      border: '#e63946',
      color: '#e63946',
      icon: '❌',
      text: 'MISSED',
      sub: 'Off target',
    },
  };

  const c = config[result];
  if (!c) return null;

  return (
    <div className="result-flash__overlay">
      <div
        className="result-flash__card"
        style={{ background: c.bg, borderColor: c.border }}
      >
        <div className="result-flash__big" style={{ color: c.color }}>
          {c.icon} {c.text}
        </div>
        <div className="result-flash__sub">{c.sub}</div>
      </div>
    </div>
  );
}
