# MASTER PROMPT: HOKKAIDO CHEESE TART ORDER & ACCOUNTING SYSTEM (MICRO-SaaS)

## 1. MISI UTAMA
Bina aplikasi web pesanan mikro-tempatan (Hyper-local COD & Pickup) untuk jualan Hokkaido Cheese Tart. Sistem ini mesti mempunyai:
1. Antaramuka Pelanggan (Borang pesanan + Pengiraan jarak & kos delivery auto).
2. Pangkalan Data Masa-Nyata (Supabase).
3. Dashboard Pengurus/Admin (Kemas kini status pesanan & butang automasi WhatsApp).
4. Enjin Perakaunan Automatik (Untung bersih, kos barang terjual / COGS, dan persediaan rekod Consolidated e-Invois LHDN).

---

## 2. STACK TEKNOLOGI
- **Frontend / Framework:** Next.js (App Router), React, Tailwind CSS, Lucide Icons.
- **Peta & Geolocation:** Leaflet.js / OpenStreetMap (Tanpa kunci API berbayar).
- **Pangkalan Data & Auth:** Supabase (PostgreSQL + Realtime Channel).
- **Automasi Komunikasi:** WhatsApp Direct URL Schema (`https://wa.me/...`).
- **Pengehosan:** Vercel (Production) / Localhost (Development).

---

## 3. LOGIK BISNES & HARGA
- **Produk:**
  1. *Set Solo Sweet* (3 biji) — Harga: RM 4.50 | Kos Modal: RM 3.00 | Untung: RM 1.50
  2. *Set Family Box* (12 biji) — Harga: RM 18.00 | Kos Modal: RM 14.00 | Untung: RM 4.00
  3. *Set Mega Craving* (25 biji) — Harga: RM 30.00 | Kos Modal: RM 25.00 | Untung: RM 5.00
- **Logik Penghantaran (Delivery):**
  - Radius 0 – 3 km: Caj asas RM 3.00.
  - Setiap km tambahan: +RM 1.00 / km.
  - Jarak dihitung automatik menggunakan formula Haversine berdasarkan koordinat pusat dapur/kedai.

---

## 4. STATUS PESANAN & WHATSAPP TEMPLATE
1. **Pending (Baru):** Notifikasi pesanan masuk.
2. **Accepted (Diterima):** "Hai {Nama}, pesanan Hokkaido #{OrderNo} disahkan. Kami akan mula sediakan sebentar lagi."
3. **Preparing (Disediakan):** "Hokkaido Tart anda sedang dibakar/disediakan panas-panas! 🧀"
4. **Ready Pickup / Delivering:** 
   - *Pickup:* "Pesanan sedia diambil di kedai."
   - *Delivery:* "Rider dalam perjalanan ke lokasi anda. Sila sediakan tunai COD: RM {Jumlah}."
5. **Completed (Selesai):** "Terima kasih! Pesanan selesai." *(Auto-trigger masuk ke Lejar Perakaunan)*.
6. **Cancelled (Batal):** Pesanan dibatalkan.

---

## 5. MODUL PERAKAUNAN (LHDN CONSOLIDATED E-INVOICE READY)
- Setiap pesanan berstatus `completed` merekodkan:
  - Tarikh & Masa
  - ID Transaksi
  - Jumlah Kasar Jualan
  - Kos Produk (COGS)
  - Caj Delivery
  - Keuntungan Bersih
- Ciri eksport data ke fail CSV standard untuk pelaporan cukai bulanan / e-Invois Penyatuan.
