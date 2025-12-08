/* ============================================================
    CORE UTILITIES & INITIALIZATION
    - DEPENDENCY: Requires Decimal.js to be loaded in index.html
============================================================ */

function load(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
}

function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

/* ============================================================
    GLOBAL STATE & INITIAL LOAD
============================================================ */
let billItems = [];
let receipts = [];
let tariff = null;
let history = load("history") || [];

const TARIFF_KEY = "kcc-tariff-v2";
const TARIFF_FILE = "./data/seed-tariff.json";

const CATEGORY_MAP = {
    'Consultation': 'opd_charges',
    'Pharmacy': 'pharmacy',
    'Investigation': 'investigations',
    'Package': 'surgical_packages',
    'Miscellaneous': 'miscellaneous'
};

async function loadTariff() {
    if (typeof Decimal === 'undefined') {
        alert("CRITICAL ERROR: Decimal.js library not loaded.");
        return false;
    }
    
    const storedTariff = load(TARIFF_KEY);
    if (storedTariff) {
        tariff = storedTariff;
        return true;
    }

    try {
        const response = await fetch(TARIFF_FILE);
        if (!response.ok) throw new Error("Network response was not ok");
        const jsonTariff = await response.json();
        tariff = jsonTariff;
        save(TARIFF_KEY, tariff);
        return true;
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to load tariff data.", error);
        alert("Billing system cannot start. Tariff data missing.");
        return false;
    }
}

function createBillItem(cat, date, desc, rate, qty) {
    const r = new Decimal(rate);
    const q = new Decimal(qty);
    const gross = r.times(q).toFixed(2);
    
    return {
        cat,
        desc,
        rate: r.toFixed(2), 
        qty: q.toNumber(),
        date: date || "",
        gross: gross,
        discount: new Decimal(0).toFixed(2),
        net: gross
    };
}


/* ============================================================
    TARIFF MANAGEMENT & DROPDOWNS
============================================================ */

function loadDropdowns() {
    if (!tariff) return;
    
    // ROOMS
    const roomCatSelect = document.getElementById('ui_roomCat');
    roomCatSelect.innerHTML = "";
    Object.keys(tariff.rooms).forEach(key => {
        let o = document.createElement("option");
        o.value = tariff.rooms[key].id; 
        o.text = key;
        roomCatSelect.add(o);
    });

    // DOCTORS
    const docSelect = document.getElementById('ui_doc');
    docSelect.innerHTML = "";
    tariff.doctors.forEach(d => {
        let o = document.createElement("option");
        o.text = d;
        o.value = d;
        docSelect.add(o);
    });
    
    const catSelect = document.getElementById('ui_cat');
    catSelect.addEventListener("change", updateDescriptionDropdown);
    updateDescriptionDropdown();
}


function updateDescriptionDropdown() {
    const cat = document.getElementById('ui_cat').value;
    const descSelect = document.getElementById('ui_desc');
    descSelect.innerHTML = "";
    
    let items = [];

    if (cat === 'Package') {
        const packageSection = tariff.surgical_packages;
        Object.keys(packageSection).forEach(speciality => {
            if (typeof packageSection[speciality] === 'object' && !Array.isArray(packageSection[speciality])) {
                Object.keys(packageSection[speciality]).forEach(pkgKey => {
                    items.push({ key: pkgKey, name: pkgKey }); 
                });
            }
        });
    } else if (CATEGORY_MAP[cat] && tariff[CATEGORY_MAP[cat]]) {
        const section = tariff[CATEGORY_MAP[cat]];
        Object.keys(section).forEach(key => {
            if (key === 'note') return; 
            items.push({ 
                key: key, 
                name: section[key].name || key,
                rate: section[key].rate
            });
        });
    }
    
    if (items.length > 0) {
        descSelect.disabled = false;
        items.forEach(item => {
            let o = document.createElement("option");
            o.value = item.key;
            o.text = item.name;
            if (item.rate) {
                o.setAttribute('data-rate', item.rate); 
            }
            descSelect.add(o);
        });
    } else {
        descSelect.disabled = true;
        let o = document.createElement("option");
        o.text = "-- No items defined --";
        descSelect.add(o);
    }
    
    descSelect.addEventListener("change", () => {
        const selectedOption = descSelect.options[descSelect.selectedIndex];
        const rateInput = document.getElementById('ui_rate');
        if (selectedOption && selectedOption.hasAttribute('data-rate')) {
            rateInput.value = selectedOption.getAttribute('data-rate');
            rateInput.disabled = true;
        } else {
            rateInput.value = "";
            rateInput.disabled = false;
        }
    });
}

