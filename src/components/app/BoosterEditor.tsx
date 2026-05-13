import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  RARITY_COLOR, RARITY_LABEL, RARITY_DICE_BONUS,
  type Rarity, type Character,
} from "@/lib/game";
import { toastSaved } from "@/lib/saved";
import { toast } from "sonner";
import type { Booster } from "./BoosterCard";

/* ---------- DM-only modal: full editor ---------- */

export function BoosterEditor({
  booster, campaignId, onClose, onSaved,
}: {
  booster: Booster | null;
  campaignId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [extId, setExtId] = useState(booster?.external_id || "");
  const [tipo, setTipo] = useState(booster?.tipo || "");
  const [rarity, setRarity] = useState<Rarity>((booster?.rarity as Rarity) || "white");
  const [name, setName] = useState(booster?.name || "");
  const [modo, setModo] = useState(booster?.modo_lanzamiento || "");
  const [dist, setDist] = useState(booster?.distancia || "");
  const [obj, setObj] = useState(booster?.objetivos || "");
  const [dados, setDados] = useState(booster?.dados || "");
  const [efecto, setEfecto] = useState(booster?.efecto || "");
  const [uses, setUses] = useState(booster?.uses ?? 1);
  const [maxUses, setMaxUses] = useState(booster?.max_uses ?? 1);

  async function save() {
    if (!name.trim()) return toast.error("Pon un nombre");
    const payload: any = {
      campaign_id: campaignId,
      name: name.trim(),
      rarity,
      external_id: extId.trim() || null,
      tipo: tipo.trim() || null,
      modo_lanzamiento: modo.trim() || null,
      distancia: dist.trim() || null,
      objetivos: obj.trim() || null,
      dados: dados.trim() || null,
      efecto: efecto.trim() || null,
      uses: Math.max(0, uses),
      max_uses: Math.max(1, maxUses),
    };
    if (booster) {
      const { error } = await (supabase as any).from("boosters").update(payload).eq("id", booster.id);
      if (error) return toast.error(error.message);
    } else {
      payload.in_dm_vault = true;
      payload.owner_character_id = null;
      const { error } = await (supabase as any).from("boosters").insert(payload);
      if (error) return toast.error(error.message);
    }
    toastSaved();
    onSaved?.();
    onClose();
  }

  const color = RARITY_COLOR[rarity];

  return (
    <div className="fixed inset-0 bg-black/85 z-[70] flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card p-4 max-w-md w-full space-y-2 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg text-center">{booster ? "Editar potenciador" : "Nuevo potenciador"}</h3>

        <FieldRow label="ID">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="P-001" value={extId} onChange={e => setExtId(e.target.value)} />
        </FieldRow>
        <FieldRow label="Tipo">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="Información, Daño, Apoyo..." value={tipo} onChange={e => setTipo(e.target.value)} />
        </FieldRow>
        <FieldRow label="Rareza">
          <select className="w-full bg-input border border-border rounded px-3 py-2 text-sm" value={rarity} onChange={e => setRarity(e.target.value as Rarity)} style={{ color }}>
            {(["white","blue","purple","gold"] as Rarity[]).map(r =>
              <option key={r} value={r} style={{ color: "black" }}>{RARITY_LABEL[r]}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Nombre">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)} />
        </FieldRow>
        <FieldRow label="Modo de lanzamiento">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="[Punto], [Entorno]..." value={modo} onChange={e => setModo(e.target.value)} />
        </FieldRow>
        <FieldRow label="Distancia">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="30 pies (6c)" value={dist} onChange={e => setDist(e.target.value)} />
        </FieldRow>
        <FieldRow label="Objetivos">
          <input className="w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="1 criatura" value={obj} onChange={e => setObj(e.target.value)} />
        </FieldRow>
        <FieldRow label="Dados a tirar">
          <div className="flex items-center gap-2">
            <input className="flex-1 w-full bg-input border border-border rounded px-3 py-2 text-sm" placeholder="1d20 + mod SAB" value={dados} onChange={e => setDados(e.target.value)} />
            <span className="text-[10px] font-mono px-2 py-1 rounded border whitespace-nowrap"
              style={{ borderColor: color, color }}>+{RARITY_DICE_BONUS[rarity]} rareza</span>
          </div>
        </FieldRow>
        <FieldRow label="Efecto o Condición">
          <textarea className="w-full bg-input border border-border rounded px-3 py-2 text-sm min-h-20" rows={3} value={efecto} onChange={e => setEfecto(e.target.value)} />
        </FieldRow>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <label className="flex items-center justify-between text-xs">Usos
            <input type="number" min={0} value={uses} onChange={e => setUses(+e.target.value)}
              className="w-16 bg-input border border-border rounded px-2 py-1 text-right" />
          </label>
          <label className="flex items-center justify-between text-xs">Máx.
            <input type="number" min={1} value={maxUses} onChange={e => setMaxUses(+e.target.value)}
              className="w-16 bg-input border border-border rounded px-2 py-1 text-right" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button className="btn-fantasy" onClick={onClose}>Cancelar</button>
          <button className="btn-fantasy" style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }} onClick={save}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Read-only details block (player + spectator) ---------- */

function BoosterDetails({ b }: { b: Booster }) {
  const color = RARITY_COLOR[b.rarity as Rarity];
  const bonus = RARITY_DICE_BONUS[b.rarity as Rarity];
  const Row = ({ label, value }: { label: string; value?: string | null }) =>
    value ? (
      <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground break-words">{value}</span>
      </div>
    ) : null;
  return (
    <div className="space-y-1.5 text-left">
      <Row label="ID" value={b.external_id} />
      <Row label="Tipo" value={b.tipo} />
      <Row label="Modo de lanzamiento" value={b.modo_lanzamiento} />
      <Row label="Distancia" value={b.distancia} />
      <Row label="Objetivos" value={b.objetivos} />
      {(b.dados || true) && (
        <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs items-start">
          <span className="text-muted-foreground">Dados a tirar</span>
          <span className="text-foreground break-words">
            {b.dados || <em className="text-muted-foreground">—</em>}{" "}
            <span className="ml-1 inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border align-middle"
              style={{ borderColor: color, color }}>+{bonus} rareza</span>
          </span>
        </div>
      )}
      {b.efecto && (
        <div className="text-xs">
          <p className="text-muted-foreground">Efecto o Condición</p>
          <p className="italic">"{b.efecto}"</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Action sheet (player / DM / spectator) ---------- */

export function BoosterActions({
  booster, character, campaignId, players, dm, readOnly, onClose, onEdit,
}: {
  booster: Booster;
  character?: Character | null;          // owner (player view)
  campaignId: string;
  players: Character[];
  dm?: { id: string; name: string; color: string } | null;  // DM controls when set
  readOnly?: boolean;                     // spectator view
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [confirmUse, setConfirmUse] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const isDM = !!dm;
  const color = RARITY_COLOR[booster.rarity as Rarity];

  async function pushBoosterLog(actor: Character, verb: string) {
    const { pushLog } = await import("@/lib/log");
    await pushLog(campaignId, [
      { t: "char", v: actor.name, color: actor.color, id: actor.id },
      { t: "text", v: verb },
      { t: "item", v: booster.name, rarity: booster.rarity as Rarity },
    ]);
  }

  async function useBooster() {
    if (!character) return;
    const remaining = booster.uses - 1;
    if (remaining <= 0) {
      // Last use: return card to DM vault refilled to max_uses, conserva todo lo demás.
      await (supabase as any).from("boosters").update({
        uses: booster.max_uses,
        owner_character_id: null,
        in_dm_vault: true,
      }).eq("id", booster.id);
    } else {
      await (supabase as any).from("boosters").update({ uses: remaining }).eq("id", booster.id);
    }
    await pushBoosterLog(character, "usó el potenciador");
    onClose();
  }

  async function transferPlayer() {
    if (!transferTo || !character) return;
    await (supabase as any).from("boosters").update({
      owner_character_id: transferTo, in_dm_vault: false,
    }).eq("id", booster.id);
    const target = players.find(p => p.id === transferTo);
    await pushBoosterLog(character, `cedió el potenciador a ${target?.name ?? "?"}`);
    toastSaved();
    onClose();
  }

  async function transferDM() {
    if (!transferTo) return;
    const goVault = transferTo === "__vault__";
    await (supabase as any).from("boosters").update({
      owner_character_id: goVault ? null : transferTo,
      in_dm_vault: goVault,
    }).eq("id", booster.id);
    if (dm) {
      const target = players.find(p => p.id === transferTo);
      const { pushLog } = await import("@/lib/log");
      await pushLog(campaignId, [
        { t: "char", v: dm.name, color: dm.color, id: dm.id },
        { t: "text", v: goVault ? "guardó en el Vault" : "entregó" },
        { t: "item", v: booster.name, rarity: booster.rarity as Rarity },
        ...(target ? [{ t: "text", v: "a" } as const, { t: "char", v: target.name, color: target.color, id: target.id } as const] : []),
      ] as any);
    }
    toastSaved();
    onClose();
  }

  async function destroy() {
    if (!confirm("¿Destruir este potenciador?")) return;
    await (supabase as any).from("boosters").delete().eq("id", booster.id);
    if (dm) {
      const { pushLog } = await import("@/lib/log");
      await pushLog(campaignId, [
        { t: "char", v: dm.name, color: dm.color, id: dm.id },
        { t: "text", v: "destruyó el potenciador" },
        { t: "item", v: booster.name, rarity: booster.rarity as Rarity },
      ]);
    }
    onClose();
  }

  async function rollBooster() {
    if (!character) return;
    const m = (booster.dados || "").match(/(\d+)\s*d\s*(\d+)/i);
    let detail = "";
    if (m) {
      const n = Math.min(20, +m[1] || 1);
      const f = Math.max(2, +m[2] || 20);
      const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * f));
      const total = rolls.reduce((a, b) => a + b, 0) + RARITY_DICE_BONUS[booster.rarity as Rarity];
      detail = `→ [${rolls.join(", ")}] +${RARITY_DICE_BONUS[booster.rarity as Rarity]} = ${total}`;
    } else {
      const r = 1 + Math.floor(Math.random() * 20);
      detail = `→ d20 = ${r} (+${RARITY_DICE_BONUS[booster.rarity as Rarity]} rareza = ${r + RARITY_DICE_BONUS[booster.rarity as Rarity]})`;
    }
    await pushBoosterLog(character, `tiró el potenciador ${detail}`);
    toast.success(detail);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[65] flex items-center justify-center p-3" onClick={onClose}>
      <div className="ornate-card p-4 max-w-md w-full space-y-3 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-widest" style={{ color }}>{RARITY_LABEL[booster.rarity as Rarity]}</p>
          <h3 className="font-display text-lg" style={{ color }}>🃏 {booster.name}</h3>
          <p className="text-xs text-muted-foreground">{booster.uses}/{booster.max_uses} usos</p>
        </div>

        <div className="gem-divider" />
        <BoosterDetails b={booster} />

        {!isDM && !readOnly && character && (
          <>
            <div className="gem-divider" />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-fantasy" onClick={rollBooster}>🎲 Tirar</button>
              {!confirmUse ? (
                <button className="btn-fantasy"
                  style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
                  disabled={booster.uses <= 0}
                  onClick={() => setConfirmUse(true)}>
                  Usar
                </button>
              ) : (
                <button className="btn-fantasy"
                  style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)" }}
                  onClick={useBooster}>
                  Sí, usar
                </button>
              )}
            </div>
            {confirmUse && (
              <button className="btn-fantasy w-full" onClick={() => setConfirmUse(false)}>Cancelar uso</button>
            )}
            <div className="gem-divider" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Transferir a otro jugador:</p>
            <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-2 text-sm">
              <option value="">— elegir —</option>
              {players.filter(p => p.id !== character.id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn-fantasy w-full" disabled={!transferTo} onClick={transferPlayer}>Transferir</button>
          </>
        )}

        {isDM && (
          <>
            <div className="gem-divider" />
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-fantasy" onClick={onEdit}>✏️ Editar</button>
              <button className="btn-fantasy" onClick={destroy}>💥 Destruir</button>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Transferir a:</p>
            <select value={transferTo} onChange={e => setTransferTo(e.target.value)}
              className="w-full bg-input border border-border rounded px-2 py-2 text-sm">
              <option value="">— elegir —</option>
              <option value="__vault__">🏛️ Vault del DM</option>
              {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="btn-fantasy w-full" disabled={!transferTo} onClick={transferDM}>Transferir</button>
          </>
        )}

        <button className="text-xs text-muted-foreground underline w-full" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}
