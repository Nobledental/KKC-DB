/* ============================================================================
    KCC BILLING OS — FULL APP ENGINE (FINAL VERSION)
    Works 100% offline — uses window.TARIFF (or window.TARIFF_DATA)
============================================================================ */

/* ------------------------------------------------------------
    STORAGE HELPERS
------------------------------------------------------------ */
function load(key) {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
}
function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

/* ------------------------------------------------------------
    GLOBAL STATE & TARIFF INITIALIZATION
------------------------------------------------------------ */
let billItems = [];
let receipts = [];
let history = load("history") || [];

// FIX: Safely retrieve the TARIFF variable, prioritizing localStorage or falling back to the global window variable
let tariff = (function() {
    const LOCAL_KEY = "kcc-tariff-v2";
    let stored = load(LOCAL_KEY);
    if (stored) return stored;

    // Fallback logic to find the global variable defined by tariffs.js
    if (typeof window.TARIFF === 'object' && window.TARIFF !== null) {
        return window.TARIFF;
    }
    if (typeof window.TARIFF_DATA === 'object' && window.TARIFF_DATA !== null) {
        return window.TARIFF_DATA;
    }
    
    // CRITICAL: If still missing, alert and use empty object to prevent hard crash
    alert("CRITICAL ERROR: TARIFF data is missing. System will operate on empty rates.");
    return {};
})();

/* CATEGORY MAP */
const CATEGORY_MAP = {
    "Consultation": "opd_charges",
    "Pharmacy": "pharmacy",
    "Investigation": "investigations",
    "Package": "surgical_packages",
    "Miscellaneous": "miscellaneous"
};

/* ------------------------------------------------------------
    BILL ITEM CREATOR
------------------------------------------------------------ */
function createBillItem(cat, date, desc, rate, qty) {
    const r = new Decimal(rate || 0);
    const q = new Decimal(qty || 1);
    const gross = r.mul(q);

    return {
        cat,
        date: date || "",
        desc,
        rate: r.toFixed(2),
        qty: q.toNumber(),
        gross: gross.toFixed(2),
        discount: "0.00",
        net: gross.toFixed(2)
    };
}

/* ------------------------------------------------------------
    DROPDOWN LOADING
------------------------------------------------------------ */
function loadDropdowns() {
    if (!tariff || !tariff.rooms || !tariff.doctors) return;

    /* ROOMS */
    const roomSel = document.getElementById("ui_roomCat");
    roomSel.innerHTML = "";
    Object.keys(tariff.rooms).forEach(key => {
        const r = tariff.rooms[key];
        let o = document.createElement("option");
        o.value = r.id;
        o.text = key;
        roomSel.add(o);
    });

    /* DOCTORS */
    const docSel = document.getElementById("ui_doc");
    docSel.innerHTML = "";
    tariff.doctors.forEach(d => {
        let o = document.createElement("option");
        o.value = d; 
        o.text = d;
        docSel.add(o);
    });

    /* CATEGORY → description changes */
    const catSel = document.getElementById("ui_cat");
    catSel.onchange = updateDescriptionDropdown;

    updateDescriptionDropdown();
}

function updateDescriptionDropdown() {
    const cat = document.getElementById("ui_cat").value;
    const descSel = document.getElementById("ui_desc");
    descSel.innerHTML = "";

    let items = [];

    if (cat === "Package") {
        Object.keys(tariff.surgical_packages).forEach(speciality => {
            if (speciality === "notes") return;
            Object.keys(tariff.surgical_packages[speciality]).forEach(pkg => {
                items.push({ key: pkg, name: `${pkg} (${speciality})` });
            });
        });
    }
    else if (CATEGORY_MAP[cat] && tariff[CATEGORY_MAP[cat]]) {
        let src = tariff[CATEGORY_MAP[cat]];
        Object.keys(src).forEach(k => {
            if (k === "note") return;
            items.push({
                key: k,
                name: src[k].name || k,
                rate: src[k].rate
            });
        });
    }

    if (items.length === 0) {
        descSel.disabled = true;
        descSel.innerHTML = `<option>-- No Items --</option>`;
        document.getElementById("ui_rate").disabled = false;
        document.getElementById("ui_rate").value = 0;
        return;
    }

    descSel.disabled = false;
    items.forEach(it => {
        let o = document.createElement("option");
        o.value = it.key;
        o.text = it.name;
        if (it.rate) o.setAttribute("data-rate", it.rate);
        descSel.add(o);
    });

    descSel.onchange = () => {
        const opt = descSel.options[descSel.selectedIndex];
        const rateBox = document.getElementById("ui_rate");
        if (opt.hasAttribute("data-rate")) {
            rateBox.value = opt.getAttribute("data-rate");
            rateBox.disabled = true;
        } else {
            rateBox.value = "";
            rateBox.disabled = false;
        }
    };
    
    // Trigger initial rate population
    if (items.length > 0) {
        descSel.onchange();
    }
}

