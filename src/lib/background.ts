import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const KEY = "background_url";

export function useGlobalBackground() {
  const [url, setUrl] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).from("app_settings").select("value").eq("key", KEY).maybeSingle();
      if (!cancelled) setUrl((data?.value as string) || "");
    })();
    const channel = (supabase as any).channel("app_settings:bg")
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, (payload: any) => {
        if (payload?.new?.key === KEY) setUrl(payload.new.value || "");
      })
      .subscribe();
    return () => { cancelled = true; (supabase as any).removeChannel(channel); };
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (url) {
      body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url("${url}")`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = "no-repeat";
    } else {
      body.style.backgroundImage = "";
    }
  }, [url]);
  return url;
}

export async function setGlobalBackground(url: string) {
  await (supabase as any).from("app_settings").upsert({ key: KEY, value: url }, { onConflict: "key" });
}
