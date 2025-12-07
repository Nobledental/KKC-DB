/* ============================================================================
   BILLING ENGINE — KCC BILLING OS (UPGRADED)
============================================================================ */

let currentPatient = null;
let tariffMaster = null;
let billRows = [];

/* LOAD TARIFF MASTER ------------------------------------------------------- */
(async () => {
  tariffMaster = await storeGet("tariffs", "MASTER");
})();

/* PATIENT SEARCH ----------------------------------------------------------- */
document.getElementById("searchPatient").oninput = async e => {
  const q = e.target.value.toLowerCase();
  const all = await storeGetAll("patients");
  const box = document.getElementById("patientResults");

  if (!q) {
    box.style.display = "none";
    return;
  }

  box.innerHTML = "";
  box.style.display = "block";

  all.filter(p => p.name.toLowerCase().includes(q) || p.uhid.toLowerCase().includes(q))
    .forEach(p => {
      const div = document.createElement("div");
      div.className = "patient-item";
      div.textContent = `${p.name} (${p.uhid})`;
      div.onclick = () => {
        currentPatient = p;
        document.getElementById("searchPatient").value = p.name;
        box.style.display = "none";
      };
      box.appendChild(div);
    });
};

/* LOAD PATIENT ------------------------------------------------------------- */
document.getElementById("loadPatientBtn").onclick = () => {
  if (!currentPatient) return alert("Select a patient first.");

  document.getElementById("patientSummary").innerHTML = `
    <strong>${currentPatient.name}</strong><br>
    UHID: ${currentPatient.uhid} • IP: ${currentPatient.ipno}<br>
    Age/Gender: ${currentPatient.age} / ${currentPatient.gender}<br>
    Practitioner: ${currentPatient.doc}<br>
    Admission: ${formatDate(currentPatient.admDate)}
  `;
};

/* ADD ROW ------------------------------------------------------------------ */
function addBillRow(row) {
  billRows.push(row);
  renderTable();
}

/* RENDER TABLE ------------------------------------------------------------- */
function renderTable() {
  const t = document.getElementById("billTable");
  t.innerHTML = "";

  billRows.forEach((r, i) => {
    const amt = r.rate * r.qty;
    const gstAmt = amt * (r.gst / 100);
    const net = amt + gstAmt;

    t.innerHTML += `
      <div class="bill-row">
        <input type="date" value="${r.date}" 
          onchange="billRows[${i}].date=this.value; calcTotals();">

        <input value="${r.desc}" 
          onchange="billRows[${i}].desc=this.value">

        <input type="number" value="${r.rate}" 
          onchange="billRows[${i}].rate=+this.value; calcTotals();">

        <input type="number" value="${r.qty}" 
          onchange="billRows[${i}].qty=+this.value; calcTotals();">

        <input type="number" value="${r.gst}" 
          onchange="billRows[${i}].gst=+this.value; calcTotals();">

        <div>${fmt(net)}</div>

        <button onclick="billRows.splice(${i},1); renderTable();" 
          style="border:none; background:none; color:red; font-size:20px;">×</button>
      </div>
    `;
  });

  calcTotals();
}

/* AUTO DAILY CHARGES ------------------------------------------------------- */
document.getElementById("generateDailyBtn").onclick = () => {
  if (!currentPatient) return alert("Load patient first.");

  const adm = new Date(currentPatient.admDate);
  const today = new Date();
  const days = Math.ceil((today - adm) / (1000 * 60 * 60 * 24));

  const misc = tariffMaster.misc;

  for (let d = 0; d < days; d++) {

    const dt = new Date(adm);
    dt.setDate(adm.getDate() + d);
    const iso = dt.toISOString().split("T")[0];

    addBillRow({ date: iso, desc: "Room Rent", rate: misc.room || 0, qty: 1, gst: 0 });
    addBillRow({ date: iso, desc: "Nursing", rate: misc.nursing || 0, qty: 1, gst: 0 });
    addBillRow({ date: iso, desc: "RMO/DMO", rate: misc.rmo || 0, qty: 1, gst: 0 });
    addBillRow({ date: iso, desc: "Consultation", rate: misc.consult || 0, qty: 2, gst: 0 });
  }
};

/* ADD CUSTOM LINES --------------------------------------------------------- */
document.getElementById("addBillItemBtn").onclick = () =>
  addBillRow({ date: "", desc: "", rate: 0, qty: 1, gst: 0 });

document.getElementById("addReturnBtn").onclick = () =>
  addBillRow({ date: "", desc: "Return", rate: 0, qty: -1, gst: 0 });

document.getElementById("addReceiptBtn").onclick = () =>
  addBillRow({ date: "", desc: "Receipt", rate: 0, qty: 1, gst: 0 });

/* TOTALS ENGINE ------------------------------------------------------------ */
function calcTotals() {
  let gross = 0,
      gst = 0,
      returns = 0,
      receipts = 0;

  billRows.forEach(r => {
    const amt = r.rate * r.qty;
    const tax = amt * (r.gst / 100);

    gross += amt;
    gst += tax;

    if (r.qty < 0) returns += amt;
    if (r.desc.toLowerCase().includes("receipt")) receipts += amt;
  });

  document.getElementById("tGross").textContent = fmt(gross);
  document.getElementById("tGST").textContent = fmt(gst);
  document.getElementById("tReturns").textContent = fmt(returns);
  document.getElementById("tReceipts").textContent = fmt(receipts);

  const final = gross + gst + returns - receipts;
  document.getElementById("tFinal").textContent = fmt(final);
}

/* SAVE BILL ---------------------------------------------------------------- */
document.getElementById("saveBillBtn").onclick = async () => {
  if (!currentPatient) return alert("Load patient first.");

  const invoice = generateInvoice();

  const bill = {
    invoice,
    date: new Date().toISOString(),
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

  alert("Bill Saved — Invoice: " + invoice);
};
