async function loadSettings(){
  const res = await fetch(`${API}/settings`)
  return res.json()
}

function showMessage(msg, err=false){
  alert(msg)
}

async function showDashboard(){
  const container = document.getElementById('app')
  container.innerHTML = `
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="p-4 bg-gray-800 rounded">Total trades: <span id="total">-</span></div>
      <div class="p-4 bg-gray-800 rounded">Win rate: <span id="winrate">-</span></div>
      <div class="p-4 bg-gray-800 rounded">P&L: <span id="pnl">-</span></div>
    </div>
    <canvas id="equity" height="100"></canvas>
  `
  const res = await fetch(`${API}/analytics`)
  const data = await res.json()
  document.getElementById('total').innerText = data.total_trades
  document.getElementById('winrate').innerText = data.win_rate + '%'
  document.getElementById('pnl').innerText = data.pnl_total

  const ctx = document.getElementById('equity').getContext('2d')
  const labels = data.equity_curve.map(x=>x.date)
  const vals = data.equity_curve.map(x=>x.cum)
  new Chart(ctx, {type:'line', data:{labels, datasets:[{label:'Equity', data:vals, borderColor:'#60A5FA', backgroundColor:'rgba(96,165,250,0.1)'}]}})
}

function showNewTrade(){
  const container = document.getElementById('app')
  container.innerHTML = `
  <div class="p-4 bg-gray-800 rounded max-w-lg">
    <h2 class="text-xl mb-4">New Trade</h2>
    <form id="tradeForm" class="space-y-2">
      <div><input name="instrument" placeholder="Instrument" class="w-full p-2 bg-gray-900" required></div>
      <div class="grid grid-cols-3 gap-2">
        <input name="trade_type" placeholder="BUY/SELL" class="p-2 bg-gray-900" required>
        <input name="entry" placeholder="Entry" class="p-2 bg-gray-900" required>
        <input name="stop_loss" placeholder="Stop Loss" class="p-2 bg-gray-900" required>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input name="target" placeholder="Target" class="p-2 bg-gray-900">
        <input id="new-quantity" name="quantity" placeholder="Quantity" type="number" class="p-2 bg-gray-900">
      </div>
      <div><textarea name="notes" placeholder="Notes" class="w-full p-2 bg-gray-900"></textarea></div>
      <div><button class="btn" type="submit">Plan Trade</button></div>
    </form>
  </div>
  `

  document.getElementById('tradeForm').addEventListener('submit', async (e)=>{
    e.preventDefault()
    const form = new FormData(e.target)
    const payload = {
      instrument: form.get('instrument'),
      trade_type: form.get('trade_type'),
      entry: parseFloat(form.get('entry')),
      stop_loss: parseFloat(form.get('stop_loss')),
      target: parseFloat(form.get('target')||0),
      quantity: parseInt(form.get('quantity')||0),
      notes: form.get('notes')
    }

    // Pre-trade calculation (client-side)
    const settings = await loadSettings()
    const capital = settings.capital
    const risk_amount = Math.abs(payload.entry - payload.stop_loss) * payload.quantity
    const risk_pct = (risk_amount / capital) * 100
    if(risk_pct > settings.risk_per_trade_pct){
      showMessage(`Risk ${risk_pct.toFixed(2)}% exceeds allowed ${settings.risk_per_trade_pct}%`, true)
      return
    }

    // Confirmation
    const ok = confirm(`You are risking ₹${risk_amount.toFixed(2)} (${risk_pct.toFixed(2)}% of capital).\nIf SL hits → Loss ₹${risk_amount.toFixed(2)}.\nIf target hits → Profit depends on target.\n\nType OK to accept this risk.`)
    if(!ok) return

    const res = await fetch(`${API}/trades`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
    if(res.ok){
      showMessage('Trade saved')
    }else{
      const err = await res.json()
      showMessage(err.detail||'Error', true)
    }
  })
}

// Quick Trade: minimal inputs and auto-quantity calculation
async function showQuickTrade(){
  const container = document.getElementById('app')
  container.innerHTML = `
  <div class="p-4 bg-gray-800 rounded max-w-md">
    <h2 class="text-xl mb-4">Quick Trade</h2>
    <form id="quickForm" class="space-y-2">
      <div><input name="instrument" placeholder="Instrument" class="w-full p-2 bg-gray-900" required></div>
      <div class="grid grid-cols-3 gap-2">
        <select name="trade_type" class="p-2 bg-gray-900">
          <option>BUY</option>
          <option>SELL</option>
        </select>
        <input name="entry" id="quick-entry" placeholder="Entry" class="p-2 bg-gray-900" required>
        <input name="stop_loss" id="quick-stop" placeholder="Stop Loss" class="p-2 bg-gray-900" required>
      </div>
      <div class="flex items-center gap-2">
        <input id="autoQty" type="checkbox" checked>
        <label for="autoQty">Auto quantity (calculate from allowed risk)</label>
      </div>
      <div><input id="quick-qty" name="quantity" placeholder="Quantity (auto)" type="number" class="w-full p-2 bg-gray-900"></div>
      <div><button class="btn" type="submit">Save Quick Trade</button></div>
    </form>
  </div>
  `

  const settings = await loadSettings()
  const autoQtyEl = document.getElementById('autoQty')
  const qtyEl = document.getElementById('quick-qty')

  function computeAutoQty(){
    const entry = parseFloat(document.getElementById('quick-entry').value || 0)
    const stop = parseFloat(document.getElementById('quick-stop').value || 0)
    const diff = Math.abs(entry - stop)
    if(!diff) return
    const allowedRiskAmount = (settings.capital * (settings.risk_per_trade_pct/100))
    const qty = Math.floor(allowedRiskAmount / diff)
    qtyEl.value = qty > 0 ? qty : settings.default_quantity || 1
  }

  document.getElementById('quick-entry').addEventListener('input', ()=>{ if(autoQtyEl.checked) computeAutoQty() })
  document.getElementById('quick-stop').addEventListener('input', ()=>{ if(autoQtyEl.checked) computeAutoQty() })

  document.getElementById('quickForm').addEventListener('submit', async (e)=>{
    e.preventDefault()
    const f = new FormData(e.target)
    const payload = {
      instrument: f.get('instrument'),
      trade_type: f.get('trade_type'),
      entry: parseFloat(f.get('entry')),
      stop_loss: parseFloat(f.get('stop_loss')),
      target: parseFloat(0),
      quantity: parseInt(f.get('quantity')|| settings.default_quantity || 1),
      notes: 'Quick trade'
    }

    const res = await fetch(`${API}/trades`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
    if(res.ok){ showMessage('Quick trade saved'); showHistory() }
    else { const err = await res.json(); showMessage(err.detail||'Error', true) }
  })
}

document.getElementById('nav-quick').addEventListener('click', showQuickTrade)

async function showHistory(){
  const container = document.getElementById('app')
  container.innerHTML = `<div id="list"></div>`
  const res = await fetch(`${API}/trades`)
  const data = await res.json()
  const list = document.getElementById('list')
  list.innerHTML = data.map(t=>`<div class="p-2 bg-gray-800 rounded mb-2">${t.trade_date} | ${t.instrument} | ${t.trade_type} | P&L: ${t.pnl||0}</div>`).join('')
}

async function showSettings(){
  const container = document.getElementById('app')
  const s = await loadSettings()
  container.innerHTML = `
    <div class="p-4 bg-gray-800 rounded max-w-lg">
      <h2 class="text-xl mb-4">Settings</h2>
      <form id="settingsForm" class="space-y-2">
        <input name="capital" value="${s.capital}" class="w-full p-2 bg-gray-900">
        <input name="riskPct" value="${s.risk_per_trade_pct}" class="w-full p-2 bg-gray-900">
        <input name="maxDailyLossPct" value="${s.max_daily_loss_pct}" class="w-full p-2 bg-gray-900">
        <input name="defaultQty" value="${s.default_quantity}" class="w-full p-2 bg-gray-900">
        <div><button class="btn" type="submit">Save</button></div>
      </form>
    </div>
  `
  document.getElementById('settingsForm').addEventListener('submit', async (e)=>{
    e.preventDefault()
    const f = new FormData(e.target)
    const payload = {capital: parseFloat(f.get('capital')), riskPct: parseFloat(f.get('riskPct')), maxDailyLossPct: parseFloat(f.get('maxDailyLossPct')), defaultQty: parseInt(f.get('defaultQty'))}
    const res = await fetch(`${API}/settings`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
    if(res.ok) showMessage('Saved')
    else showMessage('Error', true)
  })
}

document.getElementById('nav-dashboard').addEventListener('click', showDashboard)
document.getElementById('nav-newtrade').addEventListener('click', showNewTrade)
document.getElementById('nav-history').addEventListener('click', showHistory)
document.getElementById('nav-settings').addEventListener('click', showSettings)

// P&L page
async function showPL(){
  const container = document.getElementById('app')
  container.innerHTML = `
    <div class="mb-4">
      <h2 class="text-xl">Profit & Loss</h2>
      <div class="grid grid-cols-3 gap-4 mt-2">
        <div class="p-4 bg-gray-800 rounded">Total P&L: <span id="pl-total">-</span></div>
        <div class="p-4 bg-gray-800 rounded">Largest Win: <span id="pl-win">-</span></div>
        <div class="p-4 bg-gray-800 rounded">Largest Loss: <span id="pl-loss">-</span></div>
      </div>
    </div>
    <canvas id="pnlChart" height="100"></canvas>
    <div id="pl-table" class="mt-4"></div>
  `

  const res = await fetch(`${API}/analytics`)
  const data = await res.json()
  document.getElementById('pl-total').innerText = data.pnl_total
  document.getElementById('pl-win').innerText = data.largest_win
  document.getElementById('pl-loss').innerText = data.largest_loss

  const labels = data.equity_curve.map(x=>x.date)
  const daily = data.equity_curve.map(x=>x.daily)
  const ctx = document.getElementById('pnlChart').getContext('2d')
  new Chart(ctx, {type:'bar', data:{labels, datasets:[{label:'Daily P&L', data:daily, backgroundColor: daily.map(v=> v>=0? 'rgba(34,197,94,0.6)':'rgba(244,63,94,0.6)')}]}, options:{scales:{y:{beginAtZero:true}}}})

  // table
  const table = document.getElementById('pl-table')
  table.innerHTML = `
    <div class="bg-gray-800 p-2 rounded">
      <div class="grid grid-cols-3 font-semibold p-2"> <div>Date</div><div>Daily P&L</div><div>Cumulative</div></div>
      ${data.equity_curve.map(e=>`<div class="grid grid-cols-3 p-2 border-t border-gray-700"><div>${e.date}</div><div>${e.daily.toFixed(2)}</div><div>${e.cum.toFixed(2)}</div></div>`).join('')}
    </div>
  `
}

document.getElementById('nav-pl').addEventListener('click', showPL)

// initial
showDashboard()
