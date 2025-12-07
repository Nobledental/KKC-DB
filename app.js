/* ===================================================================
   KCC BILLING OS — CORE JS ENGINE
   Fully Offline • Pure JavaScript • Premium Billing Engine
=================================================================== */

/* ===============================
   UTILITIES
================================= */
const $ = (id) => document.getElementById(id);
const newEl = (tag, cls = "") => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

/* Random generators */
function generatePatientID() {
  return "KCC-" + Math.floor(100000 + Math.random() * 900000);
}

function generateBillNumber() {
  let n = "";
  for (let i = 0; i < 12; i++) n += Math.floor(Math.random() * 10);
  return n;
}

/* Date helpers */
function calcLOS(doa, dod) {
  if (!doa || !dod) return "";
  const d1 = new Date(doa);
  const d2 = new Date(dod);
  const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : 0;
}

/* Currency formatting */
function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

/* Collapsible cards */
document.querySelectorAll(".collapsible-header").forEach((hdr) => {
  hdr.addEventListener("click", () => {
    hdr.parentElement.classList.toggle("open");
  });
});

/* ================================================================
   LOAD TARIFF + DOCTORS
================================================================= */
let TARIFF = {};
let DOCTORS = [];

async function loadTariff() {
  try {
    const t = await fetch("tariffs.json");
    TARIFF = await t.json();
  } catch (e) {
    console.warn("tariffs.json not found");
  }
}

async function loadDoctors() {
  try {
    const d = await fetch("doctors.json");
    DOCTORS = await d.json();
  } catch (e) {
    console.warn("doctors.json not found");
  }
}

/* Init select dropdowns */
async function initDropdowns() {
  await loadTariff();
  await loadDoctors();

  /* Room Types */
  const rsel = $("room_type");
  rsel.innerHTML = `<option value="">Select</option>`;
  if (TARIFF.rooms) {
    for (const r of TARIFF.rooms) {
      const opt = document.createElement("option");
      opt.value = r.name;
      opt.textContent = r.name;
      rsel.appendChild(opt);
    }
  }

  /* Doctors */
  const dsel = $("p_doctor");
  dsel.innerHTML = `<option value="">Select</option>`;
  DOCTORS.forEach((dr) => {
    const opt = document.createElement("option");
    opt.value = dr.name;
    opt.textContent = dr.name;
    dsel.appendChild(opt);
  });

  /* Departments (optional) */
  const deptSel = $("p_dept");
  deptSel.innerHTML = `
    <option value="">Select</option>
    <option>Nephrology</option>
    <option>Urology</option>
    <option>General Medicine</option>
    <option>Surgery</option>
    <option>ICU</option>
  `;
}

/* ================================================================
   AUTO GENERATE PATIENT ID
================================================================= */
$("p_id").value = generatePatientID();

/* ================================================================
   AUTO CALCULATE LOS
================================================================= */
function updateLOS() {
  const doa = $("p_doa").value;
  const dod = $("p_dod").value;
  $("p_los").value = calcLOS(doa, dod);
}

$("p_doa").addEventListener("change", updateLOS);
$("p_dod").addEventListener("change", updateLOS);

/* ================================================================
   ROOM TARIFF HANDLING
================================================================= */
$("room_type").addEventListener("change", () => {
  const type = $("room_type").value;
  const room = (TARIFF.rooms || []).find((r) => r.name === type);
  if (!room) return;

  $("room_rent").value = room.room_rent;
  $("room_nursing").value = room.nursing;
  $("room_rmo").value = room.rmo;
});

