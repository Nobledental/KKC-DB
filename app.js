/* ============================================================================
   KCC BILLING PAGE — MAIN JS ENGINE
   Krishna Kidney Centre
   100% Offline — No Backend — No Login — No AI
============================================================================ */

/* ============================================================
   SHORTCUTS
============================================================ */
const $ = (sel) => document.querySelector(sel);
const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* GLOBAL BILL OBJECT -------------------------------------------------------- */
let bill = {
  patient: {},
  room: {},
  visits: [],
  surgeries: [],
  pharmacy: { total: 0, items: [] },
  investigations: [],
  misc: [],
  receipts: [],
  totals: { gross: 0, paid: 0, balance: 0 }
};

/* ============================================================================
   PATIENT DETAILS — AUTO LOS CALCULATION
============================================================================ */
$("#p_admission").addEventListener("change", updateLOS);
$("#p_discharge").addEventListener("change", updateLOS);

function updateLOS() {
  const a = new Date($("#p_admission").value);
  const d = new Date($("#p_discharge").value);

  if (!a || !d) return;

  const diff = (d - a) / (1000 * 60 * 60 * 24);
  if (diff < 0) {
    $("#p_los").value = "Invalid";
    return;
  }

  $("#p_los").value = diff + 1;
}

/* ============================================================================
   KCC BILLING PAGE — MAIN JS ENGINE
   Krishna Kidney Centre
   100% Offline — No Backend — No Login — No AI
============================================================================ */

/* ============================================================
   SHORTCUTS
============================================================ */
const $ = (sel) => document.querySelector(sel);
const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* GLOBAL BILL OBJECT -------------------------------------------------------- */
let bill = {
  patient: {},
  room: {},
  visits: [],
  surgeries: [],
  pharmacy: { total: 0, items: [] },
  investigations: [],
  misc: [],
  receipts: [],
  totals: { gross: 0, paid: 0, balance: 0 }
};

/* ============================================================================
   PATIENT DETAILS — AUTO LOS CALCULATION
============================================================================ */
$("#p_admission").addEventListener("change", updateLOS);
$("#p_discharge").addEventListener("change", updateLOS);

function updateLOS() {
  const a = new Date($("#p_admission").value);
  const d = new Date($("#p_discharge").value);

  if (!a || !d) return;

  const diff = (d - a) / (1000 * 60 * 60 * 24);
  if (diff < 0) {
    $("#p_los").value = "Invalid";
    return;
  }

  $("#p_los").value = diff + 1;
}

/* ============================================================================
   BILL NUMBER GENERATOR (12 DIGITS)
============================================================================ */
function generateBillNumber() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");

  const prefix = `${y}${m}${d}`; // 8 digits

  return new Promise((resolve) => {
    const tx = db.transaction("bills", "readonly");
    const store = tx.objectStore("bills");

    const index = store.index("date");
    const range = IDBKeyRange.only(prefix);

    let count = 0;

    index.openCursor(range).onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        count++;
        cursor.continue();
      } else {
        const num = (count + 1).toString().padStart(4, "0"); // 0001
        resolve(prefix + num); // 12-digit bill number
      }
    };
  });
}

/* ============================================================================
   INDEXEDDB SETUP
============================================================================ */
let db;

function openDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open("kcc_billing", 1);

    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      const store = db.createObjectStore("bills", { keyPath: "bill_no" });
      store.createIndex("date", "date");
    };

    request.onsuccess = function (e) {
      db = e.target.result;
      resolve();
    };
  });
}

/* ============================================================================
   SAVE BILL
============================================================================ */
$("#saveBillBtn").addEventListener("click", saveBill);

