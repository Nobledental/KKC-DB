/* ============================================================================
   KCC BILLING OS — APP.JS (PART 1)
   CORE ENGINE: Navigation, Theme, Sidebar, Drawer, Bill Object, LOS, Utilities
============================================================================ */

/* ----------------------------------------------------------
   SHORTCUTS
---------------------------------------------------------- */
const qs = (s, o = document) => o.querySelector(s);
const qsa = (s, o = document) => [...o.querySelectorAll(s)];
const fmtINR = n => "₹" + Number(n || 0).toLocaleString("en-IN");


/* ============================================================================
   SPA NAVIGATION
============================================================================ */
const panels = qsa(".panel");
const navButtons = qsa(".nav-btn");
const panelTitle = qs("#panelTitle");

navButtons.forEach(btn =>
  btn.addEventListener("click", () => switchPanel(btn.dataset.panel, btn))
);

function switchPanel(id, btn) {
  panels.forEach(p => p.classList.remove("active-panel"));
  qs(`#${id}`).classList.add("active-panel");

  navButtons.forEach(n => n.classList.remove("active"));
  btn.classList.add("active");

  panelTitle.textContent = btn.textContent.replace("🧾 ", "").replace("🏠 ", "");
}


/* ============================================================================
   SIDEBAR COLLAPSE
============================================================================ */
const sidebar = qs("#sidebar");
qs("#collapseSidebar").addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});


/* ============================================================================
   THEME TOGGLE
============================================================================ */
qs("#toggleTheme").addEventListener("click", () => {
  const html = document.documentElement;
  html.dataset.theme = (html.dataset.theme === "dark") ? "light" : "dark";
});


/* ============================================================================
   DRAWER SYSTEM (Tariff Editing, Package Editing)
============================================================================ */
const drawer = qs("#drawer");
const drawerTitle = qs("#drawerTitle");
const drawerContent = qs("#drawerContent");

qs("#drawerClose").addEventListener("click", closeDrawer);

function openDrawer(title, html) {
  drawerTitle.textContent = title;
  drawerContent.innerHTML = html;
  drawer.classList.add("open");
}

function closeDrawer() {
  drawer.classList.remove("open");
}


/* ============================================================================
   BILL OBJECT — BASE STRUCTURE
============================================================================ */
let currentBill = {};

function newBillObject() {
  currentBill = {
    bill_no: generateBillNo(),
    date: new Date().toISOString().slice(0, 10),

    /* PATIENT */
    patient: {
      name: "",
      id: "",
      age: "",
      gender: "",
      address: "",
      dept: "",
      consultant: "",
      doa: "",
      dod: "",
      los: 0,
      insured: "no",
      insurer: "",
      claim: ""
    },

    /* MODULES */
    room: {
      type: "",
      rent: 0,
      nursing: 0,
      duty: 0,
      consult: 0
    },

    visits: [],
    surgeries: [],
    pharmacy: {
      total: 0,
      items: []
    },

    investigations: [],
    misc: [],
    receipts: [],

    /* SUMMARY */
    total_gross: 0,
    total_paid: 0,
    total_balance: 0
  };
}

newBillObject(); // initialize
updateBillUICore();


/* ============================================================================
   BILL NO GENERATOR — 12 DIGIT
============================================================================ */
function generateBillNo() {
  return String(Date.now()).slice(-12);
}


/* ============================================================================
   LOS AUTO CALCULATOR
============================================================================ */
qs("#pt_doa").addEventListener("change", calcLOS);
qs("#pt_dod").addEventListener("change", calcLOS);

function calcLOS() {
  const doa = qs("#pt_doa").value;
  const dod = qs("#pt_dod").value;
  if (!doa || !dod) return;

  const d1 = new Date(doa);
  const d2 = new Date(dod);

  if (d2 < d1) {
    alert("Discharge cannot be earlier than admission.");
    qs("#pt_los").value = "";
    currentBill.patient.los = 0;
    return;
  }

  const los = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  qs("#pt_los").value = los;
  currentBill.patient.los = los;

  updateLiveTotals();
}


/* ============================================================================
   PATIENT FIELD BINDINGS
============================================================================ */
const bindings = {
  "#pt_name": v => currentBill.patient.name = v,
  "#pt_id": v => currentBill.patient.id = v,
  "#pt_age": v => currentBill.patient.age = v,
  "#pt_gender": v => currentBill.patient.gender = v,
  "#pt_address": v => currentBill.patient.address = v,
  "#pt_dept": v => currentBill.patient.dept = v,
  "#pt_doctor": v => currentBill.patient.consultant = v,
  "#pt_doa": v => currentBill.patient.doa = v,
  "#pt_dod": v => currentBill.patient.dod = v,
  "#pt_insured": v => {
    currentBill.patient.insured = v;
    toggleInsuranceFields(v);
  },
  "#pt_insurer": v => currentBill.patient.insurer = v,
  "#pt_claim": v => currentBill.patient.claim = v
};

Object.keys(bindings).forEach(sel => {
  qs(sel).addEventListener("input", e => {
    bindings[sel](e.target.value);
  });
});

/* Insurance field show/hide */
function toggleInsuranceFields(on) {
  qsa(".insurance-block").forEach(b => {
    b.style.display = (on === "yes") ? "block" : "none";
  });
}


/* ============================================================================
   LOAD ROOM TARIFFS INTO DROPDOWN
============================================================================ */
const roomType = qs("#roomType");

