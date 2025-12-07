/* ============================================================================
   BILLING ENGINE — KCC Billing OS
============================================================================ */

let currentPatient = null;
let tariffMaster = null;
let billRows = [];

/* -------------------------------------------
   LOAD TARIFF
------------------------------------------- */
(async () => {
  tariffMaster = await storeGet("tariffs", "MASTER");
})();

/* -------------------------------------------
   SEARCH PATIENT
------------------------------------------- */
document.getElementById("searchPatient").oninput = async e => {
  const q = e.target.value.toLowerCase();
  const all = await storeGetAll("patients");
  const r = document.getElementById("patientResults");
  r.innerHTML = "";

  all.filter(p => p.name.toLowerCase().includes(q)).forEach(p => {
    const div = document.createElement("div");
    div.className = "patient-item";
    div.textContent = `${p.name} (${p.uhid})`;
    div.onclick = () => {
      currentPatient = p;
      document.getElementById("loadPatientBtn").click();
    };
    r.appendChild(div);
  });
};

/* -------------------------------------------
   LOAD PATIENT INTO BILLING PAGE
------------------------------------------- */
document.getElementById("loadPatientBtn").onclick = () => {
  if (!currentPatient) return;

  document.getElementById("patientSummary").innerHTML = `
    <strong>${currentPatient.name}</strong><br>
    UHID: ${currentPatient.uhid} • IP: ${currentPatient.ipno}<br>
    Age/Gender: ${currentPatient.age} / ${currentPatient.gender}<br>
    Practitioner: ${currentPatient.doc}<br>
    Admission: ${formatDate(currentPatient.admDate)}
  `;
};

/* -------------------------------------------
   ADD BILL ROW
------------------------------------------- */
function addBillRow(row) {
  billRows.push(row);
  renderTable();
}

/* -------------------------------------------
   RENDER TABLE
------------------------------------------- */
function renderTable() {
  const t = document.getElementById("billTable");
  t.innerHTML = "";

  billRows.forEach((r, i) => {
    t.innerHTML += `
      <div class="row">
        <input type="date" value="${r.date}" onchange="billRows[${i}].date=this.value; calcTotals();">
        <input value="${r.desc}" onchange="billRows[${i}].desc=this.value">
        <input type="number" value="${r.rate}" onchange="billRows[${i}].rate=+this.value; calcTotals();">
        <input type="number" value="${r.qty}" onchange="billRows[${i}].qty=+this.value; calcTotals();">
        <div>${fmt(r.rate * r.qty)}</div>
        <input type="number" value="${r.gst}" onchange="billRows[${i}].gst=+this.value; calcTotals();">
        <div>${fmt(r.qty * r.rate + (r.rate*r.qty*r.gst/100))}</div>
        <button onclick="billRows.splice(${i},1); renderTable(); calcTotals();">×</button>
      </div>
    `;
  });

  calcTotals();
}

/* -------------------------------------------
   DAILY CHARGES AUTO GENERATION
------------------------------------------- */
document.getElementById("generateDailyBtn").onclick = () => {
  if (!currentPatient) return;

  let los = 1;
  if (currentPatient.admDate) {
    const a = new Date(currentPatient.admDate);
    const b = new Date();
    los = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  }

  for (let d = 1; d <= los; d++) {
    addBillRow({ date: "", desc: `Room Rent — Day ${d}`, rate: tariffMaster.misc.room || 0, qty: 1, gst: 0 });
    addBillRow({ date: "", desc: `Nursing — Day ${d}`, rate: tariffMaster.misc.nursing || 0, qty: 1, gst: 0 });
    addBillRow({ date: "", desc: `RMO/DMO — Day ${d}`, rate: tariffMaster.misc.rmo || 0, qty: 1, gst: 0 });
    addBillRow({ date: "", desc: `Consultation — Day ${d}`, rate: tariffMaster.misc.consult || 0, qty: 1, gst: 0 });
  }
};

/* -------------------------------------------
   ADD MANUAL BILL ITEM
------------------------------------------- */
document.getElementById("addBillItemBtn").onclick = () => {
  addBillRow({ date: "", desc: "", rate: 0, qty: 1, gst: 0 });
};

/* -------------------------------------------
   RETURNS
------------------------------------------- */
document.getElementById("addReturnBtn").onclick = () => {
  addBillRow({ date: "", desc: "Return", rate: 0, qty: -1, gst: 0 });
};

/* -------------------------------------------
   RECEIPTS
------------------------------------------- */
document.getElementById("addReceiptBtn").onclick = () => {
  addBillRow({ date: "", desc: "Receipt", rate: 0, qty: 1, gst: 0 });
};

/* -------------------------------------------
   TOTALS ENGINE
------------------------------------------- */
function calcTotals() {
  let gross = 0, gst = 0, returns = 0, receipts = 0;

  billRows.forEach(r => {
    const amount = r.rate * r.qty;
    const tax = amount * (r.gst / 100);

    if (r.qty < 0) returns += amount;
    if (r.desc.toLowerCase().includes("receipt")) receipts += amount;

    gross += amount;
    gst += tax;
  });

  document.getElementById("tGross").textContent = fmt(gross);
  document.getElementById("tGST").textContent = fmt(gst);
  document.getElementById("tReturns").textContent = fmt(returns);
  document.getElementById("tReceipts").textContent = fmt(receipts);
  document.getElementById("tFinal").textContent = fmt(gross + gst + returns - receipts);
}

/* -------------------------------------------
   SAVE BILL
------------------------------------------- */
document.getElementById("saveBillBtn").onclick = async () => {

  const invoice = generateInvoice();

  const bill = {
    invoice,
    patient: currentPatient,
    rows: billRows,
    totals: {
      gross: document.getElementById("tGross").textContent,
      gst: document.getElementById("tGST").textContent,
      returns: document.getElementById("tReturns").textContent,
      receipts: document.getElementById("tReceipts").textContent,
      final: document.getElementById("tFinal").textContent
    }
  };

  await storeSet("bills", bill);
  alert("Bill Saved — Invoice " + invoice);
};
