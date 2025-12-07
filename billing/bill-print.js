/* ============================================================================
   BILL PRINT — JS
   Loads bill data from localStorage & renders into print layout
============================================================================ */

function qs(s) {
  return document.querySelector(s);
}

window.onload = () => {
  const data = JSON.parse(localStorage.getItem("KCC_CURRENT_BILL") || "{}");
  renderBill(data);
};

/* ----------------------------------------------------------
   RENDER BILL ON THE PRINT PAGE
---------------------------------------------------------- */
function renderBill(bill) {
  if (!bill) return;

  qs("#bp_name").textContent = bill.name;
  qs("#bp_age_gender").textContent = `${bill.age} / ${bill.gender}`;
  qs("#bp_uhid").textContent = bill.patientID;
  qs("#bp_doctor").textContent = bill.doctor;

  qs("#bp_doa").textContent = bill.doa;
  qs("#bp_dod").textContent = bill.dod;
  qs("#bp_los").textContent = bill.los;
  qs("#bp_billno").textContent = bill.billNo;

  /* ----------------------------------------------------------
     SUMMARY TABLE (STATIC FOR NOW – dynamic items later)
  ---------------------------------------------------------- */
  const body = qs("#bp_items");
  body.innerHTML = `
    <tr><td>Hospital Charges (Room, Nursing, RMO, Shifts)</td><td class="right">Included</td></tr>
    <tr><td>Consultant Visits</td><td class="right">Included</td></tr>
    <tr><td>Surgeries & Procedures</td><td class="right">Included</td></tr>
    <tr><td>Pharmacy</td><td class="right">Included</td></tr>
    <tr><td>Investigations</td><td class="right">Included</td></tr>
    <tr><td>Miscellaneous</td><td class="right">Included</td></tr>
  `;

  qs("#bp_gross").textContent = `₹ ${format(bill.totals.gross)}`;
  qs("#bp_paid").textContent = `₹ ${format(bill.totals.paid)}`;
  qs("#bp_balance").textContent = `₹ ${format(bill.totals.balance)}`;
}

/* ----------------------------------------------------------
   FORMAT NUMBERS
---------------------------------------------------------- */
function format(n) {
  return Number(n).toLocaleString("en-IN");
}
