from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
from datetime import datetime, date
from models import db, Player, Team, Match, MatchPlayer, Season
from config import Config
from image_processor import process_match_image
import json

app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

db.init_app(app)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('instance', exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def init_db():
    """Initialize database and create default teams"""
    with app.app_context():
        db.create_all()
        
        # Create default teams if they don't exist
        if Team.query.count() == 0:
            team1 = Team(name='Team 1-Black', color='Black')
            team2 = Team(name='Team 2-White', color='White')
            db.session.add(team1)
            db.session.add(team2)
            db.session.commit()

# Player endpoints
@app.route('/api/players', methods=['GET'])
def get_players():
    players = Player.query.order_by(Player.name).all()
    return jsonify([p.to_dict() for p in players])

@app.route('/api/players', methods=['POST'])
def create_player():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    
    # Check if player already exists
    existing = Player.query.filter_by(name=data['name']).first()
    if existing:
        return jsonify({'error': 'Player already exists'}), 400
    
    player = Player(name=data['name'])
    db.session.add(player)
    db.session.commit()
    return jsonify(player.to_dict()), 201

@app.route('/api/players/<int:player_id>', methods=['DELETE'])
def delete_player(player_id):
    player = Player.query.get_or_404(player_id)
    db.session.delete(player)
    db.session.commit()
    return jsonify({'message': 'Player deleted'}), 200

# Team endpoints
@app.route('/api/teams', methods=['GET'])
def get_teams():
    teams = Team.query.all()
    return jsonify([t.to_dict() for t in teams])

# Season endpoints
@app.route('/api/seasons', methods=['GET'])
def get_seasons():
    seasons = Season.query.order_by(Season.start_year.desc()).all()
    return jsonify([s.to_dict() for s in seasons])

@app.route('/api/seasons/current', methods=['GET'])
def get_current_season():
    current_year = Season.get_current_season()
    season = Season.get_or_create_season(current_year)
    return jsonify(season.to_dict())

# Image upload and processing
@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Process the image
            extracted_data = process_match_image(filepath)
            return jsonify({
                'success': True,
                'data': extracted_data
            })
        except Exception as e:
            return jsonify({'error': f'Image processing failed: {str(e)}'}), 500
        finally:
            # Clean up uploaded file
            if os.path.exists(filepath):
                os.remove(filepath)
    
    return jsonify({'error': 'Invalid file type'}), 400

# Match endpoints
@app.route('/api/matches', methods=['GET'])
def get_matches():
    season_id = request.args.get('season_id', type=int)
    query = Match.query
    
    if season_id:
        query = query.filter_by(season_id=season_id)
    
    matches = query.order_by(Match.date.desc()).all()
    return jsonify([m.to_dict() for m in matches])

@app.route('/api/matches', methods=['POST'])
def create_match():
    data = request.json
    
    # Validate required fields
    required_fields = ['date', 'team1_id', 'team2_id', 'players']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    # Get or create season
    match_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    if match_date.month >= 9:
        season_year = match_date.year
    else:
        season_year = match_date.year - 1
    
    season = Season.get_or_create_season(season_year)
    
    # Calculate team scores
    team1_score = sum(p['goals'] for p in data['players'] if p['team_id'] == data['team1_id'])
    team2_score = sum(p['goals'] for p in data['players'] if p['team_id'] == data['team2_id'])
    
    # Determine winner
    winner_id = None
    if team1_score > team2_score:
        winner_id = data['team1_id']
    elif team2_score > team1_score:
        winner_id = data['team2_id']
    
    # Create match
    match = Match(
        date=match_date,
        team1_id=data['team1_id'],
        team2_id=data['team2_id'],
        team1_score=team1_score,
        team2_score=team2_score,
        winner_id=winner_id,
        season_id=season.id
    )
    db.session.add(match)
    db.session.flush()  # Get match ID
    
    # Create player statistics
    for player_data in data['players']:
        match_player = MatchPlayer(
            match_id=match.id,
            player_id=player_data['player_id'],
            team_id=player_data['team_id'],
            goals=player_data.get('goals', 0),
            assists=player_data.get('assists', 0)
        )
        db.session.add(match_player)
    
    db.session.commit()
    return jsonify(match.to_dict()), 201

@app.route('/api/matches/<int:match_id>', methods=['DELETE'])
def delete_match(match_id):
    match = Match.query.get_or_404(match_id)
    db.session.delete(match)
    db.session.commit()
    return jsonify({'message': 'Match deleted'}), 200

# Statistics endpoints
@app.route('/api/stats/teams', methods=['GET'])
def get_team_stats():
    season_id = request.args.get('season_id', type=int)
    
    teams = Team.query.all()
    stats = []
    
    for team in teams:
        # Get matches for this team
        matches_query = Match.query.filter(
            ((Match.team1_id == team.id) | (Match.team2_id == team.id))
        )
        
        if season_id:
            matches_query = matches_query.filter_by(season_id=season_id)
        
        matches = matches_query.all()
        
        wins = 0
        draws = 0
        losses = 0
        
        for match in matches:
            if match.winner_id == team.id:
                wins += 1
            elif match.winner_id is None:
                draws += 1
            else:
                losses += 1
        
        stats.append({
            'team': team.to_dict(),
            'wins': wins,
            'draws': draws,
            'losses': losses,
            'total_matches': len(matches)
        })
    
    return jsonify(stats)

@app.route('/api/stats/players', methods=['GET'])
def get_player_stats():
    season_id = request.args.get('season_id', type=int)
    
    players = Player.query.all()
    stats = []
    
    for player in players:
        # Get match stats for this player
        match_players_query = MatchPlayer.query.filter_by(player_id=player.id)
        
        if season_id:
            match_players_query = match_players_query.join(Match).filter(
                Match.season_id == season_id
            )
        
        match_players = match_players_query.all()
        
        total_goals = sum(mp.goals for mp in match_players)
        total_assists = sum(mp.assists for mp in match_players)
        matches_played = len(set(mp.match_id for mp in match_players))
        
        stats.append({
            'player': player.to_dict(),
            'total_goals': total_goals,
            'total_assists': total_assists,
            'matches_played': matches_played
        })
    
    # Sort by total goals descending
    stats.sort(key=lambda x: x['total_goals'], reverse=True)
    
    return jsonify(stats)

Python
import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
