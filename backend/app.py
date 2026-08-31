from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, date
from sqlalchemy.orm import joinedload
from sqlalchemy import inspect, text, func, or_
from models import db, Player, Team, Match, MatchPlayer, Season, User
from config import Config
from image_processor import process_match_image
from auth import require_admin, create_token, user_from_token, get_admin_from_request
from itsdangerous import BadSignature, SignatureExpired
import json

app = Flask(__name__)
app.config.from_object(Config)
CORS(
    app,
    origins=[
        'https://rligastats-frontend.onrender.com',
        'https://rliga.cloud',
        'https://www.rliga.cloud',
        'http://localhost:3000',
    ],
    supports_credentials=False,
    allow_headers=['Content-Type', 'Authorization'],
    methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
)

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
        inspector = inspect(db.engine)
        if 'matches' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('matches')]
            if 'funny_fact' not in columns:
                db.session.execute(text('ALTER TABLE matches ADD COLUMN funny_fact VARCHAR(500)'))
                db.session.commit()
            if 'not_played' not in columns:
                if db.engine.dialect.name == 'sqlite':
                    db.session.execute(text('ALTER TABLE matches ADD COLUMN not_played BOOLEAN DEFAULT 0'))
                else:
                    db.session.execute(text('ALTER TABLE matches ADD COLUMN not_played BOOLEAN DEFAULT FALSE'))
                db.session.commit()

        if 'users' in inspector.get_table_names():
            user_columns = [col['name'] for col in inspector.get_columns('users')]
            if 'player_id' not in user_columns:
                if db.engine.dialect.name == 'sqlite':
                    db.session.execute(text('ALTER TABLE users ADD COLUMN player_id INTEGER'))
                else:
                    db.session.execute(text('ALTER TABLE users ADD COLUMN player_id INTEGER UNIQUE REFERENCES players(id)'))
                db.session.commit()
        
        # Create default teams if they don't exist
        if Team.query.count() == 0:
            team1 = Team(name='Team 1-Black', color='Black')
            team2 = Team(name='Team 2-White', color='White')
            db.session.add(team1)
            db.session.add(team2)
            db.session.commit()

        reset_match_history_once()

        seed_admin_from_env()


def reset_match_history_once():
    """One-time wipe of matches and seasons so 2025/2026 is not listed empty."""
    db.session.execute(text(
        'CREATE TABLE IF NOT EXISTS app_flags (flag_key VARCHAR(64) PRIMARY KEY)'
    ))
    db.session.commit()
    existing = db.session.execute(
        text("SELECT flag_key FROM app_flags WHERE flag_key = 'wipe_matches_2026_08'")
    ).fetchone()
    if existing:
        return
    MatchPlayer.query.delete()
    Match.query.delete()
    Season.query.delete()
    db.session.execute(text("INSERT INTO app_flags (flag_key) VALUES ('wipe_matches_2026_08')"))
    db.session.commit()


def seed_admin_from_env():
    email = (os.environ.get('ADMIN_EMAIL') or '').strip().lower()
    username = (os.environ.get('ADMIN_USERNAME') or '').strip()
    password = os.environ.get('ADMIN_PASSWORD') or ''
    if User.query.count() > 0:
        return
    if not email or not username or not password:
        print('No admin users yet. Set ADMIN_EMAIL, ADMIN_USERNAME and ADMIN_PASSWORD, or register the first admin from a player in the app.')
        return
    player = Player.query.filter(func.lower(Player.name) == username.lower()).first()
    if not player:
        player = Player(name=username)
        db.session.add(player)
        db.session.flush()
    db.session.add(User(
        email=email,
        username=player.name,
        password_hash=generate_password_hash(password),
        player_id=player.id,
    ))
    db.session.commit()


def create_admin_user(email, password, player_id):
    email = (email or '').strip().lower()
    password = password or ''
    if not email or not password or not player_id:
        return None, ('Email, password and player are required', 400)
    player = db.session.get(Player, int(player_id))
    if not player:
        return None, ('Player not found', 400)
    existing = User.query.filter(
        or_(
            func.lower(User.email) == email,
            User.player_id == player.id,
            func.lower(User.username) == player.name.lower(),
        )
    ).first()
    if existing:
        return None, ('This player or email is already an admin', 400)
    user = User(
        email=email,
        username=player.name,
        password_hash=generate_password_hash(password),
        player_id=player.id,
    )
    db.session.add(user)
    db.session.commit()
    return user, None

