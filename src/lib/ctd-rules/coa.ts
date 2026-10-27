import { CtdDossierInput, EvaluationFinding } from "./types";

export function evaluateCoa(d: CtdDossierInput): EvaluationFinding[] {
  const R: EvaluationFinding[] = [];
  const add = (
    p: string,
    f: string,
    s: string,
    st: "S" | "K" | "T",
    n: string,
    q: string
  ) => {
    R.push({ p, f, s, st, n, q });
  };

  const nb = Number(d.nbatch) || 0;

  add(
    "CoA API: jumlah batch",
    `${nb} batch`,
    "Minimal 3 batch berurutan skala pilot/komersial (BPOM 24/2017)",
    nb >= 3 ? "S" : "T",
    nb >= 3
      ? "Memenuhi jumlah minimal."
      : "Data konsistensi mutu belum memadai.",
    `Jumlah batch CoA bahan aktif hanya ${nb}; mohon lengkapi CoA dari minimal 3 batch produksi berurutan skala pilot atau komersial.`
  );

  const skala = d.skala || "Komersial";
  add(
    "CoA API: skala batch",
    skala,
    "Skala pilot atau komersial",
    skala === "Laboratorium" ? "T" : "S",
    skala === "Laboratorium"
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

  const std = d.std ?? "";
  add(
    "Standar spesifikasi API",
    std || "Tidak dinyatakan",
    "Kompendia (USP/BP/Ph.Eur/FI) atau In-House",
    std ? "S" : "T",
    std === "In-House"
      ? "In-House diterima; pastikan metode tervalidasi."
      : std
      ? "Memenuhi."
      : "Acuan spesifikasi belum disebutkan.",
    `Mohon jelaskan standar spesifikasi bahan aktif (kompendia atau in-house) beserta metode analisisnya.`
  );

  return R;
}