/* ------------------------------------------------------------
    TARIFF EDITOR RENDER
------------------------------------------------------------ */
function renderTariff() {
    if (!tariff || !tariff.rooms || !tariff.doctors) return;

    /* ROOMS */
    const roomBox = document.getElementById("tariff_rooms");
    roomBox.innerHTML = "";

    Object.keys(tariff.rooms).forEach(key => {
        const r = tariff.rooms[key];
        roomBox.innerHTML += `
        <div class="tariff-block">
            <input class="t-name" value="${key}" 
                onchange="updateTariffKey('rooms','${key}',this.value)">
            <div><label>Room Tariff</label><input type="number" value="${r.tariff_per_day}" 
                onchange="updateTariffValue('rooms','${key}','tariff_per_day',this.value)"></div>
            <div><label>Nursing</label><input type="number" value="${r.nursing_per_day}" 
                onchange="updateTariffValue('rooms','${key}','nursing_per_day',this.value)"></div>
            <div><label>Consultant Visit</label><input type="number" value="${r.consultant_per_visit}"
                onchange="updateTariffValue('rooms','${key}','consultant_per_visit',this.value)"></div>
            <div><label>Super Specialist Visit</label><input type="number" value="${r.super_specialist_per_visit}"
                onchange="updateTariffValue('rooms','${key}','super_specialist_per_visit',this.value)"></div>
            <button style="width:100%;margin-top:6px;background:#d9534f;color:white;border:none;padding:6px;border-radius:4px;"
                onclick="deleteTariffItem('rooms','${key}')">Delete</button>
        </div>`;
    });

    /* DOCTORS */
    const docBox = document.getElementById("tariff_doctors");
    docBox.innerHTML = "";

    tariff.doctors.forEach((d, i) => {
        docBox.innerHTML += `
        <div class="tariff-block" style="width:100%;">
            <input class="t-name" value="${d}" onchange="updateDoctor(${i},this.value)">
            <button style="background:#d9534f;color:white;width:100%;padding:6px;border:none;border-radius:4px;margin-top:6px;"
                onclick="deleteDoctor(${i})">Delete</button>
        </div>`;
    });

    /* PACKAGES */
    const pkgBox = document.getElementById("tariff_packages");
    pkgBox.innerHTML = "";

    Object.keys(tariff.surgical_packages).forEach(speciality => {
        if (speciality === "notes") return;

        const group = tariff.surgical_packages[speciality];

        Object.keys(group).forEach(pkg => {
            const rec = group[pkg];
            let breakups = "";
            if (rec.breakup_template) {
                Object.keys(rec.breakup_template).forEach(b => {
                    breakups += `<div><small>${b}: ${rec.breakup_template[b]*100}%</small></div>`;
                });
            }

            pkgBox.innerHTML += `
            <div class="tariff-block" style="width:100%;">
                <strong style="color:#0B63C5">${pkg} (${speciality})</strong>
                <div style="margin-top:6px;border-top:1px dashed #ccc;padding-top:6px;">
                    ${Object.keys(rec).filter(x => x !== "breakup_template").map(x => 
                        `<div style="display:flex;justify-content:space-between;">
                            <span>${x}</span><strong>₹${rec[x]}</strong>
                        </div>`).join("")}
                </div>
                <div style="margin-top:6px;">${breakups}</div>
            </div>`;
        });
    });
}

/* UPDATE TARIFF FIELDS */
function updateTariffKey(sec, oldKey, newKey) {
    if (!newKey || newKey === oldKey) return;
    tariff[sec][newKey] = tariff[sec][oldKey];
    delete tariff[sec][oldKey];
    renderTariff();
}
function updateTariffValue(sec, key, fld, val) {
    tariff[sec][key][fld] = Number(val);
}
function deleteTariffItem(sec, key) {
    if (confirm("Delete this item?")) {
        delete tariff[sec][key];
        renderTariff();
    }
}
function addRoom() {
    const n = prompt("Enter Room Name:");
    if (!n) return;
    tariff.rooms[n] = {
        id: n.toUpperCase().replace(/\s+/g,'_'),
        tariff_per_day: 0,
        nursing_per_day: 0,
        consultant_per_visit: 0,
        super_specialist_per_visit: 0
    };
    renderTariff();
}

