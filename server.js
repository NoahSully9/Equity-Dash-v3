const express = require("express");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/health", (req, res) => res.status(200).send("OK"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Yahoo Finance headers — mimic a browser request
const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

// Quote: GET /api/quote?symbols=SI,IONQ,BRZE
app.get("/api/quote", async (req, res) => {
  const { symbols } = req.query;
  if(!symbols) return res.status(400).json({error:"symbols required"});
  try {
    const symList = symbols.split(",").map(s => s.trim()).filter(Boolean);
    const results = {};
    await Promise.all(symList.map(async sym => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
        const r = await fetch(url, {headers: YF_HEADERS});
        const data = await r.json();
        const q = data?.chart?.result?.[0];
        if(!q) return;
        const meta = q.meta;
        results[sym] = {
          symbol:           sym,
          price:            meta.regularMarketPrice,
          previousClose:    meta.chartPreviousClose || meta.previousClose,
          changePercent:    meta.regularMarketPrice && (meta.chartPreviousClose || meta.previousClose)
                              ? ((meta.regularMarketPrice - (meta.chartPreviousClose || meta.previousClose)) / (meta.chartPreviousClose || meta.previousClose)) * 100
                              : null,
          dayHigh:          meta.regularMarketDayHigh,
          dayLow:           meta.regularMarketDayLow,
          volume:           meta.regularMarketVolume,
          week52High:       meta.fiftyTwoWeekHigh,
          week52Low:        meta.fiftyTwoWeekLow,
        };
      } catch(e) {
        console.error(`Quote error for ${sym}:`, e.message);
      }
    }));
    res.json(results);
  } catch(e) {
    console.error("Quote batch error:", e.message);
    res.status(500).json({error: e.message});
  }
});

// Daily bars for avg volume: GET /api/daily/IONQ
app.get("/api/daily/:symbol", async (req, res) => {
  try {
    const sym = req.params.symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1mo`;
    const r = await fetch(url, {headers: YF_HEADERS});
    const data = await r.json();
    const q = data?.chart?.result?.[0];
    if(!q) return res.json({values:[]});
    const timestamps = q.timestamps || q.timestamp || [];
    const closes     = q.indicators?.quote?.[0]?.close || [];
    const volumes    = q.indicators?.quote?.[0]?.volume || [];
    const values = timestamps.map((t, i) => ({
      datetime: new Date(t * 1000).toISOString(),
      close:    closes[i],
      volume:   volumes[i],
    })).filter(b => b.close != null);
    res.json({values});
  } catch(e) {
    console.error("Daily error:", e.message);
    res.json({values:[]});
  }
});

// Intraday chart: GET /api/intraday/IONQ
app.get("/api/intraday/:symbol", async (req, res) => {
  try {
    const sym = req.params.symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=5m&range=1d`;
    const r = await fetch(url, {headers: YF_HEADERS});
    const data = await r.json();
    const q = data?.chart?.result?.[0];
    if(!q) return res.json({values:[]});
    const timestamps = q.timestamps || q.timestamp || [];
    const closes     = q.indicators?.quote?.[0]?.close || [];
    const values = timestamps.map((t, i) => ({
      datetime: new Date(t * 1000).toISOString(),
      close:    closes[i],
    })).filter(b => b.close != null);
    res.json({values});
  } catch(e) {
    console.error("Intraday error:", e.message);
    res.json({values:[]});
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => console.log(`Running on ${PORT}`));