function loadRoomTypes() {
  roomType.innerHTML = `<option value="">Select Room</option>`;
  Object.keys(TariffMaster.rooms).forEach(room => {
    roomType.innerHTML += `<option>${room}</option>`;
  });
}

loadRoomTypes();

roomType.addEventListener("change", () => {
  const type = roomType.value;
  if (!type) return;

  const t = TariffMaster.rooms[type];

  qs("#room_rent").textContent = fmtINR(t.room);
  qs("#room_nursing").textContent = fmtINR(t.nursing);
  qs("#room_duty").textContent = fmtINR(t.duty);
  qs("#room_consult").textContent = fmtINR(t.consult);

  currentBill.room = {
    type,
    rent: t.room,
    nursing: t.nursing,
    duty: t.duty,
    consult: t.consult
  };

  updateLiveTotals();
});


/* ============================================================================
   INVESTIGATION LIST (Tariff loading)
============================================================================ */
function loadInvestigationsTariff() {
  // Used in Part 5 for tariff master editing
}


/* ============================================================================
   LIVE TOTAL UPDATER (placeholder — full logic in PART 6)
============================================================================ */
function updateLiveTotals() {
  // Will be expanded in Part 6 (Billing Engine)
  // But keep fields clean for now
  qs("#sum_gross").textContent = fmtINR(currentBill.total_gross);
  qs("#sum_paid").textContent = fmtINR(currentBill.total_paid);
  qs("#sum_balance").textContent = fmtINR(currentBill.total_balance);
}


/* ============================================================================
   INITIAL UI UPDATE
============================================================================ */
function updateBillUICore() {
  qs("#pt_los").value = "";
}

/* ============================================================================
   APP.JS — PART 2
   TARIFF MASTER ENGINE
   Rooms, Investigations, Surgical Packages, Import/Export JSON
============================================================================ */


/* ============================================================================
   RENDER ROOM TARIFF TABLE
============================================================================ */
const roomTable = qs("#tariff_rooms");