def season_for_date(match_date):
    if match_date.month >= 9:
        season_year = match_date.year
    else:
        season_year = match_date.year - 1
    return Season.get_or_create_season(season_year)

def scores_and_winner(players, team1_id, team2_id):
    team1_score = sum(p['goals'] for p in players if p['team_id'] == team1_id)
    team2_score = sum(p['goals'] for p in players if p['team_id'] == team2_id)
    winner_id = None
    if team1_score > team2_score:
        winner_id = team1_id
    elif team2_score > team1_score:
        winner_id = team2_id
    return team1_score, team2_score, winner_id

def replace_match_players(match_id, players):
    MatchPlayer.query.filter_by(match_id=match_id).delete(synchronize_session=False)
    for player_data in players:
        db.session.add(MatchPlayer(
            match_id=match_id,
            player_id=player_data['player_id'],
            team_id=player_data['team_id'],
            goals=player_data.get('goals', 0),
            assists=player_data.get('assists', 0)
        ))

# Auth
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    login_value = (data.get('login') or data.get('email') or data.get('username') or '').strip()
    password = data.get('password') or ''
    if not login_value or not password:
        return jsonify({'error': 'Login and password are required'}), 400

    lookup = login_value.lower()
    user = User.query.filter(
        or_(func.lower(User.email) == lookup, func.lower(User.username) == lookup)
    ).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid login or password'}), 401

    return jsonify({
        'token': create_token(user.id),
        'user': user.to_dict(),
    })


@app.route('/api/me', methods=['GET'])
def me():
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return jsonify({'error': 'Authentication required'}), 401
    try:
        user = user_from_token(header[7:].strip())
    except (BadSignature, SignatureExpired):
        return jsonify({'error': 'Invalid or expired token'}), 401
    if not user:
        return jsonify({'error': 'Authentication required'}), 401
    return jsonify(user.to_dict())


@app.route('/api/auth/setup', methods=['GET'])
def auth_setup():
    return jsonify({'has_admins': User.query.count() > 0})


