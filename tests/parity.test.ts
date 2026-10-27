import { describe, it, expect } from "vitest";
import { analyze, CtdDossierInput, EvaluationFinding } from "../src/lib/ctd-rules";

// Reference implementation copied verbatim from tes.html
function referenceAnalyze(d: any): EvaluationFinding[] {
  const R: EvaluationFinding[] = [];
  const add = (p: string, f: string, s: string, st: any, n: string, q: string) =>
    R.push({ p, f, s, st, n, q });
  const nb = +d.nbatch;

  add(
    "CoA API: jumlah batch",
    `${nb} batch`,
    "Minimal 3 batch berurutan skala pilot/komersial (BPOM 24/2017)",
    nb >= 3 ? "S" : "T",
    nb >= 3 ? "Memenuhi jumlah minimal." : "Data konsistensi mutu belum memadai.",
    `Jumlah batch CoA bahan aktif hanya ${nb}; mohon lengkapi CoA dari minimal 3 batch produksi berurutan skala pilot atau komersial.`
  );
  add(
    "CoA API: skala batch",
    d.skala,
    "Skala pilot atau komersial",
    d.skala === "Laboratorium" ? "T" : "S",
    d.skala === "Laboratorium"
      ? "Batch skala laboratorium tidak mewakili produksi."
      : "Memenuhi.",
    `CoA bahan aktif berasal dari batch skala laboratorium; mohon sampaikan CoA batch skala pilot atau komersial.`
  );
  add(
    "CoA API: produsen terdaftar",
    d.terdaftar === "1" ? "Terdaftar" : "Tidak terdaftar",
    "CoA dari produsen bahan baku yang terdaftar",
    d.terdaftar === "1" ? "S" : "T",
    "Status registrasi produsen API perlu terverifikasi.",
    `Mohon lampirkan bukti registrasi produsen bahan aktif dan CoA yang diterbitkan oleh produsen tersebut.`
  );
  add(
    "CoA API: batch berurutan",
    d.urut === "1" ? "Dinyatakan berurutan" : "Tidak dinyatakan",
    "3 batch produksi berurutan",
    d.urut === "1" ? "S" : "K",
    "Keberurutan batch perlu dikonfirmasi.",
    `Mohon konfirmasi bahwa batch pada CoA merupakan batch produksi berurutan, disertai nomor batch dan tanggal produksi.`
  );
  add(
    "Standar spesifikasi API",
    d.std || "Tidak dinyatakan",
    "Kompendia (USP/BP/Ph.Eur/FI) atau In-House",
    d.std ? "S" : "T",
    d.std === "In-House"
      ? "In-House diterima; pastikan metode tervalidasi."
      : d.std
      ? "Memenuhi."
      : "Acuan spesifikasi belum disebutkan.",
    `Mohon jelaskan standar spesifikasi bahan aktif (kompendia atau in-house) beserta metode analisisnya.`
  );

  const t = +d.ltT,
    h = +d.ltH,
    okLT = Math.abs(t - 30) <= 2 && Math.abs(h - 75) <= 5,
    zI = t <= 26 && h <= 65;
  let stLT = okLT ? "S" : zI && d.barrier === "1" ? "K" : "T";
  add(
    "Stabilitas real-time: kondisi",
    `${t}°C / ${h}% RH`,
    "30°C ± 2°C / 75% RH ± 5% RH (Zona IVb)",
    stLT,
    okLT
      ? "Memenuhi Zona IVb."
      : stLT === "K"
      ? "Zona I/II dengan studi ekstrapolasi/barrier; evaluasi validitas studi."
      : "Data Zona I/II tidak dapat diterima tanpa ekstrapolasi/barrier tervalidasi.",
    okLT
      ? ""
      : `Studi stabilitas real-time dilakukan pada ${t}°C / ${h}% RH, tidak sesuai Zona IVb (30°C ± 2°C / 75% RH ± 5% RH). Mohon sampaikan data pada kondisi Zona IVb atau studi ekstrapolasi/kemasan barrier tinggi yang tervalidasi.`
  );

  const mLT = +d.ltM,
    missLT = [0, 3, 6, 9, 12].filter((v: number) => !d.ltI.includes(v));
  add(
    "Stabilitas real-time: data minimal",
    `${mLT} bulan`,
    "Minimal 12 bulan data real-time saat pengajuan",
    mLT >= 12 ? "S" : "T",
    mLT >= 12 ? "Memenuhi." : "Data belum mencapai 12 bulan.",
    `Data stabilitas real-time baru ${mLT} bulan; minimal 12 bulan pada kondisi Zona IVb saat pengajuan awal.`
  );
  add(
    "Stabilitas real-time: interval",
    d.ltI.join(", ") || "-",
    "0, 3, 6, 9, 12, 18, 24 bulan, lalu tahunan",
    missLT.length
      ? "T"
      : d.ltI.includes(18) && d.ltI.includes(24)
      ? "S"
      : "K",
    missLT.length
      ? `Interval ${missLT.join(", ")} bulan belum ada.`
      : d.ltI.includes(18) && d.ltI.includes(24)
      ? "Lengkap."
      : "Interval 18 dan 24 bulan belum tersedia; sertakan komitmen kelanjutan studi.",
    missLT.length
      ? `Interval pengujian real-time ${missLT.join(
          ", "
        )} bulan tidak tersedia; mohon lengkapi.`
      : `Mohon sampaikan komitmen dan jadwal kelanjutan pengujian real-time 18, 24 bulan dan seterusnya hingga shelf-life yang diajukan.`
  );

  const at = +d.acT,
    ah = +d.acH,
    okAC = Math.abs(at - 40) <= 2 && Math.abs(ah - 75) <= 5;
  add(
    "Stabilitas dipercepat: kondisi",
    `${at}°C / ${ah}% RH`,
    "40°C ± 2°C / 75% RH ± 5% RH",
    okAC ? "S" : "T",
    okAC ? "Memenuhi." : "Kondisi menyimpang.",
    `Kondisi uji dipercepat ${at}°C / ${ah}% RH tidak sesuai 40°C ± 2°C / 75% RH ± 5% RH; mohon lengkapi data pada kondisi yang sesuai.`
  );

  const AC = [0, 1, 3, 6];
  const missAC = AC.filter((v: number) => !d.acI.includes(v)),
    mAC = +d.acM;
  add(
    "Stabilitas dipercepat: durasi dan interval",
    `${mAC} bulan; interval ${d.acI.join(", ") || "-"}`,
    "Minimal 6 bulan; interval 0, 1, 3, 6",
    mAC >= 6 && !missAC.length ? "S" : "T",
    mAC < 6
      ? "Durasi kurang dari 6 bulan."
      : missAC.length
      ? `Interval ${missAC.join(", ")} bulan belum ada.`
      : "Memenuhi.",
    `Studi dipercepat harus berdurasi minimal 6 bulan dengan interval 0, 1, 3, 6 bulan${
      mAC < 6 ? ` (durasi saat ini ${mAC} bulan)` : ""
    }${missAC.length ? `; interval ${missAC.join(", ")} bulan belum tersedia` : ""}.`
  );

  {
    const VMA = [
      ["acc", "Akurasi"],
      ["rep", "Presisi: repeatability"],
      ["ip", "Presisi: intermediate precision"],
      ["spec", "Spesifisitas"],
      ["lod", "LOD/LOQ"],
      ["lin", "Linearitas"],
      ["range", "Range"],
      ["rob", "Robustness"],
    ];
    const proj = ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      MX: Record<string, string[]> = {
        ident: ["spec"],
        impq: ["acc", "rep", "ip", "spec", "lod", "lin", "range"],
        impl: ["spec", "lod"],
        assay: ["acc", "rep", "ip", "spec", "lin", "range"],
      },
      q2 = d.vmode === "q2",
      req = q2 ? MX[d.vproc] : proj,
      PN = ({
        ident: "uji identifikasi",
        impq: "uji impuritas kuantitatif",
        impl: "uji batas impuritas",
        assay: "assay (kadar)",
      } as any)[d.vproc];

    const src = q2
      ? `ICH Q2(R1), tabel karakteristik untuk ${PN}`
      : "Kriteria proyek: parameter wajib VMA";

    VMA.forEach(([k, n]) => {
      const has = d.vma.includes(k),
        need = req.includes(k);
      if (!need && !(q2 && k === "rob")) return;
      const soft = !need,
        st = has ? "S" : soft ? "K" : "T";
      const extra =
        !q2 && !has && !MX[d.vproc].includes(k) && k !== "rob"
          ? ` Catatan: ICH Q2(R1) tidak umum mengevaluasi parameter ini untuk ${PN}.`
          : "";
      add(
        "VMA: " + n,
        has ? "Tersedia" : "Tidak ditemukan",
        soft
          ? "ICH Q2(R1): robustness dipertimbangkan pada tahap pengembangan prosedur"
          : src,
        st,
        (has
          ? "Memenuhi."
          : soft
          ? "Data robustness belum ada."
          : "Parameter wajib belum divalidasi.") + extra,
        `Hasil validasi metode analisis untuk parameter ${n} tidak ditemukan; mohon lengkapi data dan kriteria penerimaan.`
      );
    });

    const Q = "ICH Q2(R1) ",
      V = d.vma;
    if (V.includes("lin"))
      add(
        "VMA: linearitas, jumlah konsentrasi",
        `${d.vlinN} konsentrasi`,
        Q + "Part II 2: minimal 5 konsentrasi",
        +d.vlinN >= 5 ? "S" : "T",
        +d.vlinN >= 5 ? "Memenuhi." : "Jumlah konsentrasi kurang.",
        `Linearitas hanya menggunakan ${d.vlinN} konsentrasi; mohon lengkapi minimal 5 konsentrasi beserta koefisien korelasi, y-intercept, slope, dan residual sum of squares serta plot data.`
      );

    const accOk = +d.vaccN >= 9 && +d.vaccL >= 3;
    if (V.includes("acc"))
      add(
        "VMA: akurasi, jumlah determinasi",
        `${d.vaccN} determinasi / ${d.vaccL} level`,
        Q + "Part II 4.3: minimal 9 determinasi pada minimal 3 level",
        accOk ? "S" : "T",
        accOk ? "Memenuhi." : "Data akurasi kurang dari rekomendasi.",
        `Data akurasi (${d.vaccN} determinasi pada ${d.vaccL} level) belum memenuhi minimal 9 determinasi pada minimal 3 level konsentrasi yang mencakup range; mohon lengkapi dengan persen recovery dan confidence interval.`
      );

    if (V.includes("rep"))
      add(
        "VMA: repeatability, jumlah determinasi",
        ({
          9: "9 determinasi (3x3)",
          6: "6 determinasi pada 100%",
          0: "Kurang dari minimal",
        } as any)[d.vrepC],
        Q +
          "Part II 5.1: minimal 9 determinasi (3x3) atau 6 determinasi pada 100% konsentrasi uji",
        d.vrepC === "0" ? "T" : "S",
        d.vrepC === "0" ? "Jumlah determinasi kurang." : "Memenuhi.",
        `Jumlah determinasi repeatability belum memenuhi minimal 9 determinasi (3 konsentrasi x 3 replikasi) atau 6 determinasi pada 100% konsentrasi uji; mohon sertakan SD, RSD, dan confidence interval.`
      );

    if (V.includes("range") && d.vproc === "assay") {
      const ok = +d.vlo <= 80 && +d.vhi >= 120;
      add(
        "VMA: range assay",
        `${d.vlo}-${d.vhi}%`,
        Q + "Part II 3: assay minimal 80-120% konsentrasi uji",
        ok ? "S" : "T",
        ok ? "Memenuhi." : "Range lebih sempit dari minimal.",
        `Range tervalidasi (${d.vlo}-${d.vhi}%) lebih sempit dari minimal 80-120% konsentrasi uji untuk assay; mohon lengkapi data linearitas, akurasi, dan presisi pada range tersebut.`
      );
    }
  }

  const P = "Lampiran III.B Perban BPOM 23/2025";
  add(
    "Praregistrasi: Ringkasan Dokumen Mutu (QOS)",
    d.qos === "1" ? "Ada" : "Tidak ada",
    P,
    d.qos === "1" ? "S" : "T",
    d.qos === "1" ? "Memenuhi." : "QOS tidak ditemukan.",
    "Mohon lampirkan Ringkasan Dokumen Mutu (Quality Overall Summary)."
  );
  add(
    "Praregistrasi: informasi bahan asal hewan",
    d.hewan === "1" ? "Ada" : "Tidak ada",
    P,
    d.hewan === "1" ? "S" : "K",
    d.hewan === "1" ? "Memenuhi." : "Informasi belum disampaikan.",
    "Mohon sampaikan informasi bahan bersumber hewan pada pembuatan zat aktif dan obat, atau pernyataan bahwa bahan tersebut tidak digunakan."
  );
  add(
    "Praregistrasi: DMF zat aktif",
    ({ 1: "Ada", 2: "Tidak diperlukan", 0: "Tidak ada" } as any)[d.dmf],
    P +
      " (zat aktif yang belum pernah digunakan pada obat berizin edar di Indonesia)",
    d.dmf === "0" ? "T" : "S",
    d.dmf === "0" ? "DMF diperlukan namun tidak tersedia." : "Memenuhi.",
    "Mohon lampirkan DMF atau dokumen setara dari produsen zat aktif."
  );
  add(
    "Praregistrasi: data ekivalensi",
    ({
      1: "Ringkasan/protokol",
      2: "Justifikasi tidak perlu uji",
      0: "Tidak ada",
    } as any)[d.eqv],
    P,
    d.eqv === "0" ? "T" : "S",
    d.eqv === "0" ? "Data atau justifikasi belum ada." : "Memenuhi.",
    "Mohon lampirkan ringkasan/protokol data ekivalensi atau justifikasi bahwa uji ekivalensi tidak diperlukan."
  );

  if (d.jalur === "90") {
    const lst = [
      "Uni Eropa",
      "Amerika Serikat",
      "Australia",
      "Kanada",
      "Inggris",
      "Jepang",
      "Swiss",
    ];
    const j = (p: string, ok: boolean, f: string, s: string, bad: string, q: string) =>
      add(p, f, s, ok ? "S" : "T", ok ? "Memenuhi." : bad, q);
    j(
      "Jalur 90 hari: negara referensi",
      lst.includes(d.refc),
      d.refc || "Belum dipilih",
      "UE, AS, Australia, Kanada, Inggris, Jepang, atau Swiss",
      "Bukan negara referensi yang ditetapkan.",
      "Negara referensi yang diajukan tidak termasuk daftar yang ditetapkan (Uni Eropa, Amerika Serikat, Australia, Kanada, Inggris, Jepang, Swiss); mohon sesuaikan atau ajukan melalui jalur evaluasi lain."
    );
    j(
      "Jalur 90 hari: usia persetujuan",
      d.ref5 === "1",
      d.ref5 === "1" ? "Dalam 5 tahun" : "Lebih dari 5 tahun",
      "Disetujui dalam 5 tahun terakhir",
      "Persetujuan melebihi 5 tahun.",
      "Persetujuan di negara referensi harus diperoleh dalam 5 tahun terakhir; mohon sampaikan bukti yang sahih."
    );
    j(
      "Jalur 90 hari: assessment report",
      d.ar === "1",
      d.ar === "1" ? "Ada" : "Tidak ada",
      "AR lengkap dalam Bahasa Inggris",
      "AR tidak tersedia.",
      "Mohon lampirkan dokumen assessment report lengkap dari otoritas negara referensi dalam Bahasa Inggris."
    );
    j(
      "Jalur 90 hari: surat pernyataan dan matriks mutu",
      d.pern === "1",
      d.pern === "1" ? "Ada" : "Tidak ada",
      "Pernyataan mutu sama (termasuk DMF) + matriks sandingan",
      "Dokumen pernyataan belum ada.",
      "Mohon lampirkan surat pernyataan bahwa seluruh aspek mutu (termasuk DMF) sama dengan yang disetujui di negara referensi, disertai matriks sandingan mutu."
    );
    j(
      "Jalur 90 hari: kesamaan aspek mutu",
      d.ident === "1",
      d.ident === "1" ? "Identik" : "Ada perbedaan",
      "Sumber bahan baku, formula, tempat produksi, spesifikasi rilis, dan shelf life sama",
      "Aspek mutu berbeda dari negara referensi.",
      "Terdapat perbedaan aspek mutu terhadap yang disetujui di negara referensi; seluruh aspek mutu harus sama, atau mohon ajukan melalui jalur evaluasi lain."
    );
    j(
      "Jalur 90 hari: kategori obat",
      d.kate === "0",
      d.kate === "1" ? "Kategori khusus" : "Bukan kategori khusus",
      "Bukan antiinfeksi/antivirus (HCV, HIV)/antimalaria/TB",
      "Memerlukan evaluasi khusus.",
      "Obat termasuk kategori yang memerlukan evaluasi khusus sehingga tidak dapat menggunakan jalur evaluasi 90 hari."
    );
  }
  return R;
}

