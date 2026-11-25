import { NextResponse } from "next/server";
import { constantTimeEqual } from "@/lib/auth";

export const runtime = "nodejs";

type TelegramUpdate = {
  message?: {
    message_id?: number;
    text?: string;
    chat?: { id?: number };
    from?: { first_name?: string };
  };
};

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && !expectedSecret) {
    return NextResponse.json({ error: "TELEGRAM_WEBHOOK_SECRET is not configured." }, { status: 503 });
  }
  if (expectedSecret && !constantTimeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ error: "Telegram bot token is not configured." }, { status: 500 });

  try {
    const update = await request.json() as TelegramUpdate;
    const message = update.message;
    const chatId = message?.chat?.id;
    if (!chatId || typeof message?.text !== "string") return NextResponse.json({ ok: true, ignored: true });

    const firstName = message.from?.first_name?.trim() || "Kak";
    const reply = `Halo ${firstName}! Akun Telegram Anda berhasil terhubung dengan sistem Slip Gaji Melanesia Digital Advertisement.\n\nTelegram Chat ID Anda adalah:\n\`${chatId}\`\n\nSilakan salin dan berikan angka ID di atas kepada Bendahara (cukup 1 kali ini saja).`;

    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
      cache: "no-store",
    });
    const telegramResult = await telegramResponse.json().catch(() => null) as { ok?: boolean; description?: string } | null;
    if (!telegramResponse.ok || !telegramResult?.ok) {
      return NextResponse.json({ error: telegramResult?.description || "Telegram sendMessage failed." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
