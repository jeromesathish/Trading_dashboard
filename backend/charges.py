"""
Zerodha Nifty Options charge calculator.

Provides function to compute brokerage and statutory charges for Nifty options
round-trip trades. All values returned are in INR.
"""

def zerodha_nifty_options_charges(buy_price: float, sell_price: float, lots: int):
    """Calculate charges for a round-trip Nifty options trade.

    Parameters:
    - buy_price: price at which option was bought (per unit)
    - sell_price: price at which option was sold (per unit)
    - lots: number of lots traded

    Returns a dict with a detailed breakdown and the `total` rounded to 2 decimals.
    """
    lot_size = 50  # Nifty lot size
    quantity = int(lots) * lot_size

    # Turnover
    buy_value = float(buy_price) * quantity
    sell_value = float(sell_price) * quantity
    turnover = buy_value + sell_value

    # 1. Brokerage (₹20 per order → ₹40 round trip)
    brokerage = 40.0

    # 2. STT (0.1% on SELL side)
    stt = sell_value * 0.001

    # 3. Transaction Charges (0.03553%)
    transaction_charges = turnover * 0.0003553

    # 4. SEBI Charges (₹10 per crore) => 10/10000000 = 0.000001
    sebi = turnover * 0.000001

    # 5. GST (18% on brokerage + transaction + SEBI)
    gst = 0.18 * (brokerage + transaction_charges + sebi)

    # 6. Stamp Duty (0.003% on BUY side) -- note: 0.003% = 0.00003
    stamp = buy_value * 0.00003

    total_charges = (
        brokerage +
        stt +
        transaction_charges +
        sebi +
        gst +
        stamp
    )

    return {
        "lot_size": lot_size,
        "quantity": quantity,
        "buy_value": round(buy_value, 2),
        "sell_value": round(sell_value, 2),
        "turnover": round(turnover, 2),
        "brokerage": round(brokerage, 2),
        "stt": round(stt, 2),
        "transaction_charges": round(transaction_charges, 2),
        "sebi": round(sebi, 2),
        "gst": round(gst, 2),
        "stamp": round(stamp, 2),
        "total": round(total_charges, 2),
    }