/* ROOM SHIFTING */
$("add_room_shift").addEventListener("click", () => {
  const box = $("room_shift_list");

  const item = newEl("div", "list-item");
  item.innerHTML = `
    <label>Shifted Room Type</label>
    <select class="shift_type"></select>

    <label>Days Stayed</label>
    <input type="number" class="shift_days" value="1">

    <label>Remove</label>
    <button class="small-btn remove_shift">Remove</button>
  `;

  box.appendChild(item);

  /* populate dropdown */
  const sel = item.querySelector(".shift_type");
  sel.innerHTML = `<option value="">Select</option>`;
  (TARIFF.rooms || []).forEach((r) => {
    const o = document.createElement("option");
    o.value = r.name;
    o.textContent = r.name;
    sel.appendChild(o);
  });

  item.querySelector(".remove_shift").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   CONSULTANT VISITS
================================================================= */
$("add_visit").addEventListener("click", () => {
  const box = $("visit_list");

  const item = newEl("div", "list-item");
  item.innerHTML = `
    <label>Select Doctor</label>
    <select class="visit_doctor"></select>

    <label>No. of Visits</label>
    <input type="number" class="visit_count" value="1">

    <button class="small-btn remove_visit">Remove</button>
  `;

  box.appendChild(item);

  /* doctor dropdown */
  const sel = item.querySelector(".visit_doctor");
  sel.innerHTML = `<option value="">Select</option>`;
  DOCTORS.forEach((dr) => {
    const o = document.createElement("option");
    o.value = dr.name;
    o.textContent = dr.name;
    sel.appendChild(o);
  });

  item.querySelector(".remove_visit").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   SURGERIES (Basic entry — advanced package logic later)
================================================================= */
$("add_surgery").addEventListener("click", () => {
  const box = $("surgery_list");
  const item = newEl("div", "list-item");

  item.innerHTML = `
    <label>Surgery</label>
    <select class="surg_name"></select>

    <label>Surgeon</label>
    <select class="surg_doctor"></select>

    <label>No. of Assistants</label>
    <input type="number" class="surg_asst" value="1">

    <label>Anaesthesia Type</label>
    <select class="surg_anes">
      <option>GA</option>
      <option>LA</option>
      <option>RA</option>
    </select>

    <label>Emergency?</label>
    <select class="surg_emg">
      <option value="no">No</option>
      <option value="yes">Yes</option>
    </select>

    <label>Implant / Consumables (optional)</label>
    <input type="number" class="surg_implant" placeholder="0">

    <button class="small-btn remove_surg">Remove</button>
  `;

  box.appendChild(item);

  /* Load dropdowns */
  initSurgeryDropdown(item.querySelector(".surg_name"));

  const drSel = item.querySelector(".surg_doctor");
  drSel.innerHTML = `<option value="">Select</option>`;
  DOCTORS.forEach((dr) => {
    drSel.innerHTML += `<option>${dr.name}</option>`;
  });

  item.querySelector(".remove_surg").addEventListener("click", () => {
    item.remove();
  });
});

function initSurgeryDropdown(sel) {
  sel.innerHTML = `<option value="">Select Surgery</option>`;
  if (TARIFF.surgeries) {
    TARIFF.surgeries.forEach((s) => {
      const o = document.createElement("option");
      o.value = s.name;
      o.textContent = s.name;
      sel.appendChild(o);
    });
  }
}

/* ================================================================
   PHARMACY
================================================================= */
$("add_pharmacy").addEventListener("click", () => {
  const box = $("pharmacy_list");
  const item = newEl("div", "list-item");

  item.innerHTML = `
    <label>Item</label>
    <input type="text" class="ph_item">

    <label>Amount</label>
    <input type="number" class="ph_amount">

    <button class="small-btn remove_ph">Remove</button>
  `;

  box.appendChild(item);

  item.querySelector(".remove_ph").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   INVESTIGATIONS
================================================================= */
$("add_test").addEventListener("click", () => {
  const box = $("test_list");
  const item = newEl("div", "list-item");

  item.innerHTML = `
    <label>Test Name</label>
    <input type="text" class="test_name">

    <label>Amount</label>
    <input type="number" class="test_amount">

    <button class="small-btn remove_test">Remove</button>
  `;

  box.appendChild(item);

  item.querySelector(".remove_test").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   MISC ITEMS
================================================================= */
$("add_misc").addEventListener("click", () => {
  const box = $("misc_list");
  const item = newEl("div", "list-item");

  item.innerHTML = `
    <label>Description</label>
    <input type="text" class="misc_desc">

    <label>Amount</label>
    <input type="number" class="misc_amount">

    <button class="small-btn remove_misc">Remove</button>
  `;

  box.appendChild(item);

  item.querySelector(".remove_misc").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   RECEIPTS
================================================================= */
$("add_receipt").addEventListener("click", () => {
  const box = $("receipt_list_new");
  const item = newEl("div", "list-item");

  item.innerHTML = `
    <label>Mode</label>
    <select class="rcpt_mode">
      <option>Cash</option>
      <option>UPI</option>
      <option>Card</option>
      <option>Bank Transfer</option>
      <option>Insurance</option>
    </select>

    <label>Amount</label>
    <input type="number" class="rcpt_amount">

    <button class="small-btn remove_rcpt">Remove</button>
  `;

  box.appendChild(item);

  item.querySelector(".remove_rcpt").addEventListener("click", () => {
    item.remove();
  });
});

/* ================================================================
   CALCULATE TOTALS
================================================================= */
function calculateTotals() {
  let gross = 0;

  /* Room charges */
  const los = Number($("p_los").value || 0);
  gross += (Number($("room_rent").value || 0) * los);
  gross += (Number($("room_nursing").value || 0) * los);
  gross += (Number($("room_rmo").value || 0) * los);

  /* Room shifts */
  document.querySelectorAll("#room_shift_list .list-item").forEach((it) => {
    const type = it.querySelector(".shift_type").value;
    const days = Number(it.querySelector(".shift_days").value || 0);
    const r = (TARIFF.rooms || []).find((x) => x.name === type);
    if (r) {
      gross += r.room_rent * days;
      gross += r.nursing * days;
      gross += r.rmo * days;
    }
  });

  /* Consultant visits */
  document.querySelectorAll("#visit_list .list-item").forEach((it) => {
    const dr = it.querySelector(".visit_doctor").value;
    const cnt = Number(it.querySelector(".visit_count").value || 0);
    const drObj = DOCTORS.find((d) => d.name === dr);
    if (drObj) gross += drObj.visit_fee * cnt;
  });

/* Surgeries — Auto Package Calculation */
document.querySelectorAll("#surgery_list .list-item").forEach((it) => {
  const sname = it.querySelector(".surg_name").value;
  const asst = Number(it.querySelector(".surg_asst").value || 0);
  const implant = Number(it.querySelector(".surg_implant").value || 0);
  const emergency = it.querySelector(".surg_emg").value === "yes";

  const pkg = (TARIFF.surgeries || []).find((x) => x.name === sname);
  if (!pkg) return;

  let total = 0;

  /* surgeon */
  total += pkg.surgeon_fee;

  /* assistant surgeon */
  total += (pkg.surgeon_fee * (pkg.assistant_fee / 100)) * asst;

  /* anaesthesia */
  total += pkg.anaesthesia_fee;

  /* OT charges */
  let ot = pkg.ot_charges;
  if (emergency) ot *= 1.5;
  total += ot;

  /* implants */
  total += implant;

  gross += total;
});


  /* Pharmacy */
  document.querySelectorAll("#pharmacy_list .list-item").forEach((it) => {
    gross += Number(it.querySelector(".ph_amount").value || 0);
  });

  /* Tests */
  document.querySelectorAll("#test_list .list-item").forEach((it) => {
    gross += Number(it.querySelector(".test_amount").value || 0);
  });

  /* Misc */
  document.querySelectorAll("#misc_list .list-item").forEach((it) => {
    gross += Number(it.querySelector(".misc_amount").value || 0);
  });

  /* Receipts */
  let paid = 0;
  document.querySelectorAll("#receipt_list_new .list-item").forEach((it) => {
    paid += Number(it.querySelector(".rcpt_amount").value || 0);
  });

  $("total_gross").value = fmt(gross);
  $("total_paid").value = fmt(paid);
  $("total_balance").value = fmt(gross - paid);

  return { gross, paid, balance: gross - paid };
}

/* Auto recalc continuously */
setInterval(calculateTotals, 600);

/* ================================================================
   BUILD BILL OBJECT & SEND TO PRINT
================================================================= */
$("generate_bill").addEventListener("click", () => {
  const totals = calculateTotals();

  const bill = {
    bill_no: generateBillNumber(),
    bill_date: new Date().toLocaleDateString("en-IN"),

    patient: {
      name: $("p_name").value,
      id: $("p_id").value,
      age: $("p_age").value,
      gender: $("p_gender").value,
      doctor: $("p_doctor").value,
      admission_date: $("p_doa").value,
      discharge_date: $("p_dod").value
    },

    los: $("p_los").value,
    payment_type: $("p_payment_type")?.value || "Self / Cash",

    /* BILL ITEMS TABLE (used by print engine) */
    items: [],

    /* Receipt summary */
    receipts: [],
    gross_total: totals.gross,
    paid_total: totals.paid,
    balance: totals.balance
  };

  /* ROOM */
  const los = Number($("p_los").value || 0);
  const addRow = (desc, qty, rate) => {
    bill.items.push({
      desc,
      qty,
      rate,
      total: qty * rate
    });
  };

  addRow($("room_type").value + " — Room Rent", los, Number($("room_rent").value || 0));
  addRow("Nursing Charges", los, Number($("room_nursing").value || 0));
  addRow("RMO/DMO Charges", los, Number($("room_rmo").value || 0));

  /* ROOM SHIFTS */
  document.querySelectorAll("#room_shift_list .list-item").forEach((it) => {
    const type = it.querySelector(".shift_type").value;
    const days = Number(it.querySelector(".shift_days").value);
    const r = (TARIFF.rooms || []).find((x) => x.name === type);
    if (r) {
      addRow(type + " — Room Rent", days, r.room_rent);
      addRow(type + " — Nursing", days, r.nursing);
      addRow(type + " — RMO/DMO", days, r.rmo);
    }
  });

  /* CONSULTANT VISITS */
  document.querySelectorAll("#visit_list .list-item").forEach((it) => {
    const dr = it.querySelector(".visit_doctor").value;
    const cnt = Number(it.querySelector(".visit_count").value);
    const drObj = DOCTORS.find((d) => d.name === dr);
    if (drObj) addRow("Consultation — " + dr, cnt, drObj.visit_fee);
  });

/* SURGERIES — Detailed Entry */
document.querySelectorAll("#surgery_list .list-item").forEach((it) => {
  const name = it.querySelector(".surg_name").value;
  const asst = Number(it.querySelector(".surg_asst").value || 0);
  const implant = Number(it.querySelector(".surg_implant").value || 0);
  const emergency = it.querySelector(".surg_emg").value === "yes";

  const pkg = (TARIFF.surgeries || []).find((x) => x.name === name);
  if (!pkg) return;

  addRow("Surgery — " + name, 1, pkg.surgeon_fee);
  addRow("Assistant Surgeon Fee (" + asst + ")", 1, (pkg.surgeon_fee * pkg.assistant_fee/100) * asst);
  addRow("Anaesthesia Fee", 1, pkg.anaesthesia_fee);

  let ot = pkg.ot_charges;
  if (emergency) ot *= 1.5;
  addRow("OT Charges" + (emergency ? " (Emergency)" : ""), 1, ot);

  if (implant > 0) addRow("Implants / Consumables", 1, implant);
});


  /* PHARMACY */
  document.querySelectorAll("#pharmacy_list .list-item").forEach((it) => {
    const name = it.querySelector(".ph_item").value;
    const amt = Number(it.querySelector(".ph_amount").value);
    addRow("Pharmacy — " + name, 1, amt);
  });

  /* TESTS */
  document.querySelectorAll("#test_list .list-item").forEach((it) => {
    const name = it.querySelector(".test_name").value;
    const amt = Number(it.querySelector(".test_amount").value);
    addRow("Investigation — " + name, 1, amt);
  });

  /* MISC */
  document.querySelectorAll("#misc_list .list-item").forEach((it) => {
    const name = it.querySelector(".misc_desc").value;
    const amt = Number(it.querySelector(".misc_amount").value);
    addRow("Misc — " + name, 1, amt);
  });

  /* RECEIPTS */
  document.querySelectorAll("#receipt_list_new .list-item").forEach((it) => {
    bill.receipts.push({
      mode: it.querySelector(".rcpt_mode").value,
      amount: Number(it.querySelector(".rcpt_amount").value),
      date: new Date().toLocaleDateString("en-IN")
    });
  });

  /* SAVE + OPEN PRINT PAGE */
  localStorage.setItem("billPreview", JSON.stringify(bill));
  window.open("bill-print.html", "_blank");
});

/* ================================================================
   INITIALIZE EVERYTHING
================================================================= */
initDropdowns();
