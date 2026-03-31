const express = require("express");
const fetch   = require("node-fetch");
const path    = require("path");

const app     = express();
const PORT    = process.env.PORT || 3000;
const TD_KEY  = process.env.TD_API_KEY;
const TD_BASE = "https://api.twelvedata.com";

if(!TD_KEY) console.warn("WARNING: TD_API_KEY environment variable not set");

app.use(express.static(path.join(__dirname, "public")));

// Batch quote — single API call for all symbols, counts as 1 credit
app.get("/api/quote", async (req, res) => {
  const { symbols } = req.query;
  if(!symbols) return res.status(400).json({error: "symbols required"});
  try {
    const r = await fetch(`${TD_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`);
    const data = await r.json();
    // If single symbol TD returns object directly — normalize to {SYM: data}
    const symList = symbols.split(",").map(s => s.trim());
    if(symList.length === 1){
      const result = {}; result[symList[0]] = data; return res.json(result);
    }
    res.json(data);
  } catch(e) {
    console.error("Quote error:", e.message);
    res.status(500).json({error: e.message});
  }
});

// Daily bars for avg volume — returns empty values array on any failure
app.get("/api/daily/:symbol", async (req, res) => {
  try {
    const r = await fetch(`${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=1day&outputsize=12&apikey=${TD_KEY}`);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error("Daily error:", e.message);
    res.json({values: []});
  }
});

// Intraday 5-min chart
app.get("/api/intraday/:symbol", async (req, res) => {
  try {
    const r = await fetch(`${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=5min&outputsize=80&apikey=${TD_KEY}`);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error("Intraday error:", e.message);
    res.json({values: []});
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`Equity Dashboard running on port ${PORT}`));
