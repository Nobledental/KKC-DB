/* ============================================================================
   KCC BILLING OS — PREMIUM MEDICAL BILLING ENGINE
   Light Theme — Pure JS — 100% Offline
============================================================================ */

/* ----------------------------------------------------------------------------
   GLOBAL BILL OBJECT
---------------------------------------------------------------------------- */
let bill = {
    uhid: "",
    billNo: "",
    patient: {
        name: "",
        age: "",
        gender: "",
        address: "",
        doctor: "",
        department: "",
        admission: "",
        discharge: "",
        los: 0
    },
    rooms: [],
    consultants: [],
    investigations: [],
    pharmacy: [],
    receipts: [],
    totals: {
        room: 0,
        consultant: 0,
        investigations: 0,
        pharmacy: 0,
        gross: 0,
        paid: 0,
        balance: 0
    }
};

/* ============================================================================
   UTILS: ID GENERATOR
============================================================================ */
function generateUHID() {
    return "KCC" + Math.floor(100000 + Math.random() * 900000);
}

function generateBillNo() {
    let n = Date.now().toString().slice(-6);
    let r = Math.floor(100000 + Math.random() * 900000).toString();
    return n + r;
}

/* ============================================================================
   UTILS: INR FORMAT
============================================================================ */
function inr(n) {
    return Number(n || 0).toLocaleString("en-IN");
}

/* ============================================================================
   UTILS: DATE & LOS CALCULATION
============================================================================ */
function calculateLOS(adm, dis) {
    if (!adm || !dis) return 0;
    let a = new Date(adm);
    let d = new Date(dis);
    let diff = (d - a) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? diff + 1 : 0;
}

/* ============================================================================
   INITIALIZE UI
============================================================================ */
window.onload = () => {
    loadDoctors();
    loadTariffs();
    newBill();
};

/* ============================================================================
   NEW BILL SETUP
============================================================================ */
function newBill() {
    bill = {
        uhid: generateUHID(),
        billNo: generateBillNo(),
        patient: {
            name: "",
            age: "",
            gender: "",
            address: "",
            doctor: "",
            department: "",
            admission: "",
            discharge: "",
            los: 0
        },
        rooms: [],
        consultants: [],
        investigations: [],
        pharmacy: [],
        receipts: [],
        totals: {
            room: 0,
            consultant: 0,
            investigations: 0,
            pharmacy: 0,
            gross: 0,
            paid: 0,
            balance: 0
        }
    };

    document.getElementById("uhid").value = bill.uhid;
    document.getElementById("billNo").value = bill.billNo;
}

/* ============================================================================
   LOAD TARIFF DATA
============================================================================ */
let tariffData = {};
let doctorData = [];

function loadTariffs() {
    fetch("data/tariffs.json")
        .then(r => r.json())
        .then(d => tariffData = d);
}

function loadDoctors() {
    fetch("data/doctors.json")
        .then(r => r.json())
        .then(d => {
            doctorData = d;
            populateDoctorDropdown();
        });
}

function populateDoctorDropdown() {
    const sel = document.getElementById("consultantSelect");
    sel.innerHTML = `<option value="">Select Consultant</option>`;
    doctorData.forEach(doc => {
        sel.innerHTML += `<option value="${doc.name}">${doc.name}</option>`;
    });
}

/* ============================================================================
   UPDATE PATIENT INFO
============================================================================ */
function updatePatientField(id, field) {
    bill.patient[field] = document.getElementById(id).value;
    updateLOS();
}

function updateLOS() {
    bill.patient.los = calculateLOS(bill.patient.admission, bill.patient.discharge);
    document.getElementById("los").value = bill.patient.los || "";
}

