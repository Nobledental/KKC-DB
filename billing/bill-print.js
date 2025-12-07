/* ============================================================================
   BILL PRINT — LOAD FROM SESSION + RENDER
============================================================================ */

function qs(s) {
  return document.querySelector(s);
}

window.onload = () => {
  const bill = JSON.parse(sessionStorage.getItem("CURRENT_BILL") || "{}");
  if (!bill.patient) return;

  renderBill(bill);
};

/* ============================================================================
   RENDER BILL
============================================================================ */

function renderBill(b) {

  // PATIENT
  qs("#bp_name").textContent = b.patient.name;
  qs("#bp_age_gender").textContent = `${b.patient.age} / ${b.patient.gender}`;
  qs("#bp_uhid").textContent = b.patient.id;
  qs("#bp_doctor").textContent = b.patient.doctor;

  // ADMISSION
  qs("#bp_doa").textContent = b.admission.doa;
  qs("#bp_dod").textContent = b.admission.dod;
  qs("#bp_los").textContent = b.admission.los;

  // TABLE ITEMS
  const table = qs("#bp_items");
  table.innerHTML = "";

  const add = (label, amount) => {
    if (amount > 0) {
      table.innerHTML += `
        <tr>
          <td>${label}</td>
          <td class="right">₹ ${format(amount)}</td>
        </tr>`;
    }
  };

  // ROOM
  let roomTotal = 0;
  b.rooms.forEach(r => {
    roomTotal += (r.room * r.days) + (r.nursing * r.days) + (r.duty * r.days);
  });
  add("Room, Nursing & RMO", roomTotal);

  // CONSULTANT
  let visitTotal = 0;
  b.visits.forEach(v => visitTotal += v.total);
  add("Consultant Visits", visitTotal);

  // SURGERIES
  let surgTotal = 0;
  b.surgeries.forEach(s => surgTotal += s.final_amount);
  add("Surgeries & Procedures", surgTotal);

  // PHARMACY
  let pharmTotal = 0;
  b.pharmacy.forEach(p => pharmTotal += p.amount);
  add("Pharmacy", pharmTotal);

  // INVESTIGATIONS
  let testTotal = 0;
  b.investigations.forEach(t => testTotal += t.price);
  add("Investigations", testTotal);

  // MISC
  let miscTotal = 0;
  b.misc.forEach(m => miscTotal += m.amount);
  add("Miscellaneous", miscTotal);

  // TOTALS
  qs("#bp_gross").textContent = `₹ ${format(b.summary.gross)}`;
  qs("#bp_paid").textContent = `₹ ${format(b.summary.paid)}`;
  qs("#bp_balance").textContent = `₹ ${format(b.summary.balance)}`;
}

function format(n) {
  return Number(n).toLocaleString("en-IN");
}
