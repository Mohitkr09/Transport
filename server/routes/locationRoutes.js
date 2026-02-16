const express = require("express");
const router = express.Router();
const axios = require("axios");

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Query required" });
    }

    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q,
          format: "json",
          limit: 5
        },
        headers: {
          "User-Agent": "transport-app"
        }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error("Location search error:", err.message);
    res.status(500).json({ message: "Location search failed" });
  }
});

module.exports = router;
