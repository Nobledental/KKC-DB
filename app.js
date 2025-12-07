/* ============================================================================
   KCC BILLING OS — APP.JS (PART 1)
   Core UI Engine + Navigation + Patient ID + Bill No + LOS Auto
============================================================================ */

/* ----------------------------
   QUICK QUERY HELPERS
---------------------------- */
const qs = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);

/* ----------------------------
   AUTO-GENERATE PATIENT ID
---------------------------- */
function generatePatientID() {
  const id = "KCC" + Date.now().toString().slice(-6);
  qs("#p_id").value = id;
}

/* ----------------------------
   AUTO-GENERATE BILL NUMBER
---------------------------- */
function generateBillNumber() {
  return "BILL-" + Math.floor(Math.random() * 900000000000 + 100000000000);
}

/* ----------------------------
   NAVIGATION BETWEEN PANELS
---------------------------- */
qsa(".sidebar-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    qsa(".sidebar-nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.dataset.panel;
    qsa(".panel").forEach((p) => p.classList.add("hidden"));
    qs("#" + target).classList.remove("hidden");
  });
});

/* ----------------------------
   COLLAPSIBLE BOXES
---------------------------- */
qsa(".collapsible-header").forEach((header) => {
  header.addEventListener("click", () => {
    const body = header.parentElement.querySelector(".card-body");
    body.classList.toggle("open");
  });
});

/* ----------------------------
   LOAD TARIFF DATA (rooms, doctors, investigations etc.)
---------------------------- */
let TARIFF = {};
let DOCTORS = {};

async function loadTariffs() {
  const t = await fetch("data/tariffs.json").then((r) => r.json());
  const d = await fetch("data/doctors.json").then((r) => r.json());
  TARIFF = t;
  DOCTORS = d;

  populateRooms();
  populateDepartments();
  populateDoctors();
}
loadTariffs();

/* ----------------------------
   POPULATE ROOM TYPES
---------------------------- */
function populateRooms() {
  const sel = qs("#room_type");
  sel.innerHTML = `<option value="">Select Room</option>`;

  Object.keys(TARIFF.rooms).forEach((r) => {
    sel.innerHTML += `<option value="${r}">${r}</option>`;
  });
}

/* ----------------------------
   POPULATE DEPARTMENTS
---------------------------- */
function populateDepartments() {
  const sel = qs("#p_dept");
  sel.innerHTML = `<option value="">Select Department</option>`;

  DOCTORS.departments.forEach((d) => {
    sel.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

/* ----------------------------
   POPULATE DOCTORS
---------------------------- */
function populateDoctors() {
  const sel = qs("#p_doctor");
  sel.innerHTML = `<option value="">Select Consultant</option>`;

  DOCTORS.list.forEach((doc) => {
    sel.innerHTML += `<option value="${doc.name}">${doc.name} (${doc.dept})</option>`;
  });
}

/* ----------------------------
   AUTO FILL ROOM CHARGES
---------------------------- */
qs("#room_type").addEventListener("change", () => {
  const type = qs("#room_type").value;
  if (!type) return;

  const r = TARIFF.rooms[type];
  qs("#room_rent").value = r.room;
  qs("#room_nursing").value = r.nursing;
  qs("#room_rmo").value = r.duty;

  calculateTotals();
});

/* ----------------------------
   AUTO CALCULATE LENGTH OF STAY
---------------------------- */
function calcLOS() {
  const doa = qs("#p_doa").value;
  const dod = qs("#p_dod").value;

  if (!doa || !dod) return;

  const d1 = new Date(doa);
  const d2 = new Date(dod);

  let diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  if (diff < 1) diff = 1;

  qs("#p_los").value = diff;
  calculateTotals();
}

qs("#p_doa").addEventListener("change", calcLOS);
qs("#p_dod").addEventListener("change", calcLOS);

/* ----------------------------
   INITIAL VALUES ON LOAD
---------------------------- */
window.onload = () => {
  generatePatientID();
};

/* ============================================================================
   KCC BILLING OS — APP.JS (PART 2)
   Room Shifting + Consultant Visits + Surgeries
============================================================================ */

/* ----------------------------------------------------------
   ROOM SHIFTING (Add multiple room stays)
---------------------------------------------------------- */
qs("#add_room_shift").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "shift-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 shift-row">
      <div>
        <label>Room Type</label>
        <select class="shift_room">
          ${Object.keys(TARIFF.rooms)
            .map((r) => `<option value="${r}">${r}</option>`)
            .join("")}
        </select>
      </div>

      <div>
        <label>Days</label>
        <input type="number" class="shift_days" value="1" min="1">
      </div>

      <div>
        <label>Total</label>
        <input type="number" class="shift_total" readonly>
      </div>

      <button class="remove-btn shift_remove">✖</button>
    </div>
  `;

  qs("#room_shift_list").appendChild(box);

  box.querySelector(".shift_room").addEventListener("change", updateRoomShift);
  box.querySelector(".shift_days").addEventListener("input", updateRoomShift);
  box.querySelector(".shift_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  updateRoomShift();
});

function updateRoomShift() {
  qsa(".shift-box").forEach((b) => {
    const room = b.querySelector(".shift_room").value;
    const days = Number(b.querySelector(".shift_days").value || 1);

    const amount = TARIFF.rooms[room].room * days;
    b.querySelector(".shift_total").value = amount;
  });

  calculateTotals();
}

/* ----------------------------------------------------------
   CONSULTANT VISITS
---------------------------------------------------------- */
qs("#add_visit").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "visit-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 visit-row">
      <div>
        <label>Consultant</label>
        <select class="visit_doctor">
          ${DOCTORS.list
            .map((d) => `<option value="${d.name}">${d.name}</option>`)
            .join("")}
        </select>
      </div>

      <div>
        <label>Visit Count</label>
        <input type="number" class="visit_count" value="1" min="1">
      </div>

      <div>
        <label>Charge</label>
        <input type="number" class="visit_charge" value="500">
      </div>

      <button class="remove-btn visit_remove">✖</button>
    </div>
  `;

  qs("#visit_list").appendChild(box);

  box.querySelector(".visit_doctor").addEventListener("change", calculateTotals);
  box.querySelector(".visit_count").addEventListener("input", calculateTotals);
  box.querySelector(".visit_charge").addEventListener("input", calculateTotals);
  box.querySelector(".visit_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  calculateTotals();
});

/* ----------------------------------------------------------
   SURGERIES / PROCEDURES
---------------------------------------------------------- */
qs("#add_surgery").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "surgery-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 surgery-row">
      <div>
        <label>Procedure</label>
        <select class="surgery_name">
          <option value="">Select Surgery</option>
          ${TARIFF.packages
            .map(
              (p) =>
                `<option value="${p.name}" data-total="${p.package_total}">
                  ${p.category} — ${p.name}
                </option>`
            )
            .join("")}
        </select>
      </div>

      <div>
        <label>Charge</label>
        <input type="number" class="surgery_total" readonly>
      </div>

      <button class="remove-btn surgery_remove">✖</button>
    </div>
  `;

  qs("#surgery_list").appendChild(box);

  const select = box.querySelector(".surgery_name");
  const totalField = box.querySelector(".surgery_total");

  select.addEventListener("change", () => {
    const opt = select.selectedOptions[0];
    const total = Number(opt.dataset.total || 0);
    totalField.value = total;
    calculateTotals();
  });

  box.querySelector(".surgery_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  calculateTotals();
});

/* ============================================================================
   KCC BILLING OS — APP.JS (PART 3)
   Pharmacy + Investigations + Misc + Receipts
============================================================================ */

/* ----------------------------------------------------------
   PHARMACY
---------------------------------------------------------- */
qs("#add_pharmacy").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "pharmacy-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 pharma-row">
      <div>
        <label>Item</label>
        <input type="text" class="pharma_name" placeholder="Name">
      </div>

      <div>
        <label>Qty</label>
        <input type="number" class="pharma_qty" value="1" min="1">
      </div>

      <div>
        <label>Rate</label>
        <input type="number" class="pharma_rate" value="0">
      </div>

      <div>
        <label>Total</label>
        <input type="number" class="pharma_total" readonly>
      </div>

      <button class="remove-btn pharma_remove">✖</button>
    </div>
  `;

  qs("#pharmacy_list").appendChild(box);

  const qty = box.querySelector(".pharma_qty");
  const rate = box.querySelector(".pharma_rate");
  const total = box.querySelector(".pharma_total");

  function update() {
    total.value = Number(qty.value || 1) * Number(rate.value || 0);
    calculateTotals();
  }

  qty.addEventListener("input", update);
  rate.addEventListener("input", update);

  box.querySelector(".pharma_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  update();
});

/* ----------------------------------------------------------
   INVESTIGATIONS
---------------------------------------------------------- */
qs("#add_test").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "test-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 test-row">
      <div>
        <label>Test Name</label>
        <select class="test_name">
          <option>Select Test</option>
          ${TARIFF.investigations
            .map((t) => `<option value="${t.price}">${t.name}</option>`)
            .join("")}
        </select>
      </div>

      <div>
        <label>Rate</label>
        <input type="number" class="test_rate" readonly>
      </div>

      <button class="remove-btn test_remove">✖</button>
    </div>
  `;

  qs("#test_list").appendChild(box);

  const select = box.querySelector(".test_name");
  const rate = box.querySelector(".test_rate");

  select.addEventListener("change", () => {
    rate.value = Number(select.value || 0);
    calculateTotals();
  });

  box.querySelector(".test_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  calculateTotals();
});

/* ----------------------------------------------------------
   MISCELLANEOUS
---------------------------------------------------------- */
qs("#add_misc").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "misc-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 misc-row">
      <div>
        <label>Description</label>
        <input type="text" class="misc_name" placeholder="Enter">
      </div>

      <div>
        <label>Amount</label>
        <input type="number" class="misc_rate" value="0">
      </div>

      <button class="remove-btn misc_remove">✖</button>
    </div>
  `;

  qs("#misc_list").appendChild(box);

  box.querySelector(".misc_rate").addEventListener("input", calculateTotals);
  box.querySelector(".misc_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  calculateTotals();
});

