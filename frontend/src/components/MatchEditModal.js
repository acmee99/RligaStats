import React, { useMemo, useState } from 'react';
import { updateMatch } from '../services/api';
import DatePicker from './DatePicker';

const MatchEditModal = ({ match, teams, players, onClose, onSaved }) => {
  const [matchDate, setMatchDate] = useState(match.date);
  const [team1Id, setTeam1Id] = useState(match.team1?.id);
  const [team2Id, setTeam2Id] = useState(match.team2?.id);
  const [notPlayed, setNotPlayed] = useState(!!match.not_played);
  const [rows, setRows] = useState(
    (match.player_stats || []).map((ps) => ({
      player_id: ps.player?.id,
      name: ps.player?.name || '',
      team_id: ps.team?.id,
      goals: ps.goals || 0,
      assists: ps.assists || 0,
    }))
  );
  const [funnyFact, setFunnyFact] = useState(match.funny_fact || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const usedIds = useMemo(() => rows.map((r) => r.player_id), [rows]);
  const availablePlayers = players.filter((p) => !usedIds.includes(p.id));

  const handleRowChange = (playerId, field, value) => {
    setRows((current) =>
      current.map((row) =>
        row.player_id === playerId ? { ...row, [field]: value } : row
      )
    );
  };

  const handleAddPlayer = (playerId) => {
    const player = players.find((p) => p.id === parseInt(playerId, 10));
    if (!player) return;
    setRows((current) => [
      ...current,
      {
        player_id: player.id,
        name: player.name,
        team_id: team1Id,
        goals: 0,
        assists: 0,
      },
    ]);
  };

  const handleRemovePlayer = (playerId) => {
    setRows((current) => current.filter((row) => row.player_id !== playerId));
  };

  const handleSave = async () => {
    if (!team1Id || !team2Id) {
      setError('Select both teams');
      return;
    }
    if (team1Id === team2Id) {
      setError('Teams must be different');
      return;
    }
    if (!notPlayed && rows.length === 0) {
      setError('Add at least one player');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updateMatch(match.id, {
        date: matchDate,
        team1_id: team1Id,
        team2_id: team2Id,
        funny_fact: funnyFact.trim(),
        not_played: notPlayed,
        players: notPlayed
          ? []
          : rows.map((row) => ({
              player_id: row.player_id,
              team_id: row.team_id,
              goals: parseInt(row.goals, 10) || 0,
              assists: parseInt(row.assists, 10) || 0,
            })),
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit match</h2>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Date</label>
          <DatePicker value={matchDate} onChange={setMatchDate} />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={notPlayed}
              onChange={(e) => {
                const checked = e.target.checked;
                setNotPlayed(checked);
                if (checked) {
                  setRows([]);
                }
              }}
            />
            Match not played
          </label>
        </div>

        <div className="team-selector">
          <div className="team-box team-black">
            <h3>{teams.find((t) => t.id === team1Id)?.name || 'Team 1-Black'}</h3>
          </div>
          <div className="team-box team-white">
            <h3>{teams.find((t) => t.id === team2Id)?.name || 'Team 2-White'}</h3>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="edit-funny-fact">Fun fact</label>
          <textarea
            id="edit-funny-fact"
            className="text-normal"
            maxLength={500}
            rows={3}
            value={funnyFact}
            onChange={(e) => setFunnyFact(e.target.value)}
          />
        </div>

        {notPlayed ? (
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Players cannot be selected for a match that was not played.
          </p>
        ) : (
          <>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Add player</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddPlayer(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">-- Select player --</option>
                {availablePlayers.map((player) => (
                  <option key={player.id} value={player.id}>{player.name}</option>
                ))}
              </select>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Goals</th>
                  <th>Assists</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.player_id}>
                    <td>{row.name}</td>
                    <td>
                      <select
                        value={row.team_id || ''}
                        onChange={(e) =>
                          handleRowChange(row.player_id, 'team_id', parseInt(e.target.value, 10))
                        }
                      >
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={row.goals}
                        onChange={(e) => handleRowChange(row.player_id, 'goals', e.target.value)}
                        style={{ width: '70px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={row.assists}
                        onChange={(e) => handleRowChange(row.player_id, 'assists', e.target.value)}
                        style={{ width: '70px' }}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() => handleRemovePlayer(row.player_id)}
                        style={{ padding: '0.4rem 0.75rem' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save match'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchEditModal;