// 12 Realistic and Edge Scenarios
const scenarios: { name: string; input: CtdDossierInput }[] = [
  {
    name: "Scenario 1: Clean fully compliant standard dossier",
    input: {
      produk: "Amoxicillin Kapsul 500 mg",
      api: "Amoxicillin Trihydrate",
      pemohon: "PT Farmasi Prima Farma",
      noreg: "REG-2026-0001",
      tgl: "26 Oktober 2026",
      batas: "30 hari kerja",
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 24,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
      cat: "Dossier lengkap dan memenuhi standar.",
    },
  },
  {
    name: "Scenario 2: Insufficient CoA batches and lab scale",
    input: {
      nbatch: 2,
      skala: "Laboratorium",
      std: "FI",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 3: Unregistered API producer and non-sequential batches",
    input: {
      nbatch: 4,
      skala: "Pilot",
      std: "BP",
      terdaftar: "0",
      urut: "0",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 4: In-House standard and missing standard",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "In-House",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 5: Zone I/II with valid barrier packaging (clarification)",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "Ph.Eur",
      terdaftar: "1",
      urut: "1",
      ltT: 25,
      ltH: 60,
      ltM: 12,
      barrier: "1",
      ltI: [0, 3, 6, 9, 12],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 6: Zone I/II without barrier packaging (gap)",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 25,
      ltH: 60,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 7: Short real-time duration and missing intermediate intervals",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 6,
      barrier: "0",
      ltI: [0, 6],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 8: Deviating accelerated stability conditions and short duration",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12],
      acT: 45,
      acH: 60,
      acM: 3,
      acI: [0, 3],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 9: ICH Q2(R1) mode with Impurity Quantitative procedure",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "impq",
      vmode: "q2",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "range"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 10: VMA validation deficits in linearity, accuracy, repeatability, and range",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "range", "rob"],
      vlinN: 3, // < 5
      vaccN: 6, // < 9
      vaccL: 2, // < 3
      vrepC: "0", // < min
      vlo: 90, // > 80
      vhi: 110, // < 120
      jalur: "",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 11: Route 90 days fully compliant",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "90",
      refc: "Uni Eropa",
      ref5: "1",
      ar: "1",
      pern: "1",
      kate: "0",
      ident: "1",
      qos: "1",
      hewan: "1",
      dmf: "1",
      eqv: "1",
    },
  },
  {
    name: "Scenario 12: Route 90 days with deficits (unrecognized ref, >5 years, missing AR, special drug category)",
    input: {
      nbatch: 3,
      skala: "Komersial",
      std: "USP",
      terdaftar: "1",
      urut: "1",
      ltT: 30,
      ltH: 75,
      ltM: 12,
      barrier: "0",
      ltI: [0, 3, 6, 9, 12, 18, 24],
      acT: 40,
      acH: 75,
      acM: 6,
      acI: [0, 1, 3, 6],
      vproc: "assay",
      vmode: "proj",
      vma: ["acc", "rep", "ip", "spec", "lod", "lin", "rob"],
      vlinN: 5,
      vaccN: 9,
      vaccL: 3,
      vrepC: "9",
      vlo: 80,
      vhi: 120,
      jalur: "90",
      refc: "India",
      ref5: "0",
      ar: "0",
      pern: "0",
      kate: "1",
      ident: "0",
      qos: "0",
      hewan: "0",
      dmf: "0",
      eqv: "0",
    },
  },
];

describe("CTD Compliance Rule Engine Parity Test", () => {
  scenarios.forEach(({ name, input }, index) => {
    it(`[Parity #${index + 1}] ${name}`, () => {
      const actual = analyze(input);
      const expected = referenceAnalyze(input);

      expect(actual.length).toBe(expected.length);
      expect(actual).toEqual(expected);

      // Verify each finding fields
      actual.forEach((act, i) => {
        const exp = expected[i];
        expect(act.p).toBe(exp.p);
        expect(act.f).toBe(exp.f);
        expect(act.s).toBe(exp.s);
        expect(act.st).toBe(exp.st);
        expect(act.n).toBe(exp.n);
        expect(act.q).toBe(exp.q);
      });
    });
  });
});
