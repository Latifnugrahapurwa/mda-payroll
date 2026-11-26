# Melanesia Digital Advertisement — Payroll Management System

Aplikasi manajemen penggajian berbasis **Next.js App Router, TypeScript, dan Tailwind CSS**. Seluruh master karyawan, pengaturan, serta arsip slip disimpan di `localStorage` browser bendahara. Tidak membutuhkan database eksternal. Backup dan pemindahan data menggunakan satu workbook Excel `.xlsx` yang dapat diekspor dan diimpor kembali.

## Fitur

- Master karyawan: tambah, edit, hapus, cari, rekening internal, dan Telegram Chat ID.
- Global settings: standard monthly hours, basis tunjangan transport/makan, dan MDA fees. Token Telegram hanya berada di environment server.
- Payroll: input per periode dan karyawan, kalkulasi real-time, live preview slip portrait dengan tinggi otomatis agar seluruh isi tidak terpotong.
- Ekspor dan impor satu workbook Excel `.xlsx` dengan sheet Petunjuk, Ringkasan Bulanan, Master Karyawan, Pengaturan Global, Rekap Penggajian, Detail Kehadiran, dan Detail Pembayaran.
- Form angka memakai input teks numerik tanpa spinner, sehingga scroll halaman tidak mengubah nilai.
- Notifikasi aksi penting tampil sebagai toast kontras di atas halaman; tombol simpan tidak menutupi form.
- Import workbook dengan mode gabungkan/perbarui berdasarkan EIC/nama atau timpa seluruh master; payroll pada periode file diganti sementara periode lain dipertahankan.
- Indikator backup berdasarkan waktu perubahan arsip.
- Pengiriman slip PNG sebagai dokumen Telegram secara individual atau batch berurutan (jeda 400 ms).
- Webhook Telegram untuk membalas pesan `/start` maupun teks biasa dengan Chat ID.
- Login bendahara dengan cookie HttpOnly, sesi bertanda tangan, dan proteksi halaman/API.

## Prasyarat

- Node.js 20.9 atau lebih baru. Proyek menggunakan Next.js 15.5.29 (rilis patch keamanan cabang 15.x yang tersedia saat penyusunan).
- npm.
- Akun GitHub dan Vercel untuk deployment.
- Bot Telegram yang dibuat melalui `@BotFather` untuk pengiriman slip.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Edit `.env.local` dan ganti placeholder dengan password serta secret acak. Pada Windows PowerShell, salin `.env.example` menjadi `.env.local` dengan `Copy-Item .env.example .env.local`. Jangan commit `.env.local`.

Buka `http://localhost:3000`.

Untuk pemeriksaan TypeScript:

```bash
npm run typecheck
```

## Keamanan dan login bendahara

Aplikasi menggunakan satu password bendahara yang disimpan sebagai environment variable server. Cookie sesi bertanda tangan menggunakan HMAC-SHA256, HttpOnly, SameSite Strict, dan masa berlaku 12 jam. Atur `MDA_ADMIN_PASSWORD` (minimal 14 karakter) dan `MDA_SESSION_SECRET` (minimal 32 karakter). Semua halaman dan API privat dilindungi middleware; hanya login/logout dan Telegram webhook yang dikecualikan. Webhook tetap memvalidasi `TELEGRAM_WEBHOOK_SECRET`.

Buat secret acak menggunakan perintah Node.js di atas. Jangan gunakan password yang sama dengan akun lain. Ini autentikasi satu bendahara, bukan sistem multi-user/role.

## Konfigurasi Telegram

### 1. Buat bot melalui BotFather

1. Buka Telegram dan cari akun resmi `@BotFather`.
2. Kirim `/newbot`.
3. Isi nama bot, misalnya `MDA Salary Slip`.
4. Isi username bot yang diakhiri `bot`, misalnya `mda_salary_slip_bot`.
5. BotFather memberikan **HTTP API token**. Simpan token ini secara privat dan jangan masukkan ke GitHub.
6. Buka bot yang baru dibuat, tekan **Start**, lalu kirim `/start`.

### 2. Atur environment variables

Di Vercel buka **Project → Settings → Environment Variables**, kemudian tambahkan:

| Variable | Keterangan |
|---|---|
| `MDA_ADMIN_PASSWORD` | Password login bendahara, minimal 14 karakter. |
| `MDA_SESSION_SECRET` | Secret HMAC sesi, minimal 32 karakter (disarankan 64 karakter hex). |
| `TELEGRAM_BOT_TOKEN` | Token bot dari BotFather. Hanya dibaca server. |
| `TELEGRAM_WEBHOOK_SECRET` | Secret acak wajib pada production untuk memvalidasi header webhook Telegram. |

