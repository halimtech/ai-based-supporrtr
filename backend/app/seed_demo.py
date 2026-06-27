"""Pre-prepared demo simulation steps for the standardised advisor test case.

The professor asked for simulation steps that can be *loaded* in the running app
instead of being clicked through live. This module deterministically replays the
"resolve the single most critical conflict, one at a time" loop on the sample
data and lets you load any resulting snapshot straight into a real voting space.

Usage (from the ``backend`` folder):

    python -m app.seed_demo --list           # show every saved step + agreement %
    python -m app.seed_demo --step 0          # load the starting (full-conflict) state
    python -m app.seed_demo --step 17         # jump straight to the consensus state

Each snapshot writes the exact ratings/weights into a demo voting space (creating
the three demo participants and the space on first run, reusing them afterwards).
Open the app, sign in as one of the demo users, and the space reflects that step.
"""

from __future__ import annotations

import argparse

from . import db
from .algorithm import (
    coerce_ratings_lookup,
    find_critical_conflict,
    normalize_criteria,
    _build_judgements,
)
from .sample_data import SAMPLE_SESSION

DEMO_PASSWORD = "demo1234"
ROOM_NAME = "Demo · Regional office"
MAX_STEPS = 60


def _describe(conflict: dict | None) -> str:
    if conflict is None:
        return "Consensus reached — one option clearly leads"
    if conflict["kind"] == "weight":
        return f'sticking point: how important "{conflict["criterion"]}" should be'
    return f'sticking point: "{conflict["criterion"]}" for {conflict["alternative"]}'


def generate_snapshots() -> list[dict]:
    """Replay the one-conflict-at-a-time resolution and capture every state.

    Resolving a conflict means everyone adopts the group-average value for that
    single item — which is exactly what ``find_critical_conflict`` recommends.
    The picks are seeded and therefore deterministic, so the sequence is stable.
    """
    participants = list(SAMPLE_SESSION["participants"])
    alternatives = list(SAMPLE_SESSION["alternatives"])
    criteria = normalize_criteria(SAMPLE_SESSION["criteria"])
    criteria_names = [str(c["name"]) for c in criteria]

    ratings = {
        (r["participant"], r["alternative"], r["criterion"]): r["value"]
        for r in SAMPLE_SESSION["ratings"]
    }
    weights = {
        (w["participant"], w["criterion"]): w["value"]
        for w in SAMPLE_SESSION["weights"]
    }

    snapshots: list[dict] = []
    for step in range(MAX_STEPS):
        ratings_list = [
            {"participant": p, "alternative": a, "criterion": c, "value": v}
            for (p, a, c), v in ratings.items()
        ]
        weights_list = [
            {"participant": p, "criterion": c, "value": v}
            for (p, c), v in weights.items()
        ]
        lookup = coerce_ratings_lookup(ratings_list)
        judgements = _build_judgements(participants, alternatives, criteria, lookup, weights_list)
        conflict = find_critical_conflict(judgements, criteria_names, alternatives)
        strength = int(conflict["base_strength"]) if conflict else 100

        snapshots.append({
            "step": step,
            "strength": strength,
            "label": _describe(conflict),
            "ratings": ratings_list,
            "weights": weights_list,
        })

        if conflict is None or strength >= 100:
            break

        if conflict["kind"] == "rating":
            alt = conflict["alternative"]
            crit = conflict["criterion"]
            present = [v for (p, a, c), v in ratings.items() if a == alt and c == crit]
            resolved = round(sum(present) / len(present))
            for p in participants:
                ratings[(p, alt, crit)] = resolved
        else:
            crit = conflict["criterion"]
            present = [v for (p, c), v in weights.items() if c == crit]
            resolved = round(sum(present) / len(present))
            for p in participants:
                weights[(p, crit)] = resolved

    return snapshots


def _ensure_user(username: str, password: str) -> dict:
    existing = db.get_user_by_username(username)
    if existing:
        return existing
    created = db.create_user(username, password, name=username)
    if created is None:  # pragma: no cover - race / dup
        created = db.get_user_by_username(username)
    return created


def _find_or_create_room(creator_id: int) -> dict:
    for room in db.get_user_rooms(creator_id):
        if room.get("title") == SAMPLE_SESSION["title"]:
            return room
    return db.create_room(
        name=ROOM_NAME,
        title=SAMPLE_SESSION["title"],
        creator_id=creator_id,
        criteria=SAMPLE_SESSION["criteria"],
        alternatives=SAMPLE_SESSION["alternatives"],
        description="Standardised advisor test case (2026-05-04).",
    )


def _clear_room(room_id: int) -> None:
    conn = db.get_db()
    cursor = db._cursor(conn)
    ph = db._ph()
    cursor.execute(f"DELETE FROM ratings WHERE room_id = {ph}", (room_id,))
    cursor.execute(f"DELETE FROM weights WHERE room_id = {ph}", (room_id,))
    conn.commit()
    cursor.close()
    conn.close()


def load_step(step: int, password: str = DEMO_PASSWORD) -> tuple[dict, dict]:
    db.init_db()
    snapshots = generate_snapshots()
    if step < 0 or step >= len(snapshots):
        raise SystemExit(
            f"Step {step} is out of range — valid steps are 0..{len(snapshots) - 1} "
            f"(run with --list to see them)."
        )
    snapshot = snapshots[step]

    users = {name: _ensure_user(name, password) for name in SAMPLE_SESSION["participants"]}
    creator = users[SAMPLE_SESSION["participants"][0]]
    room = _find_or_create_room(creator["id"])
    for user in users.values():
        db.join_room(room["id"], user["id"])

    _clear_room(room["id"])
    for rating in snapshot["ratings"]:
        db.save_rating(
            room["id"], users[rating["participant"]]["id"],
            rating["alternative"], rating["criterion"], rating["value"],
        )
    for weight in snapshot["weights"]:
        db.save_weight(
            room["id"], users[weight["participant"]]["id"],
            weight["criterion"], weight["value"],
        )
    return room, snapshot


def _print_list(snapshots: list[dict]) -> None:
    print("Pre-prepared demo steps (resolve one conflict at a time):\n")
    for snap in snapshots:
        mark = "  ✓ consensus" if snap["strength"] >= 70 else ""
        print(f"  step {snap['step']:>2}  agreement {snap['strength']:>3}%  {snap['label']}{mark}")
    print("\nLoad one with:  python -m app.seed_demo --step <N>")


def main() -> None:
    parser = argparse.ArgumentParser(description="Load a pre-prepared demo simulation step.")
    parser.add_argument("--list", action="store_true", help="list every saved step")
    parser.add_argument("--step", type=int, help="load this step into the demo voting space")
    parser.add_argument("--password", default=DEMO_PASSWORD, help="password for the demo users")
    args = parser.parse_args()

    if args.list or args.step is None:
        _print_list(generate_snapshots())
        if args.step is None and not args.list:
            print("\nTip: pass --step <N> to actually load one.")
        return

    room, snapshot = load_step(args.step, args.password)
    participants = ", ".join(SAMPLE_SESSION["participants"])
    print(f"Loaded step {snapshot['step']} (agreement ~{snapshot['strength']}%) — {snapshot['label']}")
    print(f"Voting space: \"{room.get('name', ROOM_NAME)}\"  ·  join code: {room['code']}")
    print(f"Demo logins: {participants}  ·  password: {args.password}")


if __name__ == "__main__":
    main()
