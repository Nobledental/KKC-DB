/* ============================================================================
   INDEXEDDB STORAGE SERVICE — KCC BILLING OS (UPGRADED)
   Handles: patients, tariffs, bills
   Version-safe, promise-based, production-ready
============================================================================ */

const DB_NAME = "kcc_billing_os";
const DB_VERSION = 2;
let db = null;

/* -------------------------------------------
   OPEN DATABASE + UPGRADE SUPPORT
------------------------------------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      db = e.target.result;

      /* Create or upgrade object stores */
      if (!db.objectStoreNames.contains("patients"))
        db.createObjectStore("patients", { keyPath: "uhid" });

      if (!db.objectStoreNames.contains("tariffs"))
        db.createObjectStore("tariffs", { keyPath: "id" });

      if (!db.objectStoreNames.contains("bills"))
        db.createObjectStore("bills", { keyPath: "invoice" });
    };

    req.onsuccess = e => {
      db = e.target.result;
      resolve(true);
    };

    req.onerror = e => {
      console.error("IndexedDB error:", e);
      reject(e);
    };
  });
}

/* AUTO OPEN DB */
openDB();

/* -------------------------------------------
   GENERIC WRITE
------------------------------------------- */
function storeSet(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const obj = tx.objectStore(store);

    obj.put(data);

    tx.oncomplete = () => resolve(true);
    tx.onerror = e => reject(e);
  });
}

/* -------------------------------------------
   GET SINGLE RECORD
------------------------------------------- */
function storeGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const obj = tx.objectStore(store);

    const req = obj.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = e => reject(e);
  });
}

/* -------------------------------------------
   GET ALL RECORDS
------------------------------------------- */
function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = e => reject(e);
  });
}

/* -------------------------------------------
   DELETE RECORD
------------------------------------------- */
function storeDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);

    tx.oncomplete = () => resolve(true);
    tx.onerror = e => reject(e);
  });
}
