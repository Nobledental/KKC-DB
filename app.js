/* ============================================================================
   KCC BILLING PAGE — MAIN JS ENGINE
   Krishna Kidney Centre
   100% Offline — No Backend — No Login — No AI
============================================================================ */

/* ============================================================
   SHORTCUTS
============================================================ */
const $ = (sel) => document.querySelector(sel);
const fmtINR = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

/* GLOBAL BILL OBJECT -------------------------------------------------------- */
let bill = {
  patient: {},
  room: {},
  visits: [],
  surgeries: [],
  pharmacy: { total: 0, items: [] },
  investigations: [],
  misc: [],
  receipts: [],
  totals: { gross: 0, paid: 0, balance: 0 }
};

/* ============================================================================
   PATIENT DETAILS — AUTO LOS CALCULATION
============================================================================ */
$("#p_admission").addEventListener("change", updateLOS);
$("#p_discharge").addEventListener("change", updateLOS);

function updateLOS() {
  const a = new Date($("#p_admission").value);
  const d = new Date($("#p_discharge").value);

  if (!a || !d) return;

  const diff = (d - a) / (1000 * 60 * 60 * 24);
  if (diff < 0) {
    $("#p_los").value = "Invalid";
    return;
  }

  $("#p_los").value = diff + 1;
}

/* ============================================================================
   ROOM & DAILY CHARGES
============================================================================ */
function loadRoomTariff() {
  const select = $("#room_select");
  select.innerHTML = "";

  Object.keys(tariffs.rooms).forEach(r => {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  });
}

$("#room_select").addEventListener("change", function () {
  const roomType = this.value;
  const data = tariffs.rooms[roomType];

  bill.room = { type: roomType, ...data };

  $("#room_breakup").innerHTML = `
    <table>
      <tr><th>Item</th><th>Amount</th></tr>
      <tr><td>Room Rent</td><td>${fmtINR(data.room)}</td></tr>
      <tr><td>Nursing</td><td>${fmtINR(data.nursing)}</td></tr>
      <tr><td>Duty Doctor</td><td>${fmtINR(data.duty)}</td></tr>
      <tr><td>Consultant Visit</td><td>${fmtINR(data.consult)}</td></tr>
    </table>
  `;

  computeTotals();
});

/* ============================================================================
   CONSULTANT VISITS
============================================================================ */
$("#addVisitBtn").addEventListener("click", () => addVisitRow());

function addVisitRow() {
  const parent = $("#visit_list");

  const row = document.createElement("div");
  row.className = "visit-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input type="date" class="v_date"></td>
        <td><input type="number" class="v_count" placeholder="Visits"></td>
        <td><input type="number" class="v_rate" placeholder="Rate"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelectorAll("input").forEach(inp => inp.addEventListener("input", computeTotals));

  parent.appendChild(row);
}

/* ============================================================================
   SURGERIES
============================================================================ */
$("#addSurgeryBtn").addEventListener("click", () => addSurgeryRow());

