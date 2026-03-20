from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, FileResponse
from sqlalchemy.orm import Session
from . import db, crud, schemas, analytics
import os

app = FastAPI(title="Trading Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db.init_db()
    session = db.SessionLocal()
    try:
        yield session
    finally:
        session.close()


@app.get("/api/settings", response_model=schemas.SettingOut)
def read_settings(db_session: Session = Depends(get_db)):
    s = db_session.query(db.Setting).first()
    return {
        "capital": s.capital,
        "risk_per_trade_pct": s.risk_per_trade_pct,
        "max_daily_loss_pct": s.max_daily_loss_pct,
        "default_quantity": s.default_quantity,
    }


@app.put("/api/settings", response_model=schemas.SettingOut)
def update_settings(payload: schemas.SettingIn, db_session: Session = Depends(get_db)):
    s = db_session.query(db.Setting).first()
    s.capital = payload.capital
    s.risk_per_trade_pct = payload.risk_per_trade_pct
    s.max_daily_loss_pct = payload.max_daily_loss_pct
    s.default_quantity = payload.default_quantity
    db_session.commit()
    return {
        "capital": s.capital,
        "risk_per_trade_pct": s.risk_per_trade_pct,
        "max_daily_loss_pct": s.max_daily_loss_pct,
        "default_quantity": s.default_quantity,
    }


@app.post("/api/trades", response_model=schemas.TradeOut)
def create_trade(trade: schemas.TradeCreate, db_session: Session = Depends(get_db)):
    try:
        t = crud.create_trade(db_session, trade)
        return t
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


@app.get("/api/trades")
def list_trades(db_session: Session = Depends(get_db)):
    return [dict(
        id=t.id,
        trade_date=t.trade_date,
        instrument=t.instrument,
        setup_type=t.setup_type,
        trade_type=t.trade_type,
        entry=t.entry,
        stop_loss=t.stop_loss,
        target=t.target,
        quantity=t.quantity,
        exit_price=t.exit_price,
        result=t.result,
        pnl=t.pnl,
        notes=t.notes,
        tags=t.tags,
    ) for t in crud.list_trades(db_session)]


@app.put("/api/trades/{trade_id}")
def update_trade(trade_id: int, payload: schemas.TradeUpdate, db_session: Session = Depends(get_db)):
    t = crud.update_trade(db_session, trade_id, payload)
    if not t:
        raise HTTPException(status_code=404, detail="Trade not found")
    return t


@app.get("/api/analytics")
def get_analytics(db_session: Session = Depends(get_db)):
    return analytics.compute_basic_stats(db_session)


@app.get("/api/export")
def export_csv(db_session: Session = Depends(get_db)):
    csv_data = crud.export_trades_csv(db_session)
    return PlainTextResponse(csv_data, media_type="text/csv")


@app.post("/api/import")
def import_csv(file: UploadFile = File(...), db_session: Session = Depends(get_db)):
    import csv
    from io import TextIOWrapper

    wrapped = TextIOWrapper(file.file, encoding="utf-8")
    reader = csv.DictReader(wrapped)
    created = 0
    for row in reader:
        try:
            trade = schemas.TradeCreate(
                trade_date=row.get("trade_date") or None,
                instrument=row.get("instrument"),
                setup_type=row.get("setup_type"),
                trade_type=row.get("trade_type"),
                entry=float(row.get("entry") or 0),
                stop_loss=float(row.get("stop_loss") or 0),
                target=float(row.get("target") or 0),
                quantity=int(row.get("quantity") or 0),
                notes=row.get("notes"),
                tags=row.get("tags"),
            )
            crud.create_trade(db_session, trade)
            created += 1
        except Exception:
            continue
    return {"imported": created}


@app.get("/")
def root():
    return {"msg": "Trading Dashboard API. See /api"}
