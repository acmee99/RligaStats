import axios from 'axios';

const API_BASE_URL = 'https://rligastats-backend.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Players
export const getPlayers = () => api.get('/players');
export const createPlayer = (name) => api.post('/players', { name });
export const updatePlayer = (id, name) => api.put(`/players/${id}`, { name });
export const deletePlayer = (id) => api.delete(`/players/${id}`);

// Teams
export const getTeams = () => api.get('/teams');

// Seasons
export const getSeasons = () => api.get('/seasons');
export const getCurrentSeason = () => api.get('/seasons/current');

// Matches
export const getMatches = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/matches', { params });
};
export const createMatch = (matchData) => api.post('/matches', matchData);
export const updateMatch = (id, matchData) => api.put(`/matches/${id}`, matchData);
export const deleteMatch = (id) => api.delete(`/matches/${id}`);

// Image Upload
export const uploadImage = (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/upload', formData);
};

// Statistics
export const getTeamStats = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/stats/teams', { params });
};
export const getPlayerStats = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/stats/players', { params });
};

export default api;