function addSurgeryRow() {
  const parent = $("#surgery_list");

  const row = document.createElement("div");
  row.className = "surgery-row";

  const pakKeys = Object.keys(tariffs.packages);

  let options = `<option value="">Select Package</option>`;
  pakKeys.forEach(p => options += `<option value="${p}">${p}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="s_pkg">${options}</select>
        </td>
        <td><input class="s_discount" placeholder="Discount %"></td>
        <td><span class="s_total">₹0</span></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>

    <div class="s_breakup"></div>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".s_pkg").addEventListener("change", function () {
    const pkgName = this.value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    const breakup = row.querySelector(".s_breakup");

    const total = pkg.package_total;

    breakup.innerHTML = `
      <table>
        <tr><th>Component</th><th>Amount</th></tr>
        <tr><td>OT</td><td>${fmtINR(pkg.ot)}</td></tr>
        <tr><td>Surgeon</td><td>${fmtINR(pkg.surgeon)}</td></tr>
        <tr><td>Assistant</td><td>${fmtINR(pkg.assistant)}</td></tr>
        <tr><td>Anesthetist</td><td>${fmtINR(pkg.anesthetist)}</td></tr>
        <tr><td>Implant</td><td>${fmtINR(pkg.implant)}</td></tr>
        <tr><td>OT Gas</td><td>${fmtINR(pkg.gas)}</td></tr>
        <tr><td>Consumables</td><td>${fmtINR(pkg.consumables)}</td></tr>
        <tr><th>Total</th><th>${fmtINR(total)}</th></tr>
      </table>
    `;

    row.querySelector(".s_total").textContent = fmtINR(total);
    computeTotals();
  });

  row.querySelector(".s_discount").addEventListener("input", computeTotals);

  parent.appendChild(row);
}

/* ============================================================================
   PHARMACY
============================================================================ */
$("#pharmacy_total").addEventListener("input", computeTotals);

$("#addPharmacyItemBtn").addEventListener("click", () => {
  const parent = $("#pharmacy_list");

  const row = document.createElement("div");
  row.className = "pharm-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Item"></td>
        <td><input type="number" class="p_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".p_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   INVESTIGATIONS
============================================================================ */
$("#addInvestBtn").addEventListener("click", () => {
  const parent = $("#invest_list");

  const row = document.createElement("div");
  row.className = "invest-row";

  let options = `<option value="">Select</option>`;
  tariffs.investigations.forEach(inv => options += `<option value="${inv.name}" data-price="${inv.price}">${inv.name}</option>`);

  row.innerHTML = `
    <table>
      <tr>
        <td>
          <select class="inv_sel">${options}</select>
        </td>
        <td><input type="number" class="inv_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();

  row.querySelector(".inv_sel").addEventListener("change", function () {
    const p = this.selectedOptions[0].dataset.price;
    if (p) row.querySelector(".inv_amt").value = p;
    computeTotals();
  });

  row.querySelector(".inv_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   MISCELLANEOUS
============================================================================ */
$("#addMiscBtn").addEventListener("click", () => {
  const parent = $("#misc_list");

  const row = document.createElement("div");
  row.className = "misc-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Description"></td>
        <td><input type="number" class="m_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".m_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   RECEIPTS
============================================================================ */
$("#addReceiptBtn").addEventListener("click", () => {
  const parent = $("#receipt_list");

  const row = document.createElement("div");
  row.className = "receipt-row";
  row.innerHTML = `
    <table>
      <tr>
        <td><input placeholder="Receipt No"></td>
        <td><input type="date" class="r_date"></td>
        <td>
          <select class="r_mode">
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Transfer</option>
            <option>Insurance</option>
          </select>
        </td>
        <td><input type="number" class="r_amt" placeholder="Amount"></td>
        <td><button class="remove-btn">✖</button></td>
      </tr>
    </table>
  `;

  row.querySelector(".remove-btn").onclick = () => row.remove();
  row.querySelector(".r_amt").addEventListener("input", computeTotals);

  parent.appendChild(row);
});

/* ============================================================================
   TOTALS ENGINE
============================================================================ */
function computeTotals() {
  let gross = 0;

  /* ROOM ----------------------------------------------------- */
  if (bill.room.room) {
    const a = Number($("#p_los").value || 1);
    const perDay =
      bill.room.room +
      bill.room.nursing +
      bill.room.duty +
      bill.room.consult;

    gross += perDay * a;
  }

  /* VISITS --------------------------------------------------- */
  document.querySelectorAll(".visit-row").forEach(row => {
    const c = Number(row.querySelector(".v_count").value);
    const r = Number(row.querySelector(".v_rate").value);
    gross += c * r;
  });

  /* SURGERIES ------------------------------------------------ */
  document.querySelectorAll(".surgery-row").forEach(row => {
    const pkgName = row.querySelector(".s_pkg").value;
    if (!pkgName) return;

    const pkg = tariffs.packages[pkgName];
    let total = pkg.package_total;

    const disc = Number(row.querySelector(".s_discount").value);
    if (disc > 0) total -= (total * disc) / 100;

    gross += total;
  });

  /* PHARMACY ------------------------------------------------- */
  gross += Number($("#pharmacy_total").value || 0);

  document.querySelectorAll(".pharm-row .p_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* INVESTIGATIONS ------------------------------------------ */
  document.querySelectorAll(".invest-row .inv_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* MISC ------------------------------------------------------ */
  document.querySelectorAll(".misc-row .m_amt").forEach(x => {
    gross += Number(x.value || 0);
  });

  /* RECEIPTS -------------------------------------------------- */
  let paid = 0;
  document.querySelectorAll(".receipt-row .r_amt").forEach(x => {
    paid += Number(x.value || 0);
  });

  const balance = gross - paid;

  $("#sum_gross").textContent = fmtINR(gross);
  $("#sum_paid").textContent = fmtINR(paid);
  $("#sum_balance").textContent = fmtINR(balance);

  bill.totals = { gross, paid, balance };
}

/* ============================================================================
   PRINT MODE
============================================================================ */
$("#printBtn").addEventListener("click", () => {
  window.print();
});

/* ============================================================================
   EXPORT PDF (Same Design)
============================================================================ */
$("#pdfBtn").addEventListener("click", exportPDF);

async function exportPDF() {
  const input = document.body;

  const canvas = await html2canvas(input, { scale: 2 });
  const img = canvas.toDataURL("image/png");

  const pdf = new jspdf.jsPDF("p", "mm", "a4");
  const width = 210;
  const height = (canvas.height * width) / canvas.width;

  pdf.addImage(img, "PNG", 0, 0, width, height);

  pdf.save("KCC-Bill.pdf");
}

/* ============================================================================
   THEME TOGGLE
============================================================================ */
$("#themeToggle").addEventListener("click", () => {
  const html = document.documentElement;
  html.dataset.theme = html.dataset.theme === "light" ? "dark" : "light";
});

/* ============================================================================
   INIT
============================================================================ */
function init() {
  loadRoomTariff();
}
init();
