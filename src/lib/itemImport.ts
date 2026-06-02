import * as XLSX from "xlsx";
import { type Rarity, type Slot, type ItemCategory, SLOTS, ITEM_CATEGORIES } from "./game";

/** Parsed data for an item (before DB insertion). */
export type ParsedItem = {
  external_id: string | null;
  name: string;
  category: ItemCategory;
  rarity: Rarity;
  slot: Slot | null;
  defense_bonus: number;
  hp_bonus: number;
  damage_bonus: number;
  uses: number;
  max_uses: number;
  description: string;
};

export type ParseError = { where: string; message: string; raw?: string };

export type ParseResult = {
  rows: ParsedItem[];
  errors: ParseError[];
};

const RARITY_ALIASES: Record<string, Rarity> = {
  blanca: "white", blanco: "white", comun: "white", común: "white", common: "white", white: "white",
  azul: "blue", rara: "blue", raro: "blue", blue: "blue",
  morada: "purple", morado: "purple", purpura: "purple", púrpura: "purple", epica: "purple", épica: "purple", purple: "purple",
  dorada: "gold", dorado: "gold", oro: "gold", legendaria: "gold", legendario: "gold", gold: "gold",
};

const CATEGORY_ALIASES: Record<string, ItemCategory> = {
  equipo: "equipo", equipment: "equipo", gear: "equipo",
  consumible: "consumible", consumable: "consumible", pocion: "consumible", poción: "consumible", potion: "consumible",
  material: "material", resource: "material",
  herramienta: "herramienta", tool: "herramienta",
  tela: "tela", venda: "tela", cloth: "tela", bandage: "tela",
  comida: "comida", food: "comida",
  libro: "libro", pergamino: "libro", book: "libro", scroll: "libro",
  llave: "llave", key: "llave",
  tesoro: "tesoro", treasure: "tesoro", loot: "tesoro",
  otro: "otro", other: "otro",
};

const SLOT_ALIASES: Record<string, Slot> = {
  casco: "casco", head: "casco", helmet: "casco",
  pecho: "pecho", chest: "pecho", armor: "pecho",
  pantalon: "pantalon", pantalones: "pantalon", pants: "pantalon", legs: "pantalon",
  botas: "botas", boots: "botas", feet: "botas",
  cinturon: "cinturon", belt: "cinturon",
  guantes: "guantes", gloves: "guantes", hands: "guantes",
  mochila: "mochila", backpack: "mochila",
  arma_principal: "arma_principal", main_hand: "arma_principal", weapon: "arma_principal",
  arma_secundaria: "arma_secundaria", off_hand: "arma_secundaria", shield: "arma_secundaria",
  accesorio1: "accesorio1", accessory1: "accesorio1", ring1: "accesorio1",
  accesorio2: "accesorio2", accessory2: "accesorio2", ring2: "accesorio2", necklace: "accesorio2",
  aditamento: "aditamento", attachment: "aditamento",
};

/** Normalizes string for key/header matching. */
export function normKey(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/_/g, " ")
    .trim();
}

export function normalizeName(s: string): string {
  return normKey(s).replace(/\s+/g, " ");
}

function rarityFrom(raw: any): Rarity | null {
  const k = normKey(String(raw ?? ""));
  return RARITY_ALIASES[k] ?? null;
}

function categoryFrom(raw: any): ItemCategory | null {
  const k = normKey(String(raw ?? ""));
  if (CATEGORY_ALIASES[k]) return CATEGORY_ALIASES[k];
  const cat = ITEM_CATEGORIES.find(c => normKey(c.label) === k || normKey(c.key) === k);
  return cat ? cat.key : null;
}

function slotFrom(raw: any): Slot | null {
  const k = normKey(String(raw ?? ""));
  if (SLOT_ALIASES[k]) return SLOT_ALIASES[k];
  const slot = SLOTS.find(s => normKey(s.label) === k || normKey(s.key) === k);
  return slot ? slot.key : null;
}

