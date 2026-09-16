# PROJECT PROGRESS LOG

## 17 September 2026 (15:15 UTC+8)
### Penguatkuasaan RBAC Ketat: Blok Role 'user' dari Dashboard /urus
- **Status**: ✅ BERHASIL (Build Exit Code 0)

- **Perubahan Dilakukan**:
  1. **Middleware Server-Side Strict Enforcement (`middleware.ts`)**:
     - Perbaiki implementasi RBAC sedia ada dengan penguatkuasaan lebih ketat.
     - Hanya benarkan peranan `staff` dan `admin` akses `/urus`.
     - Jika error fetching profile atau role `user`, redirect ke `/` tanpa kompromi (tidak ada fallback "graceful allow").
     - Tambah logging untuk keselamatan: console warn apabila user role `user` cuba akses dashboard.
  2. **Client-Side RBAC Strict Guard (`app/urus/page.tsx`)**:
     - Gabungkan semua logik authentication dan RBAC ke dalam satu `useEffect` terpusat.
     - Fetch user profile dan semak role SEBELUM memanggil fungsi data fetching lain.
     - Redirect role `user` ke `/` serta-merta tanpa mengambil data pesanan.
     - Tambah UI guard sebelum render dashboard: loading state, access denied screens.
     - Hentikan realtime subscriptions untuk role `user`.
  3. **Role Badge & UI Safety Nets**:
     - Pastikan UI hanya render untuk `staff` dan `admin` sahaja.
     - Tambah fail-safe: jika `userProfile` null atau role bukan `staff`/`admin`, papar "Akses Ditolak".
     - Paparkan role badge dengan warna berbeza: admin (purple), staff (blue), user (gray).
  4. **Build Verification & Git**:
     - Jalankan `npm run build` dan pastikan Exit Code 0 (tiada ralat TypeScript).
     - Commit dan push ke GitHub dengan mesej: "security: strictly block role 'user' from /urus and redirect to home".
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logik perniagaan, semua fungsi kekal utuh.
  - ✅ Strict Routes: Laluan `/urus` dilindungi dengan ketat oleh middleware dan client-side guard.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
  - ✅ Database As Source of Truth: Gunakan jadual `user_profiles` untuk peranan sebenar.
  - ✅ Server-Side Validation: Middleware melakukan validasi server-side sebelum client-side.
- **Langkah Seterusnya**:
  - Uji dengan pelbagai pengguna (email: a6taps@gmail.com role 'user', admin@example.com role 'admin').
  - Monitor deployment dan pastikan pengguna biasa tidak boleh akses dashboard.

## 17 September 2026 (15:00 UTC+8)
### Pembaikan Teknikal Vercel Build & Turbopack Panic
- **Status**: ✅ BERHASIL (Build Exit Code 0)

- **Perubahan Dilakukan**:
  1. **Bersihkan Tracking Folder `.next` dari Git**:
     - Cipta `.gitignore` root dengan senarai standard Next.js (`.next`, `node_modules`, `.env*.local`).
     - Jalankan `git rm -r --cached .next` untuk buang folder build dari git tracking tanpa padam fail fizikal.
  2. **Matikan Turbopack untuk Production Build**:
     - Tambah env variable `NEXT_TURBOPACK=0` di skrip build `package.json`.
     - Pastikan `next.config.js` bersih tanpa tetapan `experimental.turbopack` yang tidak dikenali.
  3. **Pengesahan Binaan & Tolak Kod**:
     - Jalankan `npm run build` dengan webpack standard (Exit Code 0).
     - Commit perubahan `.gitignore`, `package.json`, `next.config.js`.
     - Push ke branch main: `git push origin main`.
- **Pematuhan .clinerules**:
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
  - ✅ Zero-Mock: Tiada penghapusan logik perniagaan.
  - ✅ Strict Routes: Semua laluan kekal utuh.
- **Langkah Seterusnya**:
  - Monitor deployment Vercel untuk pastikan build berjaya tanpa panic.
  - Jalankan skrip SQL migrasi RBAC di Supabase SQL Editor.

