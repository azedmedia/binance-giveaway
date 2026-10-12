# CRYPTO WITH ANONYMOUS BINANCE GIVEAWAY

## Deploy on Render
1. Upload these files to a new GitHub repository.
2. Create a Render Web Service and connect the repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables `BOT_TOKEN` and `ADMIN_CHAT_ID`, then deploy.

## Important limitations
- This demo checks a numeric UID format only (6–12 digits). It does NOT verify that the UID exists and cannot retrieve the Binance account username. Real verification requires an authorized Binance method.
- Claims are stored in memory and reset when the server restarts or redeploys. Add a database before using this for a real giveaway.
- Telegram receives a notification only after the UID passes the format check and the claim is accepted.
- This is an independent concept, not affiliated with Binance. Never request passwords, 2FA codes, seed phrases, or private keys.
