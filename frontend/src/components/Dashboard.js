import React, { useState, useEffect } from 'react';
import { getTeamStats, getPlayerStats, getSeasons, getCurrentSeason, getMatches, getPlayers, getTeams } from '../services/api';
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
                      <td>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => setEditingMatch(match)}
                          style={{ padding: '0.4rem 0.9rem' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Player Statistics</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Goals</th>
                  <th>Assists</th>
                  <th>Matches Played</th>
                  <th>Black team</th>
                  <th>White team</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map(stat => (
                  <tr key={stat.player.id}>
                    <td>{stat.player.name}</td>
                    <td>{stat.total_goals}</td>
                    <td>{stat.total_assists}</td>
                    <td>{stat.matches_played}</td>
                    <td>{stat.matches_black ?? 0}</td>
                    <td>{stat.matches_white ?? 0}</td>
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
