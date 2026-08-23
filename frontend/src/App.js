import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Dashboard from './components/Dashboard';
import MatchForm from './components/MatchForm';
import PlayerManagement from './components/PlayerManagement';
import ImageUpload from './components/ImageUpload';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              ⚽ Football Stats
            </Link>
            <div className="nav-menu">
              <Link to="/" className="nav-link">Dashboard</Link>
              <Link to="/match/new" className="nav-link">New Match</Link>
              <Link to="/match/image" className="nav-link">Upload Image</Link>
              <Link to="/players" className="nav-link">Players</Link>
            </div>
          </div>
        </nav>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/match/new" element={<MatchForm />} />
            <Route path="/match/image" element={<ImageUpload />} />
            <Route path="/players" element={<PlayerManagement />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