/* ============================================================
    TARIFF EDITOR LOGIC
============================================================ */

function renderTariff() {
    // 1. Rooms
    const roomContainer = document.getElementById('tariff_rooms');
    roomContainer.innerHTML = "";
    Object.keys(tariff.rooms).forEach(key => {
        let r = tariff.rooms[key];
        roomContainer.innerHTML += `
            <div class="tariff-block" data-key="${key}">
                <input class="t-name" value="${key}" onchange="updateTariffKey('rooms', '${key}', this.value)">
                <div class="t-row"><label>Tariff</label><input type="number" value="${r.tariff_per_day}" onchange="updateTariffValue('rooms', '${key}', 'tariff_per_day', this.value)"></div>
                <div class="t-row"><label>Nursing</label><input type="number" value="${r.nursing_per_day}" onchange="updateTariffValue('rooms', '${key}', 'nursing_per_day', this.value)"></div>
                <div class="t-row"><label>Dr. Visit</label><input type="number" value="${r.consultant_per_visit}" onchange="updateTariffValue('rooms', '${key}', 'consultant_per_visit', this.value)"></div>
                <button onclick="deleteTariffItem('rooms', '${key}')" style="background:#d9534f;color:white;border:none;padding:5px;border-radius:4px;cursor:pointer;width:100%;margin-top:5px;">Delete</button>
            </div>
        `;
    });

    // 2. Doctors
    const docContainer = document.getElementById('tariff_doctors');
    docContainer.innerHTML = "";
    tariff.doctors.forEach((d, index) => {
         docContainer.innerHTML += `
            <div class="tariff-block" style="width:100%;">
                <input class="t-name" value="${d}" onchange="updateDoctor(${index}, this.value)">
                <button onclick="deleteDoctor(${index})" style="background:#d9534f;color:white;border:none;padding:5px;border-radius:4px;cursor:pointer;width:100%;margin-top:5px;">Delete</button>
            </div>
        `;
    });

    // 3. Packages
    const pkgContainer = document.getElementById('tariff_packages');
    pkgContainer.innerHTML = "";
    Object.keys(tariff.surgical_packages).forEach(cat => {
        if(cat === 'notes') return;
        const sub = tariff.surgical_packages[cat];
        Object.keys(sub).forEach(pkgName => {
            const pkg = sub[pkgName];
            // Render a block for each package
            let breakupHtml = '';
            if(pkg.breakup_template){
                breakupHtml = Object.keys(pkg.breakup_template).map(k => `<div><small>${k}: ${pkg.breakup_template[k]}</small></div>`).join('');
            }
            pkgContainer.innerHTML += `
                <div class="tariff-block" style="width:100%; max-width:100%;">
                    <strong style="color:#0B63C5">${pkgName} (${cat})</strong>
                    <div class="t-row" style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px;">
                        ${Object.keys(pkg).filter(k=>k!=='breakup_template').map(k => 
                            `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>${k}:</span> <strong>₹${pkg[k]}</strong></div>`
                        ).join('')}
                    </div>
                </div>
            `;
        });
    });
}

function updateTariffKey(section, oldKey, newKey) {
    if(oldKey === newKey) return;
    tariff[section][newKey] = tariff[section][oldKey];
    delete tariff[section][oldKey];
    renderTariff();
}

function updateTariffValue(section, key, field, value) {
    tariff[section][key][field] = parseFloat(value);
}

function deleteTariffItem(section, key) {
    if(confirm("Delete this item?")) {
        delete tariff[section][key];
        renderTariff();
    }
}

function addRoom() {
    const name = prompt("Enter Room Name:");
    if(name) {
        tariff.rooms[name] = { id: name.toUpperCase().replace(/\s+/g, '_'), tariff_per_day: 0, nursing_per_day: 0, consultant_per_visit: 0, super_specialist_per_visit: 0 };
        renderTariff();
    }
}

