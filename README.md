# Noor Bakery – Inventory

A demo inventory system for a bakery, built on a SQL database (AlaSQL, running on the device).

- **Ingredients**: stock levels, reorder alerts, expiry dates, receiving stock from suppliers
- **Bake a batch**: recipes deduct ingredients and add finished items to the counter
- **Bakery items**: sell from the counter, oldest batch first (FIFO), remove expired stock
- **Sales and stock history**: every change is recorded in a `movements` table
- **SQL console**: run queries against the live data; every action shows the SQL it ran

## Layout

- `app/` – Android app (WebView wrapper). The UI is `app/src/main/assets/index.html`.
- `web/index.html` – the same app as a single web page (loads AlaSQL from a CDN).
- `.github/workflows/build-apk.yml` – builds `NoorBakery.apk` on every push to `main` and attaches it to a release.

In the Android app, data is saved on the phone (WebView localStorage). The signing key in `app/` is a demo key only.
