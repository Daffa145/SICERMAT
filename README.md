# CERMAT (Compliance Evaluation & Review Mutu)

CERMAT adalah sistem aplikasi web internal untuk menelaah dokumen Modul 3 (Mutu) CTD/ACTD obat jadi oleh evaluator Badan Pengawas Obat dan Makanan (BPOM). Sistem ini berjalan 100% lokal tanpa ketergantungan cloud, layanan eksternal, maupun API AI.

Sistem mengevaluasi:
- **CoA Bahan Aktif**: Jumlah batch (minimal 3), skala produksi (pilot/komersial), status produsen terdaftar, standar spesifikasi kompendia/in-house, keberurutan batch (PerKa BPOM 24/2017).
- **Stabilitas Obat Jadi**: Kondisi real-time Zona IVb (30°C ± 2°C / 75% RH ± 5% RH, minimal 12 bulan) dan accelerated (40°C ± 2°C / 75% RH ± 5% RH, minimal 6 bulan) sesuai ASEAN Stability Guideline.
- **Validasi Metode Analisis (VMA)**: Kriteria ICH Q2(R1) untuk parameter akurasi, presisi (repeatability & intermediate precision), spesifisitas, LOD/LOQ, linearitas, range, dan robustness.
- **Praregistrasi & Jalur Evaluasi**: Kelengkapan QOS, bahan asal hewan, DMF, data ekivalensi, serta ketentuan khusus Jalur 90 Hari (PerBPOM 23/2025).

---

## 1. Persyaratan Sistem
- Node.js versi 18 atau lebih baru (direkomendasikan Node.js 20+)
- npm versi 9 atau lebih baru
- Sistem Operasi: Windows, macOS, atau Linux

---

## 2. Cara Instalasi dan Menjalankan

Aplikasi dapat dijalankan dari kondisi awal dengan satu rangkaian perintah:

```bash
npm install && npm run setup && npm run dev
```

Perintah `npm run setup` secara otomatis menyinkronkan skema database ke MySQL dan mengisi data awal (seeding) ke database `cermat`.

Setelah server berjalan, buka peramban web di:
```
http://localhost:3000
```

---

## 3. Integrasi Database MySQL & phpMyAdmin

Aplikasi menggunakan database MySQL yang dapat diakses dan dikelola langsung melalui **phpMyAdmin** (seperti pada Laragon, XAMPP, atau instalasi MySQL lokal lainnya).

### Konfigurasi Koneksi (`.env`)
```env
DATABASE_URL="mysql://root:@localhost:3306/cermat"
```

### Akses phpMyAdmin
1. Pastikan layanan Apache & MySQL aktif (misalnya di Laragon atau XAMPP).
2. Buka peramban dan akses:
   ```
   http://localhost/phpmyadmin
   ```
3. Pilih database **`cermat`** di panel kiri untuk melihat seluruh tabel:
   - `user`, `role`, `permission`, `rolepermission`
   - `case`, `caseversion`, `casecomment`
   - `auditlog`, `systemsetting`

### File Backup / Dump SQL Langsung
File skema & data siap impor juga disediakan di root project:
- **`cermat.sql`**: Dapat langsung diimpor ke phpMyAdmin via tab **Import**.

---

## 4. Akun Pengguna Awal (Seed Data)

Berikut adalah daftar kredensial akun bawaan untuk pengujian:

| Peran (Role) | Username | Password Awal | Keterangan |
|---|---|---|---|
| **Administrator** | `admin` | `AdminPassword123!` | Wajib mengganti password pada saat login pertama kali |
| **Kepala Evaluator** | `kepala_evaluator` | `KepalaPassword123!` | Memiliki wewenang review, finalisasi kasus, dan melihat audit |
| **Evaluator** | `evaluator1` | `EvaluatorPassword123!` | Mengelola dossier miliknya sendiri dan menjalankan analisis |
| **Pengamat** | `pengamat1` | `PengamatPassword123!` | Hanya dapat melihat dossier dan mengunduh berkas |

---

## 5. Pencadangan Database (Backup)

Pencadangan database MySQL menghasilkan file `.sql` ber-timestamp:

### Cara 1: Melalui Antarmuka Pengguna (UI)
1. Masuk sebagai akun dengan hak akses `settings.manage` (misalnya `admin`).
2. Buka menu **Pengaturan & Backup**.
3. Klik tombol **Cadangkan Database Sekarang**.

