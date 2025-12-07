/* ============================================================================
   PRINT ENGINE — KCC Billing OS
   Loads bill from IndexedDB → Renders → Generates Barcode → window.print()
============================================================================ */

let bill = null;

/* -------------------------------------------
   FETCH LATEST BILL
------------------------------------------- */
(async () => {
  const allBills = await storeGetAll("bills");
  if (!allBills.length) return;

  // Latest saved bill
  bill = allBills[allBills.length - 1];

  renderPatientDetails();
  renderTable();
  renderBarcode();
})();

/* -------------------------------------------
   PATIENT DETAILS
------------------------------------------- */
function renderPatientDetails() {
  const p = bill.patient;

  document.getElementById("pDetails").innerHTML = `
    <h2>Patient Details</h2>
    <table style="width:100%; border-collapse:collapse">
      <tr><td><strong>Name</strong></td><td>${p.name}</td></tr>
      <tr><td><strong>UHID</strong></td><td>${p.uhid}</td></tr>
      <tr><td><strong>IP No</strong></td><td>${p.ipno}</td></tr>
      <tr><td><strong>Age/Gender</strong></td><td>${p.age} / ${p.gender}</td></tr>
      <tr><td><strong>Practitioner</strong></td><td>${p.doc}</td></tr>
      <tr><td><strong>Speciality</strong></td><td>${p.spec}</td></tr>
      <tr><td><strong>Admission Date</strong></td><td>${formatDate(p.admDate)}</td></tr>
      <tr><td><strong>Nursing Unit</strong></td><td>${p.nursingUnit}</td></tr>
    </table>
  `;
}

/* -------------------------------------------
   BILLING TABLE
------------------------------------------- */
function renderTable() {
  const rows = bill.rows;

  let html = `
    <h2>Billing Details</h2>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Rate</th>
          <th>Qty</th>
          <th>GST%</th>
          <th>Net</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(r => {
    const amt = r.rate * r.qty;
    const tax = amt * (r.gst / 100);
    const total = amt + tax;

    html += `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td>${r.desc}</td>
        <td>${fmt(r.rate)}</td>
        <td>${r.qty}</td>
        <td>${r.gst}</td>
        <td>${fmt(total)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <div style="margin-top:20px">
      <p><strong>Gross:</strong> ${bill.totals.gross}</p>
      <p><strong>GST:</strong> ${bill.totals.gst}</p>
      <p><strong>Returns:</strong> ${bill.totals.returns}</p>
      <p><strong>Receipts:</strong> ${bill.totals.receipts}</p>
      <p style="font-size:18px; margin-top:10px;">
        <strong>Final Payable:</strong> ${bill.totals.final}
      </p>
    </div>
  `;

  document.getElementById("pTable").innerHTML = html;
}

/* -------------------------------------------
   BARCODE
------------------------------------------- */
function renderBarcode() {
  if (!bill.invoice) return;

  JsBarcode("#barcode", bill.invoice, {
    format: "CODE128",
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 14
  });
}

/* -------------------------------------------
   AUTO PRINT
------------------------------------------- */
window.onload = () => {
  setTimeout(() => window.print(), 500);
};
