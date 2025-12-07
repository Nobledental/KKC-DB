/* ===============================
   LOAD BILL FROM localStorage
================================= */

const bill = JSON.parse(localStorage.getItem("billPreview") || "{}");

function set(id, value) {
  document.getElementById(id).textContent = value ?? "";
}

/* ===============================
   FILL HEADER
================================= */

set("bill_no", bill.bill_no);
set("bill_date", bill.bill_date);

/* ===============================
   FILL PATIENT INFO
================================= */

set("p_name", bill.patient.name);
set("p_id", bill.patient.id);
set("p_age_gender", `${bill.patient.age} / ${bill.patient.gender}`);
set("p_doctor", bill.patient.doctor);
set("p_doa", bill.patient.admission_date);
set("p_dod", bill.patient.discharge_date);
set("p_los", bill.los);
set("p_payment_type", bill.payment_type);

/* ===============================
   BILLING TABLE
================================= */

const tbody = document.querySelector("#bill_table tbody");

bill.items.forEach(item => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${item.desc}</td>
    <td class="right">${item.qty}</td>
    <td class="right">${item.rate.toLocaleString("en-IN")}</td>
    <td class="right">${item.total.toLocaleString("en-IN")}</td>
  `;
  tbody.appendChild(tr);
});

/* ===============================
   TOTALS
================================= */

set("gross_total", `₹ ${bill.gross_total.toLocaleString("en-IN")}`);

/* ===============================
   RECEIPTS
================================= */

const receiptBox = document.getElementById("receipt_list");

bill.receipts.forEach(r => {
  const div = document.createElement("div");
  div.className = "receipt-line";
  div.innerHTML = `
    <p><strong>${r.mode}</strong> — ₹${r.amount.toLocaleString("en-IN")} (${r.date})</p>
  `;
  receiptBox.appendChild(div);
});

set("paid_total", `₹ ${bill.paid_total.toLocaleString("en-IN")}`);
set("balance_amt", `₹ ${bill.balance.toLocaleString("en-IN")}`);

/* ===============================
   AUTO PRINT (Optional)
================================= */
// window.print();