/* DOCTORS */
function updateDoctor(i, val) {
    tariff.doctors[i] = val;
}
function deleteDoctor(i) {
    if (confirm("Delete doctor?")) {
        tariff.doctors.splice(i,1);
        renderTariff();
}
}
function addDoctor() {
    const n = prompt("Doctor Name:");
    if (!n) return;
    tariff.doctors.push(n);
    renderTariff();
}

function saveTariff() {
    // FIX: Using the correct persistent key for V2 data
    save("kcc-tariff-v2", tariff);
    alert("Tariff saved.");
    loadDropdowns();
}

/* ------------------------------------------------------------
    ROOM DAY ENGINE
------------------------------------------------------------ */
function addRoomDays() {
    const doa = document.getElementById("ui_doa").value;
    const dod = document.getElementById("ui_dod").value;
    const roomId = document.getElementById("ui_roomCat").value;

    if (!doa || !dod || !roomId) return;

    /* Remove previous auto-generated items */
    billItems = billItems.filter(x =>
        x.cat !== "Room Rent" &&
        x.cat !== "Nursing" &&
        x.cat !== "Doctor Visit" &&
        x.desc !== tariff.miscellaneous.MRD_CHARGE.name
    );

    const roomKey = Object.keys(tariff.rooms)
        .find(k => tariff.rooms[k].id === roomId);

    const r = tariff.rooms[roomKey];

    const start = new Date(doa);
    const end = new Date(dod);

    const hrs = (end - start) / 3600000; // Calculate total hours

    const full = Math.floor(hrs / 24); // Full 24-hour periods
    const rem = hrs % 24; // Remaining hours

    const rules = tariff.billing_rules.room_rent_rule;

    // 1. Bill Full Days
    for (let i = 0; i < full; i++) {
        const d = new Date(start.getTime() + i*86400000)
            .toISOString().split("T")[0];

        billItems.push(createBillItem("Room Rent", d, `Room: ${roomKey}`, r.tariff_per_day, 1));
        billItems.push(createBillItem("Nursing", d, "Nursing Charge", r.nursing_per_day, 1));

        const docFee = new Decimal(r.consultant_per_visit)
                                 .plus(new Decimal(r.super_specialist_per_visit))
                                 .toNumber();

        billItems.push(createBillItem("Doctor Visit", d, "Daily Doctor Visit", docFee, 1));
    }

    // 2. Bill Remaining Hours (Final Day Logic)
    if (rem > 0) {
        let roomRate = new Decimal(r.tariff_per_day);
        let nurRate = new Decimal(r.nursing_per_day);

        // Apply Half-Day Rule (<= 6 hours)
        if (rem <= rules.full_day_hours) {
            roomRate = roomRate.mul(rules.half_day_multiplier);
            nurRate = nurRate.mul(rules.half_day_multiplier);
        }

        const finalDate = end.toISOString().split("T")[0];

        billItems.push(createBillItem("Room Rent", finalDate, `Room: ${roomKey} (Final Day)`, roomRate.toNumber(), 1));
        billItems.push(createBillItem("Nursing", finalDate, "Nursing Charge (Final Day)", nurRate.toNumber(), 1));

        const docFee = new Decimal(r.consultant_per_visit)
                                 .plus(new Decimal(r.super_specialist_per_visit))
                                 .toNumber();

        billItems.push(createBillItem("Doctor Visit", finalDate, "Doctor Visit (Final Day)", docFee, 1));
    }

    /* 3. Add MRD Fee (One time per admission) */
    billItems.push(createBillItem(
        "Miscellaneous",
        doa,
        tariff.miscellaneous.MRD_CHARGE.name,
        tariff.miscellaneous.MRD_CHARGE.rate,
        1
    ));

    calculateTotals();
    renderUI();
}

