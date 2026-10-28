import { ok, route } from "@/lib/http";
import { endSession } from "@/lib/auth/session";

export const POST = route(async () => {
  await endSession();
  return ok({ ok: true });
});
