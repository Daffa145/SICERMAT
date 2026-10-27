export interface SystemPermissionDef {
  code: string;
  module: "case" | "user" | "role" | "audit" | "settings";
  name: string;
  description: string;
}

export const MODULE_NAMES: Record<string, string> = {
  case: "Manajemen Kasus (Dossier)",
  user: "Manajemen Pengguna",
  role: "Peran & Hak Akses (RBAC)",
  audit: "Audit Trail",
  settings: "Pengaturan & Cadangan",
};

export const SYSTEM_PERMISSIONS: SystemPermissionDef[] = [
  // Modul Case
  {
    code: "case.view_own",
    module: "case",
    name: "Lihat Kasus Milik Sendiri",
    description: "Mengakses dan membaca dossier yang dibuat oleh akun sendiri",
  },
  {
    code: "case.view_all",
    module: "case",
    name: "Lihat Semua Kasus",
    description: "Mengakses dan membaca seluruh dossier dalam sistem",
  },
  {
    code: "case.create",
    module: "case",
    name: "Buat Kasus Baru",
    description: "Membuat draft dossier dan mengimpor file data kasus",
  },
  {
    code: "case.edit_own",
    module: "case",
    name: "Ubah Kasus Milik Sendiri",
    description: "Memperbarui data teknis dossier milik akun sendiri",
  },
  {
    code: "case.edit_all",
    module: "case",
    name: "Ubah Semua Kasus",
    description: "Memperbarui data teknis seluruh dossier dalam sistem",
  },
  {
    code: "case.delete",
    module: "case",
    name: "Hapus Kasus",
    description: "Menghapus catatan dossier yang belum difinalisasi",
  },
  {
    code: "case.analyze",
    module: "case",
    name: "Jalankan Analisis",
    description: "Mengevaluasi kepatuhan CTD dan membuat snapshot versi evaluasi",
  },
  {
    code: "case.finalize",
    module: "case",
    name: "Review & Finalisasi",
    description: "Mengubah status menjadi Final (terkunci) atau membuka kembali kasus Final",
  },
  {
    code: "case.export",
    module: "case",
    name: "Ekspor Dokumen",
    description: "Mengunduh berkas Word .docx, ekspor .json, dan mencetak dokumen",
  },

  // Modul User
  {
    code: "user.view",
    module: "user",
    name: "Lihat Daftar Pengguna",
    description: "Melihat daftar akun dan profil evaluator/administrator",
  },
  {
    code: "user.create",
    module: "user",
    name: "Tambah Pengguna",
    description: "Mendaftarkan akun evaluator atau staf baru",
  },
  {
    code: "user.edit",
    module: "user",
    name: "Ubah Pengguna",
    description: "Memperbarui profil, mengubah role, dan mereset password pengguna",
  },
  {
    code: "user.deactivate",
    module: "user",
    name: "Nonaktifkan Pengguna",
    description: "Menonaktifkan status akses akun pengguna",
  },

  // Modul Role
  {
    code: "role.view",
    module: "role",
    name: "Lihat Peran & Matriks",
    description: "Melihat daftar peran dan pemetaan hak akses",
  },
  {
    code: "role.manage",
    module: "role",
    name: "Kelola Peran & Matriks",
    description: "Menambah/mengubah/menghapus peran dan memperbarui matriks centang hak akses",
  },

  // Modul Audit
  {
    code: "audit.view",
    module: "audit",
    name: "Lihat Audit Trail",
    description: "Melihat rekam jejak aktivitas, mutasi data, dan riwayat ekspor",
  },

  // Modul Settings
  {
    code: "settings.manage",
    module: "settings",
    name: "Kelola Pengaturan & Backup",
    description: "Mengubah identitas instansi, pejabat penandatangan, dan membuat cadangan database",
  },
];

export const DEFAULT_ROLES = [
  {
    name: "Administrator",
    description: "Akses penuh ke seluruh modul, konfigurasi sistem, dan manajemen keamanan",
    isSystem: true,
    permissions: SYSTEM_PERMISSIONS.map((p) => p.code),
  },
  {
    name: "Kepala Evaluator",
    description: "Memantau seluruh kasus, melakukan review teknis, memfinalisasi dossier, dan melihat audit",
    isSystem: true,
    permissions: [
      "case.view_all",
      "case.analyze",
      "case.finalize",
      "case.export",
      "audit.view",
    ],
  },
  {
    name: "Evaluator",
    description: "Menginput, mengedit, menganalisis dossier miliknya sendiri, dan mengekspor surat",
    isSystem: true,
    permissions: [
      "case.view_own",
      "case.create",
      "case.edit_own",
      "case.analyze",
      "case.export",
    ],
  },
  {
    name: "Pengamat",
    description: "Hanya memiliki izin melihat data dossier dan mengunduh berkas surat",
    isSystem: true,
    permissions: [
      "case.view_all",
      "case.export",
    ],
  },
];
