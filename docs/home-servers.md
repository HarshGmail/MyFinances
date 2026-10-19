# Home servers

Two machines at home, joined privately by Tailscale, split by what each is good at.

| | pingu | noddy |
| --- | --- | --- |
| Hardware | i3-3220, 6 GB DDR3, two 500 GB disks | HP x360, i7 (8 threads), 8 GB, 512 GB SSD |
| Role | storage: photos, backups | compute: apps |
| Runs | snappy (photo library) | MyFinances backend, MCP, PDF parsing; later Ved's backend |
| Address | 192.168.31.28 | reserved on the Jio router once installed |

MyFinances moves to noddy once it is installed; until then it can run on
pingu with the same `deploy/home/myfinances up`. Moving it is copying
`deploy/home/*.env` across and running that command there. The Cloudflare
tunnel token works from either machine.
