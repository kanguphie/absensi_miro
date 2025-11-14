# Panduan Instalasi Backend di aaPanel

Dokumen ini menjelaskan cara menginstal dan menjalankan backend Sistem Absensi RFID menggunakan aaPanel. Sistem ini dirancang untuk berjalan secara otomatis, di mana tabel database dan data awal akan dibuat sendiri saat server pertama kali dijalankan.

## Prasyarat

1.  Server dengan **aaPanel** yang sudah terinstal.
2.  **MySQL** sudah terinstal di aaPanel.
3.  **Node.js Version Manager** sudah terinstal dari App Store aaPanel.

## Langkah 1: Persiapan Database

Anda hanya perlu membuat database kosong. Tabel akan dibuat secara otomatis oleh aplikasi.

1.  Login ke aaPanel.
2.  Buka menu **Databases**.
3.  Klik **Add Database**.
4.  Isi **Database name**, **Username**, dan **Password**. Simpan informasi ini karena akan digunakan nanti.
5.  Klik **Submit**.

## Langkah 2: Unggah File Proyek

1.  Buka menu **Files**.
2.  Navigasi ke direktori tujuan, misalnya `/www/wwwroot/domain-anda.com`.
3.  Unggah file ZIP proyek Anda, lalu ekstrak. Pastikan folder `backend` berada di dalam direktori ini.

## Langkah 3: Setup Proyek Node.js

1.  Buka menu **Website**.
2.  Pilih tab **Node project**.
3.  Klik **Add Node project**.
4.  Isi formulir dengan konfigurasi berikut:
    *   **Project path**: Arahkan ke folder `backend` yang sudah Anda unggah.
    *   **Project name**: Beri nama proyek (misal: `absensi-backend`).
    *   **Node version**: Pilih versi Node.js yang stabil (disarankan v18 atau lebih baru).
    *   **Run file**: `server.js`.
    *   **Port**: Masukkan port yang akan digunakan, misalnya `3001`.
    *   **Install dependencies**: Centang kotak ini agar `npm install` dijalankan secara otomatis.
5.  Klik **Submit**. Tunggu hingga proses instalasi dependensi selesai.

## Langkah 4: Konfigurasi Environment (.env)

Aplikasi memerlukan beberapa variabel lingkungan untuk terhubung ke database dan mengamankan otentikasi.

1.  Kembali ke menu **Files**.
2.  Masuk ke dalam folder `backend`.
3.  Buat file baru dengan nama `.env`.
4.  Salin konten di bawah ini, tempelkan ke dalam file `.env`, dan sesuaikan nilainya.

```env
# Konfigurasi Database
# Ganti dengan informasi database yang Anda buat di Langkah 1
DB_HOST=localhost
DB_PORT=3306
DB_USER=absenmiro_db
DB_PASS=bhZ6ZHf5jbeDhwsT
DB_NAME=absenmiro_db

# Konfigurasi Aplikasi
# Port harus sama dengan yang diatur di Node project aaPanel
PORT=3001

# Kunci Rahasia untuk JSON Web Token (JWT)
# Ganti dengan string acak yang sangat panjang dan rahasia untuk keamanan
JWT_SECRET=GANTI_DENGAN_KUNCI_RAHASIA_ANDA_YANG_SANGAT_AMAN
```

**Penting:**
*   Pastikan `PORT` di file `.env` sama dengan port yang Anda masukkan saat membuat Node project.
*   Isi `JWT_SECRET` dengan teks acak yang panjang untuk mengamankan sesi login.

## Langkah 5: Jalankan dan Verifikasi Proyek

1.  Kembali ke menu **Website** > **Node project**.
2.  Temukan proyek Anda dan klik **Start**.
3.  Jika proyek berjalan tanpa masalah, status akan berubah menjadi "Running".
4.  Untuk memeriksa log jika terjadi error, klik tombol **Log**.

Setelah server berhasil berjalan, aplikasi akan:
- Terhubung ke database MySQL.
- Membuat semua tabel yang diperlukan secara otomatis (`users`, `students`, `schoolclasses`, dll.).
- Mengisi database dengan data awal (akun admin default, daftar kelas, dan beberapa siswa contoh).

## Langkah 6: (Opsional) Mapping Domain / Reverse Proxy

Agar API dapat diakses melalui domain (misalnya `api.domain-anda.com`), Anda perlu mengatur reverse proxy.

1.  Di daftar **Node project**, klik nama proyek Anda atau tombol **Domain**.
2.  Masukkan domain atau subdomain yang Anda inginkan.
3.  Klik **Submit**. aaPanel akan secara otomatis mengonfigurasi Nginx sebagai reverse proxy.

---

Backend Anda sekarang sudah siap digunakan! Frontend dapat dihubungkan ke alamat IP server beserta portnya, atau ke domain yang sudah Anda mapping.
