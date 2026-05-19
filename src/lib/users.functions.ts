import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getMyLanguage = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("app_users").select("language").eq("id", data.userId).maybeSingle();
    return { language: row?.language ?? null };
  });

export const setMyLanguage = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; language: "es" | "en" }) => {
    if (d.language !== "es" && d.language !== "en") throw new Error("Invalid language");
    if (!d.userId) throw new Error("Missing user");
    return d;
  })
  .handler(async ({ data }) => {
    await supabaseAdmin.from("app_users").update({ language: data.language }).eq("id", data.userId);
    return { ok: true };
  });

export const getUsernamesByIds = createServerFn({ method: "POST" })
  .inputValidator((d: { ids: string[] }) => {
    if (!Array.isArray(d.ids)) throw new Error("ids must be an array");
    return { ids: d.ids.slice(0, 200) };
  })
  .handler(async ({ data }) => {
    if (!data.ids.length) return { users: [] as Array<{ id: string; username: string }> };
    const { data: us } = await supabaseAdmin
      .from("app_users").select("id,username").in("id", data.ids);
    return { users: (us || []) as Array<{ id: string; username: string }> };
  });
