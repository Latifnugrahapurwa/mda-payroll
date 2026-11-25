import { NextResponse } from "next/server";

export const runtime = "nodejs";

function escapeTelegramMarkdown(value: string) {
  return value.replace(/([_*`\[])/g, "\\$1");
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const chatId = String(form.get("chatId") ?? "").trim();
    const employeeName = String(form.get("employeeName") ?? "Karyawan").trim();
    const period = String(form.get("period") ?? "").trim();
    const token = process.env.TELEGRAM_BOT_TOKEN || "";

    if (!token) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN belum dikonfigurasi di Vercel Environment Variables." }, { status: 503 });
    if (!chatId || !period) return NextResponse.json({ error: "chatId dan period wajib diisi." }, { status: 400 });
    if (!/^-?\d+$/.test(chatId)) return NextResponse.json({ error: "Telegram Chat ID harus berupa angka." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "File slip tidak ditemukan." }, { status: 400 });
    if (!(["image/png", "application/pdf"].includes(file.type))) return NextResponse.json({ error: "Format file harus PNG atau PDF." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "File melebihi batas aman 4 MB untuk request Vercel Functions." }, { status: 413 });

    const body = new FormData();
    const document = new Blob([await file.arrayBuffer()], { type: file.type });
    body.append("document", document, file.name || "Slip_Gaji_MDA.png");
    body.append("chat_id", chatId);
    body.append("caption", `Halo *${escapeTelegramMarkdown(employeeName)}*, berikut adalah Slip Gaji Anda untuk periode *${escapeTelegramMarkdown(period)}*.`);
    body.append("parse_mode", "Markdown");

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: "POST", body, cache: "no-store" });
    const result = await telegramResponse.json().catch(() => null) as { ok?: boolean; description?: string; result?: { message_id?: number } } | null;
    if (!telegramResponse.ok || !result?.ok) {
      return NextResponse.json({ error: result?.description || "Telegram gagal menerima dokumen." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, messageId: result.result?.message_id });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan saat memproses pengiriman slip." }, { status: 500 });
  }
}
