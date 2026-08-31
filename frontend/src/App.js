import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import logo from './assets/rliga-logo.png';
import Dashboard from './components/Dashboard';
import MatchForm from './components/MatchForm';
import PlayerManagement from './components/PlayerManagement';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppShell() {
  const { isAdmin, user, logout } = useAuth();

  return (
    <div className="App">
      <nav className="navbar">
        <div className="nav-container">
          <NavLink to="/" className="nav-logo">
            <img src={logo} alt="Rliga" className="nav-logo-img" />
            <span>
              Rliga
              <small>Středeční fotbálek stats</small>
            </span>
          </NavLink>
          <div className="nav-menu">
            <NavLink to="/" end className="nav-link">Dashboard</NavLink>
            {isAdmin && <NavLink to="/match/new" className="nav-link">New match</NavLink>}
            <NavLink to="/players" className="nav-link">Players</NavLink>
            {isAdmin ? (
              <button type="button" className="nav-link nav-link-button" onClick={logout}>
                Sign out{user?.username ? ` (${user.username})` : ''}
              </button>
            ) : (
              <NavLink to="/login" className="nav-link">Sign in</NavLink>
            )}
          </div>
        </div>
      </nav>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/match/new"
            element={(
              <ProtectedRoute>
                <MatchForm />
              </ProtectedRoute>
            )}
          />
          <Route path="/players" element={<PlayerManagement />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="footer-pitch" />
        <p>Rliga Stats — Black vs White</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </Router>
  );
}

export default App;
