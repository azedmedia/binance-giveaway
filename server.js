const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const TOTAL_SLOTS = 8;
const REWARD = "$0.05";
const PUBLIC_DIR = path.join(__dirname, "public");
const claims = new Map(); // Demo only; resets on restart.

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use("/api/", rateLimit({ windowMs: 60000, limit: 15 }));
app.use(express.static(PUBLIC_DIR));

app.get("/", (_req, res) => {
  const index = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  return res.status(500).send("Homepage missing: commit public/index.html to GitHub.");
});

function validUidFormat(uid) { return /^[0-9]{6,12}$/.test(uid); }

async function notifyTelegram(uid, slot) {
  const token = process.env.BOT_TOKEN, chatId = process.env.ADMIN_CHAT_ID;
  if (!token || !chatId) { console.warn("Telegram notification skipped: missing BOT_TOKEN or ADMIN_CHAT_ID"); return; }
  const text = ["🎉 Crypto With Anonymous giveaway claim", `Binance UID: ${uid}`, `Slot: ${slot}/${TOTAL_SLOTS}`, "UID format only; existence and username are not verified."].join("\\n");
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    const data = await r.json();
    if (!r.ok || !data.ok) console.error("Telegram notification failed:", data.description || r.status);
    else console.log(`Telegram notification sent for slot ${slot}`);
  } catch (e) { console.error("Telegram notification failed:", e.message); }
}

app.get("/api/status", (_req, res) => res.json({
  totalSlots: TOTAL_SLOTS, claimed: claims.size,
  remaining: Math.max(0, TOTAL_SLOTS - claims.size), reward: REWARD
}));

app.post("/api/claim", async (req, res) => {
  const uid = String(req.body?.uid || "").trim();
  if (!validUidFormat(uid)) return res.status(400).json({ ok: false, message: "UID NOT VALID! Please input your correct Binance UID." });
  if (claims.has(uid)) return res.status(409).json({ ok: false, message: "This UID has already submitted a claim." });
  if (claims.size >= TOTAL_SLOTS) return res.status(409).json({ ok: false, message: "Sorry, all giveaway slots have been claimed." });
  const slot = claims.size + 1;
  claims.set(uid, { slot, createdAt: new Date().toISOString() });
  await notifyTelegram(uid, slot);
  res.json({ ok: true, message: "UID format accepted. Your claim has been submitted.", slot });
});

app.listen(PORT, () => console.log(`Giveaway running on ${PORT}; homepage path: ${PUBLIC_DIR}`));
