/* ============================================================================
   UTILITIES — KCC Billing OS (UPGRADED)
============================================================================ */

function pad(n, size = 2) {
  return n.toString().padStart(size, "0");
}

/* -------------------------------------------
   FORMAT DATE (DD-MM-YYYY)
------------------------------------------- */
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()}`;
}

/* -------------------------------------------
   UHID FORMAT: KCC-YYMM-XXXXXX
------------------------------------------- */
function generateUHID() {
  const now = new Date();
  const yymm = `${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}`;
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `KCC-${yymm}-${seq}`;
}

/* -------------------------------------------
   IP NUMBER FORMAT: IP-YYMM-XXXXXX
------------------------------------------- */
function generateIP() {
  const now = new Date();
  const yymm = `${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}`;
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `IP-${yymm}-${seq}`;
}

/* -------------------------------------------
   INVOICE NUMBER (12 DIGIT SAFE)
------------------------------------------- */
function generateInvoice() {
  const now = new Date();
  const y = now.getFullYear();
  const seq = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
  return `${y}${seq}`; // Example: 202401123456
}

/* -------------------------------------------
   INR FORMATTER
------------------------------------------- */
function fmt(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
