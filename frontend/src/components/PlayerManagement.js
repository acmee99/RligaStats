import React, { useState, useEffect } from 'react';
import { getPlayers, createPlayer, deletePlayer } from '../services/api';

const PlayerManagement = () => {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      const response = await getPlayers();
      setPlayers(response.data);
    } catch (err) {
      setError('Failed to load players');
      console.error(err);
    }
  };

  const handleCreatePlayer = async (e) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      setError('Player name is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await createPlayer(newPlayerName.trim());
      setPlayers([...players, response.data]);
      setNewPlayerName('');
      setSuccess('Player created successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create player');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      await deletePlayer(playerId);
      setPlayers(players.filter(p => p.id !== playerId));
      setSuccess('Player deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete player');
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Player Management</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleCreatePlayer} style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Add New Player</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Enter player name"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !newPlayerName.trim()}
              >
                {loading ? 'Adding...' : 'Add Player'}
              </button>
            </div>
          </div>
        </form>

        <h3>All Players ({players.length})</h3>
        {players.length === 0 ? (
          <p style={{ color: '#666', marginTop: '1rem' }}>No players yet. Add your first player above!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id}>
                  <td>{player.id}</td>
                  <td>{player.name}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDeletePlayer(player.id)}
                      style={{ padding: '0.5rem 1rem' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PlayerManagement;