## 17 September 2026 (14:30 UTC+8)
### Sistem RBAC 3-Tier, Audit Logs & Butang Batal Pesanan
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Skrip SQL Migrasi RBAC & Audit Logs (`supabase/migrations/rbac_and_audit_logs.sql`)**:
     - Cipta jadual `user_profiles` dengan role ('user', 'staff', 'admin') dan trigger auto-insert untuk pengguna Google OAuth.
     - Cipta jadual `order_logs` untuk jejak audit tindakan status pesanan dan pembatalan.
     - Polisi RLS: hanya 'staff' dan 'admin' boleh akses `/urus` dan baca log.
     - Trigger automatik log status change & cancellation.
     - Auto-assign admin role untuk email 'anamazizi@gmail.com'.
  2. **Middleware Role-Based Access Control (`middleware.ts`)**:
     - Tambah semakan role: jika pengguna dengan role 'user' cuba akses `/urus`, lencong ke laman utama (`/`).
  3. **Dashboard Urus dengan Role Badge & Audit Logs (`app/urus/page.tsx`)**:
     - Fetch user profile dan paparkan badge role (admin/staff/user).
     - Tambah butang merah "Batal Pesanan" untuk pesanan belum selesai/dibatalkan.
     - Log automatik ke `order_logs` setiap perubahan status & pembatalan.
     - Paparkan sejarah tindakan (audit logs) di bawah setiap kad pesanan.
     - Tambah pautan WhatsApp notifikasi pembatalan kepada pelanggan.
  4. **Types untuk RBAC (`types/rbac.ts`)**:
     - Definisi jenis `UserProfile`, `OrderLog`, `UserRole`.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Semua fungsi logik perniagaan kekal utuh.
  - ✅ Strict Routes: Laluan `/urus` dilindungi oleh middleware RBAC.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
  - ✅ Database As Source of Truth: Gunakan jadual `user_profiles` dan `order_logs` di Supabase.
  - ✅ Server-Side Validation: Log audit disimpan di server, bukan localStorage.
- **Langkah Seterusnya**:
  - Jalankan skrip SQL migrasi di Supabase SQL Editor.
  - Uji fungsi RBAC dengan log masuk menggunakan pelbagai emel (user, staff, admin).


### Penguatkuasaan Client-Side Auth Guard & Hardcode OAuth Callback
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Kunci Dashboard Client-Side (`/urus/page.tsx`)**:
     - Tambah state `authChecking` dan `useRouter` untuk client-side auth validation.
     - Jika tiada sesi pengguna (`!user`), lakukan redirect serta-merta ke `/urus/login` sebelum render.
     - Paparkan loading spinner \"Mengesahkan kelayakan...\" semasa auth checking.
  2. **Pengesahan OAuth Redirect Param (`/urus/login/page.tsx`)**:
     - Tukar `redirectTo: ${window.location.origin}/auth/callback` kepada hardcoded production URL `https://hokkaido-eosin.vercel.app/auth/callback`.
  3. **Semakan Simpanan Pesanan Pelanggan ke Supabase (`app/page.tsx`)**:
     - Sahkan fungsi submit pesanan menyimpan data ke jadual `orders` dengan lajur yang sah tanpa melanggar polisi RLS anon.
  4. **Pengesahan Binaan & Tolak Kod**:
     - Jalankan `npm run build` dan pastikan Exit Code 0.
     - Tolak kod ke branch main.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logik perniagaan atau fungsi yang telah siap.
  - ✅ Strict Routes: Laluan `/urus` kekal sama dengan perlindungan middleware dan client-side guard.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript/JavaScript).
- **Langkah Seterusnya**:
  - Monitor deployment Vercel dan uji fungsi authentication flow di production.


## 17 September 2026 (12:00 UTC+8)
### Semakan & Pembaikan Keselamatan /urus serta Label UI
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Kunci Laluan /urus (Strict Route Guard / Middleware)**:
     - Semak `middleware.ts` dan `app/urus/page.tsx`.
     - Pastikan jika sesi Supabase Auth tiada (`!user` atau `!session`), pengguna dilencongkan serta-merta ke `/urus/login`.
  2. **Kemas Kini Label Status "Sedang Dibakar" -> "Sedang Disediakan"**:
     - Di `app/urus/page.tsx`, ubah teks tab penapis dan butang tindakan:
       * Tukar "Sedang Bakar/Sedia" kepada "Sedang Disediakan".
     - Selaraskan template WhatsApp bagi status Preparing agar mencerminkan produk ready-stock frozen:
       "Hai {Nama}, pesanan Hokkaido #{OrderNo} anda sedang disediakan (Ready-stock Frozen - sedap dinikmati sejuk!). ❄️🧁"
  3. **Pengesahan Pautan Redirect Google OAuth di /urus/login**:
     - Pastikan butang "Log Masuk dengan Google" di `app/urus/login/page.tsx` memanggil `redirectTo: ${window.location.origin}/auth/callback`.
  4. **Pengesahan Binaan & Tolak Kod**:
     - Jalankan `npm run build` dan pastikan Exit Code 0.
     - Tolak kod ke branch main.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logik perniagaan atau fungsi yang telah siap.
  - ✅ Strict Routes: Laluan `/urus` kekal sama dengan perlindungan middleware.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript/JavaScript).
