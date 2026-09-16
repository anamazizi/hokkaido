# SOP PENGURUSAN SISTEM HOKKAIDO CHEESE TART

## 1. OBJEKTIF & POLISI SISTEM
SOP ini menentukan tatacara operasi bagi pesanan tempatan (hyper-local COD & Takeaway) Hokkaido Cheese Tart. Sistem ini dibangunkan untuk menjana aliran tunai pantas tanpa kos operasi pelayan yang tinggi.

## 2. PENGURUSAN PESANAN (WORKFLOW)
1. **Penerimaan Pesanan:**
   - Pesanan baharu masuk ke dashboard dengan status `pending`.
   - Admin memeriksa alamat, stok sedia ada, dan jarak penghantaran.
2. **Pengesahan & Dapur:**
   - Tekan butang `[Terima Order]`. Hantar WhatsApp pengesahan kepada pelanggan.
   - Tekan butang `[Sedang Sedia / Preparing]` apabila tart mula dipanaskan/dibungkus.
3. **Penghantaran / Ambil Sendiri:**
   - Jika Pickup: Tekan `[Sedia Diambil]`.
   - Jika Delivery: Rider bertolak, tekan `[Sedang Hantar]`. Pastikan jumlah COD dimaklumkan kepada rider dan pembeli.
4. **Penyelesaian Transaksi:**
   - Apabila wang tunai diterima, tekan `[Selesai]`.
   - Data secara automatik dicatat ke dalam buku lejar kewangan.

## 3. DASAR KEWANGAN & PERAKAUNAN
- Kos Modal (COGS):
  * Set Solo Sweet (3 biji): RM 3.00
  * Set Family Box (12 biji): RM 14.00
  * Set Mega Craving (25 biji): RM 25.00
- Semua caj delivery dimasukkan sebagai kos penampung petrol/rider.
- Untung bersih harian dihitung secara automatik:
  $$\text{Untung Bersih} = \text{Jumlah Bayaran} - \text{COGS} - \text{Caj Penghantaran}$$

## 4. KEPERLUAN MYINVOIS LHDN
- Bagi perniagaan makanan mikro/B2C, transaksi individu bernilai kecil tidak memerlukan e-Invois masa-nyata.
- Di akhir bulan, gunakan butang "Eksport Jualan CSV" di Dashboard Admin untuk menghimpunkan semua transaksi ke dalam format Invois Penyatuan (Consolidated e-Invoice) jika diperlukan oleh pihak berkuasa.
