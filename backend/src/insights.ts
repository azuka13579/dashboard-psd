import { model, type Row } from "./db";

type Summary = Record<string, any> & { n: number; clusters: { cluster: number; n: number }[] };

const fmt = (v: number, d = 1) => v.toLocaleString("id-ID", { maximumFractionDigits: d, minimumFractionDigits: d });
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/** Rekomendasi tindak lanjut per tipe zona hasil clustering. */
const REKOMENDASI: Record<number, { sektor: string; isi: string }[]> = {
  0: [
    { sektor: "Kesehatan", isi: "Siapkan peringatan dini paparan panas dan ketersediaan air minum di ruang publik pada siang hari." },
    { sektor: "Pertanian", isi: "Prioritaskan irigasi tetes dan varietas tahan kering; jadwalkan penyiraman pagi atau sore hari." },
    { sektor: "Kebencanaan", isi: "Tingkatkan patroli titik api karena kombinasi suhu tinggi, udara kering, dan angin kencang mempercepat penyebaran kebakaran." },
  ],
  1: [
    { sektor: "Pertanian", isi: "Kondisi cerah dan lembap cocok untuk hortikultura; pantau embun pagi yang memicu penyakit jamur." },
    { sektor: "Energi", isi: "Tutupan awan rendah mendukung pemanfaatan panel surya sebagai sumber energi alternatif." },
    { sektor: "Pariwisata", isi: "Iklim sejuk dan cerah dapat dioptimalkan untuk agenda wisata alam dan kegiatan luar ruang." },
  ],
  2: [
    { sektor: "Kebencanaan", isi: "Siagakan pemantauan curah hujan, longsor, dan banjir karena zona ini paling sering mengalami hujan." },
    { sektor: "Transportasi", isi: "Sampaikan informasi jarak pandang dan kondisi jalan licin kepada pengguna jalan dan penerbangan perintis." },
    { sektor: "Pertanian", isi: "Perbaiki drainase lahan dan sesuaikan jadwal panen serta pengeringan hasil panen dengan prakiraan cuaca." },
  ],
};

export function buildInsights(provinsi: string | undefined, s: Summary, nat: Summary, rows: Row[]) {
  const wilayah = provinsi ?? "Indonesia";
  const by = <K extends keyof Row>(k: K, dir: 1 | -1) => [...rows].sort((a, b) => dir * ((a[k] as number) - (b[k] as number)))[0]!;
  const hottest = by("suhu_C", -1);
  const coolest = by("suhu_C", 1);
  const windiest = by("kecepatan_angin", -1);
  const dominant = [...s.clusters].sort((a, b) => b.n - a.n)[0]!;
  const domInfo = model.clusters[dominant.cluster]!;

  const insights: { judul: string; isi: string }[] = [];

  insights.push({
    judul: "Zona iklim dominan",
    isi: `${fmt((dominant.n / s.n) * 100, 0)}% dari ${s.n.toLocaleString("id-ID")} kecamatan di ${wilayah} termasuk zona ${domInfo.nama}. ${domInfo.deskripsi}`,
  });

  insights.push({
    judul: "Rentang suhu",
    isi: `Suhu tertinggi tercatat di ${titleCase(hottest.kecamatan)}, ${hottest.provinsi} (${fmt(hottest.suhu_C)} °C) dan terendah di ${titleCase(coolest.kecamatan)}, ${coolest.provinsi} (${fmt(coolest.suhu_C)} °C), selisih ${fmt(hottest.suhu_C - coolest.suhu_C)} °C.`,
  });

  if (provinsi) {
    const diff = s.suhu_C - nat.suhu_C;
    insights.push({
      judul: "Dibanding rata-rata nasional",
      isi: `Rata-rata suhu ${wilayah} ${fmt(s.suhu_C)} °C, ${diff >= 0 ? "lebih panas" : "lebih sejuk"} ${fmt(Math.abs(diff))} °C dari rata-rata nasional. Kelembapan ${fmt(s.kelembapan, 0)}% (nasional ${fmt(nat.kelembapan, 0)}%).`,
    });
  } else {
    insights.push({
      judul: "Hubungan suhu dan kelembapan",
      isi: "Suhu berkorelasi negatif kuat dengan kelembapan (r = -0,70): wilayah yang lebih panas cenderung lebih kering. Pola ini menjadi pemisah utama antar-cluster.",
    });
  }

  insights.push({
    judul: "Potensi hujan",
    isi: `${fmt(s.pct_hujan)}% kecamatan di ${wilayah} sedang mengalami hujan${provinsi ? ` (nasional ${fmt(nat.pct_hujan)}%)` : ""}. Hujan terkonsentrasi di zona Lembap-Berawan.`,
  });

  insights.push({
    judul: "Angin",
    isi: `Angin terkencang di ${titleCase(windiest.kecamatan)}, ${windiest.provinsi} (${fmt(windiest.kecepatan_angin, 2)} m/s). Rata-rata kecepatan angin ${fmt(s.kecepatan_angin, 2)} m/s.`,
  });

  const rekomendasi = s.clusters
    .filter((c) => c.n / s.n >= 0.1)
    .sort((a, b) => b.n - a.n)
    .map((c) => ({
      cluster: c.cluster,
      nama: model.clusters[c.cluster]!.nama,
      porsi: c.n / s.n,
      items: REKOMENDASI[c.cluster]!,
    }));

  return { wilayah, insights, rekomendasi };
}
