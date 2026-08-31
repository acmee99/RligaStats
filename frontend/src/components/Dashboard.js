import React, { useState, useEffect, useMemo } from 'react';
import { addDays, getDay } from 'date-fns';
import { getTeamStats, getPlayerStats, getSeasons, getMatches, getPlayers, getTeams, deleteMatch } from '../services/api';
import MatchEditModal from './MatchEditModal';
import { useAuth } from '../context/AuthContext';

const OVERALL = 'overall';
const HISTORICAL_SEASONS_URL =
  'https://docs.google.com/spreadsheets/d/15CiOc_4Xp6jKBgq5j2im0rHJOyXJOmtsNjc_U-Nicz0/edit?gid=97946016#gid=97946016';

const countWednesdays = (fromDate, toDate) => {
  const start = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const end = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  let day = start;
  while (getDay(day) !== 3) {
    day = addDays(day, 1);
    if (day > end) return 0;
  }
  let count = 0;
  while (day <= end) {
    count += 1;
    day = addDays(day, 7);
  }
  return count;
};

const seasonWednesdayCount = (season) => {
  if (!season) return 0;
  return countWednesdays(
    new Date(season.start_year, 8, 1),
    new Date(season.end_year, 7, 31)
  );
};

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [teamStats, setTeamStats] = useState([]);
  const [playerStats, setPlayerStats] = useState([]);
  const [matches, setMatches] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [dashboardTab, setDashboardTab] = useState('league');
  const [editingMatch, setEditingMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('ranking');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    loadSeasons();
  }, []);

  useEffect(() => {
    if (selectedSeason !== null) {
      loadStats();
    }
  }, [selectedSeason]);

  const loadSeasons = async () => {
    try {
      const seasonsRes = await getSeasons();
      const list = [...seasonsRes.data].sort((a, b) => b.start_year - a.start_year);
      setSeasons(list);
      setSelectedSeason(list[0]?.id ?? OVERALL);
      const [playersRes, teamsRes] = await Promise.all([getPlayers(), getTeams()]);
      setPlayers(playersRes.data);
      setTeams(teamsRes.data);
    } catch (err) {
      setError('Failed to load seasons');
      console.error(err);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const seasonId = selectedSeason === OVERALL ? undefined : selectedSeason;
      const [teamsRes, playersRes, matchesRes] = await Promise.all([
        getTeamStats(seasonId),
        getPlayerStats(seasonId),
        getMatches(seasonId)
      ]);
      setTeamStats(teamsRes.data);
      setPlayerStats(playersRes.data);
      setMatches(matchesRes.data);
    } catch (err) {
      setError('Failed to load statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortedPlayerStats = useMemo(() => {
    const rows = playerStats.map((stat) => {
      const points = stat.points ?? ((stat.total_goals || 0) + (stat.total_assists || 0));
      const matchesPlayed = stat.matches_played || 0;
      const ppm = stat.ppm ?? (matchesPlayed ? points / matchesPlayed : 0);
      return {
        ...stat,
        points,
        ppm: Number(ppm),
        ranking: stat.ranking ?? 0,
        matches_black: stat.matches_black ?? 0,
        matches_white: stat.matches_white ?? 0,
      };
    });
    return [...rows].sort((a, b) => {
      let av;
      let bv;
      if (sortKey === 'player') {
        av = (a.player?.name || '').toLowerCase();
        bv = (b.player?.name || '').toLowerCase();
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [playerStats, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'player' || key === 'ranking' ? 'asc' : 'desc');
    }
  };

  const sortMark = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const gameSummary = useMemo(() => {
    const played = matches.filter((m) => !m.not_played).length;
    const notPlayed = matches.filter((m) => m.not_played).length;
    let totalWednesdays = 0;
    if (selectedSeason === OVERALL) {
      totalWednesdays = seasons.reduce((sum, season) => sum + seasonWednesdayCount(season), 0);
    } else {
      const season = seasons.find((s) => s.id === selectedSeason);
      totalWednesdays = seasonWednesdayCount(season);
    }
    return {
      totalMatches: totalWednesdays,
      gamesPlayed: played,
      gamesNotPlayed: notPlayed,
      gamesRemaining: Math.max(0, totalWednesdays - played - notPlayed),
    };
  }, [matches, seasons, selectedSeason]);

  const teamPlayersForMatch = (match, teamId) =>
    (match.player_stats || []).filter((ps) => ps.team?.id === teamId);

  const handleDeleteMatch = async (match) => {
    const label = `${match.date} — ${match.team1?.name || 'Team 1'} ${match.team1_score}–${match.team2_score} ${match.team2?.name || 'Team 2'}`;
    if (!window.confirm(`Delete this match?\n\n${label}`)) {
      return;
    }
    try {
      await deleteMatch(match.id);
      loadStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete match');
    }
  };

  if (loading && selectedSeason === null) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">Match centre</p>
          <h1>Black vs White</h1>
          <p>Black vs White. Every goal, assist and result — one league, one table.</p>
        </div>
      </section>
      <div className="card">
        <div className="page-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            className={`page-tab${dashboardTab === 'league' ? ' active' : ''}`}
            aria-selected={dashboardTab === 'league'}
            onClick={() => setDashboardTab('league')}
          >
            League table &amp; stats
          </button>
          <button
            type="button"
            role="tab"
            className={`page-tab${dashboardTab === 'history' ? ' active' : ''}`}
            aria-selected={dashboardTab === 'history'}
            onClick={() => setDashboardTab('history')}
          >
            Historical seasons
          </button>
        </div>

        {dashboardTab === 'history' ? (
          <div className="historical-seasons">
            <h2>Historical seasons</h2>
            <a
              href={HISTORICAL_SEASONS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Season: 2025-2026 and olders
            </a>
          </div>
        ) : (
          <>
        <h2>League table &amp; stats</h2>
        
        <div className="season-selector">
          <label htmlFor="season-select">Season </label>
          <select
            id="season-select"
            value={selectedSeason ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedSeason(value === OVERALL ? OVERALL : parseInt(value, 10));
            }}
          >
            <option value={OVERALL}>Overall</option>
            {seasons.map(season => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="loading">Loading statistics...</div>
        ) : (
          <>
            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>
              Player statistics
              {selectedSeason === OVERALL ? ' — Overall' : ''}
            </h3>
            <table className="table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('player')}>Player{sortMark('player')}</th>
                  <th className="sortable" onClick={() => handleSort('ranking')}>Ranking{sortMark('ranking')}</th>
                  <th className="sortable" onClick={() => handleSort('points')}>Points{sortMark('points')}</th>
                  <th className="sortable" onClick={() => handleSort('total_goals')}>Goals{sortMark('total_goals')}</th>
                  <th className="sortable" onClick={() => handleSort('total_assists')}>Assists{sortMark('total_assists')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_played')}>Matches played{sortMark('matches_played')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_black')}>Black team{sortMark('matches_black')}</th>
                  <th className="sortable" onClick={() => handleSort('matches_white')}>White team{sortMark('matches_white')}</th>
                  <th className="sortable" onClick={() => handleSort('ppm')}>Ppm{sortMark('ppm')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayerStats.map(stat => (
                  <tr key={stat.player.id}>
                    <td>{stat.player.name}</td>
                    <td>{stat.ranking}</td>
                    <td>{stat.points}</td>
                    <td>{stat.total_goals}</td>
                    <td>{stat.total_assists}</td>
                    <td>{stat.matches_played}</td>
                    <td>{stat.matches_black ?? 0}</td>
                    <td>{stat.matches_white ?? 0}</td>
                    <td>{Number(stat.ppm).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="section-heading-row">
              <h3>Team statistics</h3>
              <div className="season-game-meta">
                <span>Total matches: {gameSummary.totalMatches}</span>
                <span>Games played: {gameSummary.gamesPlayed}</span>
                <span>Games not played: {gameSummary.gamesNotPlayed}</span>
                <span>Games remaining: {gameSummary.gamesRemaining}</span>
              </div>
            </div>
            <div className="stats-grid">
              {teamStats.map(stat => (
                <div
                  key={stat.team.id}
                  className={`stat-card${(stat.team.color || '').toLowerCase() === 'black' ? ' team-black' : ''}`}
                >
                  <h3>{stat.team.name}</h3>
                  <div className="stat-value">{stat.wins}</div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <small>Wins: {stat.wins} | Draws: {stat.draws} | Losses: {stat.losses}</small>
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    Total matches: {stat.total_matches}
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Matches</h3>
            {matches.length === 0 ? (
              <p style={{ color: '#666' }}>No matches in this season yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Team 1</th>
                    <th>Score</th>
                    <th>Team 2</th>
                    <th>Funny fact</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id}>
                      <td>{match.date}</td>
                      <td>
                        <MatchTeamHover
                          teamName={match.team1?.name}
                          notPlayed={match.not_played}
                          players={teamPlayersForMatch(match, match.team1?.id)}
                        />
                      </td>
                      <td>{match.not_played ? 'Not played' : `${match.team1_score} – ${match.team2_score}`}</td>
                      <td>
                        <MatchTeamHover
                          teamName={match.team2?.name}
                          notPlayed={match.not_played}
                          players={teamPlayersForMatch(match, match.team2?.id)}
                        />
                      </td>
                      <td className="funny-fact-cell">{match.funny_fact || '—'}</td>
                      {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setEditingMatch(match)}
                            style={{ padding: '0.4rem 0.9rem' }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger"
                            type="button"
                            onClick={() => handleDeleteMatch(match)}
                            style={{ padding: '0.4rem 0.9rem' }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
          </>
        )}
      </div>
      {editingMatch && (
        <MatchEditModal
          key={editingMatch.id}
          match={editingMatch}
          teams={teams}
          players={players}
          onClose={() => setEditingMatch(null)}
          onSaved={async () => {
            setEditingMatch(null);
            const seasonsRes = await getSeasons();
            setSeasons(seasonsRes.data);
            loadStats();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

const MatchTeamHover = ({ teamName, players, notPlayed }) => {
  const [pos, setPos] = useState(null);

  return (
    <span
      className="match-team-hover"
      onMouseEnter={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setPos(null)}
    >
      {teamName}
      {pos && (
        <span
          className="match-team-popover"
          role="tooltip"
          style={{ left: pos.x, top: pos.y }}
        >
          <span className="match-team-popover-inner">
            {notPlayed ? (
              <p>Match not played</p>
            ) : players.length === 0 ? (
              <p>No player stats</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Goals</th>
                    <th>Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((ps) => (
                    <tr key={ps.id || ps.player?.id}>
                      <td>{ps.player?.name || '—'}</td>
                      <td>{ps.goals}</td>
                      <td>{ps.assists}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </span>
        </span>
      )}
    </span>
  );
};