/* ------------------------------------------------------------
    ADD ITEM (MANUAL / TARIFF)
------------------------------------------------------------ */
function addItem() {
    const cat = document.getElementById("ui_cat").value;
    const descSel = document.getElementById("ui_desc");
    const descText = descSel.options[descSel.selectedIndex].text;
    const date = document.getElementById("ui_date").value;
    const qty = Number(document.getElementById("ui_qty").value || 1);
    let rate = Number(document.getElementById("ui_rate").value || 0);

    /* Packages — rate based on room */
    if (cat === "Package") {
        const roomId = document.getElementById("ui_roomCat").value;
        let pkgFound = null;

        Object.keys(tariff.surgical_packages).forEach(speciality => {
            if (speciality === "notes") return;
            const group = tariff.surgical_packages[speciality];
            if (group[descSel.value] && group[descSel.value][roomId]) {
                pkgFound = group[descSel.value][roomId];
            }
        });

        if (pkgFound) rate = pkgFound;
    }
    else {
        const opt = descSel.options[descSel.selectedIndex];
        if (opt.hasAttribute("data-rate")) {
            rate = Number(opt.getAttribute("data-rate"));
        }
    }

    if (rate <= 0) {
        alert("Invalid rate.");
        return;
    }
    billItems.push(createBillItem(cat, date, descText, rate, qty));

    calculateTotals();
    renderUI();
}

/* ------------------------------------------------------------
    RECEIPTS
------------------------------------------------------------ */
function addReceipt() {
    const amt = new Decimal(document.getElementById("ui_ramt").value || 0);
    if (amt.lte(0)) return;

    const paid = receipts.reduce((a,b) => a.plus(new Decimal(b.amt)), new Decimal(0));
    const net = billItems.reduce((a,b) => a.plus(new Decimal(b.net)), new Decimal(0));

    if (paid.plus(amt).gt(net)) {
        alert("Receipt exceeds bill amount.");
        return;
    }

    receipts.push({
        no: "R" + (receipts.length + 1),
        date: document.getElementById("ui_rdate").value,
        amt: amt.toFixed(2),
        mode: document.getElementById("ui_rmode").value
    });

    calculateTotals();
    renderUI();
}

/* ------------------------------------------------------------
    SUMMARY ENGINE
------------------------------------------------------------ */
function calculateTotals() {
    let gross = new Decimal(0);
    let disc = new Decimal(0);
    let net = new Decimal(0);
    let paid = new Decimal(0);

    billItems.forEach(it => {
        const g = new Decimal(it.gross);
        const d = new Decimal(it.discount || 0);
        gross = gross.plus(g);
        disc = disc.plus(d);
        net = net.plus(g.minus(d));
    });

    receipts.forEach(r => {
        paid = paid.plus(new Decimal(r.amt));
    });

    document.getElementById("ui_s_gross").innerText = "₹" + gross.toFixed(2);
    document.getElementById("ui_totalDiscount").innerText = "₹" + disc.toFixed(2);
    document.getElementById("ui_totalDiscount_summary").innerText = "₹" + disc.toFixed(2);
    document.getElementById("ui_s_net_bill").innerText = "₹" + net.toFixed(2);
    document.getElementById("ui_s_rec").innerText = "₹" + paid.toFixed(2);
    document.getElementById("ui_s_final").innerText = "₹" + net.minus(paid).toFixed(2);
}

/* ITEM DISCOUNT */
function updateItemDiscount(i, val) {
    const d = new Decimal(val || 0);
    const g = new Decimal(billItems[i].gross);

    if (d.gt(g)) {
        alert("Discount > gross.");
        billItems[i].discount = g.toFixed(2);
        billItems[i].net = "0.00";
    } else {
        billItems[i].discount = d.toFixed(2);
        billItems[i].net = g.minus(d).toFixed(2);
    }

    calculateTotals();
}

/* PROPORTIONAL BILL DISCOUNT */
function applyBillDiscount() {
    const dTotal = new Decimal(document.getElementById("ui_billDiscount").value || 0);
    if (dTotal.lt(0)) return;

    const gross = billItems.reduce((a,b) => a.plus(new Decimal(b.gross)), new Decimal(0));
    if (dTotal.gt(gross)) return;

    billItems.forEach(it => {
        const g = new Decimal(it.gross);
        const share = g.div(gross).mul(dTotal);
        it.discount = share.toFixed(2);
        it.net = g.minus(share).toFixed(2);
    });

    calculateTotals();
    renderUI();
}

