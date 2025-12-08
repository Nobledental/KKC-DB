/* ============================================================
   SIMPLE STORAGE (localStorage)
============================================================ */
function load(key){
  return JSON.parse(localStorage.getItem(key) || "null");
}
function save(key,val){
  localStorage.setItem(key,JSON.stringify(val));
}

/* ============================================================
   GLOBAL STATE
============================================================ */
let billItems=[];
let receipts=[];
let tariff=null;
let history = load("history") || [];

/* ============================================================
   AUTO INIT TARIFF DATA
============================================================ */
function initTariff(){
  if(load("tariff")){ tariff = load("tariff"); return; }

  tariff = {
    rooms:{
      "General Ward":{room:1200,nursing:400,doctor:600},
      "Semi Private":{room:2000,nursing:600,doctor:800},
      "Private":{room:3500,nursing:800,doctor:1200},
      "Deluxe":{room:5000,nursing:1200,doctor:1500}
    },
    doctors:["Dr. B.K. Srinivasan","Dr. Rajesh","Dr. Kumar"],
    packages:{
      "URS Procedure":{
        package:50000,
        breakup:[
          {d:"Surgeon Fees",r:50000,q:1},
          {d:"Assistant Surgeon Fees",r:16000,q:1},
          {d:"DJ Stenting",r:12000,q:1},
          {d:"Anaesthesia Fees",r:10000,q:1},
          {d:"OT Charge",r:12000,q:1}
        ]
      }
    }
  };

  save("tariff",tariff);
}
initTariff();


/* ============================================================
   LOAD DROPDOWNS
============================================================ */
function loadDropdowns(){
  let r=document.getElementById("ui_roomCat");
  r.innerHTML="";
  Object.keys(tariff.rooms).forEach(x=>{
    let o=document.createElement("option");
    o.text=x; r.add(o);
  });

  let d=document.getElementById("ui_doc");
  d.innerHTML="";
  tariff.doctors.forEach(x=>{
    let o=document.createElement("option");
    o.text=x; d.add(o);
  });
}
loadDropdowns();


/* ============================================================
   AUTO GENERATE BILL NO
============================================================ */
function uniqBillNo(){
  return "BILL-" + Math.floor(Math.random()*999999999);
}


/* ============================================================
   ADD NEW ITEM
============================================================ */
function addItem(){
  let cat = ui_cat.value;
  let desc = ui_desc.value;
  let rate = parseFloat(ui_rate.value || 0);
  let qty = parseFloat(ui_qty.value || 1);
  let date = ui_date.value;

  if(cat==="Pharmacy" || cat==="Investigation"){
    date = ""; // as requested
  }

  // Packages
  if(cat==="Package" || cat==="Surgical"){
    if(tariff.packages[desc]){
      tariff.packages[desc].breakup.forEach(x=>{
        let g = x.r * x.q;
        billItems.push({
          cat:"Surgical",
          date:"",
          desc:x.d,
          rate:x.r,
          qty:x.q,
          gross:g,
          net:g
        });
      });
    }
  } else {
    let gross = rate * qty;
    billItems.push({
      cat, desc, rate, qty, date,
      gross, net:gross
    });
  }

  renderUI();
}


/* ============================================================
   AUTO-ADD ROOM DAYS
============================================================ */
ui_dod.addEventListener("change", addRoomDays);

function addRoomDays(){
  let doa = ui_doa.value;
  let dod = ui_dod.value;
  if(!doa || !dod) return;

  let room = ui_roomCat.value;
  let info = tariff.rooms[room];
  if(!info) return;

  let s = new Date(doa), e = new Date(dod);
  let days = Math.ceil((e - s) / 86400000);

  for(let i=0;i<days;i++){
    let d = new Date(s.getTime()+i*86400000).toISOString().split("T")[0];

    billItems.push({cat:"Room Rent",date:d,desc:`Room: ${room}`,rate:info.room,qty:1,gross:info.room,net:info.room});
    billItems.push({cat:"Nursing",date:d,desc:`Nursing`,rate:info.nursing,qty:1,gross:info.nursing,net:info.nursing});
    billItems.push({cat:"Doctor Visit",date:d,desc:`Professional Visit`,rate:info.doctor,qty:2,gross:info.doctor*2,net:info.doctor*2});
  }

  renderUI();
}


/* ============================================================
   ADD RECEIPT
============================================================ */
function addReceipt(){
  let amt = parseFloat(ui_ramt.value||0);
  let recTot = receipts.reduce((a,b)=>a+b.amt,0);

  let gross = billItems.reduce((a,b)=>a+b.gross,0);

  if(recTot + amt > gross){
    alert("Receipt exceeds total bill amount!");
    return;
  }

  receipts.push({
    no: "R" + (receipts.length+1),
    date: ui_rdate.value,
    amt,
    mode: ui_rmode.value
  });

  renderUI();
}


/* ============================================================
   RENDER UI TABLES
============================================================ */
function renderUI(){
  let tb = ui_billBody;
  tb.innerHTML="";

  let gross=0, ret=0, rec=0;

  billItems.forEach(x=>{
    gross += x.gross;
    if(x.cat==="Returns") ret += x.gross;

    tb.innerHTML+=`
      <tr>
        <td>${x.cat}</td>
        <td>${x.date}</td>
        <td>${x.desc}</td>
        <td>${x.rate}</td>
        <td>${x.qty}</td>
        <td>${x.gross}</td>
        <td>${x.net}</td>
      </tr>`;
  });

  receipts.forEach(x=>{
    rec+=x.amt;
  });

  ui_s_gross.innerText="₹"+gross;
  ui_s_ret.innerText="₹"+ret;
  ui_s_rec.innerText="₹"+rec;
  ui_s_final.innerText="₹"+(gross-ret-rec);
}


/* ============================================================
   SAVE BILL
============================================================ */
function saveBill(){
  let finalGross = billItems.reduce((a,b)=>a+b.gross,0);
  let rec = receipts.reduce((a,b)=>a+b.amt,0);
  if(rec > finalGross){
    alert("Receipts exceed total!");
    return;
  }

  let billNo = uniqBillNo();
  let data = {
    billNo,
    patient:{
      name:ui_name.value,
      age:ui_age.value,
      gender:ui_gender.value,
      uhid:ui_uhid.value,
      ip:ui_ip.value,
      room:ui_roomCat.value,
      doc:ui_doc.value,
      spec:ui_spec.value,
      ins:ui_ins.value==="Yes"?ui_insName.value:"No",
      doa:ui_doa.value,
      dod:ui_dod.value
    },
    items:billItems,
    receipts:receipts,
    date:new Date().toISOString()
  };

  history.push(data);
  save("history",history);

  alert("Bill Saved!");
  loadHistoryTable();
}


/* ============================================================
   LOAD HISTORY TABLE
============================================================ */
function loadHistoryTable(){
  historyTable.innerHTML="";
  history.forEach(x=>{
    historyTable.innerHTML+=`
      <tr>
        <td>${x.billNo}</td>
        <td>${x.patient.name}</td>
        <td>${x.patient.uhid}</td>
        <td>${x.date.split("T")[0]}</td>
        <td><button onclick="loadBill('${x.billNo}')">Open</button></td>
      </tr>
    `;
  });
}
loadHistoryTable();


/* ============================================================
   LOAD BILL BACK INTO UI
============================================================ */
function loadBill(no){
  let b = history.find(x=>x.billNo==no);
  if(!b) return;

  billItems = JSON.parse(JSON.stringify(b.items));
  receipts  = JSON.parse(JSON.stringify(b.receipts));

  // patient
  ui_name.value = b.patient.name;
  ui_age.value = b.patient.age;
  ui_gender.value = b.patient.gender;
  ui_uhid.value = b.patient.uhid;
  ui_ip.value = b.patient.ip;
  ui_roomCat.value = b.patient.room;
  ui_doc.value = b.patient.doc;
  ui_spec.value = b.patient.spec;
  ui_ins.value = b.patient.ins==="No"?"No":"Yes";
  ui_insName.value = b.patient.ins==="No"?"":b.patient.ins;
  ui_doa.value = b.patient.doa;
  ui_dod.value = b.patient.dod;

  renderUI();

  document.querySelector(`[data-screen="billingScreen"]`).click();
}


/* ============================================================
   PREPARE PRINT VIEW
============================================================ */
function preparePrint(){
  let name = ui_name.value;
  let age = ui_age.value;
  let gender = ui_gender.value;
  let doa = ui_doa.value;
  let dod = ui_dod.value;

  b_invoice.innerText = uniqBillNo();
  b_name.innerText = name;
  b_age_gender.innerText = `${age}Y / ${gender}`;
  b_doa.innerText = doa.replace("T"," ");
  b_dod.innerText = dod.replace("T"," ");
  b_doc.innerText = ui_doc.value;
  b_spec.innerText = ui_spec.value;
  b_ins.innerText = ui_ins.value==="Yes"?ui_insName.value:"No";

  b_items.innerHTML="";
  let total=0;

  billItems.forEach(x=>{
    b_items.innerHTML+=`
      <div class="row">
        <div>${x.desc}</div>
        <div>${x.rate}</div>
        <div>${x.qty}</div>
        <div>${x.gross}</div>
      </div>
    `;
    total+=x.gross;
  });

  let rec = receipts.reduce((a,b)=>a+b.amt,0);

  s_gross.innerText="₹"+total;
  s_final.innerText="₹"+total;

  // receipts print
  receiptLines.innerHTML="";
  receipts.forEach(r=>{
    receiptLines.innerHTML+=`
      <div class="sum-line">
        <span>${r.no} (${r.date})</span>
        <strong>₹${r.amt}</strong>
      </div>
    `;
  });

  rc_total.innerText="₹"+rec;
  rc_balance.innerText="₹"+(total - rec);

  window.print();
}


/* ============================================================
   SWITCH SCREENS
============================================================ */
document.querySelectorAll(".sidebar-nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".sidebar-nav button").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
    document.getElementById(btn.dataset.screen).classList.add("active");
  });
});