/* ============================================================================
   ROOM SHIFT MODULE
============================================================================ */
function addRoomShift() {
    const container = document.getElementById("roomList");

    let html = `
    <div class="entry-block">
        <div class="entry-row">
            <div>
                <label>Room Type</label>
                <select class="roomType" onchange="updateRoom(this)">
                    <option value="">Select</option>
                    ${Object.keys(tariffData.rooms || {}).map(r => `<option>${r}</option>`).join("")}
                </select>
            </div>
            <div>
                <label>From</label>
                <input type="date" class="roomFrom" onchange="updateRoom(this)">
            </div>
            <div>
                <label>To</label>
                <input type="date" class="roomTo" onchange="updateRoom(this)">
            </div>
        </div>

        <div class="entry-row">
            <div>
                <label>Room Rent/day</label>
                <input class="roomRent" disabled>
            </div>
            <div>
                <label>Nursing/day</label>
                <input class="nursing" disabled>
            </div>
            <div>
                <label>RMO/DMO/day</label>
                <input class="rmo" disabled>
            </div>
        </div>

        <button class="remove-btn" onclick="this.parentElement.remove(); calculateTotals();">Remove</button>
    </div>`;

    container.insertAdjacentHTML("beforeend", html);
}

function updateRoom(el) {
    const block = el.closest(".entry-block");
    const type = block.querySelector(".roomType").value;

    if (tariffData.rooms[type]) {
        block.querySelector(".roomRent").value = tariffData.rooms[type].room;
        block.querySelector(".nursing").value = tariffData.rooms[type].nursing;
        block.querySelector(".rmo").value = tariffData.rooms[type].duty;
    }

    calculateTotals();
}

/* ============================================================================
   CONSULTANT MODULE
============================================================================ */
function addConsultantVisit() {
    const container = document.getElementById("consultantList");

    let html = `
    <div class="entry-block">
        <div class="entry-row">
            <div>
                <label>Doctor</label>
                <select class="consultantName">
                    ${doctorData.map(d => `<option>${d.name}</option>`).join("")}
                </select>
            </div>
            <div>
                <label>Date</label>
                <input type="date" class="consultantDate" onchange="calculateTotals()">
            </div>
            <div>
                <label>Visits</label>
                <input type="number" class="consultantCount" value="1" min="1" onchange="calculateTotals()">
            </div>
        </div>

        <button class="remove-btn" onclick="this.parentElement.remove(); calculateTotals();">Remove</button>
    </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
}

/* ============================================================================
   INVESTIGATIONS MODULE
============================================================================ */
function addInvestigation() {
    const container = document.getElementById("investigationList");

    const html = `
    <div class="table-row">
        <select class="invName" onchange="updateInvAmount(this)">
            <option value="">Select Investigation</option>
            ${(tariffData.investigations || []).map(i => `<option data-amt="${i.amount}">${i.name}</option>`).join("")}
        </select>
        <input class="invAmount" disabled>
        <button class="remove-btn" onclick="this.parentElement.remove(); calculateTotals();">X</button>
    </div>`;

    container.insertAdjacentHTML("beforeend", html);
}

function updateInvAmount(el) {
    const amt = el.selectedOptions[0].dataset.amt;
    el.closest(".table-row").querySelector(".invAmount").value = amt;
    calculateTotals();
}

/* ============================================================================
   PHARMACY MODULE
============================================================================ */
function addPharmacyItem() {
    const container = document.getElementById("pharmacyList");

    let html = `
    <div class="table-row">
        <select class="pharmName" onchange="updatePharmAmount(this)">
            <option value="">Select Item</option>
            ${(tariffData.pharmacy || []).map(i => `<option data-amt="${i.amount}">${i.name}</option>`).join("")}
        </select>
        <input class="pharmAmount" disabled>
        <button class="remove-btn" onclick="this.parentElement.remove(); calculateTotals();">X</button>
    </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
}

function updatePharmAmount(el) {
    const amt = el.selectedOptions[0].dataset.amt;
    el.closest(".table-row").querySelector(".pharmAmount").value = amt;
    calculateTotals();
}