function updateDoctor(index, val) {
    tariff.doctors[index] = val;
}

function deleteDoctor(index) {
    if(confirm("Delete Doctor?")) {
        tariff.doctors.splice(index, 1);
        renderTariff();
    }
}

function addDoctor() {
    const name = prompt("Enter Doctor Name:");
    if(name) {
        tariff.doctors.push(name);
        renderTariff();
    }
}

function saveTariff() {
    save(TARIFF_KEY, tariff);
    loadDropdowns();
    alert("Tariff Saved Successfully!");
}


/* ============================================================
    BILLING ENGINE CORE LOGIC
============================================================ */

function addRoomDays() {
    const doa = document.getElementById('ui_doa').value;
    const dod = document.getElementById('ui_dod').value;
    const roomCatId = document.getElementById('ui_roomCat').value;
    
    if (!doa || !dod || !roomCatId) return;

    billItems = billItems.filter(item => 
        item.cat !== "Room Rent" && 
        item.cat !== "Nursing" && 
        item.cat !== "Doctor Visit" &&
        item.desc !== tariff.miscellaneous.MRD_CHARGE.name 
    );
    
    const roomKey = Object.keys(tariff.rooms).find(k => tariff.rooms[k].id === roomCatId);
    const r = tariff.rooms[roomKey];
    if (!r) return;

    const s = new Date(doa);
    const e = new Date(dod);
    const totalTimeHours = (e - s) / 3600000;
    
    const fullDays = Math.floor(totalTimeHours / 24);
    const remainingHours = totalTimeHours % 24;

    for (let i = 0; i < fullDays; i++) {
        const d = new Date(s.getTime() + i * 86400000);
        const ds = d.toISOString().split("T")[0];
        
        billItems.push(createBillItem("Room Rent", ds, `Room: ${roomKey}`, r.tariff_per_day, 1));
        billItems.push(createBillItem("Nursing", ds, "Nursing Charge", r.nursing_per_day, 1));
        const doctorTotal = new Decimal(r.consultant_per_visit).plus(new Decimal(r.super_specialist_per_visit));
        billItems.push(createBillItem("Doctor Visit", ds, "Daily Doctor Visits", doctorTotal.toNumber(), 1));
    }

    if (remainingHours > 0) {
        let roomRate = new Decimal(r.tariff_per_day);
        let nursingRate = new Decimal(r.nursing_per_day);
        const rules = tariff.billing_rules.room_rent_rule;
        
        if (remainingHours <= rules.full_day_hours) {
            roomRate = roomRate.times(rules.half_day_multiplier || 0.5); 
            nursingRate = nursingRate.times(rules.half_day_multiplier || 0.5);
        }
        
        const finalDate = e.toISOString().split("T")[0];
        
        billItems.push(createBillItem("Room Rent", finalDate, `Room: ${roomKey} (Final Day)`, roomRate.toNumber(), 1));
        billItems.push(createBillItem("Nursing", finalDate, "Nursing Charge (Final Day)", nursingRate.toNumber(), 1));
        const doctorTotal = new Decimal(r.consultant_per_visit).plus(new Decimal(r.super_specialist_per_visit));
        billItems.push(createBillItem("Doctor Visit", finalDate, "Doctor Visit (Discharge)", doctorTotal.toNumber(), 1));
    }
    
    billItems.push(createBillItem(
        "Miscellaneous", doa, 
        tariff.miscellaneous.MRD_CHARGE.name, 
        tariff.miscellaneous.MRD_CHARGE.rate, 1
    ));

    calculateTotals();
    renderUI();
}