function renderRoomTariffs() {
  roomTable.innerHTML = `
    <tr>
      <th>Room Type</th>
      <th>Room Rent</th>
      <th>Nursing</th>
      <th>Duty Doctor</th>
      <th>Consultant</th>
    </tr>
  `;

  Object.keys(TariffMaster.rooms).forEach(type => {
    const t = TariffMaster.rooms[type];

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${type}</td>
      <td><input class="inline-input" data-rt="${type}" data-field="room" value="${t.room}"></td>
      <td><input class="inline-input" data-rt="${type}" data-field="nursing" value="${t.nursing}"></td>
      <td><input class="inline-input" data-rt="${type}" data-field="duty" value="${t.duty}"></td>
      <td><input class="inline-input" data-rt="${type}" data-field="consult" value="${t.consult}"></td>
    `;
    roomTable.appendChild(row);
  });

  // Bind inline edits
  qsa("[data-rt]").forEach(input => {
    input.addEventListener("input", e => {
      const room = e.target.dataset.rt;
      const field = e.target.dataset.field;
      TariffMaster.rooms[room][field] = Number(e.target.value);
    });
  });
}

renderRoomTariffs();


/* ============================================================================
   RENDER INVESTIGATION TARIFF TABLE
============================================================================ */
const investTable = qs("#tariff_invest");

function renderInvestTariffs() {
  investTable.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Price</th>
      <th></th>
    </tr>
  `;

  TariffMaster.investigations.forEach((item, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><input class="inline-input" data-inv="${i}" data-field="name" value="${item.name}"></td>
      <td><input class="inline-input" data-inv="${i}" data-field="price" value="${item.price}"></td>
      <td><button class="mini-btn" data-remove-inv="${i}">Remove</button></td>
    `;
    investTable.appendChild(row);
  });

  // Update values
  qsa("[data-inv]").forEach(input => {
    input.addEventListener("input", e => {
      const index = Number(e.target.dataset.inv);
      const field = e.target.dataset.field;
      TariffMaster.investigations[index][field] =
        field === "price" ? Number(e.target.value) : e.target.value;
    });
  });

  // Remove
  qsa("[data-remove-inv]").forEach(btn => {
    btn.addEventListener("click", e => {
      const i = Number(e.target.dataset.removeInv);
      TariffMaster.investigations.splice(i, 1);
      renderInvestTariffs();
    });
  });
}

// Add new investigation
qs("#addInvestTariff").addEventListener("click", () => {
  TariffMaster.investigations.push({ name: "New Test", price: 0 });
  renderInvestTariffs();
});

renderInvestTariffs();


/* ============================================================================
   SURGICAL PACKAGES — LIST RENDERING
============================================================================ */
const packageList = qs("#packageList");

function renderPackages() {
  packageList.innerHTML = "";

  TariffMaster.packages.forEach((pkg, i) => {
    const card = document.createElement("div");
    card.className = "package-card";

    card.innerHTML = `
      <div class="package-name">${pkg.name}</div>
      <div class="package-cat">${pkg.category}</div>
      <div class="package-total">Total: ${fmtINR(pkg.package_total)}</div>
      <button class="mini-btn" data-edit-pkg="${i}">Edit</button>
    `;

    packageList.appendChild(card);
  });

  // bind editors
  qsa("[data-edit-pkg]").forEach(btn => {
    btn.addEventListener("click", e => {
      const index = Number(e.target.dataset.editPkg);
      openPackageEditor(index);
    });
  });
}

renderPackages();


/* ============================================================================
   PACKAGE EDITOR — DRAWER
============================================================================ */
function openPackageEditor(i) {
  const pkg = TariffMaster.packages[i];

  const html = `
    <label>Category</label>
    <select id="pkg_cat">
      ${[
        "ENT",
        "Ortho",
        "Urology",
        "General Surgery",
        "OBGY",
        "Cardiac",
        "Ophthal"
      ]
        .map(c => `<option ${c === pkg.category ? "selected" : ""}>${c}</option>`)
        .join("")}
    </select>

    <label>Package Name</label>
    <input id="pkg_name" value="${pkg.name}">

    <label>OT</label>
    <input type="number" id="pkg_ot" value="${pkg.ot}">

    <label>Surgeon</label>
    <input type="number" id="pkg_surgeon" value="${pkg.surgeon}">

    <label>Assistant</label>
    <input type="number" id="pkg_assistant" value="${pkg.assistant}">

    <label>Anesthetist</label>
    <input type="number" id="pkg_anesthetist" value="${pkg.anesthetist}">

    <label>Implant</label>
    <input type="number" id="pkg_implant" value="${pkg.implant}">

    <label>OT Gas</label>
    <input type="number" id="pkg_gas" value="${pkg.gas}">

    <label>Consumables</label>
    <input type="number" id="pkg_consumables" value="${pkg.consumables}">

    <button class="primary-btn" id="savePkg">Save Package</button>
  `;

  openDrawer("Edit Package", html);

  qs("#savePkg").onclick = () => savePackage(i);
}

function savePackage(i) {
  const p = TariffMaster.packages[i];

  p.category = qs("#pkg_cat").value;
  p.name = qs("#pkg_name").value;
  p.ot = Number(qs("#pkg_ot").value);
  p.surgeon = Number(qs("#pkg_surgeon").value);
  p.assistant = Number(qs("#pkg_assistant").value);
  p.anesthetist = Number(qs("#pkg_anesthetist").value);
  p.implant = Number(qs("#pkg_implant").value);
  p.gas = Number(qs("#pkg_gas").value);
  p.consumables = Number(qs("#pkg_consumables").value);

  p.package_total =
    p.ot + p.surgeon + p.assistant + p.anesthetist + p.implant + p.gas + p.consumables;

  renderPackages();
  closeDrawer();
}


/* ============================================================================
   ADD NEW PACKAGE
============================================================================ */
qs("#addPackage").addEventListener("click", () => {
  TariffMaster.packages.push({
    category: "General Surgery",
    name: "New Package",
    ot: 0,
    surgeon: 0,
    assistant: 0,
    anesthetist: 0,
    implant: 0,
    gas: 0,
    consumables: 0,
    package_total: 0
  });

  renderPackages();
});


/* ============================================================================
   IMPORT / EXPORT TARIFF JSON
============================================================================ */
qs("#exportTariff").addEventListener("click", () => {
  const data = JSON.stringify(TariffMaster, null, 2);
  const blob = new Blob([data], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tariff_master.json";
  a.click();
});

qs("#importTariff").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  const json = JSON.parse(text);

  // Replace entire tariff
  Object.assign(TariffMaster, json);

  // Re-render UI
  renderRoomTariffs();
  renderInvestTariffs();
  renderPackages();
});
 
/* ============================================================================
   APP.JS — PART 3
   BILLING ENGINE: Visits, Surgeries, Pharmacy, Investigations, Misc, Receipts
============================================================================ */


/* ============================================================================
   CONSULTANT VISITS
============================================================================ */
const visitTable = qs("#visitTable");
qs("#addVisit").addEventListener("click", addVisitRow);

function addVisitRow() {
  const index = currentBill.visits.length;
  currentBill.visits.push({ date: "", count: 1, fee: 0, total: 0 });

  const row = document.createElement("tr");
  row.innerHTML = `
    <td><input type="date" class="inline-input" data-vdate="${index}"></td>
    <td><input type="number" class="inline-input" data-vcount="${index}" value="1"></td>
    <td><input class="inline-input" data-vfee="${index}" value="0"></td>
    <td id="vtotal-${index}">0</td>
    <td><button class="mini-btn" data-vdel="${index}">X</button></td>
  `;

  visitTable.appendChild(row);
  bindVisitRow(index);
}

function bindVisitRow(i) {
  qs(`[data-vdate="${i}"]`).addEventListener("change", e => {
    currentBill.visits[i].date = e.target.value;
  });

  qs(`[data-vcount="${i}"]`).addEventListener("input", e => {
    currentBill.visits[i].count = Number(e.target.value);
    calcVisit(i);
  });

  qs(`[data-vfee="${i}"]`).addEventListener("input", e => {
    currentBill.visits[i].fee = Number(e.target.value);
    calcVisit(i);
  });

  qs(`[data-vdel="${i}"]`).addEventListener("click", () => {
    currentBill.visits.splice(i, 1);
    renderVisits();
  });
}

function calcVisit(i) {
  const v = currentBill.visits[i];
  v.total = v.count * v.fee;
  qs(`#vtotal-${i}`).textContent = fmtINR(v.total);
  updateLiveTotals();
}

function renderVisits() {
  visitTable.innerHTML = "";
  currentBill.visits.forEach((v, i) => addVisitRow());
}


/* ============================================================================
   SURGERY MODULE (SUPER ADVANCED)
============================================================================ */
qs("#addSurgery").addEventListener("click", addSurgery);

const surgeryList = qs("#surgeryList");

function addSurgery() {
  const index = currentBill.surgeries.length;

  currentBill.surgeries.push({
    package: null,
    discount_mode: "none",
    discount_value: 0,
    final_total: 0
  });

  renderSurgeries();
}

function renderSurgeries() {
  surgeryList.innerHTML = "";

  currentBill.surgeries.forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "bill-box";

    div.innerHTML = `
      <h4>Surgery ${i + 1}</h4>

      <label>Package</label>
      <select class="inline-input" data-spkg="${i}">
        <option value="">Select Package</option>
        ${TariffMaster.packages
          .map((p, idx) =>
            `<option value="${idx}" ${s.package === idx ? "selected" : ""}>
              ${p.category} — ${p.name}
            </option>`
          )
          .join("")}
      </select>

      <div id="surgeryBreakup-${i}" class="surg-breakup"></div>

      <label>Discount</label>
      <select class="inline-input" data-sdisc="${i}">
        <option value="none" ${s.discount_mode === "none" ? "selected" : ""}>No Discount</option>
        <option value="50" ${s.discount_mode === "50" ? "selected" : ""}>50% Package</option>
        <option value="custom" ${s.discount_mode === "custom" ? "selected" : ""}>Custom %</option>
      </select>

      <input type="number" placeholder="Custom %" class="inline-input"
        id="sdiscval-${i}" value="${s.discount_value}" 
        style="display:${s.discount_mode === "custom" ? "block" : "none"}">

      <p><strong>Final Amount:</strong> <span id="sfinal-${i}">${fmtINR(s.final_total)}</span></p>

      <button class="mini-btn" data-sdel="${i}">Remove</button>
    `;

    surgeryList.appendChild(div);
    bindSurgeryEvents(i);
  });
}

function bindSurgeryEvents(i) {
  // Select package
  qs(`[data-spkg="${i}"]`).addEventListener("change", e => {
    currentBill.surgeries[i].package = e.target.value === "" ? null : Number(e.target.value);
    updateSurgeryBreakup(i);
  });

  // Discount mode
  qs(`[data-sdisc="${i}"]`).addEventListener("change", e => {
    currentBill.surgeries[i].discount_mode = e.target.value;

    qs(`#sdiscval-${i}`).style.display =
      e.target.value === "custom" ? "block" : "none";

    calcSurgery(i);
  });

  // Custom %
  qs(`#sdiscval-${i}`).addEventListener("input", e => {
    currentBill.surgeries[i].discount_value = Number(e.target.value);
    calcSurgery(i);
  });

  // Remove surgery
  qs(`[data-sdel="${i}"]`).addEventListener("click", () => {
    currentBill.surgeries.splice(i, 1);
    renderSurgeries();
    updateLiveTotals();
  });
}

function updateSurgeryBreakup(i) {
  const s = currentBill.surgeries[i];
  const div = qs(`#surgeryBreakup-${i}`);

  if (s.package === null) {
    div.innerHTML = "";
    return;
  }

  const pkg = TariffMaster.packages[s.package];

  div.innerHTML = `
    <p>OT: ${fmtINR(pkg.ot)}</p>
    <p>Surgeon: ${fmtINR(pkg.surgeon)}</p>
    <p>Assistant: ${fmtINR(pkg.assistant)}</p>
    <p>Anesthetist: ${fmtINR(pkg.anesthetist)}</p>
    <p>Implant: ${fmtINR(pkg.implant)}</p>
    <p>OT Gas: ${fmtINR(pkg.gas)}</p>
    <p>Consumables: ${fmtINR(pkg.consumables)}</p>
    <p><strong>Package Total: ${fmtINR(pkg.package_total)}</strong></p>
  `;

  calcSurgery(i);
}

function calcSurgery(i) {
  const s = currentBill.surgeries[i];
  if (s.package === null) return;

  const pkg = TariffMaster.packages[s.package];
  let final = pkg.package_total;

  if (s.discount_mode === "50") {
    final = final / 2;
  } else if (s.discount_mode === "custom") {
    final = final - (final * s.discount_value) / 100;
  }

  s.final_total = Math.round(final);

  qs(`#sfinal-${i}`).textContent = fmtINR(s.final_total);
  updateLiveTotals();
}


/* ============================================================================
   PHARMACY MODULE
============================================================================ */
qs("#addPharmaItem").addEventListener("click", addPharmaItem);

function addPharmaItem() {
  const index = currentBill.pharmacy.items.length;
  currentBill.pharmacy.items.push({ item: "", qty: 1, amt: 0 });

  renderPharma();
}

function renderPharma() {
  const box = qs("#pharmaList");
  box.innerHTML = "";

  currentBill.pharmacy.items.forEach((p, i) => {
    const row = document.createElement("div");
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <input class="inline-input" placeholder="Item" data-pitem="${i}" value="${p.item}">
      <input class="inline-input" type="number" placeholder="Qty" data-pqty="${i}" value="${p.qty}">
      <input class="inline-input" type="number" placeholder="Amount" data-pamt="${i}" value="${p.amt}">
      <button class="mini-btn" data-pdel="${i}">X</button>
    `;

    box.appendChild(row);
  });

  bindPharmaEvents();
}

function bindPharmaEvents() {
  qsa("[data-pitem]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.pitem;
      currentBill.pharmacy.items[i].item = e.target.value;
    })
  );

  qsa("[data-pqty]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.pqty;
      currentBill.pharmacy.items[i].qty = Number(e.target.value);
      updateLiveTotals();
    })
  );

  qsa("[data-pamt]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.pamt;
      currentBill.pharmacy.items[i].amt = Number(e.target.value);
      updateLiveTotals();
    })
  );

  qsa("[data-pdel]").forEach(btn =>
    btn.addEventListener("click", e => {
      const i = e.target.dataset.pdel;
      currentBill.pharmacy.items.splice(i, 1);
      renderPharma();
      updateLiveTotals();
    })
  );

  // Pharmacy total from "main field"
  qs("#pharmacyTotal").addEventListener("input", e => {
    currentBill.pharmacy.total = Number(e.target.value);
    updateLiveTotals();
  });
}


/* ============================================================================
   INVESTIGATIONS MODULE
============================================================================ */
qs("#addInvestigation").addEventListener("click", () => {
  currentBill.investigations.push({ name: "", amt: 0 });
  renderInvestigations();
});

function renderInvestigations() {
  const box = qs("#investList");
  box.innerHTML = "";

  currentBill.investigations.forEach((inv, i) => {
    const div = document.createElement("div");
    div.style.marginBottom = "10px";

    div.innerHTML = `
      <input class="inline-input" placeholder="Investigation" data-invname="${i}" value="${inv.name}">
      <input class="inline-input" type="number" placeholder="Amount" data-invamt="${i}" value="${inv.amt}">
      <button class="mini-btn" data-invdel="${i}">X</button>
    `;

    box.appendChild(div);
  });

  bindInvestigationEvents();
}

function bindInvestigationEvents() {
  qsa("[data-invname]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.invname;
      currentBill.investigations[i].name = e.target.value;
    })
  );

  qsa("[data-invamt]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.invamt;
      currentBill.investigations[i].amt = Number(e.target.value);
      updateLiveTotals();
    })
  );

  qsa("[data-invdel]").forEach(btn =>
    btn.addEventListener("click", e => {
      const i = e.target.dataset.invdel;
      currentBill.investigations.splice(i, 1);
      renderInvestigations();
      updateLiveTotals();
    })
  );
}


/* ============================================================================
   MISCELLANEOUS MODULE
============================================================================ */
qs("#addMisc").addEventListener("click", () => {
  currentBill.misc.push({ desc: "", amt: 0 });
  renderMisc();
});

function renderMisc() {
  const box = qs("#miscList");
  box.innerHTML = "";

  currentBill.misc.forEach((m, i) => {
    const row = document.createElement("div");
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <input class="inline-input" placeholder="Description" data-mdesc="${i}" value="${m.desc}">
      <input class="inline-input" type="number" placeholder="Amount" data-mamt="${i}" value="${m.amt}">
      <button class="mini-btn" data-mdel="${i}">X</button>
    `;
    box.appendChild(row);
  });

  bindMiscEvents();
}

function bindMiscEvents() {
  qsa("[data-mdesc]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.mdesc;
      currentBill.misc[i].desc = e.target.value;
    })
  );

  qsa("[data-mamt]").forEach(inp =>
    inp.addEventListener("input", e => {
      const i = e.target.dataset.mamt;
      currentBill.misc[i].amt = Number(e.target.value);
      updateLiveTotals();
    })
  );

  qsa("[data-mdel]").forEach(btn =>
    btn.addEventListener("click", e => {
      const i = e.target.dataset.mdel;
      currentBill.misc.splice(i, 1);
      renderMisc();
      updateLiveTotals();
    })
  );
}


