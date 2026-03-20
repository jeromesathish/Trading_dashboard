// Risk & Reward Calculator - app.js
// Real-time calculations, save to localStorage, simple Chart.js visualization

function $(id){ return document.getElementById(id) }

// Load saved values
function loadSaved(){
  try{
    const s = JSON.parse(localStorage.getItem('rr_calc')||'{}')
    if(s.entry) $('entry').value = s.entry
    if(s.stop) $('stop').value = s.stop
    if(s.target) $('target').value = s.target
    if(s.qty) $('qty').value = s.qty
    if(s.brokerFixed) $('brokerFixed').value = s.brokerFixed
    if(s.brokerPerc) $('brokerPerc').value = s.brokerPerc
    if(s.capital) $('capital').value = s.capital
    if(s.riskPct) $('riskPct').value = s.riskPct
    if(s.side) setSide(s.side)
  }catch(e){ }
}

function saveValues(){
  const obj = {
    entry: $('entry').value,
    stop: $('stop').value,
    target: $('target').value,
    qty: $('qty').value,
    brokerFixed: $('brokerFixed').value,
    brokerPerc: $('brokerPerc').value,
    capital: $('capital').value,
    riskPct: $('riskPct').value,
    side: currentSide
  }
  localStorage.setItem('rr_calc', JSON.stringify(obj))
  showToast('Saved locally')
}

function resetAll(){
  ['entry','stop','target','qty','brokerFixed','brokerPerc','capital','riskPct'].forEach(id=>$(id).value='')
  currentSide = 'BUY'
  setSide('BUY')
  compute()
}

let currentSide = 'BUY'
function setSide(side){
  currentSide = side
  if(side==='BUY'){
    $('buyBtn').classList.add('bg-gray-700'); $('buyBtn').classList.remove('bg-transparent')
    $('sellBtn').classList.remove('bg-gray-700'); $('sellBtn').classList.add('bg-transparent')
  }else{
    $('sellBtn').classList.add('bg-gray-700'); $('sellBtn').classList.remove('bg-transparent')
    $('buyBtn').classList.remove('bg-gray-700'); $('buyBtn').classList.add('bg-transparent')
  }
  compute()
}

function parseFloatOr0(v){ const x = parseFloat(v); return isNaN(x)?0:x }

function compute(){
  const entry = parseFloatOr0($('entry').value)
  const stop = parseFloatOr0($('stop').value)
  const target = parseFloatOr0($('target').value)
  let qty = parseInt($('qty').value) || 0
  const brokerFixed = parseFloatOr0($('brokerFixed').value)
  const brokerPerc = parseFloatOr0($('brokerPerc').value)

  // risk per unit depends on side
  let riskPerUnit = Math.abs(entry - stop)
  if(riskPerUnit===0 || qty===0){
    // attempt recommended qty if capital & riskPct provided
    const capital = parseFloatOr0($('capital').value)
    const riskPct = parseFloatOr0($('riskPct').value)
    if(capital>0 && riskPct>0 && riskPerUnit>0){
      const allowed = capital * (riskPct/100)
      qty = Math.floor(allowed / riskPerUnit)
      if(qty<=0) qty = 1
      $('qty').value = qty
    }
  }

  const grossLoss = riskPerUnit * qty
  const grossProfit = Math.abs(target - entry) * qty

  // brokerage: apply on both sides (simplified)
  const brokerPercentAmount = (brokerPerc/100) * (entry*qty + (target*qty))
  const netLoss = grossLoss + brokerFixed + brokerPercentAmount
  const netProfit = grossProfit - brokerFixed - brokerPercentAmount

  // RR
  const rr = grossLoss>0? (grossProfit / grossLoss) : 0

  $('loss').innerText = netLoss? `₹${netLoss.toFixed(2)}` : '-'
  $('profit').innerText = netProfit? `₹${netProfit.toFixed(2)}` : '-'
  $('rr').innerText = rr? `1:${rr.toFixed(2)}` : '-'

  // recommended qty (explicit)
  const capital = parseFloatOr0($('capital').value)
  const riskPct = parseFloatOr0($('riskPct').value)
  if(capital>0 && riskPct>0 && riskPerUnit>0){
    const allowed = capital * (riskPct/100)
    const rec = Math.floor(allowed / riskPerUnit) || 0
    $('recQty').innerText = rec>0? rec : '-'
  } else {
    $('recQty').innerText = '-'
  }

  updateChart(grossLoss, grossProfit)
}

