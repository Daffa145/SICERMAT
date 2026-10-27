import { CtdDossierInput, EvaluationFinding } from "./types";

export function evaluatePreregistration(
  d: CtdDossierInput
): EvaluationFinding[] {
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

  const dmfMap: Record<string, string> = {
    "1": "Ada",
    "2": "Tidak diperlukan",
    "0": "Tidak ada",
  };
  const dmfKey = String(d.dmf ?? "0");
  add(
    "Praregistrasi: DMF zat aktif",
    dmfMap[dmfKey] || "Tidak ada",
    P + " (zat aktif yang belum pernah digunakan pada obat berizin edar di Indonesia)",
    d.dmf === "0" ? "T" : "S",
    d.dmf === "0" ? "DMF diperlukan namun tidak tersedia." : "Memenuhi.",
    "Mohon lampirkan DMF atau dokumen setara dari produsen zat aktif."
  );

  const eqvMap: Record<string, string> = {
    "1": "Ringkasan/protokol",
    "2": "Justifikasi tidak perlu uji",
    "0": "Tidak ada",
  };
  const eqvKey = String(d.eqv ?? "0");
  add(
    "Praregistrasi: data ekivalensi",
    eqvMap[eqvKey] || "Tidak ada",
    P,
    d.eqv === "0" ? "T" : "S",
    d.eqv === "0" ? "Data atau justifikasi belum ada." : "Memenuhi.",
    "Mohon lampirkan ringkasan/protokol data ekivalensi atau justifikasi bahwa uji ekivalensi tidak diperlukan."
  );

  return R;
}
