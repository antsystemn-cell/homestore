import * as XLSX from "xlsx";
import type { NiimbotLabelData } from "./types";

const COLUMNS: Array<{ key: keyof NiimbotLabelData; width: number }> = [
  { key: "order_no", width: 16 },
  { key: "customer_name", width: 22 },
  { key: "phone", width: 14 },
  { key: "phone2", width: 14 },
  { key: "district", width: 18 },
  { key: "address", width: 40 },
  { key: "payment_status", width: 16 },
  { key: "payment_amount", width: 14 },
  { key: "items", width: 50 },
  { key: "tracking_code", width: 18 },
  { key: "note", width: 24 },
];

export function generateNiimbotXlsx(rows: NiimbotLabelData[]): Blob {
  const header = COLUMNS.map((c) => c.key);
  const dataMatrix: (string | undefined)[][] = [
    header,
    ...rows.map((r) => COLUMNS.map((c) => r[c.key])),
  ];

  const ws = XLSX.utils.aoa_to_sheet(dataMatrix);
  ws["!cols"] = COLUMNS.map((c) => ({ wch: c.width }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Labels");

  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function buildXlsxFilename(count: number): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `niimbot-labels-${count}-${stamp}.xlsx`;
}
