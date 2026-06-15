/** Отправка писем через Resend API (fetch, без доп. зависимостей). */
export function isMailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

function appBaseUrl(request?: Request): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const origin = request?.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  request?: Request
): Promise<{ sent: boolean; devLink?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[password-reset] ${to}: ${resetUrl}`);
      return { sent: true, devLink: resetUrl };
    }
    return { sent: false };
  }

  const site = appBaseUrl(request);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Сброс пароля — Шёлковый путь",
      html: `<!DOCTYPE html>
<html lang="ru">
<body style="margin:0;padding:0;background:#f7f3ef;font-family:Georgia,serif;color:#3d1a22;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:40px auto;background:#fff;border:1px solid #e8dfd4;border-radius:12px;overflow:hidden;">
    <tr><td style="height:4px;background:linear-gradient(90deg,#7a1f35,#c9a227,#2d3a6b);"></td></tr>
    <tr><td style="padding:32px 28px 8px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#c9a227;">Шёлковый путь</p>
      <h1 style="margin:0;font-size:24px;font-weight:500;">Сброс пароля</h1>
    </td></tr>
    <tr><td style="padding:16px 28px 28px;text-align:center;font-size:15px;line-height:1.6;color:#5c4a4e;">
      <p style="margin:0 0 24px;">Нажмите кнопку ниже, чтобы задать новый пароль. Ссылка действует 1 час.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:#7a1f35;color:#faf6f0;text-decoration:none;border-radius:8px;font-size:15px;font-family:sans-serif;">Подтвердить сброс</a>
      <p style="margin:24px 0 0;font-size:12px;color:#8a7a7e;">Если кнопка не открывается, скопируйте ссылку:<br><a href="${resetUrl}" style="color:#7a1f35;word-break:break-all;">${resetUrl}</a></p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#faf8f5;font-size:12px;color:#8a7a7e;text-align:center;">
      Если вы не запрашивали сброс — просто проигнорируйте письмо.<br>${site}
    </td></tr>
  </table>
</body>
</html>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[mail] Resend error:", res.status, err);
    return { sent: false };
  }

  return { sent: true };
}
