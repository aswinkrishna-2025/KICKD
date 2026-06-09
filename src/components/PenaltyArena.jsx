import { useRef, useEffect, useState, useCallback } from 'react';
import supabase from '../hooks/useSupabase';
import ResultFlash from './ResultFlash';

/* ─── Canvas constants ───────────────────────────────────── */
const W = 420, H = 310;
const BALL_X = 210, BALL_Y = 248;
const GOAL = { x: 110, y: 20, w: 200, h: 68 };

/* ─── Difficulty ─────────────────────────────────────────── */
const KEEPER_PATROL_SPEED = 2.8;
const KEEPER_DIVE_FAST     = 0.12;   // fast dive speed (harder)
const KEEPER_DIVE_SLOW     = 0.065;  // slow reaction dive speed
const KEEPER_REACH        = 36;     // catch radius in pixels
const MISS_CHANCE         = 0.07;   // random miss chance

/* ─── Math helpers ───────────────────────────────────────── */
function lerp(a, b, t) { return a + (b - a) * t; }

function catmullRom(pts, steps = 6) {
  if (pts.length < 2) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5*(2*p1.x+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5*(2*p1.y+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* ─── Canvas drawing ─────────────────────────────────────── */
function drawPitch(ctx) {
  const stripeH = Math.ceil(H / 10);
  for (let i = 0; i < 11; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1a6b2e' : '#1e7533';
    ctx.fillRect(0, i * stripeH, W, stripeH);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 10, 300, 200);
  ctx.strokeRect(90, 10, 240, 140);
  ctx.beginPath();
  ctx.arc(BALL_X, 195, 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(BALL_X, 195, 50, Math.PI * 1.2, Math.PI * 1.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGoal(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.8;
  const cols = 10, rows = 5;
  for (let c = 0; c <= cols; c++) {
    const x = GOAL.x + (c / cols) * GOAL.w;
    ctx.beginPath(); ctx.moveTo(x, GOAL.y); ctx.lineTo(x, GOAL.y + GOAL.h); ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = GOAL.y + (r / rows) * GOAL.h;
    ctx.beginPath(); ctx.moveTo(GOAL.x, y); ctx.lineTo(GOAL.x + GOAL.w, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.strokeRect(GOAL.x, GOAL.y, GOAL.w, GOAL.h);
  const postW = 7, postH = GOAL.h + 10;
  const g1 = ctx.createLinearGradient(GOAL.x - postW, 0, GOAL.x + 2, 0);
  g1.addColorStop(0, '#888'); g1.addColorStop(1, '#ddd');
  ctx.fillStyle = g1;
  ctx.fillRect(GOAL.x - postW, GOAL.y - 4, postW, postH);
  const g2 = ctx.createLinearGradient(GOAL.x + GOAL.w, 0, GOAL.x + GOAL.w + postW, 0);
  g2.addColorStop(0, '#ddd'); g2.addColorStop(1, '#888');
  ctx.fillStyle = g2;
  ctx.fillRect(GOAL.x + GOAL.w, GOAL.y - 4, postW, postH);
  const bg = ctx.createLinearGradient(0, GOAL.y - 4, 0, GOAL.y + 4);
  bg.addColorStop(0, '#ccc'); bg.addColorStop(1, '#888');
  ctx.fillStyle = bg;
  ctx.fillRect(GOAL.x - postW, GOAL.y - 4, GOAL.w + postW * 2, 7);
}

function drawKeeper(ctx, kx, ky, tilt = 0, diving = false) {
  ctx.save();
  ctx.translate(kx, ky);
  if (diving && tilt !== 0) ctx.rotate(tilt * 0.55);

  // Shadow
  ctx.beginPath();
  ctx.ellipse(0, 30, 14, 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();

  // Legs (spread when diving)
  ctx.fillStyle = '#1a1a2e';
  if (diving && tilt > 0) {
    ctx.fillRect(-12, 18, 8, 14);
    ctx.fillRect(2, 16, 8, 16);
  } else if (diving && tilt < 0) {
    ctx.fillRect(-10, 16, 8, 16);
    ctx.fillRect(4, 18, 8, 14);
  } else {
    ctx.fillRect(-9, 18, 7, 14);
    ctx.fillRect(2, 18, 7, 14);
  }

  // Body
  const bodyGrad = ctx.createLinearGradient(-10, 0, 10, 0);
  bodyGrad.addColorStop(0, '#c8102e');
  bodyGrad.addColorStop(1, '#e63946');
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-10, 0, 20, 20);

  // Arms — wide when diving
  ctx.fillStyle = '#d4a97a';
  if (diving) {
    const armAngle = tilt > 0 ? 0.8 : -0.8;
    ctx.beginPath(); ctx.ellipse(-16, 4, 6, 3, armAngle, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(16, 4, 6, 3, -armAngle, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(-14, 6, 5, 3, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14, 6, 5, 3, 0.4, 0, Math.PI * 2); ctx.fill();
  }

  // Gloves — yellow, larger when diving
  const gloveR = diving ? 5.5 : 4;
  ctx.fillStyle = '#f5c518';
  ctx.beginPath(); ctx.arc(diving ? -20 : -18, diving ? 4 : 7, gloveR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(diving ? 20 : 18, diving ? 4 : 7, gloveR, 0, Math.PI * 2); ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(0, -8, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c518';
  ctx.fill();
  ctx.strokeStyle = '#d4a060'; ctx.lineWidth = 1; ctx.stroke();

  // Eyes
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.arc(-3, -8, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -8, 2, 0, Math.PI * 2); ctx.fill();

  // Kit number
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1', 0, 13);

  ctx.restore();
}

function drawBall(ctx, bx, by, scale = 1) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.ellipse(0, 13, 11, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  const ballGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
  ballGrad.addColorStop(0, '#ffffff');
  ballGrad.addColorStop(1, '#cccccc');
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fillStyle = ballGrad;
  ctx.fill();
  ctx.strokeStyle = '#999'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#222';
  [[0,-5],[-4,3],[4,3],[-6,-2],[6,-2]].forEach(([px,py]) => {
    ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}

// Draw the Score Hero curved path the player has drawn
function drawShotPath(ctx, points, fadeProgress = 1) {
  if (points.length < 2) return;
  const opacity = Math.max(0, 1 - fadeProgress * 1.2);
  ctx.save();

  // Glowing trail
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.5})`;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner bright line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = `rgba(120,200,255,${opacity * 0.7})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow at end
  if (points.length >= 2 && opacity > 0.3) {
    const last = points[points.length - 1];
    const prev = points[Math.max(0, points.length - 4)];
    const angle = Math.atan2(last.y - prev.y, last.x - prev.x);
    ctx.save();
    ctx.translate(last.x, last.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, -5);
    ctx.lineTo(-10, 5);
    ctx.closePath();
    ctx.fillStyle = `rgba(255,255,255,${opacity * 0.8})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// Draw "START HERE" indicator on ball when idle
function drawBallHint(ctx, x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ─── Main Component ─────────────────────────────────────── */
export default function PenaltyArena({ selectedTeam, setScreen, seriesResults }) {
  const canvasRef = useRef(null);

  // Keeper
  const keeperXRef        = useRef(210);
  const keeperYRef        = useRef(54);
  const keeperDirRef      = useRef(1);
  const keeperTgtXRef     = useRef(210);
  const keeperTgtYRef     = useRef(54);
  const keeperDivingRef   = useRef(false);
  const keeperTiltRef     = useRef(0);
  const keeperDiveLerpRef = useRef(KEEPER_DIVE_FAST);

  // Drawing
  const drawingRef     = useRef(false);
  const rawPathRef     = useRef([]);
  const smoothPathRef  = useRef([]);

  // Ball
  const ballPosRef     = useRef({ x: BALL_X, y: BALL_Y });
  const flyProgressRef = useRef(0);
  const animStateRef   = useRef('idle'); // idle | drawing | flying | done

  const canShootRef    = useRef(true);
  const resolveCalledRef = useRef(false);
  const rafRef         = useRef(null);

  const [goalsScored,  setGoalsScored]  = useState(0);
  const [results,      setResults]      = useState([]);
  const [flashResult,  setFlashResult]  = useState(null);
  const [hint,         setHint]         = useState('Draw from the ⚽ to aim your shot!');
  const [shotCount,    setShotCount]    = useState(0);

  /* ── Resolve shot outcome ── */
  const resolveShot = useCallback(async (tx, ty) => {
    if (resolveCalledRef.current) return;
    resolveCalledRef.current = true;

    const inGoal =
      tx >= GOAL.x + 5 && tx <= GOAL.x + GOAL.w - 5 &&
      ty >= GOAL.y - 6 && ty <= GOAL.y + GOAL.h + 6;

    const kx = keeperXRef.current;
    const keeperSave = inGoal && Math.abs(tx - kx) < KEEPER_REACH;
    const randomMiss = Math.random() < MISS_CHANCE;
    const isGoal     = inGoal && !keeperSave && !randomMiss;

    const resultType = isGoal ? 'goal' : keeperSave ? 'saved' : 'missed';
    setFlashResult(resultType);
    animStateRef.current = 'done';

    try {
      const { data } = await supabase
        .from('team_scores').select('*')
        .eq('team_id', selectedTeam.id).single();
      await supabase.from('team_scores').upsert({
        team_id: selectedTeam.id,
        goals: (data?.goals || 0) + (isGoal ? 1 : 0),
        shots: (data?.shots || 0) + 1,
      }, { onConflict: 'team_id' });
    } catch (e) { console.warn('Supabase error', e); }

    setResults(prev => {
      const next = [...prev, resultType];
      seriesResults.current = next;
      return next;
    });
    if (isGoal) setGoalsScored(g => g + 1);

    setShotCount(prev => {
      const next = prev + 1;
      setTimeout(() => {
        setFlashResult(null);
        ballPosRef.current    = { x: BALL_X, y: BALL_Y };
        flyProgressRef.current = 0;
        rawPathRef.current     = [];
        smoothPathRef.current  = [];
        resolveCalledRef.current = false;
        keeperDivingRef.current  = false;
        keeperXRef.current       = 210;
        keeperYRef.current       = 54;
        keeperTiltRef.current    = 0;

        if (next >= 5) {
          setScreen('end');
        } else {
          canShootRef.current   = true;
          animStateRef.current  = 'idle';
          setHint('Draw from the ⚽ to aim your shot!');
        }
      }, 1500);
      return next;
    });
  }, [selectedTeam, setScreen, seriesResults]);

  /* ── Main canvas loop ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let pulse = 0;

    function loop() {
      pulse += 0.05;
      ctx.clearRect(0, 0, W, H);
      drawPitch(ctx);
      drawGoal(ctx);

      /* Keeper */
      if (!keeperDivingRef.current) {
        keeperXRef.current += keeperDirRef.current * KEEPER_PATROL_SPEED;
        if (keeperXRef.current >= 305) { keeperXRef.current = 305; keeperDirRef.current = -1; }
        if (keeperXRef.current <= 115) { keeperXRef.current = 115; keeperDirRef.current = 1; }
        keeperYRef.current = 54;
        keeperTiltRef.current = 0;
      } else {
        keeperXRef.current = lerp(keeperXRef.current, keeperTgtXRef.current, keeperDiveLerpRef.current);
        keeperYRef.current = lerp(keeperYRef.current, keeperTgtYRef.current, keeperDiveLerpRef.current * 0.8);
      }
      drawKeeper(ctx, keeperXRef.current, keeperYRef.current, keeperTiltRef.current, keeperDivingRef.current);

      /* Path & ball */
      const state = animStateRef.current;

      if (state === 'idle') {
        // Pulsing ring on ball as hint
        const r = 18 + Math.sin(pulse) * 3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(BALL_X, BALL_Y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + 0.2 * Math.sin(pulse)})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        drawBall(ctx, BALL_X, BALL_Y);

      } else if (state === 'drawing') {
        drawShotPath(ctx, rawPathRef.current);
        drawBall(ctx, BALL_X, BALL_Y);

      } else if (state === 'flying') {
        const path = smoothPathRef.current;
        flyProgressRef.current = Math.min(1, flyProgressRef.current + 0.033);
        const p = flyProgressRef.current;
        const idx = Math.min(path.length - 1, Math.floor(p * (path.length - 1)));
        if (path[idx]) ballPosRef.current = path[idx];
        const scale = 1 - p * 0.5;

        // Fade path as ball moves
        drawShotPath(ctx, smoothPathRef.current, p);
        drawBall(ctx, ballPosRef.current.x, ballPosRef.current.y, scale);

        if (p >= 1) {
          const last = path[path.length - 1];
          resolveShot(last.x, last.y);
        }

      } else if (state === 'done') {
        drawBall(ctx, ballPosRef.current.x, ballPosRef.current.y, 0.5);
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);

    /* Input helpers */
    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const sx = W / rect.width, sy = H / rect.height;
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    }

    function nearBall(pos) {
      const dx = pos.x - BALL_X, dy = pos.y - BALL_Y;
      return Math.sqrt(dx*dx + dy*dy) < 38;
    }

    function onDown(e) {
      if (!canShootRef.current || animStateRef.current !== 'idle') return;
      const pos = getPos(e);
      if (!nearBall(pos)) return;
      e.preventDefault();
      drawingRef.current = true;
      rawPathRef.current = [{ x: BALL_X, y: BALL_Y }];
      animStateRef.current = 'drawing';
      setHint('');
    }

    function onMove(e) {
      if (!drawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      const last = rawPathRef.current[rawPathRef.current.length - 1];
      const dx = pos.x - last.x, dy = pos.y - last.y;
      if (dx*dx + dy*dy > 16) rawPathRef.current.push(pos);
    }

    function onUp(e) {
      if (!drawingRef.current) return;
      e.preventDefault();
      drawingRef.current = false;

      const raw = rawPathRef.current;
      if (raw.length < 4) {
        animStateRef.current = 'idle';
        rawPathRef.current = [];
        setHint('Draw a longer path to shoot!');
        return;
      }

      /* Smooth the path */
      smoothPathRef.current = catmullRom(raw, 6);

      /* Determine target = last drawn point */
      const target = raw[raw.length - 1];
      const tgtX = Math.max(GOAL.x, Math.min(GOAL.x + GOAL.w, target.x));
      const tgtY = Math.max(GOAL.y, Math.min(GOAL.y + GOAL.h, target.y));

      /* Keeper dive — dynamic AI behavior */
      const rand = Math.random();
      let targetX = tgtX;
      let targetY = tgtY < 50 ? 30 : 65;
      let diveSpeed = KEEPER_DIVE_FAST;

      if (rand < 0.65) {
        // Option 1: Correct Anticipation (dive fast to the shot location)
        targetX = tgtX + (Math.random() - 0.5) * 15;
        diveSpeed = KEEPER_DIVE_FAST;
      } else if (rand < 0.80) {
        // Option 2: Wrong Anticipation (dive to the opposite side of the goal)
        const goalCenter = GOAL.x + GOAL.w / 2; // 210
        const shotOffset = tgtX - goalCenter;
        targetX = goalCenter - shotOffset;
        // Make sure it actually moves away from the shot
        if (Math.abs(targetX - goalCenter) < 30) {
          targetX = shotOffset > 0 ? goalCenter - 60 : goalCenter + 60;
        }
        diveSpeed = KEEPER_DIVE_FAST;
      } else {
        // Option 3: Reaction Dive (dive to shot location, but slowly/late)
        targetX = tgtX;
        diveSpeed = KEEPER_DIVE_SLOW;
      }

      keeperTgtXRef.current = Math.max(115, Math.min(305, targetX));
      keeperTgtYRef.current = targetY;
      keeperDiveLerpRef.current = diveSpeed;
      keeperDivingRef.current = true;
      keeperTiltRef.current = keeperTgtXRef.current > keeperXRef.current ? 0.7 : -0.7;

      canShootRef.current   = false;
      animStateRef.current  = 'flying';
      flyProgressRef.current = 0;
    }

    canvas.addEventListener('mousedown',  onDown);
    canvas.addEventListener('mousemove',  onMove);
    canvas.addEventListener('mouseup',    onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove',  onMove, { passive: false });
    canvas.addEventListener('touchend',   onUp,   { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousedown',  onDown);
      canvas.removeEventListener('mousemove',  onMove);
      canvas.removeEventListener('mouseup',    onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onUp);
    };
  }, [resolveShot]);

  return (
    <div className="arena">

      {/* HUD */}
      <div className="arena__hud">
        <div className="arena__hud-team">
          <span className="arena__hud-flag">{selectedTeam?.flag}</span>
          <span className="arena__hud-name">{selectedTeam?.name}</span>
        </div>
        <div className="arena__hud-score">
          <span className="arena__hud-goals">{goalsScored}</span>
          <span className="arena__hud-label"> goals</span>
        </div>
      </div>

      {/* Shot dots */}
      <div className="arena__dots">
        {Array.from({ length: 5 }).map((_, i) => {
          const r = results[i];
          return (
            <div
              key={i}
              className={`arena__dot ${r === 'goal' ? 'arena__dot--goal' : r ? 'arena__dot--miss' : ''}`}
            >
              {r === 'goal' ? '⚽' : r ? '✗' : ''}
            </div>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="arena__canvas-wrap">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="arena__canvas"
        />
        <ResultFlash result={flashResult} />
      </div>

      {/* Hint */}
      {hint && animStateRef.current === 'idle' && (
        <div className="arena__hint">{hint}</div>
      )}

      {/* Bottom nav */}
      <div className="arena__nav">
        <button className="btn-secondary" onClick={() => setScreen('select')}>
          ← Change Team
        </button>
        <button className="btn-outline-gold" onClick={() => setScreen('board')}>
          🏆 Leaderboard
        </button>
      </div>
    </div>
  );
}
