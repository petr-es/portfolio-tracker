function drawDonut(groupId, segments) {
  const g = document.getElementById(groupId);
  const cx = 80, cy = 80, r = 60, sw = 22;
  const tot = segments.reduce((a, s) => a + s.value, 0);
  let angle = -Math.PI / 2;
  segments.forEach(seg => {
    const span = seg.value / tot * 2 * Math.PI;
    const endAngle = angle + span;
    const gap = 0.025;
    const a1 = angle + gap, a2 = endAngle - gap;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', seg.color);
    path.setAttribute('stroke-width', sw);
    path.setAttribute('stroke-linecap', 'round');
    g.appendChild(path);
    angle = endAngle;
  });
}

function fillTable(tbodyId, rows) {
  const tb = document.getElementById(tbodyId);
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="dot" style="background:${r.color}"></span>${r.label}</td>
      <td class="pct">${r.pct}%</td>
      <td class="val">${r.val}</td>
      <td class="units">${r.units}</td>
    `;
    tb.appendChild(tr);
  });
}

function fillPricesTable(rows) {
  const tb = document.getElementById('tbl-prices');
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="dot" style="background:${r.color}"></span>${r.label}</td>
      <td class="dim">${r.price}</td>
      <td class="dim">${r.rate}</td>
      <td class="units">${r.pxczk}</td>
      <td class="units">${r.units}</td>
      <td class="val">${r.val}</td>
    `;
    tb.appendChild(tr);
  });
}

function fmt(n, dec = 2) {
  const s = n.toFixed(dec);
  return LANG.locale === 'cs' ? s.replace('.', ',') : s;
}

