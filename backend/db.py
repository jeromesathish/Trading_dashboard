from datetime import datetime, date
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date, Text
from sqlalchemy.orm import sessionmaker, declarative_base
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "trading.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Trade(Base):
    __tablename__ = "trades"
    id = Column(Integer, primary_key=True, index=True)
    trade_date = Column(Date, default=date.today, index=True)
    instrument = Column(String, index=True)
    setup_type = Column(String, index=True)
    trade_type = Column(String)  # BUY or SELL
    entry = Column(Float)
    stop_loss = Column(Float)
    target = Column(Float)
    quantity = Column(Integer)
    exit_price = Column(Float, nullable=True)
    result = Column(String, nullable=True)  # Win/Loss/Breakeven
    pnl = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    tags = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    capital = Column(Float, default=100000.0)
    risk_per_trade_pct = Column(Float, default=2.0)
    max_daily_loss_pct = Column(Float, default=5.0)
    default_quantity = Column(Integer, default=0)


def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # create default settings if not present
    if db.query(Setting).count() == 0:
        s = Setting()
        db.add(s)
        db.commit()
    db.close()


if __name__ == "__main__":
    init_db()
