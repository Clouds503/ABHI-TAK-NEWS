import { supabase } from "@/integrations/supabase/client";

/**
 * Triggers a browser download of a file using Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Escapes a cell value for standard RFC 4180 CSV.
 * Wraps values with quotes if they contain commas, newlines, or quotes.
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return "";
  let str = typeof val === "object" ? JSON.stringify(val) : String(val);
  // Replace carriage returns
  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ColumnDefinition<T = any> {
  key: string;
  label: string;
  transform?: (value: any, row: T) => any;
}

/**
 * Exports an array of objects to a CSV file.
 * Automatically adds the UTF-8 Byte Order Mark (\uFEFF) at the start so that
 * Microsoft Excel, Google Sheets, and Numbers properly display Hindi (Devanagari)
 * and special characters without encoding corruption.
 */
export function exportToCsv<T extends Record<string, any>>(
  filename: string,
  rows: T[],
  columns: ColumnDefinition<T>[]
): void {
  const headerRow = columns.map((col) => escapeCsvCell(col.label)).join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((col) => {
        // Support nested keys like "author.full_name" or "category.name_hi"
        let val: any;
        if (col.key.includes(".")) {
          const parts = col.key.split(".");
          val = parts.reduce((acc, part) => (acc ? acc[part] : undefined), row as any);
        } else {
          val = row[col.key];
        }

        if (col.transform) {
          val = col.transform(val, row);
        }
        return escapeCsvCell(val);
      })
      .join(",")
  );

  // \uFEFF ensures Excel recognizes UTF-8 encoding
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/**
 * Exports data to a formatted JSON file.
 */
export function exportToJson(filename: string, data: any): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
  downloadBlob(blob, filename.endsWith(".json") ? filename : `${filename}.json`);
}

/**
 * Fetches all records from a Supabase table in batches (default batch size 1000)
 * to bypass the default 1000 row pagination limit without truncation.
 */
export async function fetchAllRowsInBatches<T = any>(
  table: string,
  queryModifier?: (q: any) => any,
  batchSize = 1000,
  maxRows?: number,
  onProgress?: (fetched: number, total: number | null) => void
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  let hasMore = true;

  // First get count if possible
  let countQuery = supabase.from(table as any).select("id", { count: "exact", head: true });
  if (queryModifier) {
    countQuery = queryModifier(countQuery);
  }
  const { count } = await countQuery;
  const totalCount = count ?? null;

  while (hasMore) {
    const to = from + batchSize - 1;
    let query = supabase.from(table as any).select("*").range(from, to);
    if (queryModifier) {
      query = queryModifier(query);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allRows = allRows.concat(data as T[]);
    if (onProgress) {
      onProgress(allRows.length, totalCount);
    }

    if (data.length < batchSize || (maxRows && allRows.length >= maxRows)) {
      hasMore = false;
    } else {
      from += batchSize;
    }
  }

  if (maxRows && allRows.length > maxRows) {
    return allRows.slice(0, maxRows);
  }

  return allRows;
}

/**
 * Generates an ISO-date stamped filename.
 * E.g., sanitizeExportFilename("articles", "csv") => "articles_2026-11-20.csv"
 */
export function sanitizeExportFilename(baseName: string, ext: "csv" | "json"): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const cleanBase = baseName.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
  return `${cleanBase}_${dateStr}.${ext}`;
}
