import { ContractRecord } from "./db";

export function formatCurrency(amount: number | string) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr: string | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  if (dataUrl.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename || "attachment";
    link.click();
  } else {
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename || "attachment";
        link.click();
        URL.revokeObjectURL(url);
      });
  }
}

export function openAttachment(dataUrl: string) {
  window.open(dataUrl, "_blank");
}

export function exportToCSV(rows: ContractRecord[]) {
  const headers = [
    "Client Name",
    "Renewal Amount",
    "Signed Date",
    "Updated By",
    "Attachment Name",
    "Created At",
    "Updated At",
  ];
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r) =>
    [r.clientName, r.contractAmount, r.signedDate, r.updatedBy, r.attachmentName, r.createdAt, r.updatedAt]
      .map(escape)
      .join(",")
  );
  const csv = [headers.join(","), ...body].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "renewal-contract-dashboard.csv";
  link.click();
  URL.revokeObjectURL(url);
}