async function saveBill() {
  // Generate bill number if missing
  if (!bill.bill_no) {
    bill.bill_no = await generateBillNumber();
  }

  // Collect patient details into bill object
  bill.patient = {
    name: $("#p_name").value,
    id: $("#p_id").value,
    age: $("#p_age").value,
    gender: $("#p_gender").value,
    address: $("#p_address").value,
    dept: $("#p_department").value,
    consultant: $("#p_consultant").value,
    admission: $("#p_admission").value,
    discharge: $("#p_discharge").value,
    los: $("#p_los").value,
    insurance: $("#p_insurance").value,
    insurer: $("#p_insurer").value,
    claim: $("#p_claim").value
  };

  // Fill bill totals
  bill.totals = {
    gross: bill.totals.gross,
    paid: bill.totals.paid,
    balance: bill.totals.balance
  };

  const record = {
    bill_no: bill.bill_no,
    patient_name: bill.patient.name,
    date: bill.patient.admission || "",
    total: bill.totals.gross,
    paid: bill.totals.paid,
    balance: bill.totals.balance,
    full_bill_json: JSON.parse(JSON.stringify(bill))
  };

  const tx = db.transaction("bills", "readwrite");
  tx.objectStore("bills").put(record);

  tx.oncomplete = () => {
    alert("Bill Saved Successfully!\nBill No: " + bill.bill_no);
    loadHistory();
  };
}