### Cara 2: Melalui Terminal (CLI)
Jalankan perintah berikut:
```bash
npm run backup
```
File backup akan tersimpan di `./data/backup/cermat-YYYYMMDD-HHmm.sql`.

---

## 5. Pengujian Kualitas Kode (Quality Assurance)

Sistem dilengkapi rangkaian pengujian unit dan pengecekan tipe ketat:

- **Uji Paritas Rule Engine (Vitest)**:
  ```bash
  npm test
  ```
  Membandingkan keluaran engine baru terhadap 12 skenario pengujian dengan hasil fungsi `analyze()` pada prototipe referensi `tes.html`.
- **Pemeriksaan Tipe TypeScript**:
  ```bash
  npm run typecheck
  ```
- **Pemeriksaan Linter**:
  ```bash
  npm run lint
  ```
- **Kompilasi Produksi**:
  ```bash
  npm run build
  ```

---

## 6. Struktur Direktori

```
CERMAT/
├── data/                      # File database SQLite & direktori backup (gitignored)
│   ├── cermat.db
│   └── backup/
├── prisma/
│   ├── schema.prisma          # Definisi skema ERD Prisma
│   ├── migrations/            # Berkas migrasi SQL
│   └── seed.ts                # Skrip pengisian data awal
├── scripts/
│   └── backup.ts              # Skrip CLI cadangan database
├── src/
│   ├── app/
│   │   ├── (auth)/            # Rute otentikasi (login, ganti password)
│   │   ├── (app)/             # Rute aplikasi internal
│   │   │   ├── dashboard/     # Halaman utama ringkasan metrik
│   │   │   ├── cases/         # Manajemen kasus, form bertahap, dan detail
│   │   │   ├── users/         # Manajemen pengguna & reset password
│   │   │   ├── roles/         # Matriks centang Role & Permission (RBAC)
│   │   │   ├── audit/         # Penampil audit trail
│   │   │   └── settings/      # Pengaturan instansi & pencadangan
│   │   └── api/               # API route handlers (ekspor .docx dan .json)
│   ├── components/            # Komponen antarmuka (sidebar, header, form, tema)
│   ├── lib/
│   │   ├── auth/              # Sesi cookie bertanda tangan (jose) & hash bcrypt
│   │   ├── rbac/              # Helper server requirePermission & checkPermission
│   │   ├── ctd-rules/         # Rule engine murni CTD Modul 3 (tanpa dependensi UI/DB)
│   │   ├── export/            # Generator naskah surat dinas Word (.docx) asli
│   │   ├── audit.ts           # Helper pencatat audit log
│   │   ├── prisma.ts          # Singleton Prisma Client
│   │   └── utils.ts           # Utilitas format tanggal & styling
│   └── middleware.ts          # Middleware pengalihan rute login
└── tests/
    └── parity.test.ts         # Uji paritas 12 skenario terhadap tes.html
```

---

## 7. Keputusan Desain

1. **Penyimpanan Sesi Pengguna**: Menggunakan JSON Web Token (JWT) dengan algoritma HS256 yang ditandatangani oleh pustaka `jose`, disimpan pada cookie `cermat_session` dengan atribut `httpOnly`, `sameSite: lax`, dan masa kedaluwarsa 8 jam.
2. **Pencegahan Brute-Force**: Kegagalan login dipantau pada setiap akun. Setelah 5 kali kegagalan berturut-turut, akun dikunci sementara selama 5 menit (`lockedUntil`) dan dicatat pada audit log.
3. **Penyimpanan Nilai Teknis Form Dossier**: Kolom `rawFormData` pada entitas `Case` dan snapshot `CaseVersion` menyimpan 38+ parameter input teknis dalam format JSON terstruktur untuk menjaga fleksibilitas parameter evaluasi tanpa memerlukan puluhan relasi database yang memperlambat query.
4. **Pencegahan Kuncian Akses (Lockout Protection)**: Sistem secara ketat menolak penonaktifan akun Administrator terakhir serta menolak pencabutan hak akses `role.manage` pada peran Administrator baik melalui form pengguna maupun matriks hak akses.
5. **Ekspor Microsoft Word Asli**: Dokumen Deficiency Letter dihasilkan sebagai file biner `.docx` murni menggunakan pustaka `docx`, menggunakan font Times New Roman 12pt, margin dinas resmi (kiri 3 cm, kanan 2.5 cm, atas/bawah 2.5 cm), nomor surat instansi resmi, penomoran butir temuan, dan penandaan `[Mayor]` atau `[Minor]`.
