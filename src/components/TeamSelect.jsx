import { useState, useEffect } from 'react';
import { TEAMS } from '../constants';
import supabase from '../hooks/useSupabase';

export default function TeamSelect({ selectedTeam, setSelectedTeam, setScreen }) {
  const [scores,  setScores]  = useState({});
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScores() {
      const { data } = await supabase.from('team_scores').select('*');
      if (data) {
        const map = {};
        data.forEach(row => { map[row.team_id] = row; });
        setScores(map);
      }
      setLoading(false);
    }
    fetchScores();
  }, []);

  const filtered = TEAMS.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalGoals = Object.values(scores).reduce((a, r) => a + (r.goals || 0), 0);
  const totalShots = Object.values(scores).reduce((a, r) => a + (r.shots || 0), 0);

  return (
    <div className="team-select">

      {/* Hero banner */}
      <div className="team-select__hero">
        <button
          className="team-select__back-btn"
          onClick={() => setScreen('menu')}
          aria-label="Back to main menu"
        >
          ← Back
        </button>
        <p className="team-select__eyebrow">⚽ World Cup 2026</p>
        <h1 className="team-select__title">Pick Your Team</h1>
        <p className="team-select__sub">Select a team and take 5 penalties</p>
      </div>

      {/* Global stats chips */}
      {!loading && (
        <div className="team-select__stats-row">
          <div className="team-select__stat-chip">
            <span className="team-select__stat-icon">⚽</span>
            <div className="team-select__stat-info">
              <span className="team-select__stat-val">{totalGoals.toLocaleString()}</span>
              <span className="team-select__stat-lbl">Global Goals</span>
            </div>
          </div>
          <div className="team-select__stat-chip">
            <span className="team-select__stat-icon">🎯</span>
            <div className="team-select__stat-info">
              <span className="team-select__stat-val">
                {totalShots > 0 ? Math.round((totalGoals / totalShots) * 100) : 0}%
              </span>
              <span className="team-select__stat-lbl">Avg Accuracy</span>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="team-select__search-section">
        <span className="team-select__section-label">Select Your Team</span>
        <div className="team-select__search-wrap">
          <span className="team-select__search-icon">🔍</span>
          <input
            className="team-select__search"
            type="text"
            placeholder="Search team…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="team-select__search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="team-select__grid">
        {filtered.length === 0 && (
          <p className="team-select__empty">No teams found for "{search}"</p>
        )}
        {filtered.map(team => {
          const row      = scores[team.id];
          const goals    = row?.goals ?? 0;
          const isSelected = selectedTeam?.id === team.id;

          return (
            <button
              key={team.id}
              className={`team-card${isSelected ? ' team-card--selected' : ''}`}
              onClick={() => setSelectedTeam(team)}
              style={{
                '--c1': team.color,
                '--c2': team.color2,
              }}
            >
              {/* National colour stripe at top */}
              <div
                className="team-card__stripe"
                style={{
                  background: `linear-gradient(135deg, ${team.color} 0%, ${team.color2} 100%)`,
                }}
              />

              <span className="team-card__flag">{team.flag}</span>
              <span className="team-card__name">{team.name}</span>

              {loading ? (
                <span className="team-card__stat team-card__stat--loading">…</span>
              ) : (
                <span className="team-card__stat">
                  <span>{goals}</span>
                  <span>⚽</span>
                </span>
              )}

              {isSelected && <span className="team-card__check">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Sticky footer — z-index must sit above music bar's panel but below music bar itself */}
      <div className="team-select__footer">
        {selectedTeam && (
          <div className="team-select__selected-preview">
            <span>{selectedTeam.flag}</span>
            <span>Playing as {selectedTeam.name}</span>
          </div>
        )}
        <button
          className="btn-primary"
          disabled={!selectedTeam}
          onClick={() => setScreen('arena')}
        >
          {selectedTeam
            ? `⚽ Shoot for ${selectedTeam.name} ${selectedTeam.flag}`
            : 'Select a team to continue'}
        </button>
      </div>
    </div>
  );
}
