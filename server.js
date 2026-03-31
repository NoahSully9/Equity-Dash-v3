const express = require("express");
const path    = require("path");

const app     = express();
const PORT    = process.env.PORT || 3000;
const TD_KEY  = process.env.TD_API_KEY;
const TD_BASE = "https://api.twelvedata.com";

if(!TD_KEY) console.warn("WARNING: TD_API_KEY not set");

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/quote", async (req, res) => {
  const { symbols } = req.query;
  if(!symbols) return res.status(400).json({error:"symbols required"});
  try {
    const url = `${TD_BASE}/quote?symbol=${encodeURIComponent(symbols)}&apikey=${TD_KEY}`;
    const r = await fetch(url);
    const data = await r.json();
    if(data.symbol){ const o={}; o[data.symbol]=data; return res.json(o); }
    res.json(data);
  } catch(e){ res.status(500).json({error:e.message}); }
});

app.get("/api/daily/:symbol", async (req, res) => {
  try {
    const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=1day&outputsize=12&apikey=${TD_KEY}`;
    const r = await fetch(url);
    res.json(await r.json());
  } catch(e){ res.json({values:[]}); }
});

app.get("/api/intraday/:symbol", async (req, res) => {
  try {
    const url = `${TD_BASE}/time_series?symbol=${encodeURIComponent(req.params.symbol)}&interval=5min&outputsize=80&apikey=${TD_KEY}`;
    const r = await fetch(url);
    res.json(await r.json());
  } catch(e){ res.json({values:[]}); }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`Running on ${PORT}`));
