from sqlalchemy.orm import Session
from . import db
from datetime import date
from collections import defaultdict


def compute_basic_stats(db_session: Session):
    trades = db_session.query(db.Trade).order_by(db.Trade.trade_date).all()
    total = len(trades)
    wins = sum(1 for t in trades if t.result == "Win")
    losses = sum(1 for t in trades if t.result == "Loss")
    pnl_total = sum((t.pnl or 0) for t in trades)
    avg_rr = 0.0
    largest_win = max((t.pnl or 0) for t in trades) if trades else 0
    largest_loss = min((t.pnl or 0) for t in trades) if trades else 0

    win_rate = (wins / total * 100) if total else 0

    # equity curve per date
    equity = []
    daily = defaultdict(float)
    for t in trades:
        daily[t.trade_date] += (t.pnl or 0)
    cum = 0
    for d in sorted(daily.keys()):
        cum += daily[d]
        equity.append({"date": d.isoformat(), "cum": cum, "daily": daily[d]})

    return {
        "total_trades": total,
        "win_rate": round(win_rate, 2),
        "pnl_total": round(pnl_total, 2),
        "largest_win": round(largest_win, 2),
        "largest_loss": round(largest_loss, 2),
        "equity_curve": equity,
    }
