import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import logo from './assets/rliga-logo.png';
import Dashboard from './components/Dashboard';
import MatchForm from './components/MatchForm';
import PlayerManagement from './components/PlayerManagement';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <NavLink to="/" className="nav-logo">
              <img src={logo} alt="Rliga" className="nav-logo-img" />
              <span>
                Rliga
                <small>Hobby league stats</small>
              </span>
            </NavLink>
            <div className="nav-menu">
              <NavLink to="/" end className="nav-link">Dashboard</NavLink>
              <NavLink to="/match/new" className="nav-link">New match</NavLink>
              <NavLink to="/players" className="nav-link">Players</NavLink>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/match/new" element={<MatchForm />} />
            <Route path="/players" element={<PlayerManagement />} />
          </Routes>
        </main>

        <footer className="site-footer">
          <div className="footer-pitch" />
          <p>Rliga Stats — Black vs White</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
