# web-kompascom

Prototype situs mobile Kompas.com — multi-page (MPA) statis yang dibangun dengan [Vite](https://vitejs.dev/).

## Menjalankan

```bash
npm install      # sekali saja
npm run dev      # dev server dengan hot-reload (http://localhost:5173)
npm run build    # build produksi ke folder dist/
npm run preview  # pratinjau hasil build
```

> Buka lewat `npm run dev`, bukan dengan meng-klik file `.html` langsung
> (modul ES & import CSS butuh dev server / hasil build).

## Struktur

```
.
├── *.html                  # halaman (entry MPA), satu <script type="module"> per halaman
├── public/
│   └── assets/             # gambar, video, svg, audio — direferensikan sebagai /assets/...
├── src/
│   ├── js/
│   │   ├── data.js         # data konten mock untuk feed home
│   │   ├── utils/dom.js    # helper DOM bersama (makeClickable, goTo)
│   │   ├── home/           # modul khusus home: render, article-links, audio-player, plus-sheet
│   │   ├── main.js         # entry home (index.html)
│   │   └── <halaman>.js    # entry per halaman lain
│   └── styles/
│       ├── common.css      # base + layout + komponen (dimuat di SEMUA halaman)
│       └── pages/*.css     # style spesifik per halaman (dimuat hanya di halaman terkait)
├── vite.config.js          # daftar entry MPA
└── package.json
```

### Peta halaman → entry

| Halaman                | Entry JS                     | Style halaman                     |
| ---------------------- | ---------------------------- | --------------------------------- |
| `index.html`           | `src/js/main.js`             | `src/styles/pages/home.css`       |
| `article-detail.html`  | `src/js/article-detail.js`   | `src/styles/pages/article.css`    |
| `karin-chat.html`      | `src/js/karin-chat.js`       | `src/styles/pages/karin.css`      |
| `original-index.html`  | `src/js/original-index.js`   | `src/styles/pages/original-index.css` |
| `original-detail.html` | `src/js/original-detail.js`  | `src/styles/pages/original-detail.css` |
| `original-reader.html` | `src/js/original-reader.js`  | `src/styles/pages/original-reader.css` |
| `laya-read.html`       | `src/js/laya-read.js`        | `src/styles/pages/laya.css`       |
| `account.html`         | `src/js/account.js`          | `src/styles/pages/account.css`    |
| `membership.html`      | `src/js/membership.js`       | `src/styles/pages/membership.css` |

## Konvensi

- **Aset** selalu direferensikan dengan path absolut `/assets/...` (folder `public/`).
- **CSS bersama** masuk `common.css`; style yang jelas hanya dipakai satu halaman masuk `pages/<halaman>.css`.
- **JS** memakai ES module; logika yang dipakai lintas halaman ditaruh di `src/js/utils/`.