// Chart.js setup
let rrChart = null
function updateChart(loss, profit){
  const ctx = $('rrChart').getContext('2d')
  const data = {
    labels:['Loss','Profit'],
    datasets:[{label:'Amount', data:[loss, profit], backgroundColor:['rgba(244,63,94,0.6)','rgba(34,197,94,0.6)']}]
  }
  if(rrChart) { rrChart.data = data; rrChart.update(); return }
  rrChart = new Chart(ctx, {type:'bar', data, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}, elements:{bar:{borderRadius:6}}, responsive:true, maintainAspectRatio:false}})
}

// wire events
;['entry','stop','target','qty','brokerFixed','brokerPerc','capital','riskPct'].forEach(id=>{
  const el = $(id)
  if(!el) return
  el.addEventListener('input', ()=>{ compute(); saveValuesDebounced() })
})

// Debounced fetch to /api/charges to auto-fill brokerage fields when possible
let chargesTimer = null
async function fetchAndApplyChargesDebounced(){
  if(chargesTimer) clearTimeout(chargesTimer)
  chargesTimer = setTimeout(fetchAndApplyCharges, 600)
}

async function fetchAndApplyCharges(){
  // only attempt if api is available and required inputs present
  const entry = parseFloatOr0($('entry').value)
  const target = parseFloatOr0($('target').value)
  let qty = parseInt($('qty').value) || 0
  if(!entry || !target || !qty) return

  // derive lots for API: backend uses lot_size=50
  const lotSize = 50
  const lots = Math.max(1, Math.floor(qty / lotSize))

  // determine buy/sell mapping depending on side
  let apiBuy = entry
  let apiSell = target
  if(currentSide === 'SELL'){
    apiBuy = target
    apiSell = entry
  }

  try{
    const res = await fetch('/api/charges', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({buy_price: apiBuy, sell_price: apiSell, lots})
    })
    if(!res.ok) return
    const j = await res.json()
    // apply brokerage (fixed) and brokerage percent (as % of turnover)
    if(j.brokerage!=null) $('brokerFixed').value = j.brokerage
    if(j.turnover && j.brokerage!=null){
      const perc = (j.brokerage / j.turnover) * 100
      $('brokerPerc').value = perc.toFixed(4)
    }
    // also update other fields if you want (e.g., display charges summary)
  }catch(err){
    // ignore (API might not be present when served as static files)
    return
  }
}

// call fetchAndApplyCharges when relevant inputs change
;['entry','target','qty'].forEach(id=>{
  const el = $(id)
  if(!el) return
  el.addEventListener('input', ()=>{ fetchAndApplyChargesDebounced() })
})

$('buyBtn').addEventListener('click', ()=>setSide('BUY'))
$('sellBtn').addEventListener('click', ()=>setSide('SELL'))
$('reset').addEventListener('click', (e)=>{ e.preventDefault(); resetAll() })
$('save').addEventListener('click', (e)=>{ e.preventDefault(); saveValues() })

// debounced save to avoid excessive localStorage writes
let saveTimer = null
function saveValuesDebounced(){ if(saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(()=>{ saveValues(); saveTimer=null }, 800) }

// keyboard-friendly: Enter moves to next input
const inputs = Array.from(document.querySelectorAll('input'))
inputs.forEach((inp,i)=> inp.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); const next = inputs[i+1]; if(next) next.focus(); else compute(); } }))

// init
loadSaved(); setSide('BUY'); compute();

// Toast helper
function showToast(msg, timeout=1500){
  const t = document.createElement('div')
  t.innerText = msg
  t.className = 'fixed right-4 bottom-4 bg-gray-800 text-gray-100 px-4 py-2 rounded shadow'
  document.body.appendChild(t)
  setTimeout(()=>{ t.remove() }, timeout)
}

// Export (save JSON file with inputs + results)
function exportToFile(){
  const payload = {
    ts: new Date().toISOString(),
    side: currentSide,
    entry: $('entry').value,
    stop: $('stop').value,
    target: $('target').value,
    qty: $('qty').value,
    brokerFixed: $('brokerFixed').value,
    brokerPerc: $('brokerPerc').value,
    capital: $('capital').value,
    riskPct: $('riskPct').value,
    results: {
      loss: $('loss').innerText,
      profit: $('profit').innerText,
      rr: $('rr').innerText,
      recQty: $('recQty').innerText
    }
  }
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], {type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rr_calc_${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  showToast('Exported to file')
}

// Wire export button
const expBtn = $('exportBtn')
if(expBtn) expBtn.addEventListener('click', (e)=>{ e.preventDefault(); exportToFile() })
