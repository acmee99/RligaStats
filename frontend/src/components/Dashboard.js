import React, { useState, useEffect } from 'react';
import { getTeamStats, getPlayerStats, getSeasons, getCurrentSeason } from '../services/api';

const Dashboard = () => {
  const [teamStats, setTeamStats] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } catch (err) {
      setError('Failed to load seasons');
      console.error(err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamsRes, playersRes] = await Promise.all([
        getTeamStats(selectedSeason),
        getPlayerStats(selectedSeason)
      ]);
      setTeamStats(teamsRes.data);
      setPlayerStats(playersRes.data);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedSeason) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="card">
        <h2>Football Match Statistics</h2>
        
        <div className="season-selector">
          <label htmlFor="season-select">Season: </label>
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
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Team Statistics</h3>
            <div className="stats-grid">
              {teamStats.map(stat => (
                <div key={stat.team.id} className="stat-card">
                  <h3>{stat.team.name}</h3>
                  <div className="stat-value">{stat.wins}</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>Wins: {stat.wins} | Draws: {stat.draws} | Losses: {stat.losses}</small>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Total Matches: {stat.total_matches}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Player Statistics</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Goals</th>
                  <th>Assists</th>
                  <th>Matches Played</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map(stat => (
                  <tr key={stat.player.id}>
                    <td>{stat.player.name}</td>
                    <td>{stat.total_goals}</td>
                    <td>{stat.total_assists}</td>
                    <td>{stat.matches_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
