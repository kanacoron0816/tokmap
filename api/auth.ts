import { requirePasscode } from "./_lib/auth.js";

// GET /api/auth  合言葉が正しいかだけを確かめる
export async function GET(request: Request): Promise<Response> {
  return (await requirePasscode(request)) ?? Response.json({ ok: true });
}
