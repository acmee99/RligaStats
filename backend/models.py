from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Player(db.Model):
    __tablename__ = 'players'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    match_stats = db.relationship('MatchPlayer', back_populates='player', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Team(db.Model):
    __tablename__ = 'teams'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    color = db.Column(db.String(50), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color
        }

class Season(db.Model):
    __tablename__ = 'seasons'
    
    id = db.Column(db.Integer, primary_key=True)
    start_year = db.Column(db.Integer, nullable=False, unique=True)
    end_year = db.Column(db.Integer, nullable=False)
    
    # Relationships
    matches = db.relationship('Match', back_populates='season', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'start_year': self.start_year,
            'end_year': self.end_year,
            'name': f"{self.start_year}/{self.end_year}"
        }
    
    @staticmethod
    def get_current_season():
        """Get the current season based on date"""
        now = datetime.now()
        if now.month >= 9:  # September onwards
            return now.year
        else:  # January to August
            return now.year - 1
    
    @staticmethod
    def get_or_create_season(year):
        """Get or create a season for the given start year"""
        season = Season.query.filter_by(start_year=year).first()
        if not season:
            season = Season(start_year=year, end_year=year + 1)
            db.session.add(season)
            db.session.commit()
        return season

class Match(db.Model):
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    team1_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    team2_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    team1_score = db.Column(db.Integer, default=0)
    team2_score = db.Column(db.Integer, default=0)
    winner_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)
    season_id = db.Column(db.Integer, db.ForeignKey('seasons.id'), nullable=False)
    funny_fact = db.Column(db.String(500), nullable=True)
    not_played = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    team1 = db.relationship('Team', foreign_keys=[team1_id], backref='matches_as_team1')
    team2 = db.relationship('Team', foreign_keys=[team2_id], backref='matches_as_team2')
    winner = db.relationship('Team', foreign_keys=[winner_id])
    season = db.relationship('Season', back_populates='matches')
    player_stats = db.relationship('MatchPlayer', back_populates='match', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'team1': self.team1.to_dict() if self.team1 else None,
            'team2': self.team2.to_dict() if self.team2 else None,
            'team1_score': self.team1_score,
            'team2_score': self.team2_score,
            'winner': self.winner.to_dict() if self.winner else None,
            'season': self.season.to_dict() if self.season else None,
            'funny_fact': self.funny_fact or '',
            'not_played': bool(self.not_played),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'player_stats': [ps.to_dict() for ps in self.player_stats]
        }

class MatchPlayer(db.Model):
    __tablename__ = 'match_players'
    
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('matches.id'), nullable=False)
    player_id = db.Column(db.Integer, db.ForeignKey('players.id'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    goals = db.Column(db.Integer, default=0)
    assists = db.Column(db.Integer, default=0)
    
    # Relationships
    match = db.relationship('Match', back_populates='player_stats')
    player = db.relationship('Player', back_populates='match_stats')
    team = db.relationship('Team')
    
    def to_dict(self):
        return {
            'id': self.id,
            'match_id': self.match_id,
            'player': self.player.to_dict() if self.player else None,
            'team': self.team.to_dict() if self.team else None,
            'goals': self.goals,
            'assists': self.assists
        }