@app.route('/api/users', methods=['POST'])
def create_user():
    if User.query.count() > 0 and not get_admin_from_request():
        return jsonify({'error': 'Authentication required'}), 401
    data = request.json or {}
    try:
        player_id = int(data.get('player_id'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Email, password and player are required'}), 400
    user, error = create_admin_user(
        data.get('email'),
        data.get('password'),
        player_id,
    )
    if error:
        return jsonify({'error': error[0]}), error[1]
    return jsonify(user.to_dict()), 201


# Player endpoints
def player_payload(player, admin_ids):
    data = player.to_dict()
    data['is_admin'] = player.id in admin_ids
    return data


def admin_player_ids():
    return {
        user.player_id
        for user in User.query.filter(User.player_id.isnot(None)).all()
    }


@app.route('/api/players', methods=['GET'])
def get_players():
    players = Player.query.order_by(Player.name).all()
    ids = admin_player_ids()
    return jsonify([player_payload(p, ids) for p in players])

@app.route('/api/players', methods=['POST'])
@require_admin
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
    return jsonify(player_payload(player, set())), 201

@app.route('/api/players/<int:player_id>', methods=['PUT'])
@require_admin
def update_player(player_id):
    player = Player.query.get_or_404(player_id)
    data = request.json
    if not data or not data.get('name') or not str(data.get('name')).strip():
        return jsonify({'error': 'Name is required'}), 400
    name = str(data['name']).strip()
    existing = Player.query.filter(Player.name == name, Player.id != player_id).first()
    if existing:
        return jsonify({'error': 'Player already exists'}), 400
    player.name = name
    linked = User.query.filter_by(player_id=player.id).first()
    if linked:
        linked.username = name
    db.session.commit()
    return jsonify(player_payload(player, admin_player_ids()))

@app.route('/api/players/<int:player_id>', methods=['DELETE'])
@require_admin
def delete_player(player_id):
    player = Player.query.get_or_404(player_id)
    if User.query.filter_by(player_id=player.id).first():
        return jsonify({'error': 'Cannot delete a player who is an admin'}), 400
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
    seasons = [s for s in seasons if Match.query.filter_by(season_id=s.id).count() > 0]
    return jsonify([s.to_dict() for s in seasons])

@app.route('/api/seasons/current', methods=['GET'])
def get_current_season():
    current_year = Season.get_current_season()
    season = Season.get_or_create_season(current_year)
    return jsonify(season.to_dict())

# Image upload and processing
@app.route('/api/upload', methods=['POST'])
@require_admin
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
@require_admin
def create_match():
    data = request.json
    
    required_fields = ['date', 'team1_id', 'team2_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    not_played = bool(data.get('not_played'))
    players = [] if not_played else (data.get('players') or [])
    if not not_played and not players:
        return jsonify({'error': 'Players are required unless the match was not played'}), 400
    
    match_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    season = season_for_date(match_date)
    if not_played:
        team1_score, team2_score, winner_id = 0, 0, None
    else:
        team1_score, team2_score, winner_id = scores_and_winner(
            players, data['team1_id'], data['team2_id']
        )

    match = Match(
        date=match_date,
        team1_id=data['team1_id'],
        team2_id=data['team2_id'],
        team1_score=team1_score,
        team2_score=team2_score,
        winner_id=winner_id,
        season_id=season.id,
        funny_fact=(data.get('funny_fact') or '').strip() or None,
        not_played=not_played
    )
    db.session.add(match)
    db.session.flush()
    replace_match_players(match.id, players)
    db.session.commit()
    return jsonify(match.to_dict()), 201

@app.route('/api/matches/<int:match_id>', methods=['GET'])
def get_match(match_id):
    match = Match.query.get_or_404(match_id)
    return jsonify(match.to_dict())

@app.route('/api/matches/<int:match_id>', methods=['PUT'])
@require_admin
def update_match(match_id):
    match = Match.query.get_or_404(match_id)
    data = request.json
    required_fields = ['date', 'team1_id', 'team2_id']
    if not data or not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    not_played = bool(data.get('not_played'))
    players = [] if not_played else (data.get('players') or [])
    if not not_played and not players:
        return jsonify({'error': 'Players are required unless the match was not played'}), 400

    match_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    season = season_for_date(match_date)
    if not_played:
        team1_score, team2_score, winner_id = 0, 0, None
    else:
        team1_score, team2_score, winner_id = scores_and_winner(
            players, data['team1_id'], data['team2_id']
        )

    match.date = match_date
    match.team1_id = data['team1_id']
    match.team2_id = data['team2_id']
    match.team1_score = team1_score
    match.team2_score = team2_score
    match.winner_id = winner_id
    match.season_id = season.id
    match.funny_fact = (data.get('funny_fact') or '').strip() or None
    match.not_played = not_played
    replace_match_players(match.id, players)
    db.session.commit()
    return jsonify(match.to_dict())

@app.route('/api/matches/<int:match_id>', methods=['DELETE'])
@require_admin
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
        played = [m for m in matches if not m.not_played]
        not_played_matches = [m for m in matches if m.not_played]
        
        wins = 0
        draws = 0
        losses = 0
        
        for match in played:
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
            'total_matches': len(played),
            'matches_not_played': len(not_played_matches)
        })
    
    return jsonify(stats)

@app.route('/api/stats/players', methods=['GET'])
def get_player_stats():
    season_id = request.args.get('season_id', type=int)
    
    players = Player.query.all()
    stats = []
    
    for player in players:
        # Get match stats for this player
        match_players_query = MatchPlayer.query.options(
            joinedload(MatchPlayer.team)
        ).filter_by(player_id=player.id).join(Match).filter(
            (Match.not_played.is_(False)) | (Match.not_played.is_(None))
        )
        
        if season_id:
            match_players_query = match_players_query.filter(
                Match.season_id == season_id
            )
        
        match_players = match_players_query.all()
        
        total_goals = sum(mp.goals for mp in match_players)
        total_assists = sum(mp.assists for mp in match_players)
        matches_played = len(set(mp.match_id for mp in match_players))
        matches_black = len({
            mp.match_id for mp in match_players
            if mp.team and (mp.team.color or '').lower() == 'black'
        })
        matches_white = len({
            mp.match_id for mp in match_players
            if mp.team and (mp.team.color or '').lower() == 'white'
        })
        
        stats.append({
            'player': player.to_dict(),
            'total_goals': total_goals,
            'total_assists': total_assists,
            'matches_played': matches_played,
            'matches_black': matches_black,
            'matches_white': matches_white,
            'points': total_goals + total_assists,
            'ppm': round((total_goals + total_assists) / matches_played, 2) if matches_played else 0,
        })
    
    stats.sort(key=lambda x: (-x['points'], x['player']['name'].lower()))
    last_points = None
    last_rank = 0
    for index, row in enumerate(stats, start=1):
        if row['points'] != last_points:
            last_rank = index
            last_points = row['points']
        row['ranking'] = last_rank
    
    return jsonify(stats)

@app.route('/')
def index():
    return jsonify({'status': 'ok'})

init_db()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
