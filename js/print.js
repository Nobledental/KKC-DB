/* ============================================================================
   PRINT ENGINE — KCC Billing OS (UPGRADED)
============================================================================ */

let bill = null;

/* LOAD LATEST BILL --------------------------------------------------------- */
(async () => {
  const bills = await storeGetAll("bills");
  if (!bills.length) return;

  bill = bills[bills.length - 1];

  renderPatientDetails();
  renderBillingTable();
  renderBarcode();

  setTimeout(() => window.print(), 500);
})();

/* PATIENT DETAILS ---------------------------------------------------------- */
function renderPatientDetails() {
  const p = bill.patient;

  document.getElementById("pDetails").innerHTML = `
    <h2 style="margin-bottom:8px;">Patient Details</h2>
    <table>
      <tr><td><strong>Name</strong></td><td>${p.name}</td></tr>
      <tr><td><strong>UHID</strong></td><td>${p.uhid}</td></tr>
      <tr><td><strong>IP No</strong></td><td>${p.ipno}</td></tr>
      <tr><td><strong>Age / Gender</strong></td><td>${p.age} / ${p.gender}</td></tr>
      <tr><td><strong>Practitioner</strong></td><td>${p.doc}</td></tr>
      <tr><td><strong>Speciality</strong></td><td>${p.spec}</td></tr>
      <tr><td><strong>Admission Date</strong></td><td>${formatDate(p.admDate)}</td></tr>
      <tr><td><strong>Nursing Unit</strong></td><td>${p.nursingUnit}</td></tr>
    </table>
  `;
}

/* BILL TABLE --------------------------------------------------------------- */
function renderBillingTable() {
  let html = `
    <h2 style="margin-bottom:8px;">Billing Details</h2>
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

  bill.rows.forEach(r => {
    const amt = r.rate * r.qty;
    const gstAmt = amt * (r.gst / 100);
    const net = amt + gstAmt;

    html += `
      <tr>
        <td>${formatDate(r.date)}</td>
        <td>${r.desc}</td>
        <td>${fmt(r.rate)}</td>
        <td>${r.qty}</td>
        <td>${r.gst}</td>
        <td>${fmt(net)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>

    <table>
      <tr><td><strong>Gross</strong></td><td>${bill.totals.gross}</td></tr>
      <tr><td><strong>GST</strong></td><td>${bill.totals.gst}</td></tr>
      <tr><td><strong>Returns</strong></td><td>${bill.totals.returns}</td></tr>
      <tr><td><strong>Receipts</strong></td><td>${bill.totals.receipts}</td></tr>
      <tr><td><strong>Final Payable</strong></td><td><strong>${bill.totals.final}</strong></td></tr>
    </table>
  `;

  document.getElementById("pTable").innerHTML = html;
}

/* BARCODE --------------------------------------------------------------- */
function renderBarcode() {
  if (!bill.invoice) return;

  JsBarcode("#barcode", bill.invoice, {
    format: "CODE128",
    width: 2,
    height: 50,
    displayValue: true,
    fontSize: 16
  });
}
