

const history = JSON.parse(localStorage.getItem("calcHistory") || "[]");

const modeBtns = document.querySelectorAll(".mode-btn");
const panels = document.querySelectorAll(".calc-panel");

modeBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    modeBtns.forEach((b) => b.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(mode).classList.add("active");
  });
});

function addToHistory(expression, result) {
  const entry = {
    expr: String(expression),
    res: String(result),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem("calcHistory", JSON.stringify(history));
  renderHistory();
}
window.addToHistory = addToHistory;

function renderHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  if (history.length === 0) {
    list.innerHTML = '<div class="empty-state">No calculations yet</div>';
    return;
  }
  list.innerHTML = history.map((h) => `
    <div class="history-item">
      <div>
        <div class="expr">${h.expr}</div>
        <div class="time">${h.time}</div>
      </div>
      <div class="res">${h.res}</div>
    </div>
  `).join("");
}

document.getElementById("clearHistory")?.addEventListener("click", () => {
  if (confirm("Clear all history?")) {
    history.length = 0;
    localStorage.removeItem("calcHistory");
    renderHistory();
  }
});

function appendValue(value) {
  const d = document.getElementById("display");
  if (d) d.value += value;
}
function clearDisplay() {
  const d = document.getElementById("display");
  if (d) d.value = "";
}
function deleteLast() {
  const d = document.getElementById("display");
  if (d) d.value = d.value.slice(0, -1);
}
function calculate() {
  const d = document.getElementById("display");
  if (!d || !d.value) return;
  try {
    const expr = d.value;
    const result = eval(expr);
    d.value = result;
    addToHistory(expr, result);
  } catch {
    d.value = "Error";
  }
}

function sciAppend(value) {
  const d = document.getElementById("sci-display");
  if (d) d.value += value;
}
function sciClear() {
  const d = document.getElementById("sci-display");
  if (d) d.value = "";
}
function sciDelete() {
  const d = document.getElementById("sci-display");
  if (d) d.value = d.value.slice(0, -1);
}
function sciFunc(fn) {
  const d = document.getElementById("sci-display");
  if (d) d.value += fn + "(";
}
function sciFactorial() {
  const d = document.getElementById("sci-display");
  if (!d || !d.value) return;
  try {
    const n = parseInt(eval(d.value));
    if (n < 0 || n > 20) { d.value = "Error"; return; }
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    d.value = res;
    addToHistory(n + "!", res);
  } catch {
    d.value = "Error";
  }
}
function sciPercent() {
  const d = document.getElementById("sci-display");
  if (d && d.value) d.value += "/100";
}
function sciReciprocal() {
  const d = document.getElementById("sci-display");
  if (!d || !d.value) return;
  try {
    const val = eval(d.value);
    if (val === 0) { d.value = "Error"; return; }
    const res = 1 / val;
    d.value = res;
    addToHistory("1/(" + val + ")", res);
  } catch {
    d.value = "Error";
  }
}
function sciCalculate() {
  const d = document.getElementById("sci-display");
  if (!d || !d.value) return;
  try {
    let expr = d.value;
    const open = (expr.match(/\(/g) || []).length;
    const close = (expr.match(/\)/g) || []).length;
    expr += ")".repeat(Math.max(0, open - close));
    const result = eval(expr);
    d.value = result;
    addToHistory(expr, result);
  } catch {
    d.value = "Error";
  }
}

const units = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, ton: 1000 },
  temperature: { C: "c", F: "f", K: "k" },
  volume: { L: 1, mL: 0.001, gal: 3.78541, qt: 0.946353, cup: 0.236588 },
  area: { "m²": 1, "km²": 1000000, "ft²": 0.092903, "in²": 0.00064516, acre: 4046.86, ha: 10000 },
};

const unitCategory = document.getElementById("unitCategory");
const unitFrom = document.getElementById("unitFrom");
const unitTo = document.getElementById("unitTo");
const unitFromValue = document.getElementById("unitFromValue");
const unitToValue = document.getElementById("unitToValue");

