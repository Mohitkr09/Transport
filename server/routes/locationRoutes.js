const express = require("express");
const router = express.Router();
const axios = require("axios");
const NodeCache = require("node-cache");
const rateLimit = require("express-rate-limit");

/* ======================================================
CACHE (5 MIN)
====================================================== */

const cache = new NodeCache({ stdTTL: 300 });

/* ======================================================
RATE LIMIT (ANTI ABUSE)
====================================================== */

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many requests. Slow down."
  }
});

router.use(limiter);

/* ======================================================
AXIOS INSTANCE (NOMINATIM)
====================================================== */

const nominatim = axios.create({
  baseURL: "https://nominatim.openstreetmap.org",
  timeout: 8000,
  headers: {
    "User-Agent": "TransportX/1.0 (contact@transportx.com)"
  }
});

/* ======================================================
SEARCH LOCATION
GET /api/location/search?q=patna
====================================================== */

router.get("/search", async (req, res) => {
  try {
    const { q, country } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Query must be at least 2 characters"
      });
    }

    const cacheKey = `search:${q}:${country || "all"}`;
    const cached = cache.get(cacheKey);

    if (cached) return res.json(cached);

    const { data } = await nominatim.get("/search", {
      params: {
        q,
        format: "json",
        limit: 5,
        addressdetails: 1,
        countrycodes: country || undefined
      }
    });

    const formatted = {
      success: true,
      count: data.length,
      results: data.map(loc => ({
        display: loc.display_name,
        lat: Number(loc.lat),
        lng: Number(loc.lon),
        type: loc.type,
        city:
          loc.address?.city ||
          loc.address?.town ||
          loc.address?.village ||
          null,
        state: loc.address?.state || null,
        country: loc.address?.country || null,
        postcode: loc.address?.postcode || null
      }))
    };

    cache.set(cacheKey, formatted);

    res.json(formatted);

  } catch (err) {
    console.error("🔴 SEARCH ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Location search failed"
    });
  }
});

/* ======================================================
REVERSE GEOCODE
GET /api/location/reverse?lat=..&lng=..
====================================================== */

router.get("/reverse", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "lat & lng required"
      });
    }

    const cacheKey = `rev:${lat},${lng}`;
    const cached = cache.get(cacheKey);

    if (cached) return res.json(cached);

    const { data } = await nominatim.get("/reverse", {
      params: {
        lat,
        lon: lng,
        format: "json",
        addressdetails: 1
      }
    });

    const formatted = {
      success: true,
      address: data.display_name,
      lat: Number(data.lat),
      lng: Number(data.lon),
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        null,
      state: data.address?.state || null,
      country: data.address?.country || null,
      postcode: data.address?.postcode || null
    };

    cache.set(cacheKey, formatted);

    res.json(formatted);

  } catch (err) {
    console.error("🔴 REVERSE ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Reverse geocoding failed"
    });
  }
});

/* ======================================================
HEALTH CHECK
====================================================== */

router.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "Location API",
    status: "running",
    time: new Date()
  });
});

/* ======================================================
FALLBACK (DEBUG)
====================================================== */

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Location route not found → ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;