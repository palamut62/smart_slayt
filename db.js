// SQLite kalici depolama: uretilen her kart serisi ve kartlari kaydedilir.
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(resolve(__dirname, "smart_slayt.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  model TEXT,
  steps INTEGER,
  slides_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id INTEGER NOT NULL,
  idx INTEGER NOT NULL,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  FOREIGN KEY (set_id) REFERENCES sets(id) ON DELETE CASCADE
);
`);

// Geriye donuk uyumlu migration: var olan kolonu tekrar EKLEME (hata vermesin).
// Eski kayitlar bozulmaz; yeni kolonlar varsayilanla doldurulur.
function ensureColumn(table, column, ddl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}
ensureColumn("sets", "type", "type TEXT DEFAULT 'carousel'");
ensureColumn("sets", "cheatsheet_type", "cheatsheet_type TEXT");

export function createSet({ topic, model, steps, slides, cards, type, cheatsheetType }) {
  const now = Date.now();
  const info = db
    .prepare("INSERT INTO sets (topic, model, steps, slides_json, created_at, type, cheatsheet_type) VALUES (?,?,?,?,?,?,?)")
    .run(topic, model || "", steps || 0, JSON.stringify(slides), now, type || "carousel", cheatsheetType || null);
  const setId = info.lastInsertRowid;
  const ins = db.prepare("INSERT INTO cards (set_id, idx, filename, url) VALUES (?,?,?,?)");
  cards.forEach((c, i) => ins.run(setId, i, c.name, c.url));
  return getSet(setId);
}

export function listSets() {
  const sets = db.prepare("SELECT * FROM sets ORDER BY created_at DESC").all();
  const cardsStmt = db.prepare("SELECT * FROM cards WHERE set_id=? ORDER BY idx");
  return sets.map((s) => ({
    id: s.id, topic: s.topic, model: s.model, steps: s.steps,
    type: s.type || "carousel", cheatsheetType: s.cheatsheet_type || null,
    createdAt: s.created_at, count: cardsStmt.all(s.id).length,
    cards: cardsStmt.all(s.id),
  }));
}

export function getSet(id) {
  const s = db.prepare("SELECT * FROM sets WHERE id=?").get(id);
  if (!s) return null;
  const cards = db.prepare("SELECT * FROM cards WHERE set_id=? ORDER BY idx").all(id);
  return {
    id: s.id, topic: s.topic, model: s.model, steps: s.steps,
    type: s.type || "carousel", cheatsheetType: s.cheatsheet_type || null,
    createdAt: s.created_at, slides: JSON.parse(s.slides_json || "[]"),
    count: cards.length, cards,
  };
}

export function deleteSet(id) {
  db.prepare("DELETE FROM cards WHERE set_id=?").run(id);
  db.prepare("DELETE FROM sets WHERE id=?").run(id);
}

export default db;
