# Test signing keys (dev only)

On first `npm run dev`, the release host creates:

| File | Role |
| --- | --- |
| `ed25519-private.pem` | Signs every published manifest. **Gitignored. Never ship.** |
| `ed25519-public.pem` | App trusts this in **dev only** (fetch `GET /releases/public-key`). |

Production keys and hosting are separate; do not reuse these PEMs outside local testing.
