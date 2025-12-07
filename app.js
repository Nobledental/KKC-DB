/* ============================================================================
   KCC BILLING OS — FINAL PRODUCTION APP.JS
   Single clean engine • No duplicates • Works with all existing files
============================================================================ */

/* ----------------------------------------------------------
   BASIC HELPERS
---------------------------------------------------------- */
const qs = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);

/* ----------------------------------------------------------
   BILL OBJECT
---------------------------------------------------------- */
const Bill = {
  patient: {},
  admission: {},
  rooms: [],
  visits: [],
  surgeries: [],
  pharmacy: [],
  investigations: [],
  misc: [],
  receipts: [],
  summary: {}
};

/* ----------------------------------------------------------
   GLOBAL MASTER DATA
---------------------------------------------------------- */
let TARIFF = {};
let DOCTORS = [];

/* ----------------------------------------------------------
   LOAD MASTER JSON FILES
---------------------------------------------------------- */
async function loadMaster() {
  TARIFF = await fetch("data/tariffs.json").then((r) => r.json());
  DOCTORS = await fetch("data/doctors.json").then((r) => r.json());

  populateRooms();
  populateDepartments();
  populateInvestigations();
  populatePharmacy();
}
document.addEventListener("DOMContentLoaded", loadMaster);

/* ----------------------------------------------------------
   AUTO IDs
---------------------------------------------------------- */
function generatePatientID() {
  qs("#p_id").value = "KCC" + Date.now().toString().slice(-6);
}
function generateBillNumber() {
  return Math.random().toString().slice(2, 14);
}
window.onload = () => generatePatientID();

/* ----------------------------------------------------------
   POPULATE ROOM TYPES
---------------------------------------------------------- */
function populateRooms() {
  const select = qs("#room_type");
  select.innerHTML = `<option value="">Select Room</option>`;

  Object.keys(TARIFF.rooms).forEach((r) => {
    select.innerHTML += `<option>${r}</option>`;
  });
}

/* ----------------------------------------------------------
   POPULATE DEPARTMENTS + DOCTORS
---------------------------------------------------------- */
function populateDepartments() {
  const deptSel = qs("#p_dept");
  const docSel = qs("#p_doctor");

  deptSel.innerHTML = `<option value="">Select Department</option>`;
  docSel.innerHTML = `<option value="">Select Consultant</option>`;

  DOCTORS.forEach((d) => {
    deptSel.innerHTML += `<option>${d.dept}</option>`;
  });

  deptSel.addEventListener("change", () => {
    const dept = deptSel.value;
    const set = DOCTORS.find((x) => x.dept === dept);

    docSel.innerHTML = `<option>Select Consultant</option>`;
    if (set) {
      set.doctors.forEach((name) => {
        docSel.innerHTML += `<option>${name}</option>`;
      });
    }
  });
}

/* ----------------------------------------------------------
   INVESTIGATIONS
---------------------------------------------------------- */
function populateInvestigations() {
  window.INVESTIGATION_LIST = TARIFF.investigations || [];
}

/* ----------------------------------------------------------
   PHARMACY
---------------------------------------------------------- */
function populatePharmacy() {
  window.PHARMACY_LIST = TARIFF.pharmacy || [];
}

/* ----------------------------------------------------------
   AUTO LOS
---------------------------------------------------------- */
function calcLOS() {
  const doa = qs("#p_doa").value;
  const dod = qs("#p_dod").value;
  if (!doa || !dod) return;

  const a = new Date(doa);
  const b = new Date(dod);
  if (b < a) return (qs("#p_los").value = "Invalid");

  const diff = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  qs("#p_los").value = diff;
  calculateTotals();
}
qs("#p_doa").addEventListener("change", calcLOS);
qs("#p_dod").addEventListener("change", calcLOS);

