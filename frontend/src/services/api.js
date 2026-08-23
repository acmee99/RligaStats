import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Players
export const getPlayers = () => api.get('/players');
export const createPlayer = (name) => api.post('/players', { name });
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
export const deleteMatch = (id) => api.delete(`/matches/${id}`);

// Image Upload
export const uploadImage = (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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
