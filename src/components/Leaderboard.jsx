import { useState, useEffect } from 'react';
import { TEAMS } from '../constants';
import supabase from '../hooks/useSupabase';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ selectedTeam, setScreen }) {
  const [rows, setRows] = useState([]);
  const [sortBy, setSortBy] = useState('goals');
  const [isLive, setIsLive] = useState(false);

  async function fetchScores() {
    const { data } = await supabase.from('team_scores').select('*');
    if (!data) return;
    const merged = data.map(row => {
      const team = TEAMS.find(t => t.id === row.team_id);
      return {
        ...row,
        name: team?.name || row.team_id,
        flag: team?.flag || '🏳',
        accuracy: row.shots > 0 ? Math.round((row.goals / row.shots) * 100) : 0,
      };
    });
    setRows(merged);
  }

  useEffect(() => {
    fetchScores();

    const channel = supabase
      .channel('leaderboard_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_scores' }, () => fetchScores())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_scores' }, () => fetchScores())
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, []);

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'goals')    return b.goals    - a.goals;
    if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
    if (sortBy === 'shots')    return b.shots    - a.shots;
    return 0;
  });

  const rowClass = (i) => {
    if (i === 0) return 'lb-row--top1';
    if (i === 1) return 'lb-row--top2';
    if (i === 2) return 'lb-row--top3';
    return '';
  };

  return (
    <div className="leaderboard">

      {/* Header */}
      <div className="leaderboard__header">
        <div className="leaderboard__title-row">
          <h1 className="leaderboard__title">🏆 Leaderboard</h1>
          <div className={`leaderboard__live ${isLive ? 'leaderboard__live--active' : ''}`}>
            <span className="leaderboard__live-dot">●</span> Live
          </div>
        </div>
        <p className="leaderboard__sub">Global scores from all players</p>
      </div>

      {/* Sort tabs */}
      <div className="leaderboard__tabs">
        {[
          { key: 'goals',    label: 'Goals'    },
          { key: 'accuracy', label: 'Accuracy' },
          { key: 'shots',    label: 'Shots'    },
        ].map(tab => (
          <button
            key={tab.key}
            className={`leaderboard__tab ${sortBy === tab.key ? 'leaderboard__tab--active' : ''}`}
            onClick={() => setSortBy(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="leaderboard__col-heads">
        <span>#</span>
        <span>Flag</span>
        <span>Team</span>
        <span>Stats</span>
      </div>

      {/* Table */}
      <div className="leaderboard__table">
        {sorted.map((row, i) => {
          const rank      = i + 1;
          const isTop3    = rank <= 3;
          const isSelected = selectedTeam?.id === row.team_id;
          return (
            <div
              key={row.team_id}
              className={`lb-row ${rowClass(i)} ${isSelected ? 'lb-row--selected' : ''}`}
            >
              <div className="lb-row__rank">
                {isTop3
                  ? MEDAL[i]
                  : <span className="lb-row__rank-num">{rank}</span>
                }
              </div>
              <div className="lb-row__flag">{row.flag}</div>
              <div className="lb-row__name">{row.name}</div>
              <div className="lb-row__stats">
                <span className="lb-row__goals">{row.goals}</span>
                <span className="lb-row__shots">/{row.shots}</span>
                <span className="lb-row__acc">{row.accuracy}%</span>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <div className="leaderboard__empty">Loading scores…</div>
        )}
      </div>

      {/* Nav */}
      <div className="leaderboard__nav">
        <button className="btn-secondary" onClick={() => setScreen(selectedTeam ? 'arena' : 'select')}>
          ← Back
        </button>
        <button className="btn-primary" onClick={() => setScreen('select')}>
          ⚽ Play Again
        </button>
      </div>
    </div>
  );
}
