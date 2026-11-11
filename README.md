# Zonasi Iklim Kecamatan Indonesia

Dashboard analisis cuaca per kecamatan dengan K-Means clustering dan interpolasi spasial IDW.

```
Data hujan.csv
   │  notebooks/clustering.ipynb  (Python: pandas, scikit-learn)
   ▼
backend/data/weather.db + model.json
   │  backend/  (Bun + Elysia + SQLite)
   ▼
JSON API /api/*
   │  frontend/ (React + Vite + ECharts + Leaflet)
   ▼
Dashboard 3 halaman
```

## Menjalankan

Kebutuhan: Python 3.11+, Bun 1.3+.

### 1. Notebook (hanya jika data berubah)

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r notebooks/requirements.txt
cd notebooks
../.venv/Scripts/python build_notebook.py
../.venv/Scripts/jupyter nbconvert --to notebook --execute --inplace clustering.ipynb
```

Notebook menulis `backend/data/weather.db` dan `backend/data/model.json`.
Hentikan backend dulu sebelum menjalankan ulang, karena file database sedang dipakai.
Notebook juga bisa dibuka langsung di Jupyter atau VS Code.

### 2. Backend (port 3000)

```bash
cd backend
bun install
bun run dev
```

### 3. Frontend (port 5173)

```bash
cd frontend
bun install
bun run dev
```

Buka http://localhost:5173. Vite meneruskan `/api` ke backend di port 3000.

### Mode produksi (satu server)

```bash
cd frontend && bun run build
cd ../backend && bun run start
```

Backend akan menyajikan `frontend/dist` sekaligus API di http://localhost:3000.

## CI/CD: GitHub Actions ke GitHub Packages

Workflow [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml) berjalan setiap push ke
`master` (atau manual lewat tab Actions → Run workflow), lalu mendorong dua image ke GitHub Container Registry:

| Package | Isi | Tag |
|---|---|---|
| `ghcr.io/<owner>/dashboard-web` | Frontend (Nginx) | `main-YYYYMMDD-HHMMSS` |
| `ghcr.io/<owner>/dashboard-api` | Backend (Bun + Elysia + SQLite) | `main-YYYYMMDD-HHMMSS` |

Tanggal dan waktu memakai WIB, misalnya `main-20261111-143052`. Setiap push menghasilkan tag baru.
Tidak perlu secret tambahan karena workflow memakai `GITHUB_TOKEN` bawaan.

Menjalankan image dari registry:

```bash
OWNER=<username-github> TAG=main-20261111-143052 docker compose up -d
```

Buka http://localhost:8080. Container web meneruskan `/api` ke `dashboard-api:3000`
(bisa diubah lewat env `API_UPSTREAM`).

## Endpoint API

| Endpoint | Keterangan |
|---|---|
| `GET /api/meta` | Info data, kamus kolom, statistik EDA, log preprocessing |
| `GET /api/model` | Elbow, silhouette, profil cluster, centroid, evaluasi IDW |
| `GET /api/pca` | Koordinat PCA 2D per kecamatan |
| `GET /api/provinces` | Rata-rata metrik per provinsi |
| `GET /api/points?provinsi=` | Titik kecamatan untuk peta |
| `GET /api/summary?provinsi=` | KPI, komposisi cluster, kategori cuaca |
| `GET /api/ranking?metric=&order=top\|bottom&provinsi=&n=` | Peringkat top/bottom |
| `GET /api/interpolate?lat=&lon=` | Estimasi IDW + prediksi zona cluster |
| `GET /api/insights?provinsi=` | Insight dan rekomendasi otomatis |

`metric`: `suhu_C`, `kelembapan`, `kecepatan_angin`, `tutupan_awan`, `tekanan`.

## Catatan kualitas data

Sekitar 10% koordinat kecamatan di data sumber salah geocoding (misalnya kecamatan Surabaya yang
tercatat di Laut Jawa). Notebook membuang 620 titik yang terdeteksi dengan aturan provinsi dan kabupaten.
Sebagian kecil kesalahan yang mengumpul dalam satu kabupaten masih lolos. Untuk memperbaikinya secara
tuntas, perlu koordinat resmi kecamatan (BPS/BIG) sebagai acuan.
