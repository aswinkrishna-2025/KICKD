import { useState, useRef, useEffect, useCallback } from 'react';
import './MusicPlayer.css';

// Only iShowSpeed - Champion (FIFA World Cup 2026)
const TRACK = {
  id: 'vrY1THC_NQE',
  title: 'Champion',
  artist: 'IShowSpeed',
  label: 'FIFA World Cup 2026 — Official Album',
};

// Inject YouTube IFrame API once
let ytApiLoaded = false;
function loadYouTubeAPI() {
  if (ytApiLoaded || document.getElementById('yt-api')) return;
  ytApiLoaded = true;
  const tag = document.createElement('script');
  tag.id = 'yt-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

export default function MusicPlayer() {
  const [isOpen,       setIsOpen]       = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [isReady,      setIsReady]      = useState(false);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [volume,       setVolume]       = useState(60);
  const [isMuted,      setIsMuted]      = useState(false);

  const playerRef = useRef(null);
  const tickRef   = useRef(null);

  /* ── Init YouTube player ── */
  useEffect(() => {
    loadYouTubeAPI();

    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll);
        playerRef.current = new window.YT.Player('yt-player-hidden', {
          videoId: TRACK.id,
          playerVars: {
            autoplay:        0,
            controls:        0,
            modestbranding:  1,
            rel:             0,
            iv_load_policy:  3,
            playsinline:     1,
          },
          events: {
            onReady(e) {
              setIsReady(true);
              setDuration(e.target.getDuration());
              e.target.setVolume(volume);
            },
            onStateChange(e) {
              const S = window.YT.PlayerState;
              if (e.data === S.PLAYING) {
                setIsPlaying(true);
                setDuration(playerRef.current.getDuration());
                startTick();
              } else if (e.data === S.PAUSED || e.data === S.BUFFERING) {
                setIsPlaying(false);
                stopTick();
              } else if (e.data === S.ENDED) {
                // Loop the single track
                setIsPlaying(false);
                stopTick();
                playerRef.current.seekTo(0);
                playerRef.current.playVideo();
              }
            },
          },
        });
      }
    }, 200);

    return () => {
      clearInterval(poll);
      stopTick();
      if (playerRef.current) playerRef.current.destroy();
    };
  }, []); // eslint-disable-line

  function startTick() {
    stopTick();
    tickRef.current = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const ct  = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(ct);
        setProgress(dur > 0 ? ct / dur : 0);
      } catch (_) {}
    }, 500);
  }

  function stopTick() {
    clearInterval(tickRef.current);
  }

  const togglePlay = useCallback(() => {
    if (!isReady || !playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isReady, isPlaying]);

  function handleSeek(e) {
    const pct = parseFloat(e.target.value) / 100;
    if (!playerRef.current) return;
    playerRef.current.seekTo(pct * duration, true);
    setProgress(pct);
  }

  function handleVolume(e) {
    const v = parseInt(e.target.value, 10);
    setVolume(v);
    setIsMuted(false);
    if (playerRef.current) playerRef.current.setVolume(v);
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
    } else {
      playerRef.current.mute();
    }
    setIsMuted(m => !m);
  }

  function fmt(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <>
      {/* Hidden YouTube player */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <div id="yt-player-hidden" />
      </div>

      {/* Full panel — slides up above the bar */}
      <div className={`mp-panel ${isOpen ? 'mp-panel--open' : ''}`}>
        <div className="mp-panel__inner">

          {/* Header */}
          <div className="mp-panel__head">
            <div className="mp-panel__head-label">
              <span className="mp-panel__fifa-dot" />
              FIFA World Cup 2026 — Official Album
            </div>
            <button className="mp-panel__close" onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Now playing art + meta */}
          <div className="mp-panel__now">
            <div className="mp-panel__art">
              <span className="mp-panel__art-emoji">⚡</span>
              {isPlaying && <div className="mp-panel__art-pulse" />}
            </div>
            <div className="mp-panel__meta">
              <span className="mp-panel__track-title">{TRACK.title}</span>
              <span className="mp-panel__track-artist">{TRACK.artist}</span>
              <span className="mp-panel__track-label">{TRACK.label}</span>
            </div>
          </div>

          {/* Seek bar */}
          <div className="mp-panel__seek-row">
            <span className="mp-panel__time">{fmt(currentTime)}</span>
            <div className="mp-panel__seek-wrap">
              <input
                className="mp-panel__seek"
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={progress * 100}
                onChange={handleSeek}
              />
              <div className="mp-panel__seek-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <span className="mp-panel__time">{fmt(duration)}</span>
          </div>

          {/* Controls */}
          <div className="mp-panel__controls">
            <button
              className={`mp-panel__ctrl mp-panel__ctrl--play ${!isReady ? 'mp-panel__ctrl--loading' : ''}`}
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {!isReady ? <span className="mp-spinner" /> : isPlaying ? '❙❙' : '▶'}
            </button>
          </div>

          {/* Volume */}
          <div className="mp-panel__volume-row">
            <button className="mp-panel__mute" onClick={toggleMute} aria-label="Toggle mute">
              {isMuted || volume === 0 ? '🔇' : volume < 40 ? '🔈' : '🔊'}
            </button>
            <div className="mp-panel__vol-wrap">
              <input
                className="mp-panel__vol"
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolume}
              />
              <div className="mp-panel__vol-fill" style={{ width: `${isMuted ? 0 : volume}%` }} />
            </div>
          </div>

        </div>
      </div>

      {/* Mini bar — always visible at very bottom */}
      <div className={`mp-bar ${isOpen ? 'mp-bar--open' : ''}`} onClick={() => !isOpen && setIsOpen(true)}>
        {/* Progress line at top of bar */}
        <div className="mp-bar__progress">
          <div className="mp-bar__progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="mp-bar__left">
          <button
            className={`mp-bar__play-btn ${isPlaying ? 'mp-bar__play-btn--playing' : ''}`}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '❙❙' : '▶'}
          </button>
          <div className="mp-bar__info">
            <span className="mp-bar__title">{TRACK.title}</span>
            <span className="mp-bar__artist">{TRACK.artist}</span>
          </div>
        </div>

        <div className="mp-bar__right">
          <span className="mp-bar__badge">FIFA 2026</span>
          <button
            className="mp-bar__expand"
            onClick={(e) => { e.stopPropagation(); setIsOpen(o => !o); }}
            aria-label="Expand player"
          >
            {isOpen ? '▾' : '▴'}
          </button>
        </div>
      </div>
    </>
  );
}