Buat secret acak 32 byte (64 karakter hex) dengan Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Gunakan secret berbeda untuk `MDA_SESSION_SECRET` dan `TELEGRAM_WEBHOOK_SECRET`. Buat password bendahara yang panjang dan unik, lalu simpan di password manager.

Masukkan secret yang dihasilkan ke `TELEGRAM_WEBHOOK_SECRET`. Setelah mengubah environment variables, lakukan redeploy.

**Penting:** Pengiriman slip dan webhook sama-sama memakai `TELEGRAM_BOT_TOKEN` dari environment server. Token tidak lagi dimasukkan ke localStorage atau dikirim dari browser.

### 3. Daftarkan webhook setelah deploy

Ganti `YOUR_BOT_TOKEN`, `YOUR_VERCEL_DOMAIN`, dan `YOUR_WEBHOOK_SECRET` dengan nilai milik Anda. Domain contoh: `mda-payroll.vercel.app`.

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_VERCEL_DOMAIN/api/telegram/webhook" \
  -d "secret_token=YOUR_WEBHOOK_SECRET"
```

Jika tidak menggunakan `TELEGRAM_WEBHOOK_SECRET`, hilangkan parameter `secret_token` dari perintah tersebut.

Periksa status webhook:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

### 4. Hubungkan karyawan

1. Karyawan membuka bot dan menekan **Start** atau mengirim pesan.
2. Bot membalas dengan Telegram Chat ID.
3. Bendahara menyalin angka Chat ID ke data karyawan di menu **Karyawan**.
4. Pastikan karyawan tidak memblokir bot.
5. Simpan slip pada periode aktif, lalu lakukan pengiriman dari menu **Kirim & Rekap**.

## Deploy ke GitHub dan Vercel

**Catatan paket:** Vercel Hobby gratis dibatasi untuk penggunaan personal/nonkomersial. Gunakan Hobby hanya untuk preview/pengujian dengan data dummy. Untuk aplikasi yang dipakai dalam operasional penggajian perusahaan, pilih Vercel Pro sesuai ketentuan Vercel.

Next.js terdeteksi otomatis oleh Vercel. Tidak perlu `vercel.json`, adapter, atau perubahan Framework Preset. Biarkan Build Command (`next build`) dan Output Directory menggunakan default.

1. Buat repository GitHub baru dengan visibilitas **Public**. Source code akan terlihat publik, jadi jangan masukkan token, password, data karyawan, nomor rekening, slip, atau file backup.
2. Pastikan file `.env.local` tidak ikut di-commit; `.gitignore` sudah mengecualikannya.
3. Di folder proyek jalankan:

```bash
git init
git add .
git commit -m "feat: initial MDA payroll management system"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

4. Login ke Vercel, pilih **Add New → Project**, lalu import repository GitHub tersebut.
5. Framework preset akan terdeteksi sebagai Next.js. Biarkan Build Command dan Output Directory menggunakan default Vercel.
6. Tambahkan empat environment variables: `MDA_ADMIN_PASSWORD`, `MDA_SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, dan `TELEGRAM_WEBHOOK_SECRET`. Pilih environment Production; tambahkan Preview hanya jika akan menguji preview deployment.
7. Klik **Deploy**. Setelah domain Vercel tersedia, daftarkan webhook sesuai langkah di atas.
8. Login menggunakan password bendahara. Setelah login, uji kirim satu slip ke akun Telegram milik sendiri sebelum mengirim batch.

## Struktur proyek

```text
mda-payroll/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   ├── auth/logout/route.ts
│   │   └── telegram/
│   │       ├── send-slip/route.ts
│   │       └── webhook/route.ts
│   ├── login/page.tsx
│   ├── employees/page.tsx
│   ├── payroll/page.tsx
│   ├── send/page.tsx
│   ├── settings/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── AppShell.tsx
│   ├── Field.tsx
│   └── SlipCard.tsx
├── lib/
│   ├── auth.ts
│   ├── download.ts
│   ├── payroll.ts
│   ├── storage.tsx
│   └── types.ts
├── public/logo-mda.jpg
├── middleware.ts
├── .env.example
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Backup dan restore workbook Excel

