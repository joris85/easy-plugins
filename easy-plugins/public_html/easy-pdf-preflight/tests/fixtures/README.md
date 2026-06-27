# Easy PDF Preflight — Test Fixtures

Place sample PDF files here for smoke tests.

- `sample.pdf` — minimal single-page PDF with Helvetica font (auto-generated for tests)

## Manual test checklist

- [ ] PDF with embedded fonts → font table populated with embedding status
- [ ] PDF with JPEG images → image table shows dimensions and format
- [ ] PDF with images → Extract Images → per-row Download links work
- [ ] PDF with images → Download All as ZIP returns a valid archive
- [ ] PDF with no images → shows "No images found" (not blank)
- [ ] Missing vendor on server → clear error in UI alert
- [ ] Quick Info panel shows pages, file size, PDF version immediately after upload

## Automated smoke test

```bash
cd public_html/easy-pdf-preflight
composer install   # if vendor/ is missing
php tests/run.php
```