function addItem() {
    const cat = document.getElementById('ui_cat').value;
    const descSelect = document.getElementById('ui_desc');
    const descText = descSelect.options[descSelect.selectedIndex].text;
    const qty = parseFloat(document.getElementById('ui_qty').value || 1);
    let rate = parseFloat(document.getElementById('ui_rate').value || 0);
    const date = document.getElementById('ui_date').value;

    let itemRate = new Decimal(rate);
    let finalDesc = descText;

    if (cat === 'Package') {
        const roomCatId = document.getElementById('ui_roomCat').value;
        itemRate = new Decimal(rate); 
        finalDesc = `Package: ${descText}`;
    } 
    else if (descSelect.options[descSelect.selectedIndex].hasAttribute('data-rate')) {
        itemRate = new Decimal(descSelect.options[descSelect.selectedIndex].getAttribute('data-rate'));
        rate = itemRate.toNumber();
    }
    
    if (itemRate.greaterThan(0) && qty > 0) {
        billItems.push(createBillItem(cat, date, finalDesc, rate, qty));
    } else {
        alert("Please ensure Rate and Quantity are greater than zero.");
        return;
    }

    calculateTotals();
    renderUI();
}

function addReceipt() {
    const amt = new Decimal(document.getElementById('ui_ramt').value || 0);
    const gross = billItems.reduce((a, b) => a.plus(new Decimal(b.net)), new Decimal(0));
    const paid = receipts.reduce((a, b) => a.plus(new Decimal(b.amt)), new Decimal(0));
    
    if (amt.lessThanOrEqualTo(0)) return;

    if (paid.plus(amt).greaterThan(gross)) {
        alert("Receipt amount exceeds the total net bill amount!");
        return;
    }

    receipts.push({
        no: "R" + (receipts.length + 1),
        date: document.getElementById('ui_rdate').value,
        amt: amt.toFixed(2),
        mode: document.getElementById('ui_rmode').value
    });

    document.getElementById('ui_ramt').value = ''; 

    calculateTotals();
    renderUI();
}

/* ============================================================
    MAIN CALCULATION ENGINE
============================================================ */
function calculateTotals() {
    let gross = new Decimal(0);
    let discount = new Decimal(0);
    let net = new Decimal(0);
    let receiptsTotal = new Decimal(0);

    billItems.forEach(item => {
        const itemGross = new Decimal(item.gross || 0);
        const itemDiscount = new Decimal(item.discount || 0);

        gross = gross.plus(itemGross);
        discount = discount.plus(itemDiscount);
        net = net.plus(itemGross.minus(itemDiscount));
    });
    
    receipts.forEach(r => {
        receiptsTotal = receiptsTotal.plus(new Decimal(r.amt));
    });

    document.getElementById('ui_s_gross').innerText = "₹" + gross.toFixed(2);
    document.getElementById('ui_totalDiscount').innerText = "₹" + discount.toFixed(2);
    document.getElementById('ui_totalDiscount_summary').innerText = "₹" + discount.toFixed(2);
    document.getElementById('ui_s_net_bill').innerText = "₹" + net.toFixed(2);
    document.getElementById('ui_s_rec').innerText = "₹" + receiptsTotal.toFixed(2);
    document.getElementById('ui_s_final').innerText = "₹" + (net.minus(receiptsTotal)).toFixed(2);
}

function updateItemDiscount(i, val) {
    const d = new Decimal(val || 0);
    const itemGross = new Decimal(billItems[i].gross);
    
    if (d.greaterThan(itemGross)) {
        alert("Item discount cannot exceed gross amount.");
        document.querySelector(`#ui_billBody tr:nth-child(${i + 1}) .discount-input`).value = itemGross.toFixed(2);
        billItems[i].discount = itemGross.toFixed(2);
        billItems[i].net = new Decimal(0).toFixed(2);
    } else {
        billItems[i].discount = d.toFixed(2);
        billItems[i].net = itemGross.minus(d).toFixed(2);
    }

    calculateTotals();
    // No re-render to keep focus
}

function applyBillDiscount() {
    const billDisc = new Decimal(document.getElementById('ui_billDiscount').value || 0);
    const totalGross = billItems.reduce((a, b) => a.plus(new Decimal(b.gross)), new Decimal(0));

    if (billDisc.lessThan(0)) {
        alert("Discount cannot be negative.");
        document.getElementById('ui_billDiscount').value = 0;
        return;
    }
    
    if (billDisc.greaterThan(totalGross)) {
        alert("Bill discount cannot exceed gross.");
        document.getElementById('ui_billDiscount').value = 0;
        return;
    }

    billItems.forEach(item => {
        const itemGross = new Decimal(item.gross);
        const share = itemGross.dividedBy(totalGross).times(billDisc);
        
        item.discount = share.toFixed(2);
        item.net = itemGross.minus(share).toFixed(2);
    });

    calculateTotals();
    renderUI();
}

