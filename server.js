const express  = require("express");
const fetch    = require("node-fetch");
const path     = require("path");

const app      = express();
const PORT     = process.env.PORT || 3000;
const TD_KEY   = process.env.TD_API_KEY;
const TD_BASE  = "https://api.twelvedata.com";

if(!TD_KEY) console.warn("WARNING: TD_API_KEY environment variable not set");

// Serve everything in /public
app.use(express.static(path.join(__dirname, "public")));

// ── API proxy routes ──

// Batch quote: GET /api/quote?symbols=IONQ,BRZE,SERV
app.get("/api/quote", async (req, res) => {
  const { symbols } = req.query;
  if(!symbols) return res.status(400).json({ error: "symbols query param required" });
  try {
    const symList = symbols.split(",");
    // Fetch each symbol individually and return as {SYM: data} object
    // This avoids Twelve Data's inconsistent single vs batch response shape
    const results = {};
    for(const sym of symList){
      const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(sym.trim())}&apikey=${TD_KEY}`;
      const r   = await fetch(url);
      const data = await r.json();
      results[sym.trim()] = data;
    }
    res.json(results);
  } catch(e) {
    console.error("Quote fetch error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Daily time series: GET /api/daily/IONQ
app.get("/api/daily/:symbol", async (req, res) => {
  try {
    const url  = `${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=1day&outputsize=12&apikey=${TD_KEY}`;
    const r    = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error("Daily fetch error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Intraday 5-min chart: GET /api/intraday/IONQ
app.get("/api/intraday/:symbol", async (req, res) => {
  try {
    const url  = `${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=5min&outputsize=80&apikey=${TD_KEY}`;
    const r    = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error("Intraday fetch error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// Fallback — serve index.html for any unmatched route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Equity Dashboard running on port ${PORT}`);
});