/* ------------------------------------------------------------
    RENDER BILL UI TABLE
------------------------------------------------------------ */
function renderUI() {
    const body = document.getElementById("ui_billBody");
    body.innerHTML = "";

    billItems.forEach((x,i) => {
        body.innerHTML += `
        <tr>
            <td>${x.cat}</td>
            <td>${x.date}</td>
            <td>${x.desc}</td>
            <td>${x.rate}</td>
            <td>${x.qty}</td>
            <td>${x.gross}</td>
            <td><input type="number" class="discount-input" value="${x.discount}"
                onchange="updateItemDiscount(${i},this.value)"></td>
            <td><strong>${x.net}</strong></td>
            <td><button onclick="deleteItem(${i})">X</button></td>
        </tr>`;
    });

    calculateTotals();
}
function deleteItem(i) {
    billItems.splice(i,1);
    renderUI();
}

/* ------------------------------------------------------------
    HISTORY MANAGEMENT
------------------------------------------------------------ */
function saveBill() {
    const patient = document.getElementById("ui_name").value;
    if (!patient) {
        alert("Patient name required.");
        return;
    }

    const totalNet = billItems.reduce((a,b) => a.plus(new Decimal(b.net)), new Decimal(0));
    const paid = receipts.reduce((a,b) => a.plus(new Decimal(b.amt)), new Decimal(0));

    if (paid.gt(totalNet)) {
        alert("Receipts exceed bill.");
        return;
    }

    const bill = {
        billNo: "BILL-" + Date.now().toString().slice(-6),
        date: new Date().toISOString(),
        patient: {
            name: patient,
            age: document.getElementById("ui_age").value,
            gender: document.getElementById("ui_gender").value,
            uhid: document.getElementById("ui_uhid").value,
            ip: document.getElementById("ui_ip").value,
            room: document.getElementById("ui_roomCat")
                .options[document.getElementById("ui_roomCat").selectedIndex].text,
            doc: document.getElementById("ui_doc").value,
            spec: document.getElementById("ui_spec").value,
            doa: document.getElementById("ui_doa").value,
            dod: document.getElementById("ui_dod").value,
            ins: document.getElementById("ui_ins").value === "Yes" ?
                 document.getElementById("ui_insName").value : "No"
        },
        items: JSON.parse(JSON.stringify(billItems)),
        receipts: JSON.parse(JSON.stringify(receipts)),
        summary: {
            net: totalNet.minus(paid).toFixed(2),
            gross: totalNet.toFixed(2),
            paid: paid.toFixed(2)
        }
    };

    history.push(bill);
    save("history", history);

    alert("Bill saved.");
    loadHistoryTable();
}

function loadBill(no) {
    const b = history.find(x => x.billNo === no);
    if (!b) return;

    billItems = b.items;
    receipts = b.receipts;

    document.getElementById("ui_name").value = b.patient.name;
    document.getElementById("ui_age").value = b.patient.age;
    document.getElementById("ui_gender").value = b.patient.gender;
    document.getElementById("ui_uhid").value = b.patient.uhid;
    document.getElementById("ui_ip").value = b.patient.ip;
    document.getElementById("ui_spec").value = b.patient.spec;
    document.getElementById("ui_doc").value = b.patient.doc;
    document.getElementById("ui_ins").value = (b.patient.ins !== "No" ? "Yes" : "No");
    document.getElementById("ui_insName").value = (b.patient.ins !== "No" ? b.patient.ins : "");
    document.getElementById("ui_doa").value = b.patient.doa;
    document.getElementById("ui_dod").value = b.patient.dod;

    renderUI();
    document.querySelector('[data-screen="billingScreen"]').click();
}

function loadHistoryTable() {
    const box = document.getElementById("historyTable");
    box.innerHTML = "";
    history.forEach(h => {
        box.innerHTML += `
        <tr>
            <td>${h.billNo}</td>
            <td>${h.patient.name}</td>
            <td>${h.patient.uhid}</td>
            <td>${h.date.split("T")[0]}</td>
            <td><button class="btn secondary" onclick="loadBill('${h.billNo}')">Open</button></td>
        </tr>`;
    });
}

/* ------------------------------------------------------------
    PRINT ENGINE — A4 BILL + RECEIPT
------------------------------------------------------------ */

const catTitle = {
    "Room Rent": "ROOM & NURSING",
    "Nursing": "ROOM & NURSING",
    "Doctor Visit": "ROOM & NURSING",
    "Consultation": "CONSULTATION",
    "Pharmacy": "PHARMACY",
    "Investigation": "INVESTIGATION",
    "Surgical": "SURGICAL CHARGES",
    "OT": "SURGICAL CHARGES",
    "Package": "SURGICAL CHARGES",
    "Miscellaneous": "OTHER CHARGES",
    "Returns": "RETURNS"
};

function getCatTitle(c) {
    return catTitle[c] || "OTHER CHARGES";
}

