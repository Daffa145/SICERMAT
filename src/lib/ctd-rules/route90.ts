import { CtdDossierInput, EvaluationFinding } from "./types";
import { REGULATORY_CONFIG } from "./config";

export function evaluateRoute90(d: CtdDossierInput): EvaluationFinding[] {
  const R: EvaluationFinding[] = [];
  if (d.jalur !== "90") {
    return R;
  }

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

  const lst = REGULATORY_CONFIG.route90.recognizedReferenceCountries as readonly string[];
  const j = (
    p: string,
    ok: boolean,
    f: string,
    s: string,
    bad: string,
    q: string
  ) => {
    add(p, f, s, ok ? "S" : "T", ok ? "Memenuhi." : bad, q);
  };

  const refc = d.refc || "";
  j(
    "Jalur 90 hari: negara referensi",
    lst.includes(refc),
    refc || "Belum dipilih",
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

  return R;
}