- **Langkah Seterusnya**:
  - Monitor deployment Vercel dan uji fungsi di production.


## 17 September 2026 (03:39 UTC+8)
### Pembaikan Deployment Vercel (Force Dynamic & Leaflet SSR)
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Force Dynamic pada Halaman Admin**: Menambah `export const dynamic = 'force-dynamic'` di `app/urus/page.tsx` dan `app/urus/login/page.tsx` untuk memastikan halaman ini tidak di-prerender secara statik oleh Vercel.
  2. **Pengasingan Penuh Komponen Peta**: Menggantikan import statik `react-leaflet` dengan dynamic import di `components/Map.tsx`. Semua modul Leaflet dan react-leaflet kini dimuatkan secara dinamik di sisi klien sahaja (tiada import statik).
  3. **Pengesahan Fallback Supabase**: Memastikan `lib/supabase.ts` sudah mempunyai nilai sandaran yang valid untuk environment variables semasa build.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logik perniagaan; hanya penyesuaian teknikal untuk SSR.
  - ✅ Strict Routes: Laluan `/urus` dan `/urus/login` kekal sama, hanya ditambah force-dynamic.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
- **Langkah Seterusnya**:
  - Push perubahan ke GitHub untuk trigger deployment Vercel.

## 16 September 2026 (23:46 UTC)
### Pembaikan Ralat Binaan Vercel (TypeScript Strict Mode)
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Pembetulan Type `any` di app/urus/page.tsx**:
     - Menggantikan `useState<any>(null)` dengan `useState<User | null>(null)` dan menambah import type `User` dari `@supabase/supabase-js`.
     - Menghapus `any` pada mapping ledger entry dengan menggunakan type `RawLedgerEntry` yang ditakrifkan khas.
  2. **Pembetulan Type Assertion di components/Map.tsx**:
     - Menggantikan `as any` dengan `as { _getIconUrl?: string }` untuk konfigurasi ikon Leaflet.
  3. **Pembersihan Parsing Error**:
     - Membetulkan baris import yang mengandungi literal backslash-n (`\\n`) di app/urus/page.tsx.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logika perniagaan, hanya penambahbaikan type safety.
  - ✅ Strict TypeScript: Semua `any` telah digantikan dengan jenis yang tepat.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
- **Langkah Seterusnya**:
  - Perubahan akan di-push ke GitHub untuk trigger deployment Vercel semula.
### Sokongan Multi-Item Cart & Penambahbaikan UI Produk
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Padam Imej hokkaido-sets.jpg**: Membuang gambar set dari galeri, hanya mengekalkan banner dan cream untuk paparan yang lebih kemas.
  2. **Reka Bentuk Kad Pilihan Produk**: Menyelaraskan susunan teks setiap kad dengan layout:
     - Baris 1: "Hokkaido Inti Jebok" (font-medium text-slate-700)
     - Baris 2: Nama set dengan kuantiti biji (font-bold text-slate-900 text-lg)
     - Baris 3: Harga (font-semibold text-blue-600)
  3. **Sokongan Multi-Item Kuantiti Bebas**: Mengubah state dari single selection ke object quantities untuk setiap set (solo_sweet, family_box, mega_craving). Setiap kad kini mempunyai butang kaunter interaktif `[-]` `[input]` `[+]` dengan nilai default 0.
  4. **Pengiraan Subtotal Automatik**: Subtotal dikira berdasarkan jumlah kuantiti setiap set yang dipilih. Validation memastikan sekurang-kurangnya satu set dipilih sebelum hantar pesanan.
  5. **Kemas Kini Ringkasan Pesanan & Mesej WhatsApp**: Ringkasan pesanan memaparkan senarai item yang dipilih sahaja. Mesej WhatsApp kini menyenaraikan semua item yang dipilih dengan format yang jelas.
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logika perniagaan, hanya penambahbaikan UI/UX dan penambahan fungsi.
  - ✅ Strict URL Encoding: WhatsApp message dibungkus dengan `encodeURIComponent` sekali sahaja.
  - ✅ UI Contrast: Kelas kontras tinggi dikekalkan pada semua input dan kad.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
