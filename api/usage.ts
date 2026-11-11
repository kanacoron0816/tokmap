import { requirePasscode } from "./_lib/auth.js";
import { braveUsage } from "./_lib/db.js";

// GET /api/usage  今月の動画検索（Brave Search）の使用回数
export async function GET(request: Request): Promise<Response> {
  const denied = await requirePasscode(request);
  if (denied) return denied;
  return Response.json({ brave: await braveUsage() });
}
