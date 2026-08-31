from functools import wraps
from flask import request, jsonify, current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from models import db, User


def _serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='rliga-auth')


def create_token(user_id):
    return _serializer().dumps({'uid': user_id})


def user_from_token(token):
    data = _serializer().loads(
        token,
        max_age=current_app.config.get('AUTH_TOKEN_MAX_AGE', 60 * 60 * 24 * 7),
    )
    return db.session.get(User, data.get('uid'))


def get_admin_from_request():
    header = request.headers.get('Authorization', '')
    if not header.startswith('Bearer '):
        return None
    try:
        return user_from_token(header[7:].strip())
    except (BadSignature, SignatureExpired):
        return None


def require_admin(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user = get_admin_from_request()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        request.admin_user = user
        return fn(*args, **kwargs)

    return wrapped
