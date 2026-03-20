from sqlalchemy.orm import Session
from . import db, schemas
from datetime import date
from typing import List, Tuple


def calculate_risk_and_position(entry: float, stop: float, qty: int, capital: float) -> Tuple[float, float, float]:
    # Risk per share
    risk_per_unit = abs(entry - stop)
    risk_amount = risk_per_unit * qty
    risk_pct = (risk_amount / capital) * 100 if capital else 0
    reward_per_unit = abs(entry - entry + 0)  # placeholder
    return risk_amount, risk_pct, risk_per_unit


def get_settings(db_session: Session):
    return db_session.query(db.Setting).first()


def create_trade(db_session: Session, trade_in: schemas.TradeCreate):
    settings = get_settings(db_session)
    capital = settings.capital

    # compute risk
    risk_per_unit = abs(trade_in.entry - trade_in.stop_loss)
    risk_amount = risk_per_unit * trade_in.quantity
    risk_pct = (risk_amount / capital) * 100 if capital else 0

    # discipline check: per-trade risk
    if risk_pct > settings.risk_per_trade_pct:
        raise ValueError(f"Per-trade risk {risk_pct:.2f}% exceeds allowed {settings.risk_per_trade_pct}%")

    # discipline check: daily loss
    today = trade_in.trade_date or date.today()
    todays_pnl = db_session.query(db.Trade).filter(db.Trade.trade_date == today).with_entities(db.Trade.pnl)
    total_today_loss = sum([t[0] or 0 for t in todays_pnl])
    # if total_today_loss is negative and beyond max
    if total_today_loss < 0:
        loss_pct = (abs(total_today_loss) / capital) * 100
        if loss_pct >= settings.max_daily_loss_pct:
            raise PermissionError("Daily loss limit reached")

    t = db.Trade(
        trade_date=trade_in.trade_date,
        instrument=trade_in.instrument,
        setup_type=trade_in.setup_type,
        trade_type=trade_in.trade_type,
        entry=trade_in.entry,
        stop_loss=trade_in.stop_loss,
        target=trade_in.target,
        quantity=trade_in.quantity,
        notes=trade_in.notes,
        tags=trade_in.tags,
    )
    db_session.add(t)
    db_session.commit()
    db_session.refresh(t)
    return t


def update_trade(db_session: Session, trade_id: int, data: schemas.TradeUpdate):
    t = db_session.query(db.Trade).filter(db.Trade.id == trade_id).first()
    if not t:
        return None
    if data.exit_price is not None:
        t.exit_price = data.exit_price
        # compute pnl based on trade_type
        mult = 1 if t.trade_type.upper() == "BUY" else -1
        t.pnl = (data.exit_price - t.entry) * t.quantity * (1 if t.trade_type.upper() == "BUY" else -1)
        # result determination
        if t.pnl > 0:
            t.result = "Win"
        elif t.pnl < 0:
            t.result = "Loss"
        else:
            t.result = "Breakeven"
    if data.notes is not None:
        t.notes = data.notes
    if data.tags is not None:
        t.tags = data.tags
    db_session.commit()
    db_session.refresh(t)
    return t


def list_trades(db_session: Session, limit: int = 100) -> List[db.Trade]:
    return db_session.query(db.Trade).order_by(db.Trade.created_at.desc()).limit(limit).all()


def export_trades_csv(db_session: Session):
    import csv
    from io import StringIO

    trades = db_session.query(db.Trade).all()
    out = StringIO()
    writer = csv.writer(out)
    writer.writerow(["id", "trade_date", "instrument", "setup_type", "trade_type", "entry", "stop_loss", "target", "quantity", "exit_price", "result", "pnl", "notes", "tags"])
    for t in trades:
        writer.writerow([t.id, t.trade_date, t.instrument, t.setup_type, t.trade_type, t.entry, t.stop_loss, t.target, t.quantity, t.exit_price, t.result, t.pnl, t.notes, t.tags])
    return out.getvalue()