/* ============================================================================
   RECEIPTS MODULE
============================================================================ */
qs("#addReceipt").addEventListener("click", () => {
  currentBill.receipts.push({
    no: "",
    date: "",
    mode: "Cash",
    amt: 0
  });
  renderReceipts();
});

function renderReceipts() {
  const box = qs("#receiptList");
  box.innerHTML = "";

  currentBill.receipts.forEach((r, i) => {
    const row = document.createElement("div");
    row.style.marginBottom = "10px";

    row.innerHTML = `
      <input class="inline-input" placeholder="Receipt No" data-rno="${i}" value="${r.no}">
      <input class="inline-input" type="date" data-rdate="${i}" value="${r.date}">
      <select class="inline-input" data-rmode="${i}">
        <option>Cash</option>
        <option>UPI</option>
        <option>Card</option>
        <option>Transfer</option>
        <option>Insurance</option>
      </select>
      <input class="inline-input" type="number" placeholder="Amount" data-ramt="${i}" value="${r.amt}">
      <button class="mini-btn" data-rdel="${i}">X</button>
    `;

    box.appendChild(row);
  });

  bindReceiptEvents();
}

function bindReceiptEvents() {
  qsa("[data-rno]").forEach(inp =>
    inp.addEventListener("input", e => {
      currentBill.receipts[e.target.dataset.rno].no = e.target.value;
    })
  );

  qsa("[data-rdate]").forEach(inp =>
    inp.addEventListener("input", e => {
      currentBill.receipts[e.target.dataset.rdate].date = e.target.value;
    })
  );

  qsa("[data-rmode]").forEach(inp =>
    inp.addEventListener("change", e => {
      currentBill.receipts[e.target.dataset.rmode].mode = e.target.value;
    })
  );

  qsa("[data-ramt]").forEach(inp =>
    inp.addEventListener("input", e => {
      currentBill.receipts[e.target.dataset.ramt].amt = Number(e.target.value);
      updateLiveTotals();
    })
  );

  qsa("[data-rdel]").forEach(btn =>
    btn.addEventListener("click", e => {
      const i = e.target.dataset.rdel;
      currentBill.receipts.splice(i, 1);
      renderReceipts();
      updateLiveTotals();
    })
  );
}