/* ----------------------------------------------------------
   ROOM CHARGES (MAIN ROOM)
---------------------------------------------------------- */
qs("#room_type").addEventListener("change", () => {
  const type = qs("#room_type").value;
  if (!type) return;

  const r = TARIFF.rooms[type];
  qs("#room_rent").value = r.room;
  qs("#room_nursing").value = r.nursing;
  qs("#room_rmo").value = r.duty;

  Bill.rooms = [
    {
      id: "main",
      type,
      days: Number(qs("#p_los").value || 0),
      room: r.room,
      nursing: r.nursing,
      duty: r.duty
    }
  ];

  calculateTotals();
});

/* ----------------------------------------------------------
   ROOM SHIFT MODULE
---------------------------------------------------------- */
qs("#add_room_shift").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "shift-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 shift-row">
      <div>
        <label>Room</label>
        <select class="shift_type">
          ${Object.keys(TARIFF.rooms)
            .map((r) => `<option>${r}</option>`)
            .join("")}
        </select>
      </div>
      <div>
        <label>Days</label>
        <input type="number" class="shift_days" value="1" min="1">
      </div>
      <div>
        <label>Total</label>
        <input class="shift_total" readonly>
      </div>
      <button class="remove-btn shift_remove">✖</button>
    </div>
  `;

  qs("#room_shift_list").appendChild(div);

  div.querySelector(".shift_type").addEventListener("change", () => calcShift(div));
  div.querySelector(".shift_days").addEventListener("input", () => calcShift(div));
  div.querySelector(".shift_remove").addEventListener("click", () => {
    div.remove();
    Bill.rooms = Bill.rooms.filter((x) => x.id !== id);
    calculateTotals();
  });

  calcShift(div);
});

function calcShift(div) {
  const id = div.dataset.id;
  const type = div.querySelector(".shift_type").value;
  const days = Number(div.querySelector(".shift_days").value || 1);
  const r = TARIFF.rooms[type];

  const total = r.room * days + r.nursing * days + r.duty * days;
  div.querySelector(".shift_total").value = total;

  Bill.rooms = Bill.rooms.filter((x) => x.id !== id);
  Bill.rooms.push({
    id,
    type,
    days,
    room: r.room,
    nursing: r.nursing,
    duty: r.duty
  });

  calculateTotals();
}

/* ----------------------------------------------------------
   CONSULTANT VISITS
---------------------------------------------------------- */
qs("#add_visit").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "visit-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 visit-row">
      <div>
        <label>Consultant</label>
        <select class="visit_doctor">
          ${DOCTORS.flatMap((d) => d.doctors)
            .map((n) => `<option>${n}</option>`)
            .join("")}
        </select>
      </div>
      <div>
        <label>Count</label>
        <input type="number" class="visit_count" value="1" min="1">
      </div>
      <div>
        <label>Charge</label>
        <input type="number" class="visit_charge" value="500">
      </div>
      <button class="remove-btn visit_remove">✖</button>
    </div>
  `;

  qs("#visit_list").appendChild(div);

  div.querySelector(".visit_doctor").addEventListener("change", () => calcVisit(div));
  div.querySelector(".visit_count").addEventListener("input", () => calcVisit(div));
  div.querySelector(".visit_charge").addEventListener("input", () => calcVisit(div));
  div.querySelector(".visit_remove").addEventListener("click", () => {
    div.remove();
    Bill.visits = Bill.visits.filter((x) => x.id !== id);
    calculateTotals();
  });

  calcVisit(div);
});

function calcVisit(div) {
  const id = div.dataset.id;
  const doctor = div.querySelector(".visit_doctor").value;
  const count = Number(div.querySelector(".visit_count").value);
  const charge = Number(div.querySelector(".visit_charge").value);
  const total = count * charge;

  Bill.visits = Bill.visits.filter((x) => x.id !== id);
  Bill.visits.push({ id, doctor, count, charge, total });

  div.querySelector(".visit_total")?.setAttribute("value", total);
  calculateTotals();
}

