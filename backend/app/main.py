from __future__ import annotations

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from typing import Optional

from .algorithm import analyze_decision
from .models import DecisionRequest, RegisterRequest, LoginRequest, CreateRoomRequest, JoinRoomRequest, SendMessageRequest, SaveRatingRequest, SaveWeightRequest, UpdateRoomRequest
from .sample_data import SAMPLE_SESSION
from . import db

db.init_db()

app = FastAPI(
    title="Core Delight API",
    description="FastAPI backend for the decision support app with spaces and voting.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    user = db.get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest):
    if len(payload.password) < 4:
        raise HTTPException(status_code=422, detail="Password must be at least 4 characters")
    user = db.create_user(payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=409, detail="Username already taken")
    return {"user": user}


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    user = db.get_user_by_username(payload.username)
    if not user or not db.verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"user": {"id": user["id"], "username": user["username"], "token": user["token"]}}


@app.get("/api/me")
def me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"]}


@app.post("/api/spaces")
def create_space(payload: CreateRoomRequest, user: dict = Depends(get_current_user)):
    criteria = [{"name": c.name, "weight": c.weight} for c in payload.criteria]
    alternatives = payload.alternatives
    space = db.create_room(payload.name, payload.title, user["id"], criteria, alternatives, description=payload.description)
    if not space:
        raise HTTPException(status_code=500, detail="Could not create voting space")
    return {"space": space}


@app.post("/api/spaces/join")
def join_space(payload: JoinRoomRequest, user: dict = Depends(get_current_user)):
    space = db.get_room_by_code(payload.code.upper())
    if not space:
        raise HTTPException(status_code=404, detail="Voting space not found")
    db.join_room(space["id"], user["id"])
    return {"space": space}


@app.get("/api/spaces")
def list_spaces(user: dict = Depends(get_current_user)):
    spaces = db.get_user_rooms(user["id"])
    return {"spaces": spaces}


@app.get("/api/spaces/{space_id}")
def get_space(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    space = db.get_room_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Voting space not found")
    members = db.get_room_members(space_id)
    messages = db.get_messages(space_id)
    ratings = db.get_ratings(space_id)
    weights = db.get_weights(space_id)
    return {"space": space, "members": members, "messages": messages, "ratings": ratings, "weights": weights}


@app.put("/api/spaces/{space_id}")
def update_space(space_id: int, payload: UpdateRoomRequest, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    space = db.get_room_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Voting space not found")
    if space["creator_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the voting space creator can edit the voting space")
    db.update_room_description(space_id, payload.description)
    updated = db.get_room_by_id(space_id)
    return {"space": updated}


@app.post("/api/spaces/{space_id}/messages")
def send_message(space_id: int, payload: SendMessageRequest, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    msg_id = db.add_message(space_id, user["id"], payload.content)
    return {"id": msg_id, "content": payload.content, "author": user["username"], "created_at": db.now_iso()}


@app.get("/api/spaces/{space_id}/messages")
def get_space_messages(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    messages = db.get_messages(space_id)
    return {"messages": messages}


@app.post("/api/spaces/{space_id}/ratings")
def save_rating(space_id: int, payload: SaveRatingRequest, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    if payload.value < 1 or payload.value > 5:
        raise HTTPException(status_code=422, detail="Rating value must be between 1 and 5")
    db.save_rating(space_id, user["id"], payload.alternative, payload.criterion, payload.value)
    return {"status": "ok"}


@app.get("/api/spaces/{space_id}/ratings")
def get_space_ratings(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    ratings = db.get_ratings(space_id)
    return {"ratings": ratings}


@app.post("/api/spaces/{space_id}/weights")
def save_weight(space_id: int, payload: SaveWeightRequest, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    if payload.value < 1 or payload.value > 5:
        raise HTTPException(status_code=422, detail="Weight value must be between 1 and 5")
    db.save_weight(space_id, user["id"], payload.criterion, payload.value)
    return {"status": "ok"}


@app.get("/api/spaces/{space_id}/weights")
def get_space_weights(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    weights = db.get_weights(space_id)
    return {"weights": weights}


@app.post("/api/spaces/{space_id}/analyze")
def analyze_space(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    space = db.get_room_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Voting space not found")
    members = db.get_room_members(space_id)
    ratings = db.get_ratings(space_id)
    weights = db.get_weights(space_id)
    participants = [m["username"] for m in members]
    alternatives = space["alternatives"]
    criteria = space["criteria"]
    ratings_list = []
    for r in ratings:
        ratings_list.append({
            "participant": r["participant"],
            "alternative": r["alternative"],
            "criterion": r["criterion"],
            "value": r["value"],
        })
    weights_list = []
    for w in weights:
        weights_list.append({
            "participant": w["participant"],
            "criterion": w["criterion"],
            "value": w["value"],
        })
    if not ratings_list:
        raise HTTPException(status_code=422, detail="No ratings submitted yet")
    try:
        result = analyze_decision(
            title=space["title"] or space["name"],
            participants=participants,
            alternatives=alternatives,
            criteria=criteria,
            ratings=ratings_list,
            weights=weights_list if weights_list else None,
        )
        return result
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/api/spaces/{space_id}/ping")
def ping_space(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    db.update_member_last_seen(space_id, user["id"])
    return {"status": "ok"}


@app.get("/api/spaces/{space_id}/activity")
def space_activity(space_id: int, user: dict = Depends(get_current_user)):
    if not db.is_room_member(space_id, user["id"]):
        raise HTTPException(status_code=403, detail="You are not a member of this voting space")
    activity = db.get_space_activity(space_id, user["id"])
    db.update_member_last_seen(space_id, user["id"])
    return activity


@app.get("/api/sample-session")
def sample_session() -> dict[str, object]:
    return SAMPLE_SESSION


@app.post("/api/decision/analyze")
def analyze(payload: DecisionRequest) -> dict[str, object]:
    try:
        return analyze_decision(
            title=payload.title,
            participants=payload.participants,
            alternatives=payload.alternatives,
            criteria=[{"name": c.name, "weight": c.weight} for c in payload.criteria],
            ratings=[{"participant": r.participant, "alternative": r.alternative, "criterion": r.criterion, "value": r.value} for r in payload.ratings],
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


# Serve built frontend (SPA)
_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/assets", StaticFiles(directory=str(_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # API paths are already handled above; this catches everything else
        index = _dist / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Not found")