/* ============================================================================
   TOTAL CALCULATION ENGINE
============================================================================ */
function updateLiveTotals() {
  let total = 0;

  /* ROOM CHARGES */
  if (currentBill.room.type && currentBill.patient.los > 0) {
    total +=
      currentBill.room.rent * currentBill.patient.los +
      currentBill.room.nursing * currentBill.patient.los +
      currentBill.room.duty * currentBill.patient.los +
      currentBill.room.consult * currentBill.patient.los;
  }

  /* VISITS */
  currentBill.visits.forEach(v => (total += v.total));

  /* SURGERIES */
  currentBill.surgeries.forEach(s => (total += s.final_total));

  /* PHARMACY */
  total += currentBill.pharmacy.total;
  currentBill.pharmacy.items.forEach(p => (total += p.amt * p.qty));

  /* INVESTIGATIONS */
  currentBill.investigations.forEach(i => (total += i.amt));

  /* MISC */
  currentBill.misc.forEach(m => (total += m.amt));

  /* TOTAL PAID */
  let paid = 0;
  currentBill.receipts.forEach(r => (paid += r.amt));

  /* UPDATE BILL OBJECT */
  currentBill.total_gross = Math.round(total);
  currentBill.total_paid = Math.round(paid);
  currentBill.total_balance = Math.round(total - paid);

  /* UPDATE UI */
  qs("#sum_gross").textContent = fmtINR(currentBill.total_gross);
  qs("#sum_paid").textContent = fmtINR(currentBill.total_paid);
  qs("#sum_balance").textContent = fmtINR(currentBill.total_balance);
}

