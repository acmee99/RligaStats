import axios from 'axios';

const API_BASE_URL = 'https://rligastats-backend.onrender.com/api';
export const AUTH_TOKEN_KEY = 'rliga_token';
export const AUTH_USER_KEY = 'rliga_user';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.includes('/login')) {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      window.dispatchEvent(new Event('rliga-auth-logout'));
    }
    return Promise.reject(error);
  }
);

export const login = (loginValue, password) =>
  api.post('/login', { login: loginValue, password });
export const getAuthSetup = () => api.get('/auth/setup');
export const createAdminUser = (email, password, playerId) =>
  api.post('/users', { email, password, player_id: playerId });

export const getPlayers = () => api.get('/players');
export const createPlayer = (name) => api.post('/players', { name });
export const updatePlayer = (id, name) => api.put(`/players/${id}`, { name });
export const deletePlayer = (id) => api.delete(`/players/${id}`);

export const getTeams = () => api.get('/teams');

export const getSeasons = () => api.get('/seasons');
export const getCurrentSeason = () => api.get('/seasons/current');

export const getMatches = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/matches', { params });
};
export const createMatch = (matchData) => api.post('/matches', matchData);
export const updateMatch = (id, matchData) => api.put(`/matches/${id}`, matchData);
export const deleteMatch = (id) => api.delete(`/matches/${id}`);

export const uploadImage = (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post('/upload', formData);
};

export const getTeamStats = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/stats/teams', { params });
};
export const getPlayerStats = (seasonId) => {
  const params = seasonId ? { season_id: seasonId } : {};
  return api.get('/stats/players', { params });
};

export default api;