function clean(v: any): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function toInt(v: any, fallback = 0): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return isNaN(n) ? fallback : n;
}

/* ----------- XLSX ----------- */

const HEADER_MAP: Record<string, keyof ParsedItem> = {
  "id": "external_id",
  "nombre": "name",
  "name": "name",
  "categoria": "category",
  "categoría": "category",
  "category": "category",
  "rareza": "rarity",
  "rarity": "rarity",
  "ranura": "slot",
  "slot": "slot",
  "posicion": "slot",
  "posición": "slot",
  "defensa": "defense_bonus",
  "def": "defense_bonus",
  "defense": "defense_bonus",
  "vida": "hp_bonus",
  "hp": "hp_bonus",
  "daño": "damage_bonus",
  "dano": "damage_bonus",
  "damage": "damage_bonus",
  "dmg": "damage_bonus",
  "usos": "uses",
  "max usos": "max_uses",
  "máx usos": "max_uses",
  "max_uses": "max_uses",
  "descripcion": "description",
  "descripción": "description",
  "description": "description",
};

export function parseItemsXlsx(buf: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buf, { type: "array" });
  // Try finding a sheet with "item" or "objeto" in the name, else first sheet.
  const preferred = wb.SheetNames.find(n => normKey(n).includes("item") || normKey(n).includes("objeto"))
    ?? wb.SheetNames[0];
  const sheet = wb.Sheets[preferred];
  if (!sheet) return { rows: [], errors: [{ where: "xlsx", message: "Hoja vacía" }] };

  const aoa: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  
  // Find header row
  const looksLikeHeader = (row: any[]) =>
    row.some(c => normKey(String(c)) in HEADER_MAP);
  
  let headerIdx = aoa.findIndex(r => looksLikeHeader(r));
  if (headerIdx < 0) return { rows: [], errors: [{ where: "xlsx", message: "No se encontraron encabezados (Nombre, Categoría, Rareza...)" }] };

  const headers = aoa[headerIdx].map(c => normKey(String(c)));
  const colMap: Record<number, keyof ParsedItem> = {};
  headers.forEach((h, i) => {
    const k = HEADER_MAP[h];
    if (k) colMap[i] = k;
  });

  const rows: ParsedItem[] = [];
  const errors: ParseError[] = [];
  for (let r = headerIdx + 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every(c => clean(c) === "")) continue;
    
    const draft: any = {};
    for (const [iStr, key] of Object.entries(colMap)) {
      draft[key] = row[Number(iStr)];
    }
    
    const where = `Fila ${r + 1}`;
    const built = buildRow(draft, where, errors);
    if (built) rows.push(built);
  }
  return { rows, errors };
}

function buildRow(draft: any, where: string, errors: ParseError[]): ParsedItem | null {
  const name = clean(draft.name);
  const category = categoryFrom(draft.category) || "otro";
  const rarity = rarityFrom(draft.rarity) || "white";
  const slot = slotFrom(draft.slot);
  
  if (!name) {
    errors.push({ where, message: "Falta el nombre del objeto" });
    return null;
  }

  return {
    external_id: clean(draft.external_id) || null,
    name,
    category,
    rarity,
    slot,
    defense_bonus: toInt(draft.defense_bonus, 0),
    hp_bonus: toInt(draft.hp_bonus, 0),
    damage_bonus: toInt(draft.damage_bonus, 0),
    uses: toInt(draft.uses, 1),
    max_uses: toInt(draft.max_uses, draft.uses ? toInt(draft.uses, 1) : 1),
    description: clean(draft.description),
  };
}

export async function parseItemFile(file: File): Promise<ParseResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    return parseItemsXlsx(buf);
  }
  return { rows: [], errors: [{ where: file.name, message: "Formato no soportado. Usa .xlsx o .xls" }] };
}
