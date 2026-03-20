from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class TradeCreate(BaseModel):
    trade_date: Optional[date] = None
    instrument: str
    setup_type: Optional[str] = None
    trade_type: str
    entry: float
    stop_loss: float
    target: float
    quantity: int
    notes: Optional[str] = None
    tags: Optional[str] = None


class TradeUpdate(BaseModel):
    exit_price: Optional[float] = None
    result: Optional[str] = None
    pnl: Optional[float] = None
    notes: Optional[str] = None
    tags: Optional[str] = None


class TradeOut(BaseModel):
    id: int
    trade_date: Optional[date]
    instrument: str
    setup_type: Optional[str]
    trade_type: str
    entry: float
    stop_loss: float
    target: float
    quantity: int
    exit_price: Optional[float]
    result: Optional[str]
    pnl: float
    notes: Optional[str]
    tags: Optional[str]

    class Config:
        orm_mode = True


class SettingIn(BaseModel):
    capital: float
    risk_per_trade_pct: float = Field(..., alias="riskPct")
    max_daily_loss_pct: float = Field(..., alias="maxDailyLossPct")
    default_quantity: int = Field(0, alias="defaultQty")


class SettingOut(BaseModel):
    capital: float
    risk_per_trade_pct: float
    max_daily_loss_pct: float
    default_quantity: int

    class Config:
        orm_mode = True
