# WebSocket Visualization Troubleshooting

## Common Issues

### 1. "Disconnected" or No Updates

**Symptoms:** The status shows "Disconnected" or stays red, no data appears.

**Solutions:**

1. **Check if the bot is running:**
   ```bash
   pnpm dev
   ```
   Look for: `✅ WebSocket server started on port 8080`

2. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for WebSocket connection errors
   - Should see: `Connecting to WebSocket: ws://localhost:8080`

3. **Verify WebSocket server started:**
   - Check bot console output for: `WebSocket server started on port 8080`
   - If you see `EADDRINUSE`, port 8080 is already in use

4. **Use HTTP server instead of file://:**
   ```bash
   # In one terminal: Start the bot
   pnpm dev
   
   # In another terminal: Serve the HTML file
   pnpm serve:vis
   ```
   Then open: `http://localhost:3000`

### 2. Connection Refused

**Symptoms:** Browser console shows connection refused errors.

**Check:**
- Is the bot actually running?
- Is port 8080 blocked by firewall?
- Try a different port: `WEBSOCKET_PORT=3001 pnpm dev`

### 3. No Updates After Connection

**Symptoms:** Status shows "Connected" but no data updates.

**Check:**
- Has the bot spawned in-game? (Check bot console)
- Is the bot receiving position updates from the server?
- Check bot console for: `WebSocket client connected`

### 4. Port Already in Use

**Symptoms:** `EADDRINUSE` error when starting bot.

**Solutions:**
```bash
# Use a different port
WEBSOCKET_PORT=3001 pnpm dev

# Or find and kill the process using port 8080
lsof -ti:8080 | xargs kill -9
```

## Debugging Steps

1. **Check WebSocket server logs:**
   - When a client connects, you should see: `WebSocket client connected`
   - When updates are sent, check bot console for any errors

2. **Check browser console:**
   - Open DevTools → Console
   - Look for connection messages and errors
   - Check Network tab → WS filter to see WebSocket connection

3. **Test WebSocket connection manually:**
   ```bash
   # Install wscat if needed: npm install -g wscat
   wscat -c ws://localhost:8080
   ```
   You should see JSON messages if the bot is running and has gamestate.

4. **Verify gamestate is updating:**
   - Check bot console for position logs
   - Bot should be receiving packets from Minecraft server
   - Look for: `gameState.setTime`, position updates, etc.

## Quick Test

1. Start bot: `pnpm dev`
2. Wait for: `✅ WebSocket server started on port 8080`
3. Serve HTML: `pnpm serve:vis` (in another terminal)
4. Open: `http://localhost:3000`
5. Check status indicator - should turn green
6. Check browser console - should see connection messages