/* ----------------------------------------------------------
   SURGERIES / PROCEDURES
---------------------------------------------------------- */
qs("#add_surgery").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "surgery-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 surgery-row">
      <div>
        <label>Package</label>
        <select class="surg_name">
          <option value="">Select</option>
          ${TARIFF.packages
            .map(
              (p) =>
                `<option value="${p.name}" data-cat="${p.category}" data-total="${
                  p.package_total
                }">${p.category} — ${p.name}</option>`
            )
            .join("")}
        </select>
      </div>
      <div>
        <label>Total</label>
        <input class="surg_total" readonly>
      </div>
      <button class="remove-btn surg_remove">✖</button>
    </div>
  `;

  qs("#surgery_list").appendChild(div);

  const sel = div.querySelector(".surg_name");
  sel.addEventListener("change", () => calcSurgery(div));
  div.querySelector(".surg_remove").addEventListener("click", () => {
    div.remove();
    Bill.surgeries = Bill.surgeries.filter((x) => x.id !== id);
    calculateTotals();
  });
});

function calcSurgery(div) {
  const id = div.dataset.id;
  const sel = div.querySelector(".surg_name");
  const pkgname = sel.value;
  if (!pkgname) return;

  const pkg = TARIFF.packages.find((p) => p.name === pkgname);
  const total = pkg.package_total;

  div.querySelector(".surg_total").value = total;

  Bill.surgeries = Bill.surgeries.filter((x) => x.id !== id);
  Bill.surgeries.push({ id, name: pkgname, category: pkg.category, total });

  calculateTotals();
}

/* ----------------------------------------------------------
   PHARMACY
---------------------------------------------------------- */
qs("#add_pharmacy").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "pharmacy-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 pharma-row">
      <div>
        <label>Item</label>
        <input type="text" class="pharm_name">
      </div>
      <div>
        <label>Qty</label>
        <input type="number" class="pharm_qty" value="1">
      </div>
      <div>
        <label>Rate</label>
        <input type="number" class="pharm_rate" value="0">
      </div>
      <div>
        <label>Total</label>
        <input class="pharm_total" readonly>
      </div>
      <button class="remove-btn pharm_remove">✖</button>
    </div>
  `;

  qs("#pharmacy_list").appendChild(div);

  const qty = div.querySelector(".pharm_qty");
  const rate = div.querySelector(".pharm_rate");

  function update() {
    const total = Number(qty.value) * Number(rate.value);
    div.querySelector(".pharm_total").value = total;

    Bill.pharmacy = Bill.pharmacy.filter((x) => x.id !== id);
    Bill.pharmacy.push({
      id,
      item: div.querySelector(".pharm_name").value,
      qty: Number(qty.value),
      rate: Number(rate.value),
      total
    });

    calculateTotals();
  }

  qty.addEventListener("input", update);
  rate.addEventListener("input", update);
  div.querySelector(".pharm_remove").addEventListener("click", () => {
    div.remove();
    Bill.pharmacy = Bill.pharmacy.filter((x) => x.id !== id);
    calculateTotals();
  });

  update();
});

/* ----------------------------------------------------------
   INVESTIGATIONS
---------------------------------------------------------- */
qs("#add_test").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "test-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 test-row">
      <div>
        <label>Test</label>
        <select class="test_sel">
          <option value="">Select</option>
          ${INVESTIGATION_LIST.map(
            (t) => `<option data-price="${t.price}">${t.name}</option>`
          ).join("")}
        </select>
      </div>
      <div>
        <label>Amount</label>
        <input class="test_rate" readonly>
      </div>
      <button class="remove-btn test_remove">✖</button>
    </div>
  `;

  qs("#test_list").appendChild(div);

  div.querySelector(".test_sel").addEventListener("change", () => calcTest(div));
  div.querySelector(".test_remove").addEventListener("click", () => {
    div.remove();
    Bill.investigations = Bill.investigations.filter((x) => x.id !== id);
    calculateTotals();
  });
});

function calcTest(div) {
  const id = div.dataset.id;
  const sel = div.querySelector(".test_sel");
  const price = Number(sel.selectedOptions[0]?.dataset.price || 0);

  div.querySelector(".test_rate").value = price;

  Bill.investigations = Bill.investigations.filter((x) => x.id !== id);
  Bill.investigations.push({ id, name: sel.value, price });

  calculateTotals();
}

/* ----------------------------------------------------------
   MISC CHARGES
---------------------------------------------------------- */
qs("#add_misc").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "misc-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 misc-row">
      <div>
        <label>Description</label>
        <input type="text" class="misc_name">
      </div>
      <div>
        <label>Amount</label>
        <input type="number" class="misc_amt" value="0">
      </div>
      <button class="remove-btn misc_remove">✖</button>
    </div>
  `;

  qs("#misc_list").appendChild(div);

  div.querySelector(".misc_amt").addEventListener("input", () => calcMisc(div));
  div.querySelector(".misc_name").addEventListener("input", () => calcMisc(div));
  div.querySelector(".misc_remove").addEventListener("click", () => {
    div.remove();
    Bill.misc = Bill.misc.filter((x) => x.id !== id);
    calculateTotals();
  });

  calcMisc(div);
});

