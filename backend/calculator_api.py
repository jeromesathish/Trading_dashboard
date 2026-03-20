from fastapi import FastAPI
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
import uvicorn
from pathlib import Path
from .charges import zerodha_nifty_options_charges
from pydantic import BaseModel

app = FastAPI(title="Risk & Reward Calculator")

# Serve the calculator frontend directory
frontend_dir = Path(__file__).resolve().parent.parent / "calculator"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="calculator")


@app.get("/api/ping")
def ping():
    return {"msg": "pong"}


class ChargesRequest(BaseModel):
    buy_price: float
    sell_price: float
    lots: int


@app.post("/api/charges")
def calc_charges(payload: ChargesRequest):
    try:
        result = zerodha_nifty_options_charges(payload.buy_price, payload.sell_price, payload.lots)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=9000, reload=True)
