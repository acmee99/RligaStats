import React, { useState, useEffect } from 'react';
import { uploadImage, getPlayers, createPlayer, getTeams, getCurrentSeason, createMatch } from '../services/api';
import { format } from 'date-fns';

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [playerMappings, setPlayerMappings] = useState({});
  const [teamAssignments, setTeamAssignments] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragging, setDragging] = useState(false);

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
      
      if (teamsRes.data.length >= 2) {
        setSelectedTeam1(teamsRes.data[0].id);
        setSelectedTeam2(teamsRes.data[1].id);
      }
    } catch (err) {
      setError('Failed to load initial data');
      console.error(err);
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
      setExtractedData([]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleImageUpload = async () => {
    if (!image) {
      setError('Please select an image first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await uploadImage(image);
      const data = response.data.data;
      setExtractedData(data);
      
      // Initialize player mappings
      const mappings = {};
      data.forEach((item, index) => {
        // Try to find matching player
        const matchedPlayer = players.find(p => 
          p.name.toLowerCase() === item.name.toLowerCase()
        );
        if (matchedPlayer) {
          mappings[index] = matchedPlayer.id;
        }
      });
      setPlayerMappings(mappings);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process image');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerMapping = (index, playerId) => {
    setPlayerMappings({
      ...playerMappings,
      [index]: playerId ? parseInt(playerId) : null
    });
  };

  const handleTeamAssignment = (index, teamId) => {
    setTeamAssignments({
      ...teamAssignments,
      [index]: parseInt(teamId)
    });
  };

  const handleCreateNewPlayer = async (index, name) => {
    if (!name.trim()) return;
    
    try {
      const response = await createPlayer(name.trim());
      const newPlayer = response.data;
      setPlayers([...players, newPlayer]);
      setPlayerMappings({
        ...playerMappings,
        [index]: newPlayer.id
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create player');
    }
  };

  const assignPlayersToTeams = () => {
    const team1Players = [];
    const team2Players = [];
    
    extractedData.forEach((item, index) => {
      const playerId = playerMappings[index];
      if (playerId) {
        // Simple assignment: alternate or based on some logic
        // For now, assign first half to team1, second half to team2
        if (index < extractedData.length / 2) {
          team1Players.push({ player_id: playerId, team_id: selectedTeam1, ...item });
        } else {
          team2Players.push({ player_id: playerId, team_id: selectedTeam2, ...item });
        }
      }
    });
    
    return [...team1Players, ...team2Players];
  };

  const handleSubmitMatch = async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      setError('Please select both teams');
      return;
    }

    const playersData = assignPlayersToTeams();
    const unmatchedPlayers = extractedData.filter((_, index) => !playerMappings[index]);
    
    if (unmatchedPlayers.length > 0) {
      setError('Please map all players before submitting');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createMatch({
        date: matchDate,
        team1_id: selectedTeam1,
        team2_id: selectedTeam2,
        players: playersData
      });
      setSuccess('Match created successfully!');
      // Reset form
      setImage(null);
      setPreview(null);
      setExtractedData([]);
      setPlayerMappings({});
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create match');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getUnmatchedPlayers = () => {
    return extractedData.filter((_, index) => !playerMappings[index]);
  };

  return (
    <div>
      <div className="card">
        <h2>Upload Match Image</h2>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <div
          className={`image-upload-area ${dragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          {preview ? (
            <img src={preview} alt="Preview" className="image-preview" />
          ) : (
            <div>
              <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
                📸 Click or drag image here
              </p>
              <p style={{ color: '#666' }}>Upload an image containing match statistics table</p>
            </div>
          )}
        </div>

        {preview && (
          <button
            className="btn btn-primary"
            onClick={handleImageUpload}
            disabled={loading}
            style={{ marginTop: '1rem' }}
          >
            {loading ? 'Processing...' : 'Extract Data from Image'}
          </button>
        )}

        {extractedData.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3>Extracted Data</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Match Date: <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                style={{ marginLeft: '0.5rem', padding: '0.5rem' }}
              />
            </p>

            <div className="team-selector">
              <div className={`team-box team-black`}>
                <h3>{teams.find(t => t.id === selectedTeam1)?.name || 'Team 1'}</h3>
                <select
                  value={selectedTeam1 || ''}
                  onChange={(e) => setSelectedTeam1(parseInt(e.target.value))}
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className={`team-box team-white`}>
                <h3>{teams.find(t => t.id === selectedTeam2)?.name || 'Team 2'}</h3>
                <select
                  value={selectedTeam2 || ''}
                  onChange={(e) => setSelectedTeam2(parseInt(e.target.value))}
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h4>Map Players and Assign Teams</h4>
              {extractedData.map((item, index) => {
                const isMatched = playerMappings[index];
                const matchedPlayer = players.find(p => p.id === playerMappings[index]);
                const assignedTeam = teamAssignments[index] || selectedTeam1;
                
                return (
                  <div
                    key={index}
                    className={`player-item ${!isMatched ? 'unmatched' : ''}`}
                  >
                    <div style={{ flex: 1 }}>
                      <strong>Extracted:</strong> {item.name || '(No name detected)'}
                      <br />
                      <small>Goals: {item.goals} | Assists: {item.assists}</small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <select
                        value={playerMappings[index] || ''}
                        onChange={(e) => handlePlayerMapping(index, e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        <option value="">-- Select Player --</option>
                        {players.map(player => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={assignedTeam || ''}
                        onChange={(e) => handleTeamAssignment(index, e.target.value)}
                        style={{ padding: '0.5rem' }}
                      >
                        {teams.map(team => (
                          <option key={team.id} value={team.id}>
                            {team.name}
                          </option>
                        ))}
                      </select>
                      {!isMatched && (
                        <button
                          className="btn btn-success"
                          onClick={() => {
                            const name = prompt('Enter player name:');
                            if (name) handleCreateNewPlayer(index, name);
                          }}
                        >
                          Create New
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {getUnmatchedPlayers().length > 0 && (
              <div className="error" style={{ marginTop: '1rem' }}>
                ⚠️ {getUnmatchedPlayers().length} player(s) need to be mapped before submitting
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleSubmitMatch}
              disabled={loading || getUnmatchedPlayers().length > 0}
              style={{ marginTop: '2rem', width: '100%' }}
            >
              {loading ? 'Creating Match...' : 'Create Match'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
