# Local release store

Published releases (not player app data):

```
releases/
  current.json          # { number, publishedAt } — gitignored once created
  by-number/<n>/        # manifest.json + content.json
  blobs/<sha256>        # content-addressed files
```

Empty shape reference: `../example/manifest.example.json`.
