import { CtdDossierInput, EvaluationFinding } from "./types";

export interface LetterOptions {
  nomorSurat?: string;
  tanggalSurat?: string;
  penandatanganNama?: string;
  penandatanganJabatan?: string;
}

export function generateDeficiencyLetter(
  d: CtdDossierInput,
  findings: EvaluationFinding[],
  options?: LetterOptions
): string {
  const defs = findings.filter((r) => r.st !== "S");
  const L: string[] = [];

  const nomor = options?.nomorSurat || "........................";
  const tanggal =
    options?.tanggalSurat || d.tgl || "........................";
  const penandatangan =
    options?.penandatanganNama
      ? `(${options.penandatanganNama})\n${options.penandatanganJabatan || ""}`.trim()
      : "(Tim Evaluator Mutu Obat Jadi)";

  L.push(
    `Nomor   : ${nomor}`,
    `Perihal : Permintaan Data Tambahan (Deficiency Letter) Dokumen Mutu`,
    `Tanggal : ${tanggal}`,
    "",
    `Kepada Yth.`,
    `${d.pemohon || "[Nama Pemohon Registrasi]"}`,
    "",
    `Dengan hormat,`,
    "",
    `Sehubungan dengan evaluasi Dokumen Mutu (Modul 3 / Bagian II ACTD) untuk produk ${
      d.produk || "[nama produk]"
    } dengan bahan aktif ${d.api || "[bahan aktif]"}${
      d.noreg ? ` (ref. ${d.noreg})` : ""
    }, berdasarkan Peraturan Kepala BPOM No. 24 Tahun 2017 sebagaimana telah diubah terakhir dengan Peraturan BPOM No. 23 Tahun 2025, serta ASEAN Stability Guideline (Zona IVb) dan ICH Q2(R1), kami menemukan hal-hal berikut yang memerlukan klarifikasi dan data tambahan:`,
    ""
  );

  if (!defs.length) {
    L.push("Tidak terdapat kekurangan data pada parameter yang ditelaah.");
  } else {
    defs.forEach((r, i) =>
      L.push(`${i + 1}. [${r.st === "T" ? "Mayor" : "Minor"}] ${r.q}`)
    );
  }

  L.push(
    "",
    `Mohon tanggapan tertulis disertai data pendukung disampaikan dalam waktu ${
      d.batas || "[....] hari kerja"
    } sejak surat ini diterima. Evaluasi akan dilanjutkan setelah data dinyatakan lengkap.`,
    "",
    `Demikian disampaikan, atas perhatian dan kerja sama Saudara kami ucapkan terima kasih.`,
    "",
    `Hormat kami,`,
    "",
    "",
    penandatangan
  );

  return L.join("\n");
}
