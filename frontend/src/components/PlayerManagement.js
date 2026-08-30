import React, { useState, useEffect } from 'react';
import { getPlayers, createPlayer, updatePlayer, deletePlayer } from '../services/api';

const PlayerManagement = () => {
  const [players, setPlayers] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
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

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditName(player.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async (playerId) => {
    if (!editName.trim()) {
      setError('Player name is required');
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      const response = await updatePlayer(playerId, editName.trim());
      setPlayers(players.map((p) => (p.id === playerId ? response.data : p)));
      setEditingId(null);
      setEditName('');
      setSuccess('Player updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update player');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to delete this player?')) {
      return;
    }

    try {
      await deletePlayer(playerId);
      setPlayers(players.filter(p => p.id !== playerId));
      if (editingId === playerId) {
        cancelEdit();
      }
      setSuccess('Player deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete player');
    }
  };

  return (
    <div className="players-page">
      <div className="card">
        <h2>Player management</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleCreatePlayer} style={{ marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Add new player</label>
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
                {loading ? 'Adding...' : 'Add player'}
              </button>
            </div>
          </div>
        </form>

        <h3>All players ({players.length})</h3>
        {players.length === 0 ? (
          <p style={{ color: '#666', marginTop: '1rem' }}>No players yet. Add your first player above!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Id</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => (
                <tr key={player.id}>
                  <td>{player.id}</td>
                  <td>
                    {editingId === player.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEdit(player.id);
                          }
                          if (e.key === 'Escape') {
                            cancelEdit();
                          }
                        }}
                        style={{ width: '100%', maxWidth: '16rem' }}
                      />
                    ) : (
                      player.name
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {editingId === player.id ? (
                        <>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => handleSaveEdit(player.id)}
                            disabled={savingEdit || !editName.trim()}
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={cancelEdit}
                            disabled={savingEdit}
                            style={{ padding: '0.5rem 1rem' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => startEdit(player)}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-danger"
                        type="button"
                        onClick={() => handleDeletePlayer(player.id)}
                        style={{ padding: '0.5rem 1rem' }}
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
      </div>
    </div>
  );
};

export default PlayerManagement;
