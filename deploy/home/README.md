# Running the backend at home

The backend, the MCP server and the PDF parser run on pingu in Docker, in place
of Render. The frontend stays on Vercel and the database stays on MongoDB Atlas.
Cloudflare Tunnel makes `api.my-finances.site` and `mcp.my-finances.site` reach
pingu without opening any port on the router.

Nothing is reachable from the LAN: every port binds to `127.0.0.1`, and the
tunnel connects outwards.

## One-time setup

1. **Settings.** In this folder on pingu, create two files from the Render
   dashboard's Environment tab:
   - `backend.env`: every variable of the backend service. Leave out `PORT`,
     `NODE_ENV` and `PDF_PARSING_SERVICE_URL`; `compose.yml` sets those.
   - `mcp.env`: `SITE_URL=https://mcp.my-finances.site` and
     `FRONTEND_URL=https://www.my-finances.site`.
2. **Atlas.** Network Access must allow pingu's public IP. Jio's address can
   change, so either allow `0.0.0.0/0` (the password still protects it) or
   update it when it changes.
3. **Start it locally first:** `deploy/home/myfinances up`. Check
   `curl localhost:5000/api/health` says the database is connected.
4. **Cloudflare.** Add `my-finances.site` to a free Cloudflare account and
   switch the nameservers at Namecheap to the two Cloudflare gives you. Copy
   the existing records first: `www` and the apex point at Vercel, and must
   stay **DNS only** (grey cloud).
5. **Tunnel.** Zero Trust → Networks → Tunnels → Create, type Cloudflared.
   Copy the token into `deploy/home/.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
   Add two public hostnames:
   - `api.my-finances.site` → `http://backend:5000`
   - `mcp.my-finances.site` → `http://mcp:4000`
6. `deploy/home/myfinances up` again. It starts the tunnel too.
7. **Render as a fallback.** Keep the Render services running. A Cloudflare
   Worker (`deploy/cloudflare/failover-worker.js`) sends every request to pingu
   first, and to Render only when the tunnel is down (502, 503, 504 or 530).
   Both use the same Atlas database and `JWT_SECRET`, so a login made on one
   works on the other. Responses carry `x-served-by: pingu` or `render`.
   Deploy it in Workers & Pages, then add the routes `api.my-finances.site/*`
   and `mcp.my-finances.site/*` to it.

## Day to day

```bash
deploy/home/myfinances status
deploy/home/myfinances logs backend
deploy/home/myfinances deploy    # git pull + rebuild + restart
```

Everything restarts on its own after a reboot or power cut. During a power or
internet cut the site is down; the frontend shows its offline state.
