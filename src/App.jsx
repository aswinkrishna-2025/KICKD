import { useState, useEffect, useRef } from 'react';
import './App.css';
import { TEAMS } from './constants';
import supabase from './hooks/useSupabase';
import MainMenu from './components/MainMenu';
import TeamSelect from './components/TeamSelect';
import PenaltyArena from './components/PenaltyArena';
import EndScreen from './components/EndScreen';
import Leaderboard from './components/Leaderboard';
import LoadingScreen from './components/LoadingScreen';
import MusicPlayer from './components/MusicPlayer';

function Header() {
  return (
    <header className="app-header">
      <div className="app-header__left">
        <span className="app-header__brand">KICKD</span>
        <span className="app-header__sub">Framedrop Interactive × MuPlay</span>
      </div>
      <div className="app-header__badge">⚽ World Cup 2026</div>
    </header>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('menu'); // starts at main menu
  const [selectedTeam, setSelectedTeam] = useState(null);
  const seriesResults = useRef([]);

  // Seed Supabase on first run
  useEffect(() => {
    async function seedIfEmpty() {
      const { count } = await supabase
        .from('team_scores')
        .select('*', { count: 'exact', head: true });
      if (count === 0) {
        await supabase.from('team_scores').insert(
          TEAMS.map(t => ({ team_id: t.id, goals: 0, shots: 0 }))
        );
      }
    }
    seedIfEmpty();
  }, []);

  // ── Browser history integration (fixes mobile swipe-back) ──────────
  useEffect(() => {
    // Set initial history entry so swipe-back has somewhere to go
    window.history.replaceState({ screen: 'menu' }, '');

    function handlePopState(e) {
      const prev = e.state?.screen || 'menu';
      if (prev === 'select' || prev === 'menu') {
        seriesResults.current = [];
      }
      setScreen(prev);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function handleSetScreen(s) {
    if (s === 'select' || s === 'menu') {
      seriesResults.current = [];
    }
    // Push a history entry so back gesture returns here
    window.history.pushState({ screen: s }, '');
    setScreen(s);
  }

  return (
    <>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}

      {!loading && (
        <div className="app-root">
          <Header />

          <main className="app-main app-main--with-player">
            {screen === 'menu' && (
              <MainMenu setScreen={handleSetScreen} />
            )}
            {screen === 'select' && (
              <TeamSelect
                selectedTeam={selectedTeam}
                setSelectedTeam={setSelectedTeam}
                setScreen={handleSetScreen}
              />
            )}
            {screen === 'arena' && (
              <PenaltyArena
                selectedTeam={selectedTeam}
                setScreen={handleSetScreen}
                seriesResults={seriesResults}
              />
            )}
            {screen === 'end' && (
              <EndScreen
                selectedTeam={selectedTeam}
                seriesResults={seriesResults}
                setScreen={handleSetScreen}
              />
            )}
            {screen === 'board' && (
              <Leaderboard
                selectedTeam={selectedTeam}
                setScreen={handleSetScreen}
              />
            )}
          </main>

          {/* Music player — always mounted, persists across screens */}
          <MusicPlayer />
        </div>
      )}
    </>
  );
}