/* ============================================================================
   APP.JS — PART 4
   INDEXEDDB STORAGE + HISTORY + PDF EXPORT ENGINE
============================================================================ */


/* ============================================================================
   INDEXEDDB — INIT
============================================================================ */
let db;
const request = indexedDB.open("kcc_billing_os", 1);

request.onupgradeneeded = function (e) {
  db = e.target.result;
  const store = db.createObjectStore("bills", { keyPath: "bill_no" });
  store.createIndex("bill_no", "bill_no", { unique: true });
};

request.onsuccess = function (e) {
  db = e.target.result;
  loadHistory();
};

request.onerror = function () {
  console.error("IndexedDB failed to load");
};


/* ============================================================================
   SAVE BILL
============================================================================ */
qs("#saveBill").addEventListener("click", () => {
  const tx = db.transaction("bills", "readwrite");
  const store = tx.objectStore("bills");

  const data = {
    bill_no: currentBill.bill_no,
    date: currentBill.date,
    patient_name: currentBill.patient.name,
    total: currentBill.total_gross,
    paid: currentBill.total_paid,
    balance: currentBill.total_balance,
    full: JSON.parse(JSON.stringify(currentBill))
  };

  store.put(data);

  tx.oncomplete = () => {
    alert("Bill saved successfully");
    loadHistory();
  };
});

/* ============================================================================
   LOAD HISTORY
============================================================================ */
const historyTable = qs("#historyTable");

