import { createHash, timingSafeEqual } from "node:crypto";
import { allowPasscodeAttempt, recordPasscodeFailure } from "./db.js";

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const digest = (s: string) => createHash("sha256").update(s).digest();

/**
 * 合言葉（Vercel の環境変数 APP_PASSCODE）を知っている人だけが API を使えるようにする。
 * 通れば null、だめならそのまま返すエラーレスポンスを返す。
 */
export async function requirePasscode(request: Request): Promise<Response | null> {
  const expected = process.env.APP_PASSCODE;
  if (!expected) {
    // 設定し忘れたまま公開されても、検索の無料枠を他人に使われないよう止めておく
    return Response.json({ error: "合言葉（APP_PASSCODE）がサーバーに設定されていません" }, { status: 503 });
  }

  const ip = clientIp(request);
  if (!(await allowPasscodeAttempt(ip))) {
    return Response.json({ error: "合言葉を何度も間違えたため、1時間ほど使えません" }, { status: 429 });
  }

  // ヘッダーは ASCII しか送れないので、クライアントは URL エンコードして送る
  let given = "";
  try {
    given = decodeURIComponent(request.headers.get("x-tokmap-passcode") ?? "");
  } catch {
    // 壊れた値は不一致として扱う
  }
  if (given && timingSafeEqual(digest(given), digest(expected))) return null;

  await recordPasscodeFailure(ip);
  return Response.json({ error: "合言葉が違います" }, { status: 401 });
}
