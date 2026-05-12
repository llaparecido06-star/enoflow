import jsPDF from "jspdf";
import QRCode from "qrcode";
import { formatCurrency } from "@/lib/currency";

interface Winery {
  id: string;
  name: string;
  slug?: string;
  primary_color?: string;
  logo_url?: string | null;
  currency?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
}

interface Wine {
  id: string;
  name: string;
  type?: string;
  year?: number | null;
  grape?: string | null;
  region?: string | null;
  enologist?: string | null;
  alcohol_content?: string | null;
  serving_temp?: string | null;
  aging?: string | null;
  description?: string | null;
  image_url?: string | null;
  harmonization?: string[] | null;
  aromatic_notes?: string[] | null;
  price_bottle?: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || "#630D16").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((r) => {
      const reader = new FileReader();
      reader.onloadend = () => r(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateWineSheet(wine: Wine, winery: Winery) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [r, g, b] = hexToRgb(winery.primary_color ?? "#630D16");
  const W = 210, H = 297;

  // Header band
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(winery.name, 15, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ficha Técnica", 15, 26);
  doc.setFontSize(8);
  if (winery.address) doc.text(winery.address, 15, 33);

  if (winery.logo_url) {
    const logo = await toDataUrl(winery.logo_url);
    if (logo) try { doc.addImage(logo, "PNG", W - 35, 8, 22, 22); } catch {}
  }

  // Wine block
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(wine.name, 15, 58);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  const subtitle = [wine.type, wine.year, wine.region].filter(Boolean).join(" · ");
  if (subtitle) doc.text(subtitle, 15, 66);

  let y = 80;

  if (wine.image_url) {
    const img = await toDataUrl(wine.image_url);
    if (img) try { doc.addImage(img, "JPEG", 15, y, 60, 80); } catch {}
  }

  // Right column attributes
  const xCol = 85;
  let yc = y;
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  const attrs: Array<[string, string | null | undefined]> = [
    ["Uva", wine.grape],
    ["Enólogo", wine.enologist],
    ["Teor alcoólico", wine.alcohol_content],
    ["Temperatura", wine.serving_temp],
    ["Envelhecimento", wine.aging],
    ["Preço", wine.price_bottle ? formatCurrency(wine.price_bottle, winery.currency) : null],
  ];
  for (const [k, v] of attrs) {
    if (!v) continue;
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, xCol, yc);
    doc.setFont("helvetica", "normal");
    doc.text(String(v), xCol + 35, yc);
    yc += 7;
  }

  y = Math.max(y + 85, yc + 5);

  // Description
  if (wine.description) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(r, g, b);
    doc.text("Descrição", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(wine.description, W - 30);
    doc.text(lines, 15, y);
    y += lines.length * 5 + 6;
  }

  if (wine.aromatic_notes?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(r, g, b);
    doc.text("Notas aromáticas", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(wine.aromatic_notes.join(" · "), 15, y);
    y += 8;
  }

  if (wine.harmonization?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(r, g, b);
    doc.text("Harmonização", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(wine.harmonization.join(" · "), 15, y);
    y += 8;
  }

  // QR pointing to public winery
  if (winery.slug) {
    const url = `${window.location.origin}/app/${winery.slug}`;
    try {
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 200 });
      doc.addImage(qr, "PNG", W - 45, H - 50, 30, 30);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("Saiba mais", W - 42, H - 16);
    } catch {}
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, 15, H - 10);
  if (winery.contact_phone || winery.contact_email) {
    doc.text([winery.contact_phone, winery.contact_email].filter(Boolean).join(" · "), 15, H - 5);
  }

  doc.save(`ficha_${wine.name.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}

interface MonthlyReportData {
  period: string;
  revenue: number;
  vouchers: number;
  leads: number;
  npsScore: number;
  byChannel: Array<{ channel: string; revenue: number }>;
  topWines?: Array<{ name: string; count: number }>;
}

export async function generateMonthlyReport(winery: Winery, data: MonthlyReportData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const [r, g, b] = hexToRgb(winery.primary_color ?? "#630D16");
  const W = 210, H = 297;

  // Header
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, W, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório Mensal", 15, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${winery.name} · ${data.period}`, 15, 26);

  if (winery.logo_url) {
    const logo = await toDataUrl(winery.logo_url);
    if (logo) try { doc.addImage(logo, "PNG", W - 32, 6, 22, 22); } catch {}
  }

  // KPI cards
  doc.setTextColor(20, 20, 20);
  let y = 55;
  const kpis = [
    { label: "Receita total", value: formatCurrency(data.revenue, winery.currency) },
    { label: "Vouchers emitidos", value: String(data.vouchers) },
    { label: "Novos leads", value: String(data.leads) },
    { label: "NPS", value: String(data.npsScore) },
  ];
  const cardW = (W - 30 - 9) / 4;
  kpis.forEach((k, i) => {
    const x = 15 + i * (cardW + 3);
    doc.setFillColor(245, 245, 247);
    doc.roundedRect(x, y, cardW, 25, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(k.label, x + 3, y + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(r, g, b);
    doc.text(k.value, x + 3, y + 18);
  });

  y += 38;

  // By channel
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Receita por canal", 15, y);
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const c of data.byChannel) {
    doc.text(`• ${c.channel}: ${formatCurrency(c.revenue, winery.currency)}`, 15, y);
    y += 6;
  }

  // Top wines
  if (data.topWines?.length) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Top vinhos do mês", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    for (const w of data.topWines.slice(0, 10)) {
      doc.text(`• ${w.name} — ${w.count} unidades`, 15, y);
      y += 6;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · EnoFlow`, 15, H - 10);

  doc.save(`relatorio_${winery.slug ?? "winery"}_${data.period.replace(/[^0-9]/g, "")}.pdf`);
}