function loadHistory() {
  if (!db) return;

  const tx = db.transaction("bills", "readonly");
  const store = tx.objectStore("bills");

  historyTable.innerHTML = `
    <tr>
      <th>Bill No</th>
      <th>Patient</th>
      <th>Date</th>
      <th>Total</th>
      <th>Paid</th>
      <th>Balance</th>
      <th>Open</th>
      <th>PDF</th>
      <th>Delete</th>
    </tr>
  `;

  store.openCursor().onsuccess = function (e) {
    const cursor = e.target.result;
    if (!cursor) return;

    const b = cursor.value;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${b.bill_no}</td>
      <td>${b.patient_name}</td>
      <td>${b.date}</td>
      <td>${fmtINR(b.total)}</td>
      <td>${fmtINR(b.paid)}</td>
      <td>${fmtINR(b.balance)}</td>

      <td><button class="mini-btn" data-open="${b.bill_no}">Open</button></td>
      <td><button class="mini-btn" data-pdf="${b.bill_no}">PDF</button></td>
      <td><button class="mini-btn" data-del="${b.bill_no}">X</button></td>
    `;

    historyTable.appendChild(row);

    cursor.continue();
  };

  bindHistoryActions();
}

function bindHistoryActions() {
  qsa("[data-open]").forEach(btn =>
    btn.addEventListener("click", () => openHistoryBill(btn.dataset.open))
  );

  qsa("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => deleteHistoryBill(btn.dataset.del))
  );

  qsa("[data-pdf]").forEach(btn =>
    btn.addEventListener("click", () => exportPDF(btn.dataset.pdf))
  );
}


/* ============================================================================
   DELETE BILL
============================================================================ */
function deleteHistoryBill(bill_no) {
  const tx = db.transaction("bills", "readwrite");
  const store = tx.objectStore("bills");
  store.delete(bill_no);

  tx.oncomplete = () => loadHistory();
}


/* ============================================================================
   OPEN SAVED BILL INTO NEW BILL PANEL
============================================================================ */
function openHistoryBill(bill_no) {
  const tx = db.transaction("bills", "readonly");
  const store = tx.objectStore("bills");
  const req = store.get(bill_no);

  req.onsuccess = function () {
    currentBill = req.result.full;
    restoreBillToUI();
    switchPanel("newBill", qs(`[data-panel="newBill"]`));
  };
}

function restoreBillToUI() {
  // PATIENT DETAILS
  const p = currentBill.patient;
  qs("#pt_name").value = p.name;
  qs("#pt_id").value = p.id;
  qs("#pt_age").value = p.age;
  qs("#pt_gender").value = p.gender;
  qs("#pt_address").value = p.address;
  qs("#pt_dept").value = p.dept;
  qs("#pt_doctor").value = p.consultant;
  qs("#pt_doa").value = p.doa;
  qs("#pt_dod").value = p.dod;
  qs("#pt_insured").value = p.insured;
  toggleInsuranceFields(p.insured);
  qs("#pt_insurer").value = p.insurer;
  qs("#pt_claim").value = p.claim;
  qs("#pt_los").value = p.los;

  // ROOM
  if (currentBill.room.type) {
    qs("#roomType").value = currentBill.room.type;

    qs("#room_rent").textContent = fmtINR(currentBill.room.rent);
    qs("#room_nursing").textContent = fmtINR(currentBill.room.nursing);
    qs("#room_duty").textContent = fmtINR(currentBill.room.duty);
    qs("#room_consult").textContent = fmtINR(currentBill.room.consult);
  }

  // VISITS
  visitTable.innerHTML = "";
  currentBill.visits.forEach((v, i) => {
    addVisitRow();
    qs(`[data-vdate="${i}"]`).value = v.date;
    qs(`[data-vcount="${i}"]`).value = v.count;
    qs(`[data-vfee="${i}"]`).value = v.fee;
    calcVisit(i);
  });

  // SURGERIES
  renderSurgeries();

  // PHARMACY
  qs("#pharmacyTotal").value = currentBill.pharmacy.total;
  renderPharma();

  // INVESTIGATIONS
  renderInvestigations();

  // MISC
  renderMisc();

  // RECEIPTS
  renderReceipts();

  updateLiveTotals();
}


/* ============================================================================
   AMOUNT IN WORDS (INDIAN SYSTEM)
============================================================================ */
function amountInWords(num) {
  const a = [
    "",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen"
  ];
  const b = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function inWords(num) {
    if ((num = num.toString()).length > 9) return "overflow";
    const n = ("000000000" + num)
      .substr(-9)
      .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);

    if (!n) return "";

    let str = "";
    str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + " crore " : "";
    str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + " lakh " : "";
    str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + " thousand " : "";
    str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + " hundred " : "";
    str +=
      n[5] != 0
        ? (str != "" ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]])
        : "";
    return str.trim();
  }

  return inWords(num) + " rupees only";
}


/* ============================================================================
   PDF EXPORT ENGINE — ULTRA PREMIUM
============================================================================ */
qs("#exportPDF").addEventListener("click", () => exportPDF(currentBill.bill_no));

async function exportPDF(bill_no) {
  const tx = db.transaction("bills", "readonly");
  const store = tx.objectStore("bills");
  const req = store.get(bill_no);

  req.onsuccess = () => {
    const bill = req.result.full;
    generatePDF(bill);
  };
}

async function generatePDF(bill) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  let y = 130;       // Content starts at 130px
  const margin = 40; // Left margin

  /* ----------------------------------------------------------
     HEADER — BILL NO + QR + BARCODE
  ---------------------------------------------------------- */
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`BILL NO: ${bill.bill_no}`, margin, 60);

  /* QR Code */
  let qrCanvas = document.createElement("canvas");
  QRCode.toCanvas(qrCanvas, bill.bill_no, { width: 80 });
  doc.addImage(qrCanvas.toDataURL("image/png"), "PNG", 450, 40, 80, 80);

  /* Barcode */
  let barcode = document.createElement("canvas");
  JsBarcode(barcode, bill.bill_no, { format: "CODE128" });
  doc.addImage(barcode.toDataURL("image/png"), "PNG", margin, 75, 200, 40);


  /* ----------------------------------------------------------
     PATIENT DETAILS
  ---------------------------------------------------------- */
  doc.setFontSize(13);
  doc.setFont("Helvetica", "bold");
  doc.text("PATIENT DETAILS", margin, y);
  y += 20;

  const pdata = [
    ["Name", bill.patient.name],
    ["Patient ID", bill.patient.id],
    ["Age / Gender", `${bill.patient.age} / ${bill.patient.gender}`],
    ["Address", bill.patient.address],
    ["Department", bill.patient.dept],
    ["Consultant", bill.patient.consultant],
    ["Admission", bill.patient.doa],
    ["Discharge", bill.patient.dod],
    ["LOS", bill.patient.los]
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin },
    body: pdata,
    theme: "grid"
  });

  y = doc.lastAutoTable.finalY + 30;


  /* ----------------------------------------------------------
     ROOM & DAILY CHARGES
  ---------------------------------------------------------- */
  if (bill.room.type) {
    doc.setFontSize(13);
    doc.setFont("Helvetica", "bold");
    doc.text("ROOM & DAILY CHARGES", margin, y);
    y += 20;

    const r = bill.room;
    const los = bill.patient.los;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      body: [
        ["Room Type", r.type],
        ["Room Rent", fmtINR(r.rent * los)],
        ["Nursing", fmtINR(r.nursing * los)],
        ["Duty Doctor", fmtINR(r.duty * los)],
        ["Consultant", fmtINR(r.consult * los)]
      ],
      theme: "grid"
    });

    y = doc.lastAutoTable.finalY + 30;
  }


  /* ----------------------------------------------------------
     CONSULTANT VISITS
  ---------------------------------------------------------- */
  if (bill.visits.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("CONSULTANT VISITS", margin, y);
    y += 20;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      head: [["Date", "Count", "Fee", "Total"]],
      body: bill.visits.map(v => [
        v.date,
        v.count,
        fmtINR(v.fee),
        fmtINR(v.total)
      ])
    });

    y = doc.lastAutoTable.finalY + 30;
  }


  /* ----------------------------------------------------------
     SURGERIES
  ---------------------------------------------------------- */
  if (bill.surgeries.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("SURGERIES", margin, y);
    y += 20;

    for (let s of bill.surgeries) {
      if (s.package === null) continue;

      const p = TariffMaster.packages[s.package];

      autoTable(doc, {
        startY: y,
        margin: { left: margin },
        body: [
          ["Package", p.category + " — " + p.name],
          ["OT", fmtINR(p.ot)],
          ["Surgeon", fmtINR(p.surgeon)],
          ["Assistant", fmtINR(p.assistant)],
          ["Anesthetist", fmtINR(p.anesthetist)],
          ["Implant", fmtINR(p.implant)],
          ["OT Gas", fmtINR(p.gas)],
          ["Consumables", fmtINR(p.consumables)],
          ["Package Total", fmtINR(p.package_total)],
          ["Discount", s.discount_mode === "none"
            ? "No Discount"
            : s.discount_mode === "50"
              ? "50% Package"
              : `${s.discount_value}% Custom`
          ],
          ["Final Total", fmtINR(s.final_total)]
        ],
        theme: "grid"
      });

      y = doc.lastAutoTable.finalY + 30;
    }
  }


  /* ----------------------------------------------------------
     PHARMACY
  ---------------------------------------------------------- */
  if (bill.pharmacy.total > 0 || bill.pharmacy.items.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("PHARMACY", margin, y);
    y += 20;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      head: [["Item", "Qty", "Amount"]],
      body: bill.pharmacy.items.map(p => [
        p.item,
        p.qty,
        fmtINR(p.amt * p.qty)
      ])
    });

    y = doc.lastAutoTable.finalY + 20;

    doc.text(`Pharmacy Total: ${fmtINR(bill.pharmacy.total)}`, margin, y);
    y += 30;
  }


  /* ----------------------------------------------------------
     INVESTIGATIONS
  ---------------------------------------------------------- */
  if (bill.investigations.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("INVESTIGATIONS", margin, y);
    y += 20;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      head: [["Name", "Amount"]],
      body: bill.investigations.map(i => [i.name, fmtINR(i.amt)])
    });

    y = doc.lastAutoTable.finalY + 30;
  }

  /* ----------------------------------------------------------
     MISC
  ---------------------------------------------------------- */
  if (bill.misc.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MISCELLANEOUS CHARGES", margin, y);
    y += 20;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      head: [["Description", "Amount"]],
      body: bill.misc.map(m => [m.desc, fmtINR(m.amt)])
    });

    y = doc.lastAutoTable.finalY + 30;
  }

  /* ----------------------------------------------------------
     RECEIPTS
  ---------------------------------------------------------- */
  if (bill.receipts.length > 0) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.text("RECEIPTS", margin, y);
    y += 20;

    autoTable(doc, {
      startY: y,
      margin: { left: margin },
      head: [["No", "Date", "Mode", "Amount"]],
      body: bill.receipts.map(r => [
        r.no,
        r.date,
        r.mode,
        fmtINR(r.amt)
      ])
    });

    y = doc.lastAutoTable.finalY + 30;
  }


  /* ----------------------------------------------------------
     FINAL SUMMARY
  ---------------------------------------------------------- */
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(14);
  doc.text("FINAL SUMMARY", margin, y);
  y += 20;

  autoTable(doc, {
    startY: y,
    margin: { left: margin },
    body: [
      ["Gross Total", fmtINR(bill.total_gross)],
      ["Paid", fmtINR(bill.total_paid)],
      ["Balance", fmtINR(bill.total_balance)]
    ],
    theme: "grid"
  });

  y = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(12);
  doc.text("Amount in Words:", margin, y);
  y += 16;
  doc.text(amountInWords(bill.total_gross), margin, y);


  /* ----------------------------------------------------------
     FOOTER
  ---------------------------------------------------------- */
  doc.setFontSize(10);
  doc.text("Computer generated — Krishna Kidney Centre", margin, 800);
  doc.text("Thank you for choosing our services.", margin, 815);


  /* ----------------------------------------------------------
     PAGE NUMBERS
  ---------------------------------------------------------- */
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pageCount}`, 520, 820);
  }


  /* ----------------------------------------------------------
     SAVE FILE
  ---------------------------------------------------------- */
  doc.save(`Bill_${bill.bill_no}.pdf`);
}



