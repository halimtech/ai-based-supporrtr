import os
import json
import secrets
import hashlib
from datetime import datetime
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from psycopg2 import IntegrityError as DBIntegrityError
    IS_POSTGRES = True
else:
    import sqlite3
    from sqlite3 import IntegrityError as DBIntegrityError
    IS_POSTGRES = False
    DB_PATH = Path(__file__).resolve().parent.parent / "data" / "app.db"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def _ph():
    return "%s" if IS_POSTGRES else "?"


def _cursor(conn):
    if IS_POSTGRES:
        return conn.cursor(cursor_factory=RealDictCursor)
    return conn.cursor()


def get_db():
    if IS_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = _cursor(conn)

    if IS_POSTGRES:
        tables = [
            """CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS rooms (
                id SERIAL PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                creator_id INTEGER NOT NULL REFERENCES users(id),
                criteria_json TEXT NOT NULL DEFAULT '[]',
                alternatives_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS room_members (
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TEXT NOT NULL,
                PRIMARY KEY (room_id, user_id)
            )""",
            """CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )""",
            """CREATE TABLE IF NOT EXISTS ratings (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alternative TEXT NOT NULL,
                criterion TEXT NOT NULL,
                value INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(room_id, user_id, alternative, criterion)
            )""",
            """CREATE TABLE IF NOT EXISTS weights (
                id SERIAL PRIMARY KEY,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                criterion TEXT NOT NULL,
                value INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(room_id, user_id, criterion)
            )"""
        ]
        for sql in tables:
            cursor.execute(sql)
    else:
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rooms (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                creator_id INTEGER NOT NULL REFERENCES users(id),
                criteria_json TEXT NOT NULL DEFAULT '[]',
                alternatives_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS room_members (
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                joined_at TEXT NOT NULL,
                PRIMARY KEY (room_id, user_id)
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                alternative TEXT NOT NULL,
                criterion TEXT NOT NULL,
                value INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(room_id, user_id, alternative, criterion)
            );
            CREATE TABLE IF NOT EXISTS weights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                criterion TEXT NOT NULL,
                value INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(room_id, user_id, criterion)
            );
            """
        )
    conn.commit()
    cursor.close()
    conn.close()

    # Migration: add description column to rooms if not present (for existing DBs)
    conn2 = get_db()
    if IS_POSTGRES:
        conn2.autocommit = True
    cursor2 = _cursor(conn2)
    try:
        cursor2.execute("ALTER TABLE rooms ADD COLUMN description TEXT NOT NULL DEFAULT ''")
        if not IS_POSTGRES:
            conn2.commit()
    except Exception:
        # Column already exists, ignore
        if not IS_POSTGRES:
            conn2.rollback()
    finally:
        cursor2.close()
        conn2.close()

    # Migration: add last_seen column to room_members if not present
    conn3 = get_db()
    if IS_POSTGRES:
        conn3.autocommit = True
    cursor3 = _cursor(conn3)
    try:
        cursor3.execute("ALTER TABLE room_members ADD COLUMN last_seen TEXT NOT NULL DEFAULT ''")
        if not IS_POSTGRES:
            conn3.commit()
    except Exception:
        if not IS_POSTGRES:
            conn3.rollback()
    finally:
        cursor3.close()
        conn3.close()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${hashed.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hashed = stored.split("$")
        computed = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return computed.hex() == hashed
    except Exception:
        return False


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def generate_room_code() -> str:
    return secrets.token_hex(3).upper()


def now_iso() -> str:
    return datetime.utcnow().isoformat()


def create_user(username: str, password: str):
    conn = get_db()
    cursor = _cursor(conn)
    password_hash = hash_password(password)
    token = generate_token()
    ph = _ph()
    try:
        if IS_POSTGRES:
            cursor.execute(
                f"INSERT INTO users (username, password_hash, token, created_at) VALUES ({ph}, {ph}, {ph}, {ph}) RETURNING id",
                (username, password_hash, token, now_iso()),
            )
            user_id = cursor.fetchone()["id"]
        else:
            cursor.execute(
                f"INSERT INTO users (username, password_hash, token, created_at) VALUES ({ph}, {ph}, {ph}, {ph})",
                (username, password_hash, token, now_iso()),
            )
            user_id = cursor.lastrowid
        conn.commit()
        return {"id": user_id, "username": username, "token": token}
    except DBIntegrityError:
        return None
    finally:
        cursor.close()
        conn.close()


def get_user_by_token(token: str):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(f"SELECT id, username, token FROM users WHERE token = {ph}", (token,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(row) if row else None


def get_user_by_username(username: str):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(f"SELECT id, username, password_hash, token FROM users WHERE username = {ph}", (username,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(row) if row else None


def create_room(name: str, title: str, creator_id: int, criteria: list, alternatives: list, description: str = ""):
    conn = get_db()
    cursor = _cursor(conn)
    code = generate_room_code()
    ph = _ph()
    try:
        if IS_POSTGRES:
            cursor.execute(
                f"""INSERT INTO rooms (code, name, title, description, creator_id, criteria_json, alternatives_json, created_at)
                    VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}) RETURNING id""",
                (code, name, title, description, creator_id, json.dumps(criteria), json.dumps(alternatives), now_iso()),
            )
            room_id = cursor.fetchone()["id"]
        else:
            cursor.execute(
                f"""INSERT INTO rooms (code, name, title, description, creator_id, criteria_json, alternatives_json, created_at)
                    VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})""",
                (code, name, title, description, creator_id, json.dumps(criteria), json.dumps(alternatives), now_iso()),
            )
            room_id = cursor.lastrowid
        cursor.execute(
            f"INSERT INTO room_members (room_id, user_id, joined_at) VALUES ({ph}, {ph}, {ph})",
            (room_id, creator_id, now_iso()),
        )
        conn.commit()
        return {"id": room_id, "code": code, "name": name, "title": title, "description": description, "creator_id": creator_id}
    except DBIntegrityError:
        return None
    finally:
        cursor.close()
        conn.close()


def get_room_by_code(code: str):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(f"SELECT * FROM rooms WHERE code = {ph}", (code,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        data = dict(row)
        data["criteria"] = json.loads(data.pop("criteria_json"))
        data["alternatives"] = json.loads(data.pop("alternatives_json"))
        return data
    return None


def get_room_by_id(room_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(f"SELECT * FROM rooms WHERE id = {ph}", (room_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        data = dict(row)
        data["criteria"] = json.loads(data.pop("criteria_json"))
        data["alternatives"] = json.loads(data.pop("alternatives_json"))
        return data
    return None


def join_room(room_id: int, user_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    try:
        if IS_POSTGRES:
            cursor.execute(
                f"""INSERT INTO room_members (room_id, user_id, joined_at)
                    VALUES ({ph}, {ph}, {ph})
                    ON CONFLICT DO NOTHING""",
                (room_id, user_id, now_iso()),
            )
        else:
            cursor.execute(
                f"""INSERT OR IGNORE INTO room_members (room_id, user_id, joined_at)
                    VALUES ({ph}, {ph}, {ph})""",
                (room_id, user_id, now_iso()),
            )
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        cursor.close()
        conn.close()


def get_user_rooms(user_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"""
        SELECT r.* FROM rooms r
        JOIN room_members rm ON r.id = rm.room_id
        WHERE rm.user_id = {ph}
        ORDER BY r.created_at DESC
        """,
        (user_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    rooms = []
    for row in rows:
        data = dict(row)
        data["criteria"] = json.loads(data.pop("criteria_json"))
        data["alternatives"] = json.loads(data.pop("alternatives_json"))
        rooms.append(data)
    return rooms


def get_room_members(room_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"""
        SELECT u.id, u.username FROM users u
        JOIN room_members rm ON u.id = rm.user_id
        WHERE rm.room_id = {ph}
        """,
        (room_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(row) for row in rows]


def add_message(room_id: int, user_id: int, content: str):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    if IS_POSTGRES:
        cursor.execute(
            f"""INSERT INTO messages (room_id, user_id, content, created_at)
                VALUES ({ph}, {ph}, {ph}, {ph}) RETURNING id""",
            (room_id, user_id, content, now_iso()),
        )
        msg_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            f"INSERT INTO messages (room_id, user_id, content, created_at) VALUES ({ph}, {ph}, {ph}, {ph})",
            (room_id, user_id, content, now_iso()),
        )
        msg_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return msg_id


def get_messages(room_id: int, limit: int = 100):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"""
        SELECT m.id, m.content, m.created_at, u.username as author
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.room_id = {ph}
        ORDER BY m.created_at DESC
        LIMIT {ph}
        """,
        (room_id, limit),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(row) for row in reversed(rows)]


def save_rating(room_id: int, user_id: int, alternative: str, criterion: str, value: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    if IS_POSTGRES:
        cursor.execute(
            f"""
            INSERT INTO ratings (room_id, user_id, alternative, criterion, value, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ON CONFLICT (room_id, user_id, alternative, criterion) DO UPDATE SET
            value = EXCLUDED.value, created_at = EXCLUDED.created_at
            """,
            (room_id, user_id, alternative, criterion, value, now_iso()),
        )
    else:
        cursor.execute(
            f"""
            INSERT INTO ratings (room_id, user_id, alternative, criterion, value, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph})
            ON CONFLICT(room_id, user_id, alternative, criterion) DO UPDATE SET
            value = excluded.value, created_at = excluded.created_at
            """,
            (room_id, user_id, alternative, criterion, value, now_iso()),
        )
    conn.commit()
    cursor.close()
    conn.close()


def get_ratings(room_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"SELECT r.*, u.username as participant FROM ratings r JOIN users u ON r.user_id = u.id WHERE r.room_id = {ph}",
        (room_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(row) for row in rows]


def save_weight(room_id: int, user_id: int, criterion: str, value: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    if IS_POSTGRES:
        cursor.execute(
            f"""
            INSERT INTO weights (room_id, user_id, criterion, value, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
            ON CONFLICT (room_id, user_id, criterion) DO UPDATE SET
            value = EXCLUDED.value, created_at = EXCLUDED.created_at
            """,
            (room_id, user_id, criterion, value, now_iso()),
        )
    else:
        cursor.execute(
            f"""
            INSERT INTO weights (room_id, user_id, criterion, value, created_at)
            VALUES ({ph}, {ph}, {ph}, {ph}, {ph})
            ON CONFLICT(room_id, user_id, criterion) DO UPDATE SET
            value = excluded.value, created_at = excluded.created_at
            """,
            (room_id, user_id, criterion, value, now_iso()),
        )
    conn.commit()
    cursor.close()
    conn.close()


def get_weights(room_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"SELECT w.*, u.username as participant FROM weights w JOIN users u ON w.user_id = u.id WHERE w.room_id = {ph}",
        (room_id,),
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [dict(row) for row in rows]


def update_room_description(room_id: int, description: str):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"UPDATE rooms SET description = {ph} WHERE id = {ph}",
        (description, room_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def is_room_member(room_id: int, user_id: int) -> bool:
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"SELECT 1 FROM room_members WHERE room_id = {ph} AND user_id = {ph}",
        (room_id, user_id),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row is not None


def update_member_last_seen(room_id: int, user_id: int):
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()
    cursor.execute(
        f"UPDATE room_members SET last_seen = {ph} WHERE room_id = {ph} AND user_id = {ph}",
        (now_iso(), room_id, user_id),
    )
    conn.commit()
    cursor.close()
    conn.close()


def get_space_activity(room_id: int, user_id: int) -> dict:
    conn = get_db()
    cursor = _cursor(conn)
    ph = _ph()

    # Get user's last_seen for this room
    cursor.execute(
        f"SELECT last_seen FROM room_members WHERE room_id = {ph} AND user_id = {ph}",
        (room_id, user_id),
    )
    row = cursor.fetchone()
    last_seen = row["last_seen"] if row and row.get("last_seen") else "1970-01-01T00:00:00"

    # New messages since last_seen
    cursor.execute(
        f"""
        SELECT COUNT(*) as cnt FROM messages m
        WHERE m.room_id = {ph} AND m.created_at > {ph}
        """,
        (room_id, last_seen),
    )
    new_messages = cursor.fetchone()["cnt"]

    # New members since last_seen
    cursor.execute(
        f"""
        SELECT COUNT(*) as cnt FROM room_members rm
        WHERE rm.room_id = {ph} AND rm.joined_at > {ph}
        """,
        (room_id, last_seen),
    )
    new_members = cursor.fetchone()["cnt"]

    # New ratings since last_seen
    cursor.execute(
        f"""
        SELECT COUNT(*) as cnt FROM ratings r
        WHERE r.room_id = {ph} AND r.created_at > {ph}
        """,
        (room_id, last_seen),
    )
    new_ratings = cursor.fetchone()["cnt"]

    cursor.close()
    conn.close()

    return {
        "last_seen": last_seen,
        "new_messages": new_messages,
        "new_members": new_members,
        "new_ratings": new_ratings,
    }