/* ----------------------------------------------------------
   RECEIPTS / PAYMENTS
---------------------------------------------------------- */
qs("#add_receipt").addEventListener("click", () => {
  const id = Date.now();

  const box = document.createElement("div");
  box.className = "receipt-box";
  box.dataset.id = id;

  box.innerHTML = `
    <div class="grid-4 receipt-row">
      <div>
        <label>Mode</label>
        <select class="receipt_mode">
          <option>Cash</option>
          <option>UPI</option>
          <option>Card</option>
          <option>Online</option>
        </select>
      </div>

      <div>
        <label>Amount</label>
        <input type="number" class="receipt_amount" value="0">
      </div>

      <button class="remove-btn receipt_remove">✖</button>
    </div>
  `;

  qs("#receipt_list_new").appendChild(box);

  box.querySelector(".receipt_amount").addEventListener("input", calculateTotals);
  box.querySelector(".receipt_remove").addEventListener("click", () => {
    box.remove();
    calculateTotals();
  });

  calculateTotals();
});

/* ============================================================================
   KCC BILLING OS — APP.JS (PART 4)
   Final Total Calculation + Print Bill + Data Export Stub
============================================================================ */

/* ----------------------------------------------------------
   CALCULATE TOTALS (MASTER FUNCTION)
---------------------------------------------------------- */
function calculateTotals() {
  let gross = 0;

  /* ---------------- ROOM MAIN ---------------- */
  const roomRent = Number(qs("#room_rent").value || 0);
  const nursing = Number(qs("#room_nursing").value || 0);
  const rmo = Number(qs("#room_rmo").value || 0);
  const los = Number(qs("#p_los").value || 0);

  if (roomRent && los) gross += roomRent * los;
  if (nursing && los) gross += nursing * los;
  if (rmo && los) gross += rmo * los;

  /* ---------------- ROOM SHIFTS ---------------- */
  qsa(".shift-box").forEach((b) => {
    const type = b.querySelector(".shift_room").value;
    const days = Number(b.querySelector(".shift_days").value || 1);
    gross += TARIFF.rooms[type].room * days;
  });

  /* ---------------- CONSULTANT VISITS ---------------- */
  qsa(".visit-box").forEach((v) => {
    const count = Number(v.querySelector(".visit_count").value || 1);
    const charge = Number(v.querySelector(".visit_charge").value || 0);
    gross += count * charge;
  });

  /* ---------------- SURGERIES ---------------- */
  qsa(".surgery-box").forEach((s) => {
    const total = Number(s.querySelector(".surgery_total").value || 0);
    gross += total;
  });

  /* ---------------- PHARMACY ---------------- */
  qsa(".pharmacy-box").forEach((p) => {
    const total = Number(p.querySelector(".pharma_total").value || 0);
    gross += total;
  });

  /* ---------------- INVESTIGATIONS ---------------- */
  qsa(".test-box").forEach((t) => {
    const total = Number(t.querySelector(".test_rate").value || 0);
    gross += total;
  });

  /* ---------------- MISC ---------------- */
  qsa(".misc-box").forEach((m) => {
    const rate = Number(m.querySelector(".misc_rate").value || 0);
    gross += rate;
  });

  /* ---------------- RECEIPTS ---------------- */
  let paid = 0;
  qsa(".receipt-box").forEach((r) => {
    paid += Number(r.querySelector(".receipt_amount").value || 0);
  });

  /* ---------------- ASSIGN TOTALS ---------------- */
  qs("#total_gross").value = gross;
  qs("#total_paid").value = paid;
  qs("#total_balance").value = gross - paid;

  return gross;
}

/* ----------------------------------------------------------
   BUILD BILL DATA OBJECT
---------------------------------------------------------- */
function collectBillData() {
  return {
    billNo: generateBillNumber(),
    patientID: qs("#p_id").value,
    name: qs("#p_name").value,
    age: qs("#p_age").value,
    gender: qs("#p_gender").value,
    dept: qs("#p_dept").value,
    doctor: qs("#p_doctor").value,
    doa: qs("#p_doa").value,
    dod: qs("#p_dod").value,
    los: qs("#p_los").value,

    totals: {
      gross: qs("#total_gross").value,
      paid: qs("#total_paid").value,
      balance: qs("#total_balance").value,
    },
  };
}

/* ----------------------------------------------------------
   GENERATE / PRINT BILL
---------------------------------------------------------- */
qs("#generate_bill").addEventListener("click", () => {
  const bill = collectBillData();

  localStorage.setItem("KCC_CURRENT_BILL", JSON.stringify(bill));

  window.open("bill-print.html", "_blank");
});

/* ----------------------------------------------------------
   HISTORY SAVE (Stub – Expand Later)
---------------------------------------------------------- */
function saveToHistory(data) {
  const old = JSON.parse(localStorage.getItem("KCC_BILL_HISTORY") || "[]");
  old.push(data);
  localStorage.setItem("KCC_BILL_HISTORY", JSON.stringify(old));
}

