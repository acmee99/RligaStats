import React, { useState, useEffect } from 'react';
import { getPlayers, getTeams, getCurrentSeason, createMatch } from '../services/api';
import { format } from 'date-fns';

const MatchForm = () => {
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [funnyFact, setFunnyFact] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [playersRes, teamsRes, seasonRes] = await Promise.all([
        getPlayers(),
        getTeams(),
        getCurrentSeason()
      ]);
      setPlayers(playersRes.data);
      setTeams(teamsRes.data);
      setCurrentSeason(seasonRes.data);

      const blackTeam = teamsRes.data.find((t) => (t.color || '').toLowerCase() === 'black');
      const whiteTeam = teamsRes.data.find((t) => (t.color || '').toLowerCase() === 'white');
      setSelectedTeam1(blackTeam?.id || teamsRes.data[0]?.id || null);
      setSelectedTeam2(whiteTeam?.id || teamsRes.data[1]?.id || null);
    } catch (err) {
      setError('Failed to load initial data');
      console.error(err);
    }
  };

  const handleAddPlayerToTeam = (teamNumber, playerId) => {
    const player = players.find(p => p.id === parseInt(playerId));
    if (!player) return;

    const playerData = {
      player_id: player.id,
      name: player.name,
      goals: 0,
      assists: 0
    };

    if (teamNumber === 1) {
      if (!team1Players.find(p => p.player_id === player.id)) {
        setTeam1Players([...team1Players, playerData]);
      }
    } else {
      if (!team2Players.find(p => p.player_id === player.id)) {
        setTeam2Players([...team2Players, playerData]);
      }
    }
  };

  const handleRemovePlayer = (teamNumber, playerId) => {
    if (teamNumber === 1) {
      setTeam1Players(team1Players.filter(p => p.player_id !== playerId));
    } else {
      setTeam2Players(team2Players.filter(p => p.player_id !== playerId));
    }
  };

  const handleUpdateStats = (teamNumber, playerId, field, value) => {
    const numValue = parseInt(value) || 0;
    if (teamNumber === 1) {
      setTeam1Players(team1Players.map(p => 
        p.player_id === playerId ? { ...p, [field]: numValue } : p
      ));
    } else {
      setTeam2Players(team2Players.map(p => 
        p.player_id === playerId ? { ...p, [field]: numValue } : p
      ));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      setError('Please select both teams');
      return;
    }

    if (team1Players.length === 0 || team2Players.length === 0) {
      setError('Each team must have at least one player');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const allPlayers = [
        ...team1Players.map(p => ({
          player_id: p.player_id,
          team_id: selectedTeam1,
          goals: p.goals,
          assists: p.assists
        })),
        ...team2Players.map(p => ({
          player_id: p.player_id,
          team_id: selectedTeam2,
          goals: p.goals,
          assists: p.assists
        }))
      ];

      await createMatch({
        date: matchDate,
        team1_id: selectedTeam1,
        team2_id: selectedTeam2,
        players: allPlayers,
        funny_fact: funnyFact.trim(),
      });

      setSuccess('Match created successfully!');
      // Reset form
      setTeam1Players([]);
      setTeam2Players([]);
      setFunnyFact('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create match');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAvailablePlayers = (teamNumber) => {
    const usedPlayerIds = [
      ...team1Players.map(p => p.player_id),
      ...team2Players.map(p => p.player_id)
    ];
    if (teamNumber === 1) {
      return players.filter(p => !team1Players.find(tp => tp.player_id === p.id));
    } else {
      return players.filter(p => !team2Players.find(tp => tp.player_id === p.id));
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Create New Match (Manual Entry)</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div className="form-group">
          <label>Match Date</label>
          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
          />
        </div>

        <div className="team-selector">
          <div className="team-box team-black">
            <h3>{teams.find(t => t.id === selectedTeam1)?.name || 'Team 1-Black'}</h3>
            
            <div style={{ marginTop: '1rem' }}>
              <label>Add Player:</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPlayerToTeam(1, e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                <option value="">-- Select Player --</option>
                {getAvailablePlayers(1).map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <ul className="player-list" style={{ marginTop: '1rem' }}>
              {team1Players.map(player => (
                <li key={player.player_id} className="player-item">
                  <div>
                    <strong>{player.name}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label>Goals:</label>
                    <input
                      type="number"
                      min="0"
                      value={player.goals}
                      onChange={(e) => handleUpdateStats(1, player.player_id, 'goals', e.target.value)}
                      style={{ width: '60px' }}
                    />
                    <label>Assists:</label>
                    <input
                      type="number"
                      min="0"
                      value={player.assists}
                      onChange={(e) => handleUpdateStats(1, player.player_id, 'assists', e.target.value)}
                      style={{ width: '60px' }}
                    />
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemovePlayer(1, player.player_id)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="team-box team-white">
            <h3>{teams.find(t => t.id === selectedTeam2)?.name || 'Team 2-White'}</h3>
            
            <div style={{ marginTop: '1rem' }}>
              <label>Add Player:</label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPlayerToTeam(2, e.target.value);
                    e.target.value = '';
                  }
                }}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                <option value="">-- Select Player --</option>
                {getAvailablePlayers(2).map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <ul className="player-list" style={{ marginTop: '1rem' }}>
              {team2Players.map(player => (
                <li key={player.player_id} className="player-item">
                  <div>
                    <strong>{player.name}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label>Goals:</label>
                    <input
                      type="number"
                      min="0"
                      value={player.goals}
                      onChange={(e) => handleUpdateStats(2, player.player_id, 'goals', e.target.value)}
                      style={{ width: '60px' }}
                    />
                    <label>Assists:</label>
                    <input
                      type="number"
                      min="0"
                      value={player.assists}
                      onChange={(e) => handleUpdateStats(2, player.player_id, 'assists', e.target.value)}
                      style={{ width: '60px' }}
                    />
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemovePlayer(2, player.player_id)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem' }}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="funny-fact">Funny fact</label>
          <textarea
            id="funny-fact"
            className="text-normal"
            maxLength={500}
            rows={3}
            value={funnyFact}
            onChange={(e) => setFunnyFact(e.target.value)}
            placeholder="Short note about this match"
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || team1Players.length === 0 || team2Players.length === 0}
          style={{ marginTop: '2rem', width: '100%' }}
        >
          {loading ? 'Creating Match...' : 'Create Match'}
        </button>
      </div>
    </div>
  );
};

export default MatchForm;
