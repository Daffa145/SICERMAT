export type EvaluationStatus = "S" | "K" | "T";

export interface EvaluationFinding {
  p: string; // Parameter Evaluasi
  f: string; // Temuan Dokumen
  s: string; // Standar Acuan
  st: EvaluationStatus; // S: Sesuai, K: Perlu Klarifikasi, T: Tidak Sesuai
  n: string; // Catatan Penelaahan
  q: string; // Teks Surat Permintaan Data Tambahan
}

export interface CtdDossierInput {
  // Identitas Dossier
  produk?: string;
  api?: string;
  pemohon?: string;
  noreg?: string;
  tgl?: string;
  batas?: string;

  // Mutu Bahan Aktif (CoA API)
  nbatch?: number | string;
  skala?: "Komersial" | "Pilot" | "Laboratorium" | string;
  std?: "USP" | "BP" | "Ph.Eur" | "FI" | "In-House" | "" | string;
  terdaftar?: "1" | "0" | string;
  urut?: "1" | "0" | string;

  // Stabilitas Real-Time
  ltT?: number | string;
  ltH?: number | string;
  ltM?: number | string;
  barrier?: "1" | "0" | string;
  ltI?: number[];

  // Stabilitas Dipercepat (Accelerated)
  acT?: number | string;
  acH?: number | string;
  acM?: number | string;
  acI?: number[];

  // Validasi Metode Analisis (VMA)
  vproc?: "assay" | "impq" | "impl" | "ident" | string;
  vmode?: "proj" | "q2" | string;
  vma?: string[];
  vlinN?: number | string;
  vaccN?: number | string;
  vaccL?: number | string;
  vrepC?: "9" | "6" | "0" | string;
  vlo?: number | string;
  vhi?: number | string;
  cat?: string;

  // Praregistrasi
  jalur?: "90" | "100" | "150" | "300" | "lain" | "" | string;
  qos?: "1" | "0" | string;
  hewan?: "1" | "0" | string;
  dmf?: "1" | "2" | "0" | string;
  eqv?: "1" | "2" | "0" | string;

  // Ketentuan Khusus Jalur 90 Hari
  refc?: string;
  ref5?: "1" | "0" | string;
  ar?: "1" | "0" | string;
  pern?: "1" | "0" | string;
  kate?: "1" | "0" | string;
  ident?: "1" | "0" | string;
}

export interface AnalysisSummary {
  verdict: string;
  counts: {
    S: number;
    K: number;
    T: number;
    total: number;
  };
  deficiencyCount: number;
  isCompliant: boolean;
}