function renderUI() {
    const ui_billBody = document.getElementById('ui_billBody');
    ui_billBody.innerHTML = "";

    billItems.forEach((x, i) => {
        ui_billBody.innerHTML += `
        <tr>
            <td>${x.cat}</td>
            <td>${x.date}</td>
            <td>${x.desc}</td>
            <td>${x.rate}</td>
            <td>${x.qty}</td>
            <td>${x.gross}</td>

            <td>
                <input type="number" class="discount-input"
                    value="${x.discount || 0}"
                    onchange="updateItemDiscount(${i}, this.value)">
            </td>

            <td style="font-weight:700;">${x.net}</td>
            <td><button onclick="deleteItem(${i})">X</button></td>
        </tr>`;
    });

    calculateTotals();
}

function deleteItem(i) {
    billItems.splice(i, 1);
    calculateTotals();
    renderUI();
}

/* ============================================================
    HISTORY & PRINTING
============================================================ */

function saveBill() {
    const gross = billItems.reduce((a, b) => a.plus(new Decimal(b.net)), new Decimal(0));
    const rec = receipts.reduce((a, b) => a.plus(new Decimal(b.amt)), new Decimal(0));

    if (rec.greaterThan(gross)) {
        alert("Cannot save bill — receipts exceed total.");
        return;
    }

    const patientName = document.getElementById('ui_name').value;
    if (!patientName) {
        alert("Patient Name is required.");
        return;
    }

    const data = {
        billNo: "BILL-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 99),
        patient: {
            name: patientName,
            age: document.getElementById('ui_age').value,
            gender: document.getElementById('ui_gender').value,
            uhid: document.getElementById('ui_uhid').value,
            ip: document.getElementById('ui_ip').value,
            room: document.getElementById('ui_roomCat').options[document.getElementById('ui_roomCat').selectedIndex].text,
            doc: document.getElementById('ui_doc').value,
            spec: document.getElementById('ui_spec').value,
            ins: document.getElementById('ui_ins').value === "Yes" ? document.getElementById('ui_insName').value : "No",
            doa: document.getElementById('ui_doa').value,
            dod: document.getElementById('ui_dod').value
        },
        items: JSON.parse(JSON.stringify(billItems)),
        receipts: JSON.parse(JSON.stringify(receipts)),
        summary: {
            gross: gross.toFixed(2),
            net: gross.minus(rec).toFixed(2),
            paid: rec.toFixed(2)
        },
        date: new Date().toISOString()
    };

    history.push(data);
    save("history", history);

    alert(`Bill ${data.billNo} saved!`);
    loadHistoryTable();
}

function loadBill(no) {
    const bill = history.find(h => h.billNo === no);
    if(bill) {
        billItems = bill.items;
        receipts = bill.receipts;
        document.getElementById('ui_name').value = bill.patient.name;
        document.getElementById('ui_age').value = bill.patient.age;
        // Populate other fields...
        renderUI();
        document.querySelector('[data-screen="billingScreen"]').click();
    }
}

function loadHistoryTable() {
    const historyTable = document.getElementById('historyTable');
    historyTable.innerHTML = "";
    history.forEach(x => {
        historyTable.innerHTML += `
        <tr>
            <td>${x.billNo}</td>
            <td>${x.patient.name}</td>
            <td>${x.patient.uhid}</td>
            <td>${x.date.split("T")[0]}</td>
            <td><button class="btn secondary" onclick="loadBill('${x.billNo}')">Open</button></td>
        </tr>`;
    });
}


const categoryTitle = {
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

function getCatTitle(cat) {
    return categoryTitle[cat] || "OTHER CHARGES";
}

function preparePrint() {
    document.getElementById('b_invoice').innerText = "BILL-" + Date.now().toString().slice(-6);
    document.getElementById('b_date_issued').innerText = new Date().toISOString().split("T")[0];
    document.getElementById('b_name').innerText = document.getElementById('ui_name').value;
    document.getElementById('b_age_gender').innerText = `${document.getElementById('ui_age').value}Y / ${document.getElementById('ui_gender').value}`;
    document.getElementById('b_room').innerText = document.getElementById('ui_roomCat').options[document.getElementById('ui_roomCat').selectedIndex].text;
    document.getElementById('b_uhid_ip').innerText = `${document.getElementById('ui_uhid').value} / ${document.getElementById('ui_ip').value}`;
    document.getElementById('b_doa').innerText = document.getElementById('ui_doa').value;
    document.getElementById('b_dod').innerText = document.getElementById('ui_dod').value;
    document.getElementById('b_doc').innerText = document.getElementById('ui_doc').value;
    document.getElementById('b_spec').innerText = document.getElementById('ui_spec').value;
    document.getElementById('b_ins').innerText = document.getElementById('ui_ins').value === "Yes" ? document.getElementById('ui_insName').value : "No";

    let dateGroups = {};
    billItems.forEach(item => {
        let d = item.date || "NO DATE";
        if (!dateGroups[d]) dateGroups[d] = [];
        dateGroups[d].push(item);
    });

    const b_items = document.getElementById('b_items');
    b_items.innerHTML = "";
    let totalGross = new Decimal(0);
    let totalDiscount = new Decimal(0);

    Object.keys(dateGroups).sort().forEach(date => {
        b_items.innerHTML += `
            <div class="row" style="font-weight:700;background:#f4f4f4;grid-column: 1 / span 6;">
                <div>Date: ${date}</div>
            </div>
        `;

        let catGroups = {};
        dateGroups[date].forEach(item => {
            let c = getCatTitle(item.cat);
            if (!catGroups[c]) catGroups[c] = [];
            catGroups[c].push(item);
        });

        Object.keys(catGroups).sort().forEach(catName => {
            b_items.innerHTML += `
                <div class="row" style="font-weight:700;background:#e8f1ff;grid-column: 1 / span 6;">
                    <div>${catName}</div>
                </div>
            `;

            catGroups[catName].forEach(item => {
                const itemGross = new Decimal(item.gross);
                const itemDisc = new Decimal(item.discount || 0);
                totalGross = totalGross.plus(itemGross);
                totalDiscount = totalDiscount.plus(itemDisc);

                b_items.innerHTML += `
                    <div class="row">
                        <div>${item.desc}</div>
                        <div>${item.rate}</div>
                        <div>${item.qty}</div>
                        <div>${itemGross.toFixed(2)}</div>
                        <div>${itemDisc.toFixed(2)}</div>
                        <div style="font-weight:700;">${item.net}</div>
                    </div>
                `;
            });
        });
    });

    const finalNet = totalGross.minus(totalDiscount);

    document.getElementById('s_gross').innerText = "₹" + totalGross.toFixed(2);
    document.getElementById('s_discount').innerText = "₹" + totalDiscount.toFixed(2);
    document.getElementById('s_final').innerText = "₹" + finalNet.toFixed(2);

    let rec = receipts.reduce((a, b) => a.plus(new Decimal(b.amt)), new Decimal(0));
    const receiptLines = document.getElementById('receiptLines');
    receiptLines.innerHTML = "";

    receipts.forEach(r => {
        receiptLines.innerHTML += `
            <div class="sum-line">
                <span>${r.no} (${r.date}) - ${r.mode}</span>
                <strong>₹${r.amt}</strong>
            </div>
        `;
    });

    document.getElementById('rc_total').innerText = "₹" + rec.toFixed(2);
    document.getElementById('rc_balance').innerText = "₹" + (finalNet.minus(rec)).toFixed(2);

    window.print();
}

/* ============================================================
    UI SWITCHING & INIT
============================================================ */
document.querySelectorAll(".sidebar-nav button").forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll(".sidebar-nav button").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        let screen = btn.getAttribute("data-screen");
        document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
        document.getElementById(screen).classList.add("active");
    };
});

(async function init() {
    const tariffLoaded = await loadTariff(); 
    if (tariffLoaded) {
        renderTariff();
        loadDropdowns();
        loadHistoryTable();
        calculateTotals();
        renderUI();
    }
})();