function calcMisc(div) {
  const id = div.dataset.id;
  const amt = Number(div.querySelector(".misc_amt").value || 0);
  const desc = div.querySelector(".misc_name").value;

  Bill.misc = Bill.misc.filter((x) => x.id !== id);
  Bill.misc.push({ id, desc, amount: amt });

  calculateTotals();
}

/* ----------------------------------------------------------
   RECEIPTS / PAYMENTS
---------------------------------------------------------- */
qs("#add_receipt").addEventListener("click", () => {
  const id = Date.now();
  const div = document.createElement("div");
  div.className = "receipt-box";
  div.dataset.id = id;

  div.innerHTML = `
    <div class="grid-4 receipt-row">
      <div>
        <label>Mode</label>
        <select class="rec_mode">
          <option>Cash</option>
          <option>UPI</option>
          <option>Card</option>
          <option>Bank Transfer</option>
        </select>
      </div>
      <div>
        <label>Amount</label>
        <input type="number" class="rec_amt" value="0">
      </div>
      <button class="remove-btn rec_remove">✖</button>
    </div>
  `;

  qs("#receipt_list_new").appendChild(div);

  div.querySelector(".rec_amt").addEventListener("input", () => calcReceipt(div));
  div.querySelector(".rec_remove").addEventListener("click", () => {
    div.remove();
    Bill.receipts = Bill.receipts.filter((x) => x.id !== id);
    calculateTotals();
  });

  calcReceipt(div);
});

function calcReceipt(div) {
  const id = div.dataset.id;
  const mode = div.querySelector(".rec_mode").value;
  const amt = Number(div.querySelector(".rec_amt").value || 0);

  Bill.receipts = Bill.receipts.filter((x) => x.id !== id);
  Bill.receipts.push({ id, mode, amount: amt });

  calculateTotals();
}

/* ----------------------------------------------------------
   MASTER TOTAL CALCULATION
---------------------------------------------------------- */
function calculateTotals() {
  let gross = 0;

  /* MAIN ROOM */
  const roomRent = Number(qs("#room_rent").value || 0);
  const nursing = Number(qs("#room_nursing").value || 0);
  const rmo = Number(qs("#room_rmo").value || 0);
  const los = Number(qs("#p_los").value || 0);

  if (roomRent && los) gross += roomRent * los;
  if (nursing && los) gross += nursing * los;
  if (rmo && los) gross += rmo * los;

  /* ROOM SHIFTS */
  Bill.rooms.forEach((r) => {
    if (r.id !== "main") {
      gross += r.room * r.days + r.nursing * r.days + r.duty * r.days;
    }
  });

  /* CONSULTANT VISITS */
  Bill.visits.forEach((v) => (gross += v.total));

  /* SURGERIES */
  Bill.surgeries.forEach((s) => (gross += s.total));

  /* PHARMACY */
  Bill.pharmacy.forEach((p) => (gross += p.total));

  /* INVESTIGATIONS */
  Bill.investigations.forEach((t) => (gross += t.price));

  /* MISC */
  Bill.misc.forEach((m) => (gross += m.amount));

  /* RECEIPTS */
  let paid = 0;
  Bill.receipts.forEach((r) => (paid += r.amount));

  qs("#total_gross").value = gross;
  qs("#total_paid").value = paid;
  qs("#total_balance").value = gross - paid;

  Bill.summary = {
    gross,
    paid,
    balance: gross - paid
  };

  return gross;
}

