const stories = [
  {
    tag: "News",
    title: "7 Menteri Prabowo yang Paling Banyak Disorot Publik Pekan Ini",
    meta: "Dibaca 2 jam lalu",
    image: "https://images.unsplash.com/photo-1541872705-1f73c6400ec9?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Tren",
    title: "Cara Cek Tarif Tol dan Aturan Perjalanan Sebelum Berangkat",
    meta: "Dibaca 3 jam lalu",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Money",
    title: "Harga Emas Hari Ini Menguat, Simak Rincian Terbarunya",
    meta: "Dibaca 4 jam lalu",
    image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Global",
    title: "Negara Asia Tenggara Sepakati Kerja Sama Energi Bersih",
    meta: "Diperbarui 5 jam lalu",
    image: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Health",
    title: "Dokter Jelaskan Kebiasaan Sederhana untuk Menjaga Daya Tahan Tubuh",
    meta: "Dibaca 6 jam lalu",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Tekno",
    title: "Fitur AI Baru Mulai Hadir di Aplikasi Produktivitas Populer",
    meta: "Dibaca 7 jam lalu",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Bola",
    title: "Jadwal Liga Pekan Ini dan Kabar Pemain yang Cedera",
    meta: "Dibaca 8 jam lalu",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Lifestyle",
    title: "Gaya Hidup Gen Z Mengubah Cara Brand Berkomunikasi",
    meta: "Dibaca 9 jam lalu",
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Regional",
    title: "Warga Gotong Royong Bersihkan Sungai Setelah Hujan Deras",
    meta: "Dibaca 10 jam lalu",
    image: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Edukasi",
    title: "Beasiswa Baru Dibuka, Ini Syarat dan Jadwal Pendaftarannya",
    meta: "Dibaca 11 jam lalu",
    image: "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=500&q=80",
  },
];

const updates = [
  {
    tag: "Megapolitan",
    title: "Transportasi Umum Tambah Armada saat Jam Sibuk",
    meta: "18 menit lalu",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Sains",
    title: "Peneliti Ungkap Fenomena Cuaca yang Perlu Diwaspadai",
    meta: "25 menit lalu",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Properti",
    title: "Kawasan Baru Jadi Incaran Pembeli Rumah Pertama",
    meta: "36 menit lalu",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Food",
    title: "Resep Sarapan Praktis yang Cocok untuk Hari Kerja",
    meta: "42 menit lalu",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=500&q=80",
  },
];

const railItems = [
  {
    tag: "VOD",
    title: "Video detik-detik pejabat menjelaskan kebijakan baru",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "News",
    title: "Pakar Ungkap Sektor yang Perlu Diwaspadai Tahun Ini",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Tren",
    title: "Fenomena Baru di Media Sosial yang Ramai Dibahas",
    image: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=500&q=80",
  },
  {
    tag: "Money",
    title: "Strategi Mengatur Belanja Bulanan Saat Harga Naik",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=500&q=80",
  },
];

function createStory(story) {
  const article = document.createElement("article");
  article.className = "story";
  article.innerHTML = `
    <img src="${story.image}" alt="" loading="lazy" />
    <div>
      <span class="label">${story.tag}</span>
      <h3>${story.title}</h3>
      <p>${story.meta}</p>
    </div>
  `;
  return article;
}

function createPopularStory(story, index) {
  const article = document.createElement("article");
  article.className = "story popular-story";
  article.innerHTML = `
    <div class="popular-media">
      <img src="${story.image}" alt="" loading="lazy" />
      <span>${index + 1}</span>
    </div>
    <div>
      <h3>${story.title}</h3>
      <p>${story.tag}</p>
    </div>
  `;
  return article;
}

function createRailCard(story) {
  const article = document.createElement("article");
  article.innerHTML = `
    <img src="${story.image}" alt="" loading="lazy" />
    <span class="label">${story.tag}</span>
    <h3>${story.title}</h3>
  `;
  return article;
}

function renderList(id, items) {
  const target = document.getElementById(id);
  items.forEach((item) => target.appendChild(createStory(item)));
}

function renderPopularList(id, items) {
  const target = document.getElementById(id);
  items.forEach((item, index) => target.appendChild(createPopularStory(item, index)));
}

function renderRail(id, items) {
  const target = document.getElementById(id);
  items.forEach((item) => target.appendChild(createRailCard(item)));
}

renderPopularList("popularList", stories.slice(0, 5));
renderList("columnList", stories.slice(2, 5));
renderList("recommendationList", [...stories.slice(4), ...updates, ...stories.slice(0, 4)]);
renderList("appointmentList", stories.slice(0, 5));
renderList("moneyList", [...stories.slice(2, 6), ...updates.slice(0, 2)]);
renderList("genzList", stories.slice(5, 10));
renderRail("newsRail", [...updates, ...stories.slice(0, 2)]);
renderRail("shortRail", railItems);
renderRail("moneyRail", [railItems[3], ...updates.slice(1, 4)]);
renderRail("commentedRail", [stories[8], stories[1], updates[0]]);
renderRail("photoRail", [stories[8], stories[4], updates[2]]);
