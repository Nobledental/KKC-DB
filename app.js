/* ============================================================================
   AUTO GENERATORS
============================================================================ */
function genUHID() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const r = String(Math.floor(Math.random() * 900000) + 100000);
    return `KCC-${y}${m}-${r}`;
}

function genIP() {
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const r = String(Math.floor(Math.random() * 900000) + 100000);
    return `IP-${y}${m}-${r}`;
}

function genInvoice() {
    return String(Math.floor(100000000000 + Math.random() * 900000000000));
}

/* ============================================================================
   TABS
============================================================================ */
document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
        document.querySelector(".tab.active").classList.remove("active");
        tab.classList.add("active");

        document.querySelector(".tab-section.active").classList.remove("active");
        document.getElementById(tab.dataset.tab).classList.add("active");
    });
});

/* ============================================================================
   PATIENT GENERATOR
============================================================================ */
document.getElementById("genPatient").onclick = () => {
    document.getElementById("uhid").value = genUHID();
    document.getElementById("ipNo").value = genIP();
};

/* ============================================================================
   BILL ROW CREATOR
============================================================================ */
const billRows = document.getElementById("billRows");

function addRow(date, desc, rate, qty) {
    const row = document.createElement("div");
    row.className = "billrow";

    row.innerHTML = `
        <input value="${date}" type="date" class="date">
        <input value="${desc}">
        <input type="number" class="rate" value="${rate}">
        <input type="number" class="qty" value="${qty}">
        <div class="gross">0.00</div>
        <div class="gst">0.00</div>
        <div class="net">0.00</div>
        <button class="del">×</button>
    `;

    row.querySelector(".del").onclick = () => {
        row.remove();
        calcTotals();
    };

    billRows.appendChild(row);
    calcTotals();
}

/* ============================================================================
   DAILY BILLING GENERATOR
============================================================================ */
document.getElementById("genDaily").onclick = () => {

    const adm = document.getElementById("admDate").value;
    const run = document.getElementById("runDate").value;

    if (!adm || !run) return alert("Please set admission & run date");

    let dt = new Date(adm);
    const end = new Date(run);

    billRows.innerHTML = "";

    while (dt <= end) {
        const d = dt.toISOString().split("T")[0];
        addRow(d, "Room Rent", document.getElementById("t_room").value, 1);
        addRow(d, "Nursing", document.getElementById("t_nursing").value, 1);
        addRow(d, "RMO/DMO Duty", document.getElementById("t_rmo").value, 1);
        addRow(d, "Consultation Visit", document.getElementById("t_consult").value, 1);
        addRow(d, "Consultation Visit", document.getElementById("t_consult").value, 1);

        dt.setDate(dt.getDate() + 1);
    }
};

/* ============================================================================
   SURGICAL PACKAGES
============================================================================ */
const packages = {
    thyroid: [
        { desc: "OT Charges", rate: 18000 },
        { desc: "Surgeon Fee", rate: 15000 },
        { desc: "Assistant Surgeon Fee", rate: 6000 },
        { desc: "Anesthesia Charges", rate: 9000 }
    ],
    turb: [
        { desc: "OT Charges", rate: 26000 },
        { desc: "Surgeon Fee", rate: 14000 }
    ],
    hernia: [
        { desc: "OT Charges", rate: 15000 },
        { desc: "Surgeon Fee", rate: 10000 }
    ],
    appendix: [
        { desc: "OT Charges", rate: 14000 },
        { desc: "Surgeon Fee", rate: 12000 }
    ]
};

document.getElementById("loadPackage").onclick = () => {
    const key = document.getElementById("packageSelect").value;
    if (!key) return;

    packages[key].forEach(item => {
        addRow(new Date().toISOString().split("T")[0], item.desc, item.rate, 1);
    });
};

/* ============================================================================
   MANUAL ITEM
============================================================================ */
document.getElementById("addManual").onclick = () => {
    addRow(new Date().toISOString().split("T")[0], "Manual Item", 0, 1);
};

/* ============================================================================
   TOTALS ENGINE
============================================================================ */
function calcTotals() {
    let gross = 0, gst = 0, net = 0;

    billRows.querySelectorAll(".billrow").forEach(r => {
        let rate = +r.querySelector(".rate").value;
        let qty = +r.querySelector(".qty").value;

        let g = rate * qty;
        let gs = g * 0.12;
        let n = g + gs;

        r.querySelector(".gross").innerText = g.toFixed(2);
        r.querySelector(".gst").innerText = gs.toFixed(2);
        r.querySelector(".net").innerText = n.toFixed(2);

        gross += g;
        gst += gs;
        net += n;
    });

    document.getElementById("grossTotal").innerText = "₹" + gross.toFixed(2);
    document.getElementById("gstTotal").innerText = "₹" + gst.toFixed(2);
    document.getElementById("finalTotal").innerText = "₹" + net.toFixed(2);
}

billRows.addEventListener("input", calcTotals);

/* ============================================================================
   PRINT ENGINE
============================================================================ */
document.getElementById("goPrint").onclick = () => {
    let printDetails = `
        <p><strong>UHID:</strong> ${document.getElementById("uhid").value}</p>
        <p><strong>IP No:</strong> ${document.getElementById("ipNo").value}</p>
        <p><strong>Patient:</strong> ${document.getElementById("pname").value}</p>
        <p><strong>Age/Gender:</strong> ${document.getElementById("agegender").value}</p>
        <p><strong>Practitioner:</strong> ${document.getElementById("doctor").value}</p>
        <p><strong>Speciality:</strong> ${document.getElementById("speciality").value}</p>
    `;

    document.getElementById("printDetails").innerHTML = printDetails;

    const tbody = document.getElementById("printRows");
    tbody.innerHTML = "";

    billRows.querySelectorAll(".billrow").forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${r.querySelector(".date").value}</td>
            <td>${r.children[1].value}</td>
            <td>${r.querySelector(".rate").value}</td>
            <td>${r.querySelector(".qty").value}</td>
            <td>${r.querySelector(".gross").innerText}</td>
            <td>${r.querySelector(".gst").innerText}</td>
            <td>${r.querySelector(".net").innerText}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById("p_gross").innerText = document.getElementById("grossTotal").innerText;
    document.getElementById("p_gst").innerText = document.getElementById("gstTotal").innerText;
    document.getElementById("p_final").innerText = document.getElementById("finalTotal").innerText;
};

document.getElementById("printBill").onclick = () => {
    window.print();
};