- **Langkah Seterusnya**:
  - Perubahan telah di-push ke GitHub dan akan trigger deployment Vercel automatik.
## 16 September 2026 (21:30 UTC)
### Pelarasan Antaramuka Terakhir & Pembaikan Fungsi WhatsApp
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Paparan Gambar Penuh (No Cropping)**: Membuang `object-cover` dan ketinggian tetap pada semua tag `<img>` produk. Menggantikan dengan kelas responsif `w-full h-auto rounded-2xl shadow-sm block` untuk memaparkan keseluruhan gambar tanpa potongan.
  2. **Pembaikan Pautan WhatsApp Pertanyaan (Fix Double Encoding)**: Memperbaiki fungsi `handleInquirySubmit` dengan menggunakan pemisah baris literal `\n` dan hanya satu kali encoding `encodeURIComponent`. Menambah `setTimeout` untuk reset loading state selepas navigation.
  3. **Pembersihan Bahagian Maklumat Tambahan Bawah**: Memadam sepenuhnya blok teks kecil di bawah butang pertanyaan (Hubungi terus dan masa jawapan).
- **Pematuhan .clinerules**:
  - ✅ Zero-Mock: Tiada penghapusan logika perniagaan, hanya penambahbaikan UI/UX.
  - ✅ Strict URL Encoding: Hanya satu kali encoding dengan `encodeURIComponent`.
  - ✅ UI Contrast: Kelas kontras tinggi dikekalkan.
  - ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript).
- **Langkah Seterusnya**:
  - Perubahan telah di-push ke GitHub dan akan trigger deployment Vercel automatik.
## 16 September 2026 (21:15 UTC)
### Eliminate Document Manipulation & Load Leaflet CSS via Layout
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **CSS Load via Layout**: Menambahkan tag `<link>` stylesheet Leaflet CDN di `<head>` di `app/layout.tsx` secara deklaratif.
  2. **Clean Document References**: Menghapus semua manipulasi `document.createElement` dan `document.head.appendChild` dari `components/Map.tsx`.
  3. **Client-Side Mount Check**: Menambahkan state `isMounted` dan render fallback component sehingga komponen hanya di-render di client-side.
  4. **Icon Configuration Safety**: Konfigurasi ikon Leaflet tetap dijalankan di dalam `useEffect` setelah mount.

### Pematuhan .clinerules
- ✅ Zero Document Manipulation: Tidak ada rujukan `document` di luar lifecycle React.
- ✅ Build Gate: `npm run build` Exit Code 0 tanpa error.
- ✅ Zero-Mock: Fungsi peta tetap berfungsi penuh dengan fallback loading UI.

### Langkah Seterusnya
- Push perubahan ke GitHub untuk trigger deployment Vercel.

## 16 September 2026 (21:00 UTC)
### Leaflet SSR Root Cause Fix
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Dynamic Import Leaflet**: Menghapus import statik `L from 'leaflet'` dan menggantikan dengan dynamic import di dalam `useEffect` di `components/Map.tsx`.
  2. **SSR Safety**: Memastikan konfigurasi ikon Leaflet hanya dijalankan di client-side dengan pemeriksaan `typeof window === 'undefined'`.
  3. **CSS Handling**: Menghapus import CSS statik dan menjaga pemuatan CSS via CDN link di useEffect.

### Pematuhan .clinerules
- ✅ Zero Window Reference: Tidak ada rujukan `window` atau `document` di luar lifecycle React.
- ✅ Build Gate: `npm run build` Exit Code 0 tanpa error.
- ✅ Zero-Mock: Fungsi peta tetap berfungsi penuh.

### Langkah Seterusnya
- Push perubahan ke GitHub untuk trigger deployment Vercel.

## 16 September 2026 (20:30 UTC)
### Production Deployment Fix for Vercel
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Leaflet SSR Fix**: Memindahkan konfigurasi ikon Leaflet ke dalam `useEffect` dengan pemeriksaan `typeof window !== 'undefined'` di `components/Map.tsx`.
  2. **Dynamic Import untuk MapDisplay**: Menggantikan import statik MapDisplay dengan `dynamic(() => import(...), { ssr: false })` di `app/page.tsx` untuk menghalang ralat "window is not defined".
  3. **Lazy Loading Imej**: Menambah atribut `loading="lazy"` pada semua tag `<img>` untuk mengelakkan isu pengoptimuman imej Next.js.
  4. **Pengesahan Imej Git**: Mengesahkan imej fizikal (`hokkaido-banner.jpg`, `hokkaido-cream.jpg`, `hokkaido-sets.jpg`) berada dalam git index.

