/* ============================================================================
   IndexedDB Wrapper — KCC Billing OS
   Stores: patients, tariffs, bills
============================================================================ */

const DB_NAME = "kcc_billing_os";
const DB_VERSION = 1;
let db = null;

/* -------------------------------------------
   OPEN / INIT DATABASE
------------------------------------------- */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      db = e.target.result;

      if (!db.objectStoreNames.contains("patients"))
        db.createObjectStore("patients", { keyPath: "uhid" });

      if (!db.objectStoreNames.contains("tariffs"))
        db.createObjectStore("tariffs", { keyPath: "id" });

      if (!db.objectStoreNames.contains("bills"))
        db.createObjectStore("bills", { keyPath: "invoice" });
    };

    req.onsuccess = e => {
      db = e.target.result;
      resolve();
    };

    req.onerror = e => reject(e);
  });
}

openDB();

/* -------------------------------------------
   GENERIC GET / SET
------------------------------------------- */
function storeSet(storeName, data) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(data);
    tx.oncomplete = () => resolve(true);
  });
}

function storeGet(storeName, key) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readonly");
    tx.objectStore(storeName).get(key).onsuccess = e => resolve(e.target.result);
  });
}

function storeGetAll(storeName) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = e => resolve(e.target.result);
  });
}

function storeDelete(storeName, key) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve(true);
  });
}
