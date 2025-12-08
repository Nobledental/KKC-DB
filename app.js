/* ============================================================================
    KCC BILLING OS — FULL APP ENGINE (FINAL VERSION)
    Integrates compact UI with Decimal.js and business logic.
============================================================================ */

/* ------------------------------------------------------------
    STORAGE & TARIFF INIT
------------------------------------------------------------ */
function load(key) {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
}
function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

// Ensure Decimal.js is loaded
if (typeof Decimal === 'undefined') {
    console.error("CRITICAL: Decimal.js not available.");
}

// Load tariff from localStorage first, then fallback to window.TARIFF
let tariff = (function() {
    const LOCAL_KEY = "kcc-tariff-v2";
    let stored = load(LOCAL_KEY);
    if (stored) return stored;

    if (typeof window.TARIFF === 'object' && window.TARIFF !== null) {
        return window.TARIFF;
    }
    return {};
})();

/* GLOBAL STATE */
let billItems = [];
let receipts = [];

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
    DROPDOWN LOGIC
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
        descSel.innerHTML = `<option value="MANUAL">-- Enter Rate Manually --</option>`;
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
    AUTOMATION: ROOM DAY ENGINE
------------------------------------------------------------ */
function addRoomDays() {
    const doa = document.getElementById("ui_doa").value;
    const dod = document.getElementById("ui_dod").value;
    const roomId = document.getElementById("ui_roomCat").value;

    if (!doa || !dod || !roomId) return alert("Please select Admission Date, Discharge Date, and Room Category.");

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
    const hrs = (end - start) / 3600000;
    const full = Math.floor(hrs / 24);
    const rem = hrs % 24;
    const rules = tariff.billing_rules.room_rent_rule;

    // 1. Bill Full Days
    for (let i = 0; i < full; i++) {
        const d = new Date(start.getTime() + i*86400000).toISOString().split("T")[0];
        billItems.push(createBillItem("Room Rent", d, `Room: ${roomKey}`, r.tariff_per_day, 1));
        billItems.push(createBillItem("Nursing", d, "Nursing Charge", r.nursing_per_day, 1));
        const docFee = new Decimal(r.consultant_per_visit).plus(new Decimal(r.super_specialist_per_visit)).toNumber();
        billItems.push(createBillItem("Doctor Visit", d, "Daily Doctor Visit", docFee, 1));
    }

    // 2. Bill Remaining Hours (Final Day Logic)
    if (rem > 0) {
        let roomRate = new Decimal(r.tariff_per_day);
        let nurRate = new Decimal(r.nursing_per_day);

        if (rem <= rules.full_day_hours) {
            roomRate = roomRate.mul(rules.half_day_multiplier);
            nurRate = nurRate.mul(rules.half_day_multiplier);
        }

        const finalDate = end.toISOString().split("T")[0];
        billItems.push(createBillItem("Room Rent", finalDate, `Room: ${roomKey} (Final Day)`, roomRate.toNumber(), 1));
        billItems.push(createBillItem("Nursing", finalDate, "Nursing Charge (Final Day)", nurRate.toNumber(), 1));
        const docFee = new Decimal(r.consultant_per_visit).plus(new Decimal(r.super_specialist_per_visit)).toNumber();
        billItems.push(createBillItem("Doctor Visit", finalDate, "Doctor Visit (Final Day)", docFee, 1));
    }

    /* 3. Add MRD Fee (One time per admission) */
    billItems.push(createBillItem(
        "Miscellaneous", doa, tariff.miscellaneous.MRD_CHARGE.name, tariff.miscellaneous.MRD_CHARGE.rate, 1
    ));

    calculateTotals();
    renderUI();
}

/* ------------------------------------------------------------
    BILLING CORE ACTIONS
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
        date: new Date().toISOString().split("T")[0],
        amt: amt.toFixed(2),
        mode: document.getElementById("ui_rmode").value
    });
    document.getElementById("ui_ramt").value = '';

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

    // Apply overall discount proportionally across all items (since the discount is a percentage input)
    const billDiscPct = new Decimal(document.getElementById("ui_billDiscount").value || 0).div(100);
    if (billDiscPct.gt(0)) {
        const totalDiscountValue = gross.mul(billDiscPct);
        disc = disc.plus(totalDiscountValue);
        net = gross.minus(disc);
    }


    document.getElementById("b_run_date").innerText = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB');

    document.getElementById("ui_s_gross").innerText = "₹" + gross.toFixed(2);
    document.getElementById("ui_totalDiscount").innerText = "- ₹" + disc.toFixed(2);
    document.getElementById("ui_s_net_bill").innerText = "₹" + net.toFixed(2);
    document.getElementById("ui_s_rec").innerText = "₹" + paid.toFixed(2);
    document.getElementById("ui_s_final").innerText = "₹" + net.minus(paid).toFixed(2);

    return { gross, disc, net, paid };
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
    // No re-render to keep input focus, only update totals
}

/* ------------------------------------------------------------
    RENDER & PRINT
------------------------------------------------------------ */
function renderUI() {
    const body = document.getElementById("ui_billBody");
    body.innerHTML = "";

    let currentCat = '';

    billItems.forEach((x, i) => {
        const catName = x.cat;
        
        // Add category strip if category changes
        if (catName !== currentCat) {
            body.innerHTML += `<div class="cat-strip" style="grid-column: 1 / span 8;">${catName}</div>`;
            currentCat = catName;
        }

        body.innerHTML += `
        <div class="row">
            <div>${x.cat}</div>
            <div>${x.date}</div>
            <div>${x.desc}</div>
            <div class="r">${x.rate}</div>
            <div class="r">${x.qty}</div>
            <div class="r">${x.gross}</div>
            <div class="r"><input type="number" class="discount-input" value="${x.discount}"
                onchange="updateItemDiscount(${i},this.value)"></div>
            <div class="r"><strong>${x.net}</strong></div>
            <div style="text-align: center;"><button onclick="deleteItem(${i})" class="delete-btn">X</button></div>
        </div>`;
    });

    calculateTotals();
}

function deleteItem(i) {
    billItems.splice(i,1);
    renderUI();
}

function preparePrint() {
    // 1. Finalize calculations one last time
    const totals = calculateTotals();

    // 2. Hide all interactive elements using the print media query
    // The CSS handles showing only the .container when print is called.
    
    // 3. Set Final Bill Number
    document.getElementById("b_invoice_no").innerText = "KCC-" + Date.now().toString().slice(-6);
    
    // 4. Trigger print
    window.print();
}


/* ------------------------------------------------------------
    INIT
------------------------------------------------------------ */
(function init() {
    loadDropdowns();
    // Set default dates
    document.getElementById("ui_doa").value = new Date().toISOString().split('T')[0];
    document.getElementById("ui_dod").value = new Date().toISOString().split('T')[0];
    // Populate initial UI
    renderUI();
})();