Pada halaman Karyawan, Penggajian, dan Kirim & Rekap tersedia tombol **Export Excel (.xlsx)** dan **Import dari Excel (.xlsx)**. File yang sama memuat:

- `Petunjuk`: versi format, periode, waktu ekspor, dan aturan pemulihan.
- `Ringkasan Bulanan`: jumlah karyawan, slip, jam dibayar, subtotal, potongan, biaya MDA, dan total transfer.
- `Master Karyawan`: identitas, jabatan, tarif, rekening internal, dan Telegram Chat ID.
- `Pengaturan Global`: jam standar, basis tunjangan transport/makan, dan persentase biaya MDA.
- `Rekap Penggajian`: seluruh komponen input dan hasil kalkulasi setiap slip pada periode terpilih.
- `Detail Kehadiran` dan `Detail Pembayaran`: tampilan terpisah untuk pemeriksaan yang lebih mudah.

Gunakan file ekspor asli untuk import. Jangan mengubah nama sheet atau header kolom. Untuk perubahan data, edit sheet `Master Karyawan`, `Pengaturan Global`, atau `Rekap Penggajian`; sheet ringkasan dan detail adalah tampilan laporan. Import dapat menggabungkan master berdasarkan EIC/nama atau menimpa seluruh master. Dalam kedua mode, pengaturan global diperbarui dan arsip payroll untuk periode yang tertulis di workbook diganti; arsip periode lain tetap dipertahankan. Nilai hasil kalkulasi payroll dihitung ulang dari komponen input dan pengaturan global di workbook agar angka total tidak tertinggal jika sel input diedit. Import menampilkan konfirmasi sebelum mengubah data.

Workbook dapat berisi nomor rekening dan Telegram Chat ID. Simpan file di lokasi privat dan jangan unggah ke repository GitHub Public.

## Rumus penggajian

```text
Total Paid Hours = Work Hours + Compensation Hours + RST Hours - AFK Hours
Based Payout Amount = Total Paid Hours × Salary/Hours
Transport Allowance = Monthly Transport Base × (Total Paid Hours / Standard Monthly Hours)
Meal Allowance = Monthly Meal Base × (Total Paid Hours / Standard Monthly Hours)
Sub Total = Based Payout + Positional Payout + Transport + Meal + Bonus
MDA Fees = (MDA Fees Percentage / 100) × Sub Total
Total To Be Paid = Sub Total - (Loan Installment + MDA Fees)
```

Nilai tunjangan transport, makan, dan MDA Fees dapat di-override per slip. Gunakan tombol **Gunakan otomatis** untuk kembali ke hasil rumus global. `Performance Bonus (%)` dan `Bonus Notes` dicatat sebagai informasi; nominal yang masuk ke perhitungan adalah field `Bonus (Rp)`.

## Catatan penting tentang penyimpanan dan keamanan

1. `localStorage` hanya tersedia pada browser dan origin yang sama. Data **tidak otomatis tersinkron** ke browser/perangkat lain, dan menghapus data situs/browser dapat menghapus arsip. Lakukan ekspor workbook Excel secara rutin dan simpan salinannya di lokasi aman.
2. Aplikasi tidak mengirim data master atau arsip ke database server. Pengiriman slip hanya mengirim file slip, Chat ID, nama, periode, dan bila dipakai token bot ke API route.
3. Token Telegram hanya dibaca dari `TELEGRAM_BOT_TOKEN` di server Vercel. Jangan pernah menaruh token di localStorage, source code, atau repository.
4. Slip PNG dibatasi maksimal 4 MB sebelum dikirim agar sesuai batas request body yang aman untuk Vercel Functions. Batch berjalan di browser; jangan tutup tab sampai selesai.
5. Nomor rekening hanya ditampilkan di master dan workbook internal bendahara. Komponen slip tidak memuat nomor rekening.
6. Login ini hanya satu password bendahara, belum menyediakan multi-user, role access, audit log server, atau enkripsi arsip lokal. Karena repository public, jangan commit file backup, data karyawan, atau slip gaji.

## Verifikasi sebelum digunakan

- Isi Global Settings dan cek tarif global.
- Tambahkan satu karyawan uji dengan rekening dan Chat ID sendiri.
- Buat slip periode uji, cocokkan rumus, lalu ekspor PNG/PDF.
- Backup dan restore periode uji.
- Uji kirim Telegram ke akun sendiri sebelum menjalankan batch karyawan.
- Simpan master dan backup bulanan di lokasi aman.