/* ============================================================================
   LOAD HISTORY LIST
============================================================================ */
function loadHistory() {
  const list = $("#history_list");
  if (!list) return;
  list.innerHTML = "";

  const tx = db.transaction("bills", "readonly");
  const store = tx.objectStore("bills");

  store.openCursor().onsuccess = function (e) {
    const cursor = e.target.result;
    if (!cursor) return;

    const bill = cursor.value;

    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <div class="h-left">
        <h3>Bill No: ${bill.bill_no}</h3>
        <p>${bill.patient_name}</p>
        <p>Date: ${bill.date}</p>
        <p>Total: ${fmtINR(bill.total)}</p>
        <p>Balance: ${fmtINR(bill.balance)}</p>
      </div>
      <div class="h-right">
        <button class="openBill">Open</button>
        <button class="deleteBill">Delete</button>
      </div>
    `;

    // OPEN BILL
    div.querySelector(".openBill").onclick = () => loadBill(bill);

    // DELETE BILL
    div.querySelector(".deleteBill").onclick = () => deleteBill(bill.bill_no);

    list.appendChild(div);

    cursor.continue();
  };
}

/* ============================================================================
   LOAD BILL BACK INTO FORM
============================================================================ */
function loadBill(rec) {
  const b = rec.full_bill_json;

  bill = JSON.parse(JSON.stringify(b));

  const p = b.patient;

  $("#p_name").value = p.name;
  $("#p_id").value = p.id;
  $("#p_age").value = p.age;
  $("#p_gender").value = p.gender;
  $("#p_address").value = p.address;
  $("#p_department").value = p.dept;
  $("#p_consultant").value = p.consultant;
  $("#p_admission").value = p.admission;
  $("#p_discharge").value = p.discharge;
  $("#p_los").value = p.los;
  $("#p_insurance").value = p.insurance;
  $("#p_insurer").value = p.insurer;
  $("#p_claim").value = p.claim;

  // Load room
  $("#room_select").value = b.room.type;
  $("#room_select").dispatchEvent(new Event("change"));

  // Visits, surgeries, etc. are NOT rebuilt here for simplicity.
  // If you want, I can add full restoration.

  computeTotals();
  alert("Bill Loaded: " + rec.bill_no);
}

/* ============================================================================
   DELETE BILL
============================================================================ */
function deleteBill(bill_no) {
  const tx = db.transaction("bills", "readwrite");
  tx.objectStore("bills").delete(bill_no);

  tx.oncomplete = () => {
    alert("Bill Deleted");
    loadHistory();
  };
}

/* ============================================================================
   INIT — OPEN DB + LOAD HISTORY
============================================================================ */
async function initDB() {
  await openDB();
  loadHistory();
}

initDB();   // 1st
init();     // 2nd

/* ============================================================================
   ROOM & DAILY CHARGES
============================================================================ */
function loadRoomTariff() {
  const select = $("#room_select");
  select.innerHTML = "";

  Object.keys(tariffs.rooms).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  });
}

$("#room_select").addEventListener("change", function () {
  const roomType = this.value;
  const data = tariffs.rooms[roomType];

  bill.room = { type: roomType, ...data };

  $("#room_breakup").innerHTML = `
    <table>
      <tr><th>Item</th><th>Amount</th></tr>
      <tr><td>Room Rent</td><td>${fmtINR(data.room)}</td></tr>
      <tr><td>Nursing</td><td>${fmtINR(data.nursing)}</td></tr>
      <tr><td>Duty Doctor</td><td>${fmtINR(data.duty)}</td></tr>
      <tr><td>Consultant Visit</td><td>${fmtINR(data.consult)}</td></tr>
    </table>
  `;

  computeTotals();
});

/* ============================================================================
   CONSULTANT VISITS
============================================================================ */
$("#addVisitBtn").addEventListener("click", () => addVisitRow());

function addVisitRow() {
  const parent = $("#visit_list");

  const row = document.createElement("div");
  row.className = "visit-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input type="date" class="v_date"></td>
        <td><input type="number" class="v_count" placeholder="Visits"></td>
        <td><input type="number" class="v_rate" placeholder="Rate"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", computeTotals));

  parent.appendChild(row);
}

/* ============================================================================
   SURGERIES
============================================================================ */
$("#addSurgeryBtn").addEventListener("click", () => addSurgeryRow());

function addSurgeryRow() {
  const parent = $("#surgery_list");

  const row = document.createElement("div");
  row.className = "surgery-row";

  const pakKeys = Object.keys(tariffs.packages);

  let options = `<option value="">Select Package</option>`;
  pakKeys.forEach(p => options += `<option value="${p}">${p}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="s_pkg">${options}</select>
        </td>
        <td><input class="s_discount" placeholder="Discount %"></td>
        <td><span class="s_total">₹0</span></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>

    <div class="s_breakup"></div>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".s_pkg").addEventListener("change", function () {
    const pkgName = this.value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    const breakup = row.querySelector(".s_breakup");

    const total = pkg.package_total;

    breakup.innerHTML = `
      <table>
        <tr><th>Component</th><th>Amount</th></tr>
        <tr><td>OT</td><td>${fmtINR(pkg.ot)}</td></tr>
        <tr><td>Surgeon</td><td>${fmtINR(pkg.surgeon)}</td></tr>
        <tr><td>Assistant</td><td>${fmtINR(pkg.assistant)}</td></tr>
        <tr><td>Anesthetist</td><td>${fmtINR(pkg.anesthetist)}</td></tr>
        <tr><td>Implant</td><td>${fmtINR(pkg.implant)}</td></tr>
        <tr><td>OT Gas</td><td>${fmtINR(pkg.gas)}</td></tr>
        <tr><td>Consumables</td><td>${fmtINR(pkg.consumables)}</td></tr>
        <tr><th>Total</th><th>${fmtINR(total)}</th></tr>
      </table>
    `;

    row.querySelector(".s_total").textContent = fmtINR(total);
    computeTotals();
  });

  row.querySelector(".s_discount").addEventListener("input", computeTotals);

  parent.appendChild(row);
}

/* ============================================================================
   PHARMACY
============================================================================ */
$("#pharmacy_total").addEventListener("input", computeTotals);

