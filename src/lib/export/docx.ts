import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
} from "docx";
import { EvaluationFinding, CtdDossierInput } from "../ctd-rules";

export interface DocxExportOptions {
  nomorSurat?: string;
  tanggalSurat?: string;
  penandatanganNama?: string;
  penandatanganJabatan?: string;
  nipPenandatangan?: string;
  agencyName?: string;
}

export async function generateDeficiencyLetterDocx(
  d: CtdDossierInput,
  findings: EvaluationFinding[],
  options?: DocxExportOptions
): Promise<Buffer> {
  const defs = findings.filter((r) => r.st !== "S");

  const fontName = "Times New Roman";
  const defaultSize = 24; // 12pt (in half-points)
  const agencyName = options?.agencyName || "BADAN PENGAWAS OBAT DAN MAKANAN";
  const nomorSurat = options?.nomorSurat || "B-RG.01.02.3.32.10.26.0452";
  const tanggalSurat = options?.tanggalSurat || d.tgl || "........................";
  const penandatanganNama =
    options?.penandatanganNama || "Dr. Dra. Nurul Hidayati, Apt., M.Si.";
  const penandatanganJabatan =
    options?.penandatanganJabatan ||
    "Koordinator Kelompok Substansi Penilaian Mutu Obat Jadi";

  // Kop Surat Resmi
  const headerParagraphs = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: agencyName.toUpperCase(),
          bold: true,
          font: fontName,
          size: 28, // 14pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40, line: 220 },
      children: [
        new TextRun({
          text: "KEDEPUTIAN BIDANG PENGAWASAN OBAT, NARKOTIKA, PSIKOTROPIKA, PREKURSOR, DAN ZAT ADIKTIF",
          font: fontName,
          size: 20, // 10pt
          color: "333333",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60, line: 220 },
      children: [
        new TextRun({
          text: "DIREKTORAT REGISTRASI OBAT",
          bold: true,
          font: fontName,
          size: 24, // 12pt
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120, line: 200 },
      children: [
        new TextRun({
          text: "Jl. Percetakan Negara No. 23, Jakarta 10560 | Telepon: (021) 4244691 | Email: registrasi.obat@pom.go.id",
          font: fontName,
          size: 18, // 9pt
          color: "555555",
        }),
      ],
    }),
  ];

  // Garis pemisah kop
  const kopSeparator = new Paragraph({
    border: {
      bottom: {
        color: "000000",
        space: 1,
        style: BorderStyle.DOUBLE,
        size: 12,
      },
    },
    spacing: { after: 280 },
  });

  // Metadata Surat (Tabel 2 Kolom tanpa border)
  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { line: 260 },
                children: [
                  new TextRun({ text: "Nomor      : ", font: fontName, size: defaultSize }),
                  new TextRun({ text: nomorSurat, font: fontName, size: defaultSize }),
                ],
              }),
              new Paragraph({
                spacing: { line: 260 },
                children: [
                  new TextRun({ text: "Lampiran  : ", font: fontName, size: defaultSize }),
                  new TextRun({ text: "1 (satu) Berkas", font: fontName, size: defaultSize }),
                ],
              }),
              new Paragraph({
                spacing: { line: 260 },
                children: [
                  new TextRun({ text: "Perihal    : ", font: fontName, size: defaultSize }),
                  new TextRun({
                    text: "Permintaan Data Tambahan (Deficiency Letter) Dokumen Mutu",
                    bold: true,
                    font: fontName,
                    size: defaultSize,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { line: 260 },
                children: [
                  new TextRun({
                    text: `Jakarta, ${tanggalSurat}`,
                    font: fontName,
                    size: defaultSize,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Alamat Tujuan
  const recipientParagraphs = [
    new Paragraph({ spacing: { before: 240, after: 60 }, children: [] }),
    new Paragraph({
      spacing: { line: 260 },
      children: [
        new TextRun({ text: "Kepada Yth.", font: fontName, size: defaultSize }),
      ],
    }),
    new Paragraph({
      spacing: { line: 260 },
      children: [
        new TextRun({
          text: `Pimpinan ${d.pemohon || "[Nama Pemohon Registrasi]"}`,
          bold: true,
          font: fontName,
          size: defaultSize,
        }),
      ],
    }),
    new Paragraph({
      spacing: { line: 260 },
      children: [
        new TextRun({ text: "di Tempat", font: fontName, size: defaultSize }),
      ],
    }),
    new Paragraph({ spacing: { before: 180, after: 60 }, children: [] }),
  ];

  // Salam pembuka & Isi
  const bodyParagraphs = [
    new Paragraph({
      spacing: { line: 280, after: 120 },
      children: [
        new TextRun({ text: "Dengan hormat,", font: fontName, size: defaultSize }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 300, after: 180 },
      children: [
        new TextRun({
          text: `Sehubungan dengan evaluasi Dokumen Mutu (Modul 3 / Bagian II ACTD) untuk produk `,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: d.produk || "[nama produk]",
          bold: true,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: ` dengan bahan aktif `,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: d.api || "[bahan aktif]",
          bold: true,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: `${d.noreg ? ` (No. Registrasi / Referensi: ${d.noreg})` : ""}, berdasarkan Peraturan Kepala BPOM No. 24 Tahun 2017 sebagaimana telah diubah terakhir dengan Peraturan BPOM No. 23 Tahun 2025, serta ASEAN Stability Guideline (Zona IVb) dan ICH Q2(R1), kami menemukan hal-hal berikut yang memerlukan klarifikasi dan data tambahan:`,
          font: fontName,
          size: defaultSize,
        }),
      ],
    }),
  ];

  // Daftar Temuan
  const findingParagraphs: Paragraph[] = [];
  if (!defs.length) {
    findingParagraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { line: 280, after: 140 },
        children: [
          new TextRun({
            text: "Tidak terdapat kekurangan data pada parameter yang ditelaah.",
            italics: true,
            font: fontName,
            size: defaultSize,
          }),
        ],
      })
    );
  } else {
    defs.forEach((r, i) => {
      findingParagraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 280, after: 120 },
          indent: { left: 400, hanging: 400 },
          children: [
            new TextRun({
              text: `${i + 1}. `,
              font: fontName,
              size: defaultSize,
              bold: true,
            }),
            new TextRun({
              text: `[${r.st === "T" ? "Mayor" : "Minor"}] `,
              font: fontName,
              size: defaultSize,
              bold: true,
              color: r.st === "T" ? "991b1b" : "92400e",
            }),
            new TextRun({
              text: r.q,
              font: fontName,
              size: defaultSize,
            }),
          ],
        })
      );
    });
  }

  // Batas waktu tanggapan & Penutup
  const closingParagraphs = [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 180, line: 300, after: 140 },
      children: [
        new TextRun({
          text: `Mohon tanggapan tertulis disertai data pendukung disampaikan dalam waktu `,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: d.batas || "30 (tiga puluh) hari kerja",
          bold: true,
          font: fontName,
          size: defaultSize,
        }),
        new TextRun({
          text: ` sejak surat ini diterima. Evaluasi akan dilanjutkan setelah seluruh data dan klarifikasi dinyatakan lengkap.`,
          font: fontName,
          size: defaultSize,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 300, after: 360 },
      children: [
        new TextRun({
          text: "Demikian disampaikan, atas perhatian dan kerja sama Saudara kami ucapkan terima kasih.",
          font: fontName,
          size: defaultSize,
        }),
      ],
    }),
  ];

  // Blok Tanda Tangan
  const signatureParagraphs = [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [],
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  spacing: { line: 260 },
                  children: [
                    new TextRun({
                      text: "Hormat kami,",
                      font: fontName,
                      size: defaultSize,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { line: 260 },
                  children: [
                    new TextRun({
                      text: penandatanganJabatan,
                      font: fontName,
                      size: 20, // 10pt
                    }),
                  ],
                }),
                // Ruang tanda tangan ~3 baris
                new Paragraph({ spacing: { before: 600, after: 0 }, children: [] }),
                new Paragraph({
                  spacing: { line: 260 },
                  children: [
                    new TextRun({
                      text: penandatanganNama,
                      bold: true,
                      underline: {},
                      font: fontName,
                      size: defaultSize,
                    }),
                  ],
                }),
                ...(options?.nipPenandatangan
                  ? [
                      new Paragraph({
                        spacing: { line: 240 },
                        children: [
                          new TextRun({
                            text: `NIP. ${options.nipPenandatangan}`,
                            font: fontName,
                            size: 20,
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
            }),
          ],
        }),
      ],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1417, // ~2.5 cm
              bottom: 1417,
              left: 1700, // ~3 cm
              right: 1417,
            },
          },
        },
        children: [
          ...headerParagraphs,
          kopSeparator,
          metaTable,
          ...recipientParagraphs,
          ...bodyParagraphs,
          ...findingParagraphs,
          ...closingParagraphs,
          ...signatureParagraphs,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