/* ============================================================================
   RECEIPT MODULE
============================================================================ */
function addReceipt() {
    const container = document.getElementById("receiptList");

    let html = `
    <div class="entry-block">
        <div class="entry-row">
            <div>
                <label>Amount</label>
                <input type="number" class="recAmount" onchange="calculateTotals()">
            </div>
            <div>
                <label>Date</label>
                <input type="date" class="recDate">
            </div>
            <div>
                <label>Mode</label>
                <select class="recMode">
                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Transfer</option>
                    <option>Insurance</option>
                </select>
            </div>
        </div>

        <button class="remove-btn" onclick="this.parentElement.remove(); calculateTotals();">Remove</button>
    </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
}

/* ============================================================================
   TOTALS ENGINE
============================================================================ */
function calculateTotals() {

    /* ---- ROOM TOTAL ---- */
    let roomTotal = 0;
    document.querySelectorAll("#roomList .entry-block").forEach(block => {
        const type = block.querySelector(".roomType").value;
        const from = block.querySelector(".roomFrom").value;
        const to = block.querySelector(".roomTo").value;

        if (!type || !from || !to) return;

        const days = calculateLOS(from, to);
        const r = tariffData.rooms[type];

        roomTotal += days * (
            (r.room || 0) +
            (r.nursing || 0) +
            (r.duty || 0)
        );
    });

    /* ---- CONSULTANT TOTAL ---- */
    let consultantTotal = 0;
    document.querySelectorAll("#consultantList .entry-block").forEach(block => {
        const doc = block.querySelector(".consultantName").value;
        const cnt = Number(block.querySelector(".consultantCount").value);
        const fee = (doctorData.find(d => d.name === doc)?.visit || 0);
        consultantTotal += cnt * fee;
    });

    /* ---- INVESTIGATION TOTAL ---- */
    let invTotal = 0;
    document.querySelectorAll(".invAmount").forEach(i => {
        invTotal += Number(i.value || 0);
    });

    /* ---- PHARMACY TOTAL ---- */
    let pharmTotal = 0;
    document.querySelectorAll(".pharmAmount").forEach(i => {
        pharmTotal += Number(i.value || 0);
    });

    /* ---- RECEIPTS ---- */
    let paid = 0;
    document.querySelectorAll(".recAmount").forEach(i => {
        paid += Number(i.value || 0);
    });

    /* ---- GROSS ---- */
    let gross = roomTotal + consultantTotal + invTotal + pharmTotal;

    bill.totals.room = roomTotal;
    bill.totals.consultant = consultantTotal;
    bill.totals.investigations = invTotal;
    bill.totals.pharmacy = pharmTotal;
    bill.totals.gross = gross;
    bill.totals.paid = paid;
    bill.totals.balance = gross - paid;

    /* ---- UPDATE UI ---- */
    document.getElementById("totalRoom").innerText = "₹ " + inr(roomTotal);
    document.getElementById("totalConsult").innerText = "₹ " + inr(consultantTotal);
    document.getElementById("totalInv").innerText = "₹ " + inr(invTotal);
    document.getElementById("totalPharm").innerText = "₹ " + inr(pharmTotal);
    document.getElementById("grossTotal").innerText = "₹ " + inr(gross);
    document.getElementById("paidTotal").innerText = "₹ " + inr(paid);
    document.getElementById("balanceTotal").innerText = "₹ " + inr(gross - paid);
}

/* ============================================================================
   SAVE BILL TO LOCAL STORAGE
============================================================================ */
function saveBill() {
    const all = JSON.parse(localStorage.getItem("kcc_bills") || "[]");

    // Update patient fields
    bill.patient.name = document.getElementById("patientName").value;
    bill.patient.age = document.getElementById("patientAge").value;
    bill.patient.gender = document.getElementById("patientGender").value;
    bill.patient.address = document.getElementById("patientAddress").value;
    bill.patient.doctor = document.getElementById("patientDoctor").value;

    calculateTotals();

    all.push(bill);
    localStorage.setItem("kcc_bills", JSON.stringify(all));

    alert("Bill saved successfully!");
}

/* ============================================================================
   OPEN BILL IN PRINT LAYOUT
============================================================================ */
function openPrintPage() {
    localStorage.setItem("kcc_current_bill", JSON.stringify(bill));
    window.open("billing/bill-print.html", "_blank");
}
