from __future__ import annotations

from pydantic import BaseModel, Field


class CriterionInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    weight: float = Field(..., ge=0)


class RatingInput(BaseModel):
    participant: str = Field(..., min_length=1, max_length=80)
    alternative: str = Field(..., min_length=1, max_length=80)
    criterion: str = Field(..., min_length=1, max_length=80)
    value: int = Field(..., ge=1, le=5)


class DecisionRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    participants: list[str] = Field(..., min_length=1)
    alternatives: list[str] = Field(..., min_length=1)
    criteria: list[CriterionInput] = Field(..., min_length=1)
    ratings: list[RatingInput] = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=120)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=120)


class CreateRoomRequest(BaseModel):
    name: str = Field("", max_length=120)
    title: str = Field("", max_length=120)
    description: str = Field("", max_length=1000)
    alternatives: list[str] = Field(..., min_length=1)
    criteria: list[CriterionInput] = Field(..., min_length=1)


class JoinRoomRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class SaveRatingRequest(BaseModel):
    alternative: str = Field(..., min_length=1, max_length=80)
    criterion: str = Field(..., min_length=1, max_length=80)
    value: int = Field(..., ge=1, le=5)


class SaveWeightRequest(BaseModel):
    criterion: str = Field(..., min_length=1, max_length=80)
    value: int = Field(..., ge=1, le=5)


class UpdateRoomRequest(BaseModel):
    description: str = Field("", max_length=1000)