function populateUnits() {
  if (!unitCategory) return;
  const cat = unitCategory.value;
  const opts = Object.keys(units[cat]);
  unitFrom.innerHTML = opts.map((u) => `<option value="${u}">${u}</option>`).join("");
  unitTo.innerHTML = opts.map((u) => `<option value="${u}">${u}</option>`).join("");
  convertUnits();
}
function convertUnits() {
  if (!unitCategory) return;
  const cat = unitCategory.value;
  const from = unitFrom.value;
  const to = unitTo.value;
  const val = parseFloat(unitFromValue.value) || 0;
  if (cat === "temperature") {
    unitToValue.value = convertTemp(val, from, to).toFixed(4);
    return;
  }
  const base = val * units[cat][from];
  const result = base / units[cat][to];
  unitToValue.value = result.toFixed(6).replace(/\.?0+$/, "");
}
function convertTemp(val, from, to) {
  let c = from === "C" ? val : from === "F" ? ((val - 32) * 5) / 9 : val - 273.15;
  return to === "C" ? c : to === "F" ? (c * 9) / 5 + 32 : c + 273.15;
}
unitCategory?.addEventListener("change", populateUnits);
unitFrom?.addEventListener("change", convertUnits);
unitTo?.addEventListener("change", convertUnits);
unitFromValue?.addEventListener("input", convertUnits);
document.getElementById("swapUnits")?.addEventListener("click", () => {
  const tmp = unitFrom.value;
  unitFrom.value = unitTo.value;
  unitTo.value = tmp;
  convertUnits();
});

document.querySelectorAll(".calc-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;
    if (type === "of") {
      const x = parseFloat(document.getElementById("percentOfX").value) || 0;
      const y = parseFloat(document.getElementById("percentOfY").value) || 0;
      document.getElementById("resultOf").textContent = ((x / 100) * y).toFixed(4);
    } else if (type === "what") {
      const y = parseFloat(document.getElementById("whatPercentY").value) || 0;
      const x = parseFloat(document.getElementById("whatPercentX").value) || 0;
      document.getElementById("resultWhat").textContent = x === 0 ? "—" : ((y / x) * 100).toFixed(2) + "%";
    } else if (type === "change") {
      const val = parseFloat(document.getElementById("changeValue").value) || 0;
      const pct = parseFloat(document.getElementById("changePercent").value) || 0;
      const t = document.getElementById("changeType").value;
      const result = t === "increase" ? val * (1 + pct / 100) : val * (1 - pct / 100);
      document.getElementById("resultChange").textContent = result.toFixed(4);
    }
  });
});

const rates = { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1550, JPY: 149, CAD: 1.36, AUD: 1.52, INR: 83, CNY: 7.24, ZAR: 18.2 };
const currencyFrom = document.getElementById("currencyFrom");
const currencyTo = document.getElementById("currencyTo");
const currencyAmount = document.getElementById("currencyAmount");
const customRate = document.getElementById("customRate");
const currencyResult = document.getElementById("currencyResult");

function populateCurrencies() {
  if (!currencyFrom) return;
  const opts = Object.keys(rates).map((c) => `<option value="${c}">${c}</option>`).join("");
  currencyFrom.innerHTML = opts;
  currencyTo.innerHTML = opts;
  currencyTo.value = "NGN";
  convertCurrency();
}
function convertCurrency() {
  if (!currencyAmount) return;
  const amount = parseFloat(currencyAmount.value) || 0;
  const from = currencyFrom.value;
  const to = currencyTo.value;
  const custom = parseFloat(customRate.value);
  let result = custom && custom > 0 ? amount * custom : (amount / rates[from]) * rates[to];
  currencyResult.textContent = `${amount} ${from} = ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`;
}
currencyFrom?.addEventListener("change", convertCurrency);
currencyTo?.addEventListener("change", convertCurrency);
currencyAmount?.addEventListener("input", convertCurrency);
customRate?.addEventListener("input", convertCurrency);
document.getElementById("swapCurrency")?.addEventListener("click", () => {
  const tmp = currencyFrom.value;
  currencyFrom.value = currencyTo.value;
  currencyTo.value = tmp;
  convertCurrency();
});

function adaptScrollHeight() {
  const page = document.querySelector(".calc-page");
  const content = document.querySelector(".calc-content");
  if (!page || !content) return;
  const rect = page.getBoundingClientRect();
  const available = window.innerHeight - rect.top - 16;
  page.style.height = available + "px";
  page.style.maxHeight = available + "px";
}

document.addEventListener("DOMContentLoaded", () => {
  populateUnits();
  populateCurrencies();
  renderHistory();
  adaptScrollHeight();
});
window.addEventListener("resize", adaptScrollHeight);
window.addEventListener("orientationchange", adaptScrollHeight);