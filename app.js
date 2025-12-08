/* ============================================================================
    KCC BILLING OS — FULL APP ENGINE (ADVANCED VERSION)
    Features: Item Discount, Global Discount, **Tax (GST/VAT) Calculation**.
============================================================================ */

/* ------------------------------------------------------------
    STORAGE & TARIFF INIT (Unchanged)
------------------------------------------------------------ */
function load(key) {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : null;
}
function save(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

let tariff = (function() {
    const LOCAL_KEY = "kcc-tariff-v2";
    let stored = load(LOCAL_KEY);
    if (stored) return stored;

    if (typeof window.TARIFF === 'object' && window.TARIFF !== null) {
        return window.TARIFF;
    }
    alert("CRITICAL ERROR: TARIFF data is missing. System will operate on empty rates.");
    return {};
})();

/* GLOBAL STATE (Unchanged) */
let billItems = [];
let receipts = [];
const CATEGORY_MAP = { /* ... unchanged ... */ };


/* ------------------------------------------------------------
    BILL ITEM CREATOR (Updated to include tax fields for storage)
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
        net: gross.toFixed(2), // Net (Taxable) before Global Discount
        tax: "0.00", // Item-level tax (Calculated later in totals)
        total: gross.toFixed(2) // Final item total (Tax Incl.)
    };
}

/* ------------------------------------------------------------
    UI & CORE ACTIONS (Functions unchanged unless specified)
------------------------------------------------------------ */
function loadDropdowns() {
    // Also update the tax rate display
    document.getElementById("ui_tax_rate").innerText = tariff.billing_rules.tax_rate_percent;
    // ... rest of loadDropdowns unchanged ...
    if (!tariff || !tariff.rooms || !tariff.doctors) return;
    /* ... rest of original logic ... */
    
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

function updatePatientDetails() {
    // Triggers full render to ensure calculations update 
    renderUI();
}
/* addRoomDays, clearBillingItems, newBill, addItem, updateReceiptNumber, addReceipt (Unchanged) */

/* ------------------------------------------------------------
    SUMMARY ENGINE (CRITICAL UPDATE)
------------------------------------------------------------ */
function calculateTotals() {
    
    // TARIFF DATA
    const TAX_RATE = new Decimal(tariff.billing_rules.tax_rate_percent).div(100);

    let gross = new Decimal(0);
    let itemDisc = new Decimal(0);
    let preDiscNet = new Decimal(0); // Net after item discounts, before global discount

    /* 1. Calculate Item-Level Totals (Gross & Item Disc) */
    billItems.forEach(it => {
        const g = new Decimal(it.gross);
        const d = new Decimal(it.discount || 0);
        gross = gross.plus(g);
        itemDisc = itemDisc.plus(d);
        preDiscNet = preDiscNet.plus(g.minus(d));
    });

    /* 2. Apply Global Discount */
    const globalDiscPercent = new Decimal(document.getElementById("ui_billDiscount").value || 0);
    let globalDiscAmount = new Decimal(0);
    
    if (globalDiscPercent.gt(0)) {
        const discountFactor = globalDiscPercent.div(100);
        globalDiscAmount = preDiscNet.mul(discountFactor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    }

    // Taxable Amount (The base value on which tax is calculated)
    const taxableAmount = preDiscNet.minus(globalDiscAmount);

    /* 3. Apply Tax (GST/VAT) */
    const taxAmount = taxableAmount.mul(TAX_RATE).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    
    // Grand Total (Taxable Amount + Tax Amount)
    const grandTotal = taxableAmount.plus(taxAmount);
    
    /* 4. Calculate Receipts and Balance */
    let paid = new Decimal(0);
    receipts.forEach(r => {
        paid = paid.plus(new Decimal(r.amt));
    });
    
    const balanceDue = grandTotal.minus(paid);

    /* 5. Update Bill Items with calculated tax/total for display */
    billItems.forEach(it => {
        // Since tax is applied globally, we need to distribute the tax portion for item display (pro-rata)
        const itemTaxableValue = new Decimal(it.net);
        const itemProportion = itemTaxableValue.div(preDiscNet.gt(0) ? preDiscNet : new Decimal(1));

        // Note: This is simplified. In a real system, tax is applied per item/category.
        // Here, we just allocate the calculated global tax back to items for display.
        const itemTaxAllocated = taxAmount.mul(itemProportion).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
        
        // Final Item Net after Global Discount (Taxable Value) - For robust pro-rata calculation
        const itemTaxableFinal = itemTaxableValue.minus(itemProportion.mul(globalDiscAmount));
        
        it.tax = itemTaxAllocated.toFixed(2);
        it.total = itemTaxableFinal.plus(itemTaxAllocated).toFixed(2);
        it.net = itemTaxableFinal.toFixed(2); // Store the final taxable value per item
    });


    // Update Summary UI
    document.getElementById("b_run_date").innerText = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB');

    document.getElementById("ui_s_gross").innerText = "₹" + gross.toFixed(2);
    document.getElementById("ui_itemDiscount").innerText = "- ₹" + itemDisc.toFixed(2);
    document.getElementById("ui_globalDiscount").innerText = "- ₹" + globalDiscAmount.toFixed(2);
    document.getElementById("ui_s_net_bill").innerText = "₹" + taxableAmount.toFixed(2);
    document.getElementById("ui_s_tax_rate").innerText = "+ ₹" + taxAmount.toFixed(2);
    document.getElementById("ui_s_grand_total").innerText = "₹" + grandTotal.toFixed(2);
    document.getElementById("ui_s_rec").innerText = "₹" + paid.toFixed(2);
    document.getElementById("ui_s_final").innerText = "₹" + balanceDue.toFixed(2);
    
    return { gross, itemDisc, globalDiscAmount, taxableAmount, taxAmount, grandTotal, paid, balanceDue };
}

/* ITEM DISCOUNT (Updated to re-run totals) */
function updateItemDiscount(i, val) {
    const d = new Decimal(val || 0);
    const g = new Decimal(billItems[i].gross);

    if (d.gt(g)) {
        alert("Discount > gross.");
        billItems[i].discount = g.toFixed(2);
        // Note: We don't update item.net here; it will be updated by calculateTotals()
    } else {
        billItems[i].discount = d.toFixed(2);
    }

    // Rerunning calculateTotals ensures item.net, item.tax, and item.total are updated.
    calculateTotals(); 
    renderUI();
}

/* ------------------------------------------------------------
    RENDER & PRINT (Updated for Tax columns)
------------------------------------------------------------ */
function renderUI() {
    const body = document.getElementById("ui_billBody");
    body.innerHTML = "";
    let currentCat = '';
    
    // Render Bill Items Table
    billItems.forEach((x, i) => {
        const catName = x.cat;
        
        if (catName !== currentCat) {
            body.innerHTML += `<div class="cat-strip">${catName}</div>`;
            currentCat = catName;
        }

        body.innerHTML += `
        <div class="row">
            <div>${i + 1}</div>
            <div>${x.date.slice(-5).replace('-', '/')}</div>
            <div>${x.desc}</div>
            <div class="r">${x.rate}</div>
            <div class="r">${x.qty}</div>
            <div class="r">${x.gross}</div>
            <div class="r"><input type="number" class="discount-input" value="${x.discount}"
                onchange="updateItemDiscount(${i},this.value)"><strong>${x.discount}</strong></div>
            <div class="r"><strong>${x.net}</strong></div>
            <div class="r"><strong>${x.tax}</strong></div>
            <div class="r"><strong>${x.total}</strong></div>
            <div class="r"><button onclick="deleteItem(${i})" class="delete-btn">X</button></div>
        </div>`;
    });
    
    // Render Receipt Lines (Unchanged)
    const rOut = document.getElementById("receiptLines");
    rOut.innerHTML = receipts.map(r => `
        <div class="sum-line" style="font-size: 11px;">
            <span>Receipt No: ${r.no} (${r.date}) - ${r.mode}</span>
            <strong>₹${r.amt}</strong>
            <button onclick="deleteReceipt('${r.no}')" class="delete-btn" style="float: right;">X</button>
        </div>`).join('');


    calculateTotals();
}

function deleteItem(i) {
    billItems.splice(i,1);
    renderUI();
}

function deleteReceipt(rNo) {
    if (confirm("Delete this receipt?")) {
        receipts = receipts.filter(r => r.no !== rNo);
        renderUI();
    }
}

function preparePrint() { /* ... unchanged ... */ }

/* ------------------------------------------------------------
    INIT (Updated to call loadDropdowns)
------------------------------------------------------------ */
(function init() {
    loadDropdowns();
    document.getElementById("ui_rdate").value = new Date().toISOString().split('T')[0];
    generateNewIDs();
    renderUI();
})();