function preparePrint() {

    /* Header */
    document.getElementById("b_invoice").innerText = "BILL-" + Date.now().toString().slice(-6);
    document.getElementById("b_date_issued").innerText = new Date().toISOString().split("T")[0];

    document.getElementById("b_name").innerText = document.getElementById("ui_name").value;
    document.getElementById("b_age_gender").innerText =
        document.getElementById("ui_age").value + "Y / " +
        document.getElementById("ui_gender").value;

    document.getElementById("b_room").innerText =
        document.getElementById("ui_roomCat")
        .options[document.getElementById("ui_roomCat").selectedIndex].text;

    document.getElementById("b_uhid_ip").innerText =
        document.getElementById("ui_uhid").value + " / " +
        document.getElementById("ui_ip").value;

    document.getElementById("b_doa").innerText = document.getElementById("ui_doa").value;
    document.getElementById("b_dod").innerText = document.getElementById("ui_dod").value;

    document.getElementById("b_doc").innerText = document.getElementById("ui_doc").value;
    document.getElementById("b_spec").innerText = document.getElementById("ui_spec").value;

    document.getElementById("b_ins").innerText =
        document.getElementById("ui_ins").value === "Yes"
        ? document.getElementById("ui_insName").value
        : "No";

    /* ITEM GROUPING */
    const out = document.getElementById("b_items");
    out.innerHTML = "";

    let totalGross = new Decimal(0);
    let totalDisc = new Decimal(0);

    /* Group by date */
    const byDate = {};
    billItems.forEach(it => {
        if (!byDate[it.date]) byDate[it.date] = [];
        byDate[it.date].push(it);
    });

    Object.keys(byDate).sort().forEach(date => {

        out.innerHTML += `
        <div class="row" style="background:#f2f2f2;font-weight:700;">
            <div>Date: ${date}</div>
        </div>`;

        /* Group by category */
        const byCat = {};
        byDate[date].forEach(it => {
            const t = getCatTitle(it.cat);
            if (!byCat[t]) byCat[t] = [];
            byCat[t].push(it);
        });

        Object.keys(byCat).forEach(catName => {

            out.innerHTML += `
            <div class="row" style="background:#e8f1ff;font-weight:700;">
                <div>${catName}</div>
            </div>`;

            byCat[catName].forEach(it => {
                const g = new Decimal(it.gross);
                const d = new Decimal(it.discount || 0);

                totalGross = totalGross.plus(g);
                totalDisc = totalDisc.plus(d);

                out.innerHTML += `
                <div class="row">
                    <div>${it.desc}</div>
                    <div>${it.rate}</div>
                    <div>${it.qty}</div>
                    <div>${g.toFixed(2)}</div>
                    <div>${d.toFixed(2)}</div>
                    <div><strong>${new Decimal(it.net).toFixed(2)}</strong></div>
                </div>`;
            });
        });

    });

    const finalNet = totalGross.minus(totalDisc);

    document.getElementById("s_gross").innerText = "₹" + totalGross.toFixed(2);
    document.getElementById("s_discount").innerText = "₹" + totalDisc.toFixed(2);
    document.getElementById("s_final").innerText = "₹" + finalNet.toFixed(2);

    /* RECEIPTS */
    const rOut = document.getElementById("receiptLines");
    rOut.innerHTML = "";

    let paid = new Decimal(0);
    receipts.forEach(r => {
        paid = paid.plus(new Decimal(r.amt));
        rOut.innerHTML += `
        <div class="sum-line">
            <span>${r.no} (${r.date}) - ${r.mode}</span>
            <strong>₹${r.amt}</strong>
        </div>`;
    });

    document.getElementById("rc_total").innerText = "₹" + paid.toFixed(2);
    document.getElementById("rc_balance").innerText =
        "₹" + finalNet.minus(paid).toFixed(2);

    /* PRINT */
    window.print();
}

/* ------------------------------------------------------------
    UI NAVIGATION
------------------------------------------------------------ */
document.querySelectorAll(".sidebar-nav button").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".sidebar-nav button")
            .forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const scr = btn.getAttribute("data-screen");
        document.querySelectorAll(".screen")
            .forEach(s => s.classList.remove("active"));
        document.getElementById(scr).classList.add("active");
    };
});

/* ------------------------------------------------------------
    INIT
------------------------------------------------------------ */
(function init() {
    loadDropdowns();
    renderTariff();
    loadHistoryTable();
    calculateTotals();
    renderUI();
})();
