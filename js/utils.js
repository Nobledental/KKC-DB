/* ============================================================================
   UTILITIES — KCC Billing OS
============================================================================ */

function pad(n, size = 2) {
  return n.toString().padStart(size, "0");
}

/* -------------------------------------------
   DATE HELPERS
------------------------------------------- */
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

/* -------------------------------------------
   AUTO UHID
   Format: KCC-YYMM-000001
------------------------------------------- */
function generateUHID() {
  const now = new Date();
  const yymm = `${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}`;
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `KCC-${yymm}-${rand}`;
}

/* -------------------------------------------
   AUTO IP NUMBER
   Format: IP-YYMM-000001
------------------------------------------- */
function generateIP() {
  const now = new Date();
  const yymm = `${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}`;
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `IP-${yymm}-${rand}`;
}

/* -------------------------------------------
   AUTO INVOICE NUMBER
   12-digit or INV-YYYY-XXXXXX
------------------------------------------- */
function generateInvoice() {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `${y}${rand}`;
}

/* -------------------------------------------
   Format INR
------------------------------------------- */
function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
}