/* ----------------------------------------------------------
   BUILD FINAL BILL + PRINT
---------------------------------------------------------- */
qs("#generate_bill").addEventListener("click", () => {
  Bill.patient = {
    id: qs("#p_id").value,
    name: qs("#p_name").value,
    age: qs("#p_age").value,
    gender: qs("#p_gender").value,
    dept: qs("#p_dept").value,
    doctor: qs("#p_doctor").value
  };

  Bill.admission = {
    doa: qs("#p_doa").value,
    dod: qs("#p_dod").value,
    los: qs("#p_los").value
  };

  Bill.bill_no = generateBillNumber();

  sessionStorage.setItem("CURRENT_BILL", JSON.stringify(Bill));
  saveBillToHistory();
  window.open("bill-print.html", "_blank");
});

/* ----------------------------------------------------------
   INDEXEDDB HISTORY
---------------------------------------------------------- */
let db;
const request = indexedDB.open("KCC_BILLS_DB", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("bills")) {
    db.createObjectStore("bills", { keyPath: "bill_no" });
  }
};

request.onsuccess = function (e) {
  db = e.target.result;
};

function saveBillToHistory() {
  const tx = db.transaction("bills", "readwrite");
  tx.objectStore("bills").put(Bill);
}

/* ----------------------------------------------------------
   LOAD HISTORY PANEL
---------------------------------------------------------- */
function loadBillHistory() {
  const panel = qs("#history");
  panel.innerHTML = `
    <h1>Bill History</h1>
    <table class="history-table">
      <thead>
        <tr>
          <th>Bill No</th>
          <th>Patient</th>
          <th>Total</th>
          <th>Paid</th>
          <th>Balance</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody id="history_rows"></tbody>
    </table>
  `;

  const body = qs("#history_rows");

  const tx = db.transaction("bills", "readonly");
  const req = tx.objectStore("bills").getAll();

  req.onsuccess = () => {
    body.innerHTML = "";
    req.result.forEach((b) => {
      body.innerHTML += `
        <tr>
          <td>${b.bill_no}</td>
          <td>${b.patient.name}</td>
          <td>${b.summary.gross}</td>
          <td>${b.summary.paid}</td>
          <td>${b.summary.balance}</td>
          <td><button onclick='openBill("${b.bill_no}")'>View</button></td>
        </tr>
      `;
    });
  };
}

/* ----------------------------------------------------------
   OPEN OLD BILL IN PRINT MODE
---------------------------------------------------------- */
function openBill(billno) {
  const tx = db.transaction("bills", "readonly");
  const req = tx.objectStore("bills").get(billno);

  req.onsuccess = () => {
    sessionStorage.setItem("CURRENT_BILL", JSON.stringify(req.result));
    window.open("bill-print.html", "_blank");
  };
}

/* ----------------------------------------------------------
   SIDEBAR NAVIGATION
---------------------------------------------------------- */
qsa(".sidebar-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    qsa(".sidebar-nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const panel = btn.dataset.panel;
    qsa(".panel").forEach((p) => p.classList.add("hidden"));

    qs("#" + panel).classList.remove("hidden");

    if (panel === "history") loadBillHistory();
  });
});

/* ----------------------------------------------------------
   COLLAPSIBLE CARDS
---------------------------------------------------------- */
qsa(".collapsible-header").forEach((head) => {
  head.addEventListener("click", () => {
    head.classList.toggle("open");
    head.nextElementSibling.classList.toggle("hidden");
  });
});
