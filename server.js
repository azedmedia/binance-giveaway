const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const TOTAL_SLOTS = 8;
const REWARD = "$0.05";
const claims = new Map(); // Memory-only demo: claims reset on restart.

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/api/", rateLimit({ windowMs: 60_000, limit: 15 }));

function validUidFormat(uid) {
  // Format check only; this does NOT prove that the Binance UID exists.
  return /^[0-9]{6,12}$/.test(uid);
}

async function notifyTelegram(uid, slot) {
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.ADMIN_CHAT_ID;
  if (!token || !chatId) {
    console.warn("Telegram notification skipped: BOT_TOKEN or ADMIN_CHAT_ID missing.");
    return false;
  }

  const message = [
    "🎉 New giveaway claim",
    `Binance UID: ${uid}`,
    `Slot: ${slot}/${TOTAL_SLOTS}`,
    "Note: UID format checked only; existence and username are not verified."
  ].join("\\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message })
    });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error("Telegram notification failed:", data.description || response.status);
      return false;
    }
    console.log(`Telegram notification sent for slot ${slot}`);
    return true;
  } catch (err) {
    console.error("Telegram notification failed:", err.message);
    return false;
  }
}

app.get("/api/status", (_req, res) => {
  res.json({
    totalSlots: TOTAL_SLOTS,
    claimed: claims.size,
    remaining: Math.max(0, TOTAL_SLOTS - claims.size),
    reward: REWARD
  });
});

app.post("/api/claim", async (req, res) => {
  const uid = String(req.body?.uid || "").trim();

  if (!validUidFormat(uid)) {
    return res.status(400).json({
      ok: false,
      message: "UID NOT VALID! Please input your correct Binance UID."
    });
  }
  if (claims.has(uid)) {
    return res.status(409).json({ ok: false, message: "This UID has already submitted a claim." });
  }
  if (claims.size >= TOTAL_SLOTS) {
    return res.status(409).json({ ok: false, message: "Sorry, all giveaway slots have been claimed." });
  }

  const slot = claims.size + 1;
  claims.set(uid, { slot, createdAt: new Date().toISOString() });
  const telegramSent = await notifyTelegram(uid, slot);

  return res.json({
    ok: true,
    message: "UID format accepted. Your claim has been submitted.",
    slot,
    telegramSent
  });
});

app.listen(PORT, () => console.log(`Giveaway site running on port ${PORT}`));
