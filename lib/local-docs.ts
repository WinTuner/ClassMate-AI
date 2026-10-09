// คลังเอกสารในเครื่อง (IndexedDB) — ไฟล์ไม่ออกจาก browser เลย
// เก็บ: id, filename, pages, chunks[{page, content}], createdAt
// ใช้แทนตาราง documents/chunks บน server ที่เลิกใช้แล้ว

import type { LocalChunk } from "./local-rag";

export type LocalDoc = {
  id: string;
  filename: string;
  pages: number;
  chunks: LocalChunk[];
  createdAt: number;
};

const DB = "classmate-ai";
const STORE = "docs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export const saveDoc = (doc: LocalDoc) =>
  tx("readwrite", (s) => s.put(doc));

export const listDocs = (): Promise<LocalDoc[]> =>
  tx("readonly", (s) => s.getAll()).then((all) =>
    (all as LocalDoc[]).sort((a, b) => b.createdAt - a.createdAt)
  );

export const getDoc = async (id: string): Promise<LocalDoc | null> => {
  const all = await listDocs();
  return all.find((d) => d.id === id) ?? null;
};

export const deleteDoc = (id: string) =>
  tx("readwrite", (s) => s.delete(id)).then(() => undefined);

export const findDuplicateName = async (filename: string): Promise<boolean> => {
  const all = await listDocs();
  return all.some((d) => d.filename === filename);
};