$("#addPharmacyItemBtn").addEventListener("click", () => {
  const parent = $("#pharmacy_list");

  const row = document.createElement("div");
  row.className = "pharm-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Item"></td>
        <td><input type="number" class="p_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".p_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   INVESTIGATIONS
============================================================================ */
$("#addInvestBtn").addEventListener("click", () => {
  const parent = $("#invest_list");

  const row = document.createElement("div");
  row.className = "invest-row";

  let options = `<option value="">Select</option>`;
  tariffs.investigations.forEach(inv => options += `<option value="${inv.name}" data-price="${inv.price}">${inv.name}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="inv_sel">${options}</select>
        </td>
        <td><input type="number" class="inv_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".inv_sel").addEventListener("change", function () {
    const p = this.selectedOptions[0].dataset.price;
    if (p) row.querySelector(".inv_amt").value = p;
    computeTotals();
  });

  row.querySelector(".inv_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   MISCELLANEOUS
============================================================================ */
$("#addMiscBtn").addEventListener("click", () => {
  const parent = $("#misc_list");

  const row = document.createElement("div");
  row.className = "misc-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Description"></td>
        <td><input type="number" class="m_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".m_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   RECEIPTS
============================================================================ */
$("#addReceiptBtn").addEventListener("click", () => {
  const parent = $("#receipt_list");

  const row = document.createElement("div");
  row.className = "receipt-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Receipt No"></td>
        <td><input type="date" class="r_date"></td>
        <td>
          <select class="r_mode">
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Transfer</option>
            <option>Insurance</option>
          </select>
        </td>
        <td><input type="number" class="r_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".r_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   TOTALS ENGINE
============================================================================ */
function computeTotals() {
  let gross = 0;

  /* ROOM ----------------------------------------------------- */
  if (bill.room.room) {
    const a = Number($("#p_los").value || 1);
    const perDay =
      bill.room.room +
      bill.room.nursing +
      bill.room.duty +
      bill.room.consult;

    gross += perDay * a;
  }

  /* VISITS --------------------------------------------------- */
  document.querySelectorAll(".visit-row").forEach(row => {
    const c = Number(row.querySelector(".v_count").value);
    const r = Number(row.querySelector(".v_rate").value);
    gross += c * r;
  });

  /* SURGERIES ------------------------------------------------ */
  document.querySelectorAll(".surgery-row").forEach(row => {
    const pkgName = row.querySelector(".s_pkg").value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    let total = pkg.package_total;

    const disc = Number(row.querySelector(".s_discount").value);
    if (disc > 0) total -= (total * disc) / 100;

    gross += total;
  });

  /* PHARMACY ------------------------------------------------- */
  gross += Number($("#pharmacy_total").value || 0);

  document.querySelectorAll(".pharm-row .p_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* INVESTIGATIONS ------------------------------------------ */
  document.querySelectorAll(".invest-row .inv_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* MISC ------------------------------------------------------ */
  document.querySelectorAll(".misc-row .m_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* RECEIPTS -------------------------------------------------- */
  let paid = 0;
  document.querySelectorAll(".receipt-row .r_amt").forEach(x => {
    paid += Number(x.value || 0);
  });

  const balance = gross - paid;

  $("#sum_gross").textContent = fmtINR(gross);
  $("#sum_paid").textContent = fmtINR(paid);
  $("#sum_balance").textContent = fmtINR(balance);

  bill.totals = { gross, paid, balance };
}

/* ============================================================================
   PRINT MODE
============================================================================ */
$("#printBtn").addEventListener("click", () => {
  window.print();
});

/* ============================================================================
   EXPORT PDF (Same Design)
============================================================================ */
$("#pdfBtn").addEventListener("click", exportPDF);

async function exportPDF() {
  const input = document.body;

  const canvas = await html2canvas(input, { scale: 2 });
  const img = canvas.toDataURL("image/png");

  const pdf = new jspdf.jsPDF("p", "mm", "a4");
  const width = 210;
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(img, "PNG", 0, 0, width, height);

  pdf.save("KCC-Bill.pdf");
}

/* ============================================================================
   THEME TOGGLE
============================================================================ */
$("#themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === "light" ? "dark" : "light";
});

/* ============================================================================
   ROOM & DAILY CHARGES
============================================================================ */
function loadRoomTariff() {
  const select = $("#room_select");
  select.innerHTML = "";

  Object.keys(tariffs.rooms).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  });
}

$("#room_select").addEventListener("change", function () {
  const roomType = this.value;
  const data = tariffs.rooms[roomType];

  bill.room = { type: roomType, ...data };

  $("#room_breakup").innerHTML = `
    <table>
      <tr><th>Item</th><th>Amount</th></tr>
      <tr><td>Room Rent</td><td>${fmtINR(data.room)}</td></tr>
      <tr><td>Nursing</td><td>${fmtINR(data.nursing)}</td></tr>
      <tr><td>Duty Doctor</td><td>${fmtINR(data.duty)}</td></tr>
      <tr><td>Consultant Visit</td><td>${fmtINR(data.consult)}</td></tr>
    </table>
  `;

  computeTotals();
});

/* ============================================================================
   CONSULTANT VISITS
============================================================================ */
$("#addVisitBtn").addEventListener("click", () => addVisitRow());

function addVisitRow() {
  const parent = $("#visit_list");

  const row = document.createElement("div");
  row.className = "visit-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input type="date" class="v_date"></td>
        <td><input type="number" class="v_count" placeholder="Visits"></td>
        <td><input type="number" class="v_rate" placeholder="Rate"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", computeTotals));

  parent.appendChild(row);
}

/* ============================================================================
   SURGERIES
============================================================================ */
$("#addSurgeryBtn").addEventListener("click", () => addSurgeryRow());

function addSurgeryRow() {
  const parent = $("#surgery_list");

  const row = document.createElement("div");
  row.className = "surgery-row";

  const pakKeys = Object.keys(tariffs.packages);

  let options = `<option value="">Select Package</option>`;
  pakKeys.forEach(p => options += `<option value="${p}">${p}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="s_pkg">${options}</select>
        </td>
        <td><input class="s_discount" placeholder="Discount %"></td>
        <td><span class="s_total">₹0</span></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>

    <div class="s_breakup"></div>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".s_pkg").addEventListener("change", function () {
    const pkgName = this.value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    const breakup = row.querySelector(".s_breakup");

    const total = pkg.package_total;

    breakup.innerHTML = `
      <table>
        <tr><th>Component</th><th>Amount</th></tr>
        <tr><td>OT</td><td>${fmtINR(pkg.ot)}</td></tr>
        <tr><td>Surgeon</td><td>${fmtINR(pkg.surgeon)}</td></tr>
        <tr><td>Assistant</td><td>${fmtINR(pkg.assistant)}</td></tr>
        <tr><td>Anesthetist</td><td>${fmtINR(pkg.anesthetist)}</td></tr>
        <tr><td>Implant</td><td>${fmtINR(pkg.implant)}</td></tr>
        <tr><td>OT Gas</td><td>${fmtINR(pkg.gas)}</td></tr>
        <tr><td>Consumables</td><td>${fmtINR(pkg.consumables)}</td></tr>
        <tr><th>Total</th><th>${fmtINR(total)}</th></tr>
      </table>
    `;

    row.querySelector(".s_total").textContent = fmtINR(total);
    computeTotals();
  });

  row.querySelector(".s_discount").addEventListener("input", computeTotals);

  parent.appendChild(row);
}

/* ============================================================================
   PHARMACY
============================================================================ */
$("#pharmacy_total").addEventListener("input", computeTotals);

$("#addPharmacyItemBtn").addEventListener("click", () => {
  const parent = $("#pharmacy_list");

  const row = document.createElement("div");
  row.className = "pharm-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Item"></td>
        <td><input type="number" class="p_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".p_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   INVESTIGATIONS
============================================================================ */
$("#addInvestBtn").addEventListener("click", () => {
  const parent = $("#invest_list");

  const row = document.createElement("div");
  row.className = "invest-row";

  let options = `<option value="">Select</option>`;
  tariffs.investigations.forEach(inv => options += `<option value="${inv.name}" data-price="${inv.price}">${inv.name}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="inv_sel">${options}</select>
        </td>
        <td><input type="number" class="inv_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".inv_sel").addEventListener("change", function () {
    const p = this.selectedOptions[0].dataset.price;
    if (p) row.querySelector(".inv_amt").value = p;
    computeTotals();
  });

  row.querySelector(".inv_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   MISCELLANEOUS
============================================================================ */
$("#addMiscBtn").addEventListener("click", () => {
  const parent = $("#misc_list");

  const row = document.createElement("div");
  row.className = "misc-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Description"></td>
        <td><input type="number" class="m_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".m_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   RECEIPTS
============================================================================ */
$("#addReceiptBtn").addEventListener("click", () => {
  const parent = $("#receipt_list");

  const row = document.createElement("div");
  row.className = "receipt-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Receipt No"></td>
        <td><input type="date" class="r_date"></td>
        <td>
          <select class="r_mode">
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Transfer</option>
            <option>Insurance</option>
          </select>
        </td>
        <td><input type="number" class="r_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".r_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   TOTALS ENGINE
============================================================================ */
function computeTotals() {
  let gross = 0;

  /* ROOM ----------------------------------------------------- */
  if (bill.room.room) {
    const a = Number($("#p_los").value || 1);
    const perDay =
      bill.room.room +
      bill.room.nursing +
      bill.room.duty +
      bill.room.consult;

    gross += perDay * a;
  }

  /* VISITS --------------------------------------------------- */
  document.querySelectorAll(".visit-row").forEach(row => {
    const c = Number(row.querySelector(".v_count").value);
    const r = Number(row.querySelector(".v_rate").value);
    gross += c * r;
  });

  /* SURGERIES ------------------------------------------------ */
  document.querySelectorAll(".surgery-row").forEach(row => {
    const pkgName = row.querySelector(".s_pkg").value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    let total = pkg.package_total;

    const disc = Number(row.querySelector(".s_discount").value);
    if (disc > 0) total -= (total * disc) / 100;

    gross += total;
  });

  /* PHARMACY ------------------------------------------------- */
  gross += Number($("#pharmacy_total").value || 0);

  document.querySelectorAll(".pharm-row .p_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* INVESTIGATIONS ------------------------------------------ */
  document.querySelectorAll(".invest-row .inv_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* MISC ------------------------------------------------------ */
  document.querySelectorAll(".misc-row .m_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* RECEIPTS -------------------------------------------------- */
  let paid = 0;
  document.querySelectorAll(".receipt-row .r_amt").forEach(x => {
    paid += Number(x.value || 0);
  });

  const balance = gross - paid;

  $("#sum_gross").textContent = fmtINR(gross);
  $("#sum_paid").textContent = fmtINR(paid);
  $("#sum_balance").textContent = fmtINR(balance);

  bill.totals = { gross, paid, balance };
}

/* ============================================================================
   PRINT MODE
============================================================================ */
$("#printBtn").addEventListener("click", () => {
  window.print();
});

/* ============================================================================
   EXPORT PDF (Same Design)
============================================================================ */
$("#pdfBtn").addEventListener("click", exportPDF);

async function exportPDF() {
  const input = document.body;

  const canvas = await html2canvas(input, { scale: 2 });
  const img = canvas.toDataURL("image/png");

  const pdf = new jspdf.jsPDF("p", "mm", "a4");
  const width = 210;
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(img, "PNG", 0, 0, width, height);

  pdf.save("KCC-Bill.pdf");
}

/* ============================================================================
   THEME TOGGLE
============================================================================ */
$("#themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === "light" ? "dark" : "light";
});

/* ============================================================================
   INIT
============================================================================ */
function init() {
  loadRoomTariff();
}
init();
