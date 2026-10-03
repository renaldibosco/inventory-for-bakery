# Noor Bakery – Inventory

A demo inventory system for a bakery, built on a SQL database (AlaSQL, running on the device).

- **Ingredients**: stock levels, reorder alerts, expiry dates, receiving stock from suppliers
- **Bake a batch**: recipes deduct ingredients and add finished items to the counter
- **Bakery items**: sell from the counter, oldest batch first (FIFO), remove expired stock
- **Sales and stock history**: every change is recorded in a `movements` table
- **SQL console**: run queries against the live data; every action shows the SQL it ran

### v1.1
- **Billing** with GST invoice, Cash / UPI / Card, share bill on WhatsApp
- **Barcode scanning** with the phone camera (EAN-13 labels on packed items)
- **Purchase orders**: low ingredients grouped by supplier, sent on WhatsApp, marked received
- **Daily closing report**, **7-day sales chart**, **profit per item**, **waste tracking**
- **Plan for tomorrow**: what to bake from last week's sales
- **Cake orders** with delivery date, advance and balance
- **Owner / Staff login** (demo PINs 1234 / 0000) and **Tamil** language

## Layout

- `app/` – Android app (WebView wrapper). The UI is `app/src/main/assets/index.html`.
- `web/index.html` – the same app as a single web page (loads libraries from a CDN).
- `src-web/` – source: `app.src.html` (screens) + `core.js` (SQL data layer); `build.py` assembles both versions.
- `.github/workflows/build-apk.yml` – builds `NoorBakery.apk` on every push to `main` and attaches it to a release.

In the Android app, data is saved on the phone (WebView localStorage). The signing key in `app/` is a demo key only.
