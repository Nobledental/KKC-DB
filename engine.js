/* ============================================================
   KRISHNA KIDNEY CENTRE — BILLING ENGINE
   Compact UI Automation — FINAL VERSION
============================================================ */

/* ============================================================
   GLOBAL DATA
============================================================ */

// Default tariff (later replaced by tariff page, but works standalone)
const TARIFF = {
    rooms: {
        "General Ward": { rent: 1200, nursing: 400 },
        "Semi Private": { rent: 2000, nursing: 600 },
        "Private": { rent: 3500, nursing: 800 },
        "ICU": { rent: 6000, nursing: 1500 }
    },

    visits: {
        professional: 300,     // 1/day
        consultant: 600        // 2/day
    }
};

// Active Bill Dataset
let BILL = {
    uhid: "",
    ip: "",
    billNo: "",
    patient: {
        name: "",
        age: "",
        doa: "",
        dod: "",
        gender: "",
        consult: "Dr. B.K. Srinivasan",
        speciality: "Urology",
        dept: "Urology",
        admType: "Planned",
        payor: "Self Pay",
        bed: ""
    },
    roomStays: [],
    items: [],
    receipts: []
};


/* ============================================================
   UTILITY FUNCTIONS
============================================================ */

function generateUHID() {
    return "KCC" + Math.floor(100000 + Math.random() * 900000);
}

function generateIP() {
    return "IP" + Date.now().toString().slice(-6);
}

function generateBillNo() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let id = "";
    for (let i = 0; i < 12; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}

function daysBetween(f, t) {
    const d1 = new Date(f);
    const d2 = new Date(t);
    const diff = (d2 - d1) / (1000 * 3600 * 24) + 1;
    return diff > 0 ? diff : 0;
}

function formatINR(num) {
    return "₹" + Number(num).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}


/* ============================================================
   INITIALIZATION
============================================================ */
window.onload = () => {
    // Auto-generate IDs
    BILL.uhid = generateUHID();
    BILL.ip = generateIP();
    BILL.billNo = generateBillNo();

    document.getElementById("uhid").innerText = BILL.uhid;
    document.getElementById("ipNo").innerText = BILL.ip;
    document.getElementById("billNo").innerText = BILL.billNo;

    enableEditableFields();
    loadRoomTypes();
    attachEventHandlers();
};


/* ============================================================
   EDITABLE FIELDS ENGINE
============================================================ */

function enableEditableFields() {
    document.querySelectorAll(".editable").forEach(el => {
        el.addEventListener("click", () => makeEditable(el, "text"));
    });

    document.querySelectorAll(".editable-date").forEach(el => {
        el.addEventListener("click", () => makeEditable(el, "date"));
    });

    document.querySelectorAll(".editable-dropdown").forEach(el => {
        el.addEventListener("click", () => makeDropdown(el));
    });
}

function makeEditable(el, type) {
    const old = el.innerText === "-" ? "" : el.innerText;
    el.innerHTML = `<input class="edit-input" type="${type}" value="${old}">`;
    const inp = el.querySelector("input");
    inp.focus();

    inp.addEventListener("blur", () => {
        el.innerText = inp.value || "-";
        updatePatientField(el.id, inp.value);
    });
}

function makeDropdown(el) {
    let list = [];

    if (el.dataset.type === "consultant")
        list = ["Dr. B.K. Srinivasan", "Dr. Ramesh", "Dr. Karthik", "Dr. Sheela"];

    if (el.dataset.type === "dept")
        list = ["Urology", "ENT", "General Surgery", "Nephrology", "Cardiology"];

    if (el.dataset.type === "admissionType")
        list = ["Planned", "Emergency", "Day Care"];

    if (el.dataset.type === "payor")
        list = ["Self Pay", "Insurance", "Corporate"];

    let html = `<select class="edit-input">`;
    list.forEach(v => html += `<option>${v}</option>`);
    html += `</select>`;

    el.innerHTML = html;
    const sel = el.querySelector("select");
    sel.focus();

    sel.addEventListener("change", () => {
        el.innerText = sel.value;
        updatePatientField(el.id, sel.value);
    });
}

function updatePatientField(id, val) {
    switch(id) {
        case "fName": BILL.patient.name = val; document.getElementById("pName").innerText = val; break;
        case "fAge": BILL.patient.age = val; document.getElementById("pAge").innerText = val; break;
        case "fDOA": BILL.patient.doa = val; break;
        case "fDOD": BILL.patient.dod = val; break;
        case "fConsult": BILL.patient.consult = val; break;
        case "fSpec": BILL.patient.speciality = val; break;
        case "fDept": BILL.patient.dept = val; break;
        case "fAdmType": BILL.patient.admType = val; break;
        case "fPayor": BILL.patient.payor = val; document.getElementById("pPayor").innerText = val; break;
    }
}


/* ============================================================
   ROOM STAY ENGINE
============================================================ */

function loadRoomTypes() {
    const sel = document.getElementById("rm_type");
    Object.keys(TARIFF.rooms).forEach(r => {
        const opt = document.createElement("option");
        opt.value = r;
        opt.textContent = r;
        sel.appendChild(opt);
    });
}

