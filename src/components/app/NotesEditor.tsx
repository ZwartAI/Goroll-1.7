import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Quote,
  AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Eraser,
} from "lucide-react";

type Props = {
  characterId: string;
  characterName: string;
  characterColor?: string;
  /** When true, hides save/edit controls. */
  readOnly?: boolean;
  onClose: () => void;
};

const FONTS = [
  { label: "Predeterminada", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Sans", value: "system-ui, -apple-system, sans-serif" },
  { label: "Monospace", value: "ui-monospace, SFMono-Regular, monospace" },
  { label: "Cursiva", value: "'Brush Script MT', cursive" },
];

const SIZES = [
  { label: "Pequeña", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Grande", value: "5" },
  { label: "Enorme", value: "6" },
];

const COLORS = ["#e8e0c8", "#f5d76e", "#e74c3c", "#5dade2", "#58d68d", "#bb8fce", "#f1948a", "#ffffff"];

export function NotesEditor({ characterId, characterName, characterColor, readOnly, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef<string>("");

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any).from("character_notes")
        .select("content").eq("character_id", characterId).maybeSingle();
      if (cancel) return;
      const html = (data?.content as string) || "";
      initialRef.current = html;
      if (ref.current) ref.current.innerHTML = html;
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [characterId]);

  function exec(cmd: string, val?: string) {
    if (readOnly) return;
    ref.current?.focus();
    try { document.execCommand(cmd, false, val); } catch { /* ignore */ }
    setDirty(true);
  }

  async function save() {
    if (!ref.current) return;
    setSaving(true);
    const content = ref.current.innerHTML;
    const { error } = await (supabase as any).from("character_notes")
      .upsert({ character_id: characterId, content, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    initialRef.current = content;
    setDirty(false);
    toast.success("Notas guardadas");
  }

  function tryClose() {
    if (dirty && !readOnly) {
      if (!confirm("Tienes cambios sin guardar. ¿Cerrar sin guardar?")) return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/85 z-[80] flex items-center justify-center p-2" onClick={tryClose}>
      <div className="ornate-card w-full max-w-2xl max-h-[94vh] flex flex-col p-3 sm:p-4 gap-2"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Notas del personaje</p>
            <h3 className="font-display text-lg truncate" style={{ color: characterColor || "var(--gold)" }}>
              📝 {characterName} {readOnly && <span className="text-xs text-muted-foreground">(solo lectura)</span>}
            </h3>
          </div>
          <button className="text-muted-foreground hover:text-foreground text-sm" onClick={tryClose}>✕</button>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-md border border-border bg-secondary/40">
            <ToolBtn onClick={() => exec("bold")} title="Negrita"><Bold size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("italic")} title="Cursiva"><Italic size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("underline")} title="Subrayado"><Underline size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("strikeThrough")} title="Tachado"><Strikethrough size={14}/></ToolBtn>
            <Sep/>
            <ToolBtn onClick={() => exec("formatBlock", "<h2>")} title="Título"><Heading1 size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("formatBlock", "<h3>")} title="Subtítulo"><Heading2 size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("formatBlock", "<blockquote>")} title="Cita"><Quote size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("formatBlock", "<p>")} title="Párrafo">P</ToolBtn>
            <Sep/>
            <ToolBtn onClick={() => exec("insertUnorderedList")} title="Lista"><List size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("insertOrderedList")} title="Lista numerada"><ListOrdered size={14}/></ToolBtn>
            <Sep/>
            <ToolBtn onClick={() => exec("justifyLeft")} title="Izquierda"><AlignLeft size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("justifyCenter")} title="Centrar"><AlignCenter size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("justifyRight")} title="Derecha"><AlignRight size={14}/></ToolBtn>
            <Sep/>
            <select className="bg-input border border-border rounded px-1 py-0.5 text-[11px]"
              defaultValue="" onChange={e => { exec("fontName", e.target.value); e.currentTarget.value = ""; }}>
              <option value="" disabled>Fuente</option>
              {FONTS.map(f => <option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
            <select className="bg-input border border-border rounded px-1 py-0.5 text-[11px]"
              defaultValue="" onChange={e => { exec("fontSize", e.target.value); e.currentTarget.value = ""; }}>
              <option value="" disabled>Tamaño</option>
              {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <Sep/>
            {COLORS.map(c => (
              <button key={c} title={`Color ${c}`} onClick={() => exec("foreColor", c)}
                className="w-5 h-5 rounded-full border border-border hover:scale-110 transition"
                style={{ background: c }} />
            ))}
            <Sep/>
            <ToolBtn onClick={() => exec("undo")} title="Deshacer"><Undo2 size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("redo")} title="Rehacer"><Redo2 size={14}/></ToolBtn>
            <ToolBtn onClick={() => exec("removeFormat")} title="Quitar formato"><Eraser size={14}/></ToolBtn>
          </div>
        )}

        <div
          ref={ref}
          contentEditable={!readOnly}
          suppressContentEditableWarning
          onInput={() => setDirty(true)}
          className="flex-1 overflow-y-auto rounded-md border border-border bg-input p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gold)] notes-editor"
          style={{ minHeight: "40vh" }}
        />
        {loading && <p className="text-xs text-muted-foreground text-center">Cargando notas…</p>}

        <div className="flex gap-2">
          <button className="btn-fantasy flex-1" onClick={tryClose}>Cerrar</button>
          {!readOnly && (
            <button className="btn-fantasy flex-1" disabled={saving || !dirty}
              style={{ background: "var(--gradient-gold)", color: "oklch(0.15 0.03 25)", opacity: !dirty ? 0.6 : 1 }}
              onClick={save}>
              {saving ? "Guardando…" : "💾 Guardar"}
            </button>
          )}
        </div>

        <style>{`
          .notes-editor h2 { font-size: 1.25rem; font-weight: 700; margin: 0.4em 0; color: var(--gold); }
          .notes-editor h3 { font-size: 1.05rem; font-weight: 600; margin: 0.35em 0; color: var(--gold); }
          .notes-editor blockquote { border-left: 3px solid var(--gold); padding-left: 0.75rem; margin: 0.5em 0; opacity: 0.85; font-style: italic; }
          .notes-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.4em 0; }
          .notes-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.4em 0; }
          .notes-editor p { margin: 0.3em 0; }
          .notes-editor:empty:before { content: "Escribe tus notas aquí…"; color: var(--muted-foreground); }
        `}</style>
      </div>
    </div>
  );
}

function ToolBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={title}
      className="px-1.5 py-1 rounded hover:bg-secondary border border-transparent hover:border-border text-xs flex items-center justify-center min-w-[26px]">
      {children}
    </button>
  );
}
function Sep() { return <span className="w-px h-5 bg-border mx-0.5" />; }
