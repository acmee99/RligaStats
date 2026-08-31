import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAdminUser, getAuthSetup, getPlayers } from '../services/api';

const Login = () => {
  const { isAdmin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasAdmins, setHasAdmins] = useState(true);
  const [players, setPlayers] = useState([]);
  const [registerPlayerId, setRegisterPlayerId] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [setupRes, playersRes] = await Promise.all([getAuthSetup(), getPlayers()]);
        setHasAdmins(!!setupRes.data.has_admins);
        setPlayers(playersRes.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (isAdmin) {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(loginValue.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setError(null);
    try {
      await createAdminUser(registerEmail.trim(), registerPassword, parseInt(registerPlayerId, 10));
      await login(registerEmail.trim(), registerPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register admin');
    } finally {
      setRegistering(false);
    }
  };

  const availablePlayers = players.filter((p) => !p.is_admin);

  return (
    <div className="login-page">
      <div className="card login-card">
        <h2>{hasAdmins ? 'Admin sign in' : 'Register first admin'}</h2>
        {error && <div className="error">{error}</div>}

        {!hasAdmins && (
          <>
            {availablePlayers.length === 0 ? (
              <p style={{ marginBottom: '1.25rem', fontWeight: 500 }}>
                Add a player first (or set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD on the server). Only existing players can become admins.
              </p>
            ) : (
              <form onSubmit={handleRegister} style={{ marginBottom: '2rem' }}>
                <div className="form-group">
                  <label htmlFor="register-player">Player</label>
                  <select
                    id="register-player"
                    value={registerPlayerId}
                    onChange={(e) => setRegisterPlayerId(e.target.value)}
                    required
                  >
                    <option value="">Select player</option>
                    {availablePlayers.map((player) => (
                      <option key={player.id} value={player.id}>{player.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="register-email">Email</label>
                  <input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="register-password">Password</label>
                  <input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={registering || !registerPlayerId || !registerEmail.trim() || !registerPassword}
                >
                  {registering ? 'Registering...' : 'Register admin'}
                </button>
              </form>
            )}
          </>
        )}

        {hasAdmins && (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login">Email or player name</label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading || !loginValue.trim() || !password}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
};

export default Login;