function attachEventHandlers() {
    document.getElementById("addRoomStayBtn").onclick = () => {
        document.getElementById("roomModal").style.display = "flex";
    };

    document.getElementById("closeRoomStay").onclick = () => {
        document.getElementById("roomModal").style.display = "none";
    };

    document.getElementById("saveRoomStay").onclick = saveRoomStay;

    document.getElementById("addManualItemBtn").onclick = () => {
        document.getElementById("itemModal").style.display = "flex";
    };

    document.getElementById("closeManualItem").onclick = () => {
        document.getElementById("itemModal").style.display = "none";
    };

    document.getElementById("saveManualItem").onclick = saveManualItem;
}

function saveRoomStay() {
    const type = document.getElementById("rm_type").value;
    const from = document.getElementById("rm_from").value;
    const to = document.getElementById("rm_to").value;

    if (!from || !to) return alert("Select full date range");

    BILL.roomStays.push({ type, from, to });
    document.getElementById("roomModal").style.display = "none";

    renderRoomStays();
    generateDailyCharges();
}


/* ============================================================
   RENDER ROOM STAY LIST
============================================================ */

function renderRoomStays() {
    const box = document.getElementById("roomStayList");
    box.innerHTML = "";

    BILL.roomStays.forEach((rs, i) => {
        const days = daysBetween(rs.from, rs.to);
        const div = document.createElement("div");
        div.className = "room-stay-card";

        div.innerHTML = `
            <h4>${rs.type}</h4>
            <div class="meta">${rs.from} → ${rs.to} (${days} days)</div>
            <div class="room-stay-actions">
                <button class="room-edit-btn" onclick="editRoomStay(${i})">EDIT</button>
                <button class="room-del-btn" onclick="deleteRoomStay(${i})">DELETE</button>
            </div>
        `;

        box.appendChild(div);
    });
}

function editRoomStay(i) {
    const rs = BILL.roomStays[i];

    document.getElementById("rm_type").value = rs.type;
    document.getElementById("rm_from").value = rs.from;
    document.getElementById("rm_to").value = rs.to;

    BILL.roomStays.splice(i,1);
    document.getElementById("roomModal").style.display = "flex";
}

function deleteRoomStay(i) {
    BILL.roomStays.splice(i,1);
    renderRoomStays();
    generateDailyCharges();
}


/* ============================================================
   AUTOMATIC DAILY CHARGES ENGINE
============================================================ */

function generateDailyCharges() {

    BILL.items = BILL.items.filter(it => it.auto !== true);

    BILL.roomStays.forEach(rs => {
        const days = daysBetween(rs.from, rs.to);
        const room = TARIFF.rooms[rs.type];

        const daily = [
            { desc: `${rs.type} Room Rent`, rate: room.rent, qty: days },
            { desc: `${rs.type} Nursing`, rate: room.nursing, qty: days },
            { desc: `Professional Visit`, rate: TARIFF.visits.professional, qty: days },
            { desc: `Consultant Visit`, rate: TARIFF.visits.consultant, qty: days * 2 }
        ];

        daily.forEach(d => {
            BILL.items.push({
                desc: d.desc,
                rate: d.rate,
                qty: d.qty,
                total: d.rate * d.qty,
                auto: true
            });
        });
    });

    renderBillItems();
}


/* ============================================================
   MANUAL ITEM ADD
============================================================ */

function saveManualItem() {
    const d = document.getElementById("mi_desc").value;
    const r = Number(document.getElementById("mi_rate").value);
    const q = Number(document.getElementById("mi_qty").value);

    BILL.items.push({
        desc: d,
        rate: r,
        qty: q,
        total: r*q,
        auto: false
    });

    document.getElementById("itemModal").style.display = "none";
    renderBillItems();
}


/* ============================================================
   RENDER BILL ITEMS
============================================================ */

function renderBillItems() {
    const box = document.getElementById("billItems");
    box.innerHTML = "";

    BILL.items.forEach((it, i) => {

        const row = document.createElement("div");
        row.className = "bill-row";

        row.innerHTML = `
            <div>${it.desc}</div>
            <div class="r">${it.rate}</div>
            <div class="r">${it.qty}</div>
            <div class="r">${formatINR(it.total)}
                ${!it.auto ? `<span class="bill-delete" onclick="delItem(${i})">x</span>` : ""}
            </div>
        `;

        box.appendChild(row);
    });

    calcSummary();
}

function delItem(i) {
    BILL.items.splice(i,1);
    renderBillItems();
}


/* ============================================================
   SUMMARY CALCULATION
============================================================ */

function calcSummary() {
    let gross = BILL.items.reduce((s,it)=>s+it.total,0);
    let rec = BILL.receipts.reduce((s,r)=>s+r.amount,0);
    let bal = gross - rec;

    document.getElementById("sumGross").innerText = formatINR(gross);
    document.getElementById("sumRec").innerText = formatINR(rec);
    document.getElementById("sumBal").innerText = formatINR(bal);
}
