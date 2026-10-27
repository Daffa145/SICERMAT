"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-800 hover:bg-blue-900 text-white transition flex items-center gap-1.5 shadow-xs"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Cetak / Simpan PDF</span>
    </button>
  );
}
