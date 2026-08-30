import React, { useState, useEffect, useMemo } from 'react';
import { getTeamStats, getPlayerStats, getSeasons, getCurrentSeason, getMatches, getPlayers, getTeams, deleteMatch } from '../services/api';
import MatchEditModal from './MatchEditModal';

const Dashboard = () => {
  const [teamStats, setTeamStats] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('ranking');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      loadStats();
    }
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const [seasonsRes, currentSeasonRes] = await Promise.all([
        getSeasons(),
        getCurrentSeason()
      ]);
      setSeasons(seasonsRes.data);
      setSelectedSeason(currentSeasonRes.data.id);
      const [playersRes, teamsRes] = await Promise.all([getPlayers(), getTeams()]);
      setPlayers(playersRes.data);
      setTeams(teamsRes.data);
    } catch (err) {
      setError('Failed to load seasons');
      console.error(err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, playersRes, matchesRes] = await Promise.all([
        getTeamStats(selectedSeason),
        getPlayerStats(selectedSeason),
        getMatches(selectedSeason)
      ]);
      setTeamStats(teamsRes.data);
      setPlayerStats(playersRes.data);
      setMatches(matchesRes.data);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortedPlayerStats = useMemo(() => {
    const rows = playerStats.map((stat) => {
      const points = stat.points ?? ((stat.total_goals || 0) + (stat.total_assists || 0));
      const matchesPlayed = stat.matches_played || 0;
      const ppm = stat.ppm ?? (matchesPlayed ? points / matchesPlayed : 0);
      return {
        ...stat,
        points,
        ppm: Number(ppm),
        ranking: stat.ranking ?? 0,
        matches_black: stat.matches_black ?? 0,
        matches_white: stat.matches_white ?? 0,
      };
    });
    return [...rows].sort((a, b) => {
      let av;
      let bv;
      if (sortKey === 'player') {
        av = (a.player?.name || '').toLowerCase();
        bv = (b.player?.name || '').toLowerCase();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [playerStats, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'player' || key === 'ranking' ? 'asc' : 'desc');
    }
  };

  const sortMark = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const handleDeleteMatch = async (match) => {
    const label = `${match.date} — ${match.team1?.name || 'Team 1'} ${match.team1_score}–${match.team2_score} ${match.team2?.name || 'Team 2'}`;
    if (!window.confirm(`Delete this match?\n\n${label}`)) {
      return;
    }
    try {
      await deleteMatch(match.id);
      loadStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete match');
    }
  };

  if (loading && !selectedSeason) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">Match centre</p>
          <h1>Black vs White</h1>
          <p>Black vs White. Every goal, assist and result — one league, one table.</p>
        </div>
      </section>
      <div className="card">
        <h2>League table &amp; stats</h2>
        
        <div className="season-selector">
          <label htmlFor="season-select">Season </label>
          <select
            id="season-select"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
          >
            {seasons.map(season => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading statistics...</div>
        ) : (
          <>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Team statistics</h3>
            <div className="stats-grid">
              {teamStats.map(stat => (
                <div key={stat.team.id} className="stat-card">
                  <h3>{stat.team.name}</h3>
                  <div className="stat-value">{stat.wins}</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>Wins: {stat.wins} | Draws: {stat.draws} | Losses: {stat.losses}</small>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Total matches: {stat.total_matches}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Matches</h3>
            {matches.length === 0 ? (
              <p style={{ color: '#666' }}>No matches in this season yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Team 1</th>
                    <th>Score</th>
                    <th>Team 2</th>
                    <th>Funny fact</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id}>
                      <td>{match.date}</td>
                      <td>{match.team1?.name}</td>
                      <td>{match.team1_score} – {match.team2_score}</td>
                      <td>{match.team2?.name}</td>
                      <td className="funny-fact-cell">{match.funny_fact || '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setEditingMatch(match)}
                            style={{ padding: '0.4rem 0.9rem' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={() => handleDeleteMatch(match)}
                            style={{ padding: '0.4rem 0.9rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Player statistics</h3>
            <table className="table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('player')}>Player{sortMark('player')}</th>
                  <th className="sortable" onClick={() => handleSort('total_goals')}>Goals{sortMark('total_goals')}</th>
                  <th className="sortable" onClick={() => handleSort('total_assists')}>Assists{sortMark('total_assists')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_played')}>Matches played{sortMark('matches_played')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_black')}>Black team{sortMark('matches_black')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_white')}>White team{sortMark('matches_white')}</th>
                  <th className="sortable" onClick={() => handleSort('points')}>Points{sortMark('points')}</th>
                  <th className="sortable" onClick={() => handleSort('ppm')}>Ppm{sortMark('ppm')}</th>
                  <th className="sortable" onClick={() => handleSort('ranking')}>Ranking{sortMark('ranking')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayerStats.map(stat => (
                  <tr key={stat.player.id}>
                    <td>{stat.player.name}</td>
                    <td>{stat.total_goals}</td>
                    <td>{stat.total_assists}</td>
                    <td>{stat.matches_played}</td>
                    <td>{stat.matches_black ?? 0}</td>
                    <td>{stat.matches_white ?? 0}</td>
                    <td>{stat.points}</td>
                    <td>{Number(stat.ppm).toFixed(2)}</td>
                    <td>{stat.ranking}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      {editingMatch && (
        <MatchEditModal
          key={editingMatch.id}
          match={editingMatch}
          teams={teams}
          players={players}
          onClose={() => setEditingMatch(null)}
          onSaved={async () => {
            setEditingMatch(null);
            const seasonsRes = await getSeasons();
            setSeasons(seasonsRes.data);
            loadStats();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