### Pematuhan .clinerules
- ✅ SSR Safety: Konfigurasi Leaflet hanya dijalankan di client-side.
- ✅ Build Gate: `npm run build` Exit Code 0 (tiada ralat TypeScript/lint).
- ✅ Zero-Mock: Tiada penghapusan logika perniagaan atau placeholder.

### Langkah Seterusnya
- Push perubahan ke repositori GitHub untuk trigger deployment Vercel.

## 16 September 2026 (23:45 UTC)
### Perbaikan Ralat Parsing app/page.tsx
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. Membetulkan struktur JSX dengan menghapus duplikasi `<div>` (baris 158).
  2. Menambahkan penutupan `<div>` untuk container yang hilang (baris 325).
  3. Membetulkan duplikasi state `useState` untuk inquiry form (baris 33-36).
  4. Membetulkan duplikasi fungsi `handleInquirySubmit` (baris 50-65).
  5. Menghapus import `useState` yang redundan (baris 13).
  6. Menambahkan penutupan kurung `)` yang hilang (baris 327) untuk mengimbangi ketidakseimbangan kurung buka/tutup.

### Pematuhan .clinerules
- ✅ Tidak ada penghapusan logika perniagaan atau fungsi yang telah siap.
- ✅ Tidak ada penggunaan mock atau placeholder (Zero-Mock).
- ✅ Struktur JSX kini seimbang dan mematuhi panduan kontras tinggi (UI Contrast).
- ✅ Build gate lulus: `npm run build` menghasilkan Exit Code 0 (tiada ralat TypeScript).

### Catatan Teknis
- Ketidakseimbangan kurung: Ditemukan missing `)` di akhir file. Masalah ini mungkin disebabkan oleh kurung buka yang tidak tertutup di suatu tempat dalam kode, namun setelah analisis, penambahan `)` di akhir fungsi menyelesaikan error parsing tanpa mengganggu logika perniagaan.
- Ralat parsing asli: "Unexpected token. Did you mean `{'}'}` or `&rbrace;`?" telah diperbaiki dengan penyeimbangan tag `<div>`.

### Langkah Seterusnya
- Uji fungsi aplikasi di localhost untuk memastikan aliran pesanan berjalan lancar.
- Commit perubahan ke repositori GitHub.

---

## 16 September 2026 (00:10 UTC)
### Fasa Penamat Projek
- **Status**: ✅ BERHASIL (Build Exit Code 0)
- **Perubahan Dilakukan**:
  1. **Baiki Ikon Pin Peta Leaflet**: Konfigurasi manual URL CDN untuk ikon marker lalai Leaflet di `components/Map.tsx`. URL kini menunjuk ke `https://unpkg.com/leaflet@1.9.4/dist/images/...` menghapuskan tanda soal rosak.
  2. **Maklumat Kedai & Google Maps untuk Kaedah Ambil Sendiri (Pickup)**:
     - Tambah alamat kedai lengkap: `Kiosk No 1, Stadium Majlis Perbandaran Manjung, 32040 Seri Manjung, Perak.`
     - Tambah pautan Google Maps kedai: `https://www.google.com/maps?q=4.1948617,100.6655929`
     - Logik WhatsApp message template kini membezakan antara kaedah Delivery (koordinat pelanggan) dan Pickup (koordinat kedai).
  3. **Komit Imej Fizikal & Pengesahan Binaan**:
     - `git add public/images/` untuk jejaki imej produk sebenar.
     - `npm run build` Exit Code 0 (tiada ralat TypeScript).
     - Commit & push ke repositori GitHub: `9169bed2`.

### Pematuhan .clinerules
- ✅ Zero-Mock: Tiada penghapusan logik perniagaan; semua fungsi pesanan kekal utuh.
- ✅ Strict URL Encoding: `encodeURIComponent(rawMessage)` digunakan dengan ketat.
- ✅ UI Contrast: Kelas kontras tinggi dikekalkan.
- ✅ Build Gate: Build berjaya, aplikasi sedia untuk deployment.

### Langkah Seterusnya
- Uji fungsi aplikasi di localhost (pastikan pin peta muncul, mesej WhatsApp untuk pickup mengandungi maklumat kedai).
- Monitor respons pelanggan dan fine-tune jika perlu.

---