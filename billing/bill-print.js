/* ============================================================================
   KCC BILLING OS — BILL PRINT ENGINE (A4 Output)
   Loads bill from localStorage → Populates A4 template → Auto Print
============================================================================ */

function inr(n) {
    return Number(n || 0).toLocaleString("en-IN");
}

/* ============================================================================
   LOAD BILL DATA
============================================================================ */
const bill = JSON.parse(localStorage.getItem("kcc_current_bill") || "{}");

if (!bill || !bill.patient) {
    alert("No bill data found.");
}

/* ============================================================================
   PATIENT DETAILS
============================================================================ */
document.getElementById("p_name").innerText = bill.patient.name;
document.getElementById("p_uhid").innerText = bill.uhid;
document.getElementById("p_age_gender").innerText =
    bill.patient.age + " / " + bill.patient.gender;
document.getElementById("p_doctor").innerText = bill.patient.doctor;
document.getElementById("p_address").innerText = bill.patient.address;

document.getElementById("p_admission").innerText = bill.patient.admission;
document.getElementById("p_discharge").innerText = bill.patient.discharge;
document.getElementById("p_los").innerText = bill.patient.los;
document.getElementById("p_billno").innerText = bill.billNo;

/* ============================================================================
   ROOM SUMMARY
============================================================================ */
let roomHTML = "";

bill.rooms?.forEach(r => {
    roomHTML += `
        <tr>
            <td>${r.type}</td>
            <td>${r.from}</td>
            <td>${r.to}</td>
            <td>${r.days}</td>
            <td>₹ ${inr(r.room)}</td>
            <td>₹ ${inr(r.nursing)}</td>
            <td>₹ ${inr(r.rmo)}</td>
            <td>₹ ${inr(r.total)}</td>
        </tr>
    `;
});

document.getElementById("tbl_room").innerHTML = roomHTML;

/* ============================================================================
   CONSULTANT VISITS
============================================================================ */
let consultHTML = "";

bill.consultants?.forEach(c => {
    consultHTML += `
        <tr>
            <td>${c.name}</td>
            <td>${c.date}</td>
            <td>${c.count}</td>
            <td>₹ ${inr(c.rate)}</td>
            <td>₹ ${inr(c.total)}</td>
        </tr>
    `;
});

document.getElementById("tbl_consult").innerHTML = consultHTML;

/* ============================================================================
   INVESTIGATIONS
============================================================================ */
let invHTML = "";

bill.investigations?.forEach(i => {
    invHTML += `
        <tr>
            <td>${i.name}</td>
            <td>₹ ${inr(i.amount)}</td>
        </tr>
    `;
});

document.getElementById("tbl_invest").innerHTML = invHTML;

/* ============================================================================
   PHARMACY
============================================================================ */
let pharmHTML = "";

bill.pharmacy?.forEach(p => {
    pharmHTML += `
        <tr>
            <td>${p.name}</td>
            <td>₹ ${inr(p.amount)}</td>
        </tr>
    `;
});

document.getElementById("tbl_pharm").innerHTML = pharmHTML;

/* ============================================================================
   RECEIPTS
============================================================================ */
let recHTML = "";

bill.receipts?.forEach(r => {
    recHTML += `
        <tr>
            <td>${r.date}</td>
            <td>${r.mode}</td>
            <td>₹ ${inr(r.amount)}</td>
        </tr>
    `;
});

document.getElementById("tbl_receipts").innerHTML = recHTML;

/* ============================================================================
   FINAL SUMMARY TOTALS
============================================================================ */
document.getElementById("sum_room").innerText = "₹ " + inr(bill.totals.room);
document.getElementById("sum_consult").innerText = "₹ " + inr(bill.totals.consultant);
document.getElementById("sum_invest").innerText = "₹ " + inr(bill.totals.investigations);
document.getElementById("sum_pharm").innerText = "₹ " + inr(bill.totals.pharmacy);

document.getElementById("sum_gross").innerText = "₹ " + inr(bill.totals.gross);
document.getElementById("sum_paid").innerText = "₹ " + inr(bill.totals.paid);
document.getElementById("sum_bal").innerText = "₹ " + inr(bill.totals.balance);

/* ============================================================================
   BUILD MISSING ROOM STRUCTURE IF NEEDED (Compatibility)
============================================================================ */
if (!bill.rooms?.length && bill.totals.room) {
    // fallback mode for older structure
}

/* ============================================================================
   AUTO PRINT
============================================================================ */
setTimeout(() => {
    window.print();
}, 600);