function render(d) {
  const EUR_CZK = d.rates.EUR_CZK;
  const USD_CZK = d.rates.USD_CZK;
  const FWRA_PX = d.prices.FWRA_EUR * EUR_CZK;
  const SPYY_PX = d.prices.SPYY_EUR * EUR_CZK;
  const S_PX    = d.prices.S_USD    * USD_CZK;

  const fwra_total = (d.holdings.fwra.t212   || 0) + (d.holdings.fwra.ibkr || 0) + (d.holdings.fwra.rev || 0);
  const spyy_total =  d.holdings.spyy.t212   || 0;
  const s_ibkr     =  d.holdings.s.ibkr      || 0;
  const s_etrade   =  d.holdings.s.etrade    || 0;
  const s_total    =  s_ibkr + s_etrade;

  const vFWRA  = fwra_total * FWRA_PX / 1000;
  const vSPYY  = spyy_total * SPYY_PX / 1000;
  const vS     = s_total    * S_PX    / 1000;
  const vAlpha = d.holdings.alpha_fixed_czk;
  const total  = vFWRA + vSPYY + vS + vAlpha;

  const bT212   = (d.holdings.fwra.t212 || 0) * FWRA_PX / 1000 + vSPYY + vAlpha;
  const bIBKR   = (d.holdings.fwra.ibkr || 0) * FWRA_PX / 1000 + s_ibkr * S_PX / 1000;
  const bRev    = (d.holdings.fwra.rev  || 0) * FWRA_PX / 1000;
  const bEtrade = s_etrade * S_PX / 1000;

  // ── Header ──────────────────────────────────────────────────────────────────
  document.getElementById('header-date').textContent = `${d.date} ${d.updated.split(' ').pop()}`;
  document.title = `Portfolio – ${d.date}`;
  document.getElementById('header-meta').innerHTML =
    `FWRA.MI €${fmt(d.prices.FWRA_EUR)} · SPYY.DE €${fmt(d.prices.SPYY_EUR)} · S $${fmt(d.prices.S_USD)}<br>` +
    `EUR/CZK ${fmt(EUR_CZK)} · USD/CZK ${fmt(USD_CZK)}`;

  // ── Donut: aktiva ────────────────────────────────────────────────────────────
  drawDonut('donut-assets', [
    { value: vFWRA,  color: 'var(--fwra)'  },
    { value: vSPYY,  color: 'var(--spyy)'  },
    { value: vAlpha, color: 'var(--alpha)' },
    { value: vS,     color: 'var(--s)'     },
  ]);

  fillTable('tbl-assets', [
    { color:'var(--fwra)',  label:'FWRA',  pct:(vFWRA /total*100).toFixed(1), val:Math.round(vFWRA).toLocaleString(LANG.locale),  units:fwra_total.toLocaleString(LANG.locale)+' '+LANG.unitsSuffix },
    { color:'var(--spyy)',  label:'SPYY',  pct:(vSPYY /total*100).toFixed(1), val:Math.round(vSPYY).toLocaleString(LANG.locale),  units:spyy_total+' '+LANG.unitsSuffix },
    { color:'var(--alpha)', label:'Alpha', pct:(vAlpha/total*100).toFixed(1), val:Math.round(vAlpha).toLocaleString(LANG.locale), units:'–' },
    { color:'var(--s)',     label:'S',     pct:(vS    /total*100).toFixed(1), val:Math.round(vS).toLocaleString(LANG.locale),     units:s_total.toLocaleString(LANG.locale)+' '+LANG.unitsSuffix },
  ]);

  // ── Donut: brokeři ───────────────────────────────────────────────────────────
  drawDonut('donut-brokers', [
    { value: bT212,   color: 'var(--t212)'   },
    { value: bIBKR,   color: 'var(--ibkr)'   },
    { value: bRev,    color: 'var(--rev)'    },
    { value: bEtrade, color: 'var(--etrade)' },
  ]);

  fillTable('tbl-brokers', [
    { color:'var(--t212)',   label:'T212',    pct:(bT212  /total*100).toFixed(1), val:Math.round(bT212).toLocaleString(LANG.locale),   units:'' },
    { color:'var(--ibkr)',   label:'IBKR',    pct:(bIBKR  /total*100).toFixed(1), val:Math.round(bIBKR).toLocaleString(LANG.locale),   units:'' },
    { color:'var(--rev)',    label:'Revolut', pct:(bRev   /total*100).toFixed(1), val:Math.round(bRev).toLocaleString(LANG.locale),    units:'' },
    { color:'var(--etrade)', label:'E-Trade', pct:(bEtrade/total*100).toFixed(1), val:Math.round(bEtrade).toLocaleString(LANG.locale), units:'' },
  ]);

  // ── Tabulka vstupních hodnot ─────────────────────────────────────────────────
  fillPricesTable([
    {
      color:'var(--fwra)',  label:'FWRA',
      price:`€${fmt(d.prices.FWRA_EUR)}`, rate:`${fmt(EUR_CZK)} CZK`,
      pxczk:`${fmt(FWRA_PX, 1)} ${LANG.currency}`,
      units:fwra_total.toLocaleString(LANG.locale),
      val:Math.round(vFWRA * 1000).toLocaleString(LANG.locale) + ' ' + LANG.currency,
    },
    {
      color:'var(--spyy)',  label:'SPYY',
      price:`€${fmt(d.prices.SPYY_EUR)}`, rate:`${fmt(EUR_CZK)} CZK`,
      pxczk:`${fmt(SPYY_PX, 0)} ${LANG.currency}`,
      units:spyy_total.toLocaleString(LANG.locale),
      val:Math.round(vSPYY * 1000).toLocaleString(LANG.locale) + ' ' + LANG.currency,
    },
    {
      color:'var(--s)',     label:'S',
      price:`$${fmt(d.prices.S_USD)}`, rate:`${fmt(USD_CZK)} CZK`,
      pxczk:`${fmt(S_PX, 1)} ${LANG.currency}`,
      units:s_total.toLocaleString(LANG.locale),
      val:Math.round(vS * 1000).toLocaleString(LANG.locale) + ' ' + LANG.currency,
    },
    {
      color:'var(--alpha)', label:'Alpha Picks',
      price:LANG.fixed, rate:'–', pxczk:'–', units:'–',
      val:Math.round(vAlpha * 1000).toLocaleString(LANG.locale) + ' ' + LANG.currency,
    },
  ]);

  // ── Totály ───────────────────────────────────────────────────────────────────
  const totalMil = (total / 1000).toLocaleString(LANG.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalKc  = Math.round(total * 1000).toLocaleString(LANG.locale);
  document.getElementById('center-assets').textContent  = totalMil + ' ' + LANG.million;
  document.getElementById('center-brokers').textContent = totalMil + ' ' + LANG.million;
  document.querySelector('.total').textContent = totalKc + ' ' + LANG.currency;

  // ── Footnote ─────────────────────────────────────────────────────────────────
  document.getElementById('footnote').innerHTML = LANG.footnote(d.date);
}

render(DATA);
