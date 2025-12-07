/* ============================================================================
   TARIFF MANAGEMENT — KCC BILLING OS (UPGRADED)
============================================================================ */

let tariffData = {
  id: "MASTER",
  rooms: [],
  misc: { nursing: 0, rmo: 0, consult: 0 },
  ot: { base: 0, hourly: 0, anes30: 0 },
  packages: [],
  investigations: []
};

/* -------------------------------------------
   LOAD TARIFF FROM DB
------------------------------------------- */
(async () => {
  const saved = await storeGet("tariffs", "MASTER");
  if (saved) tariffData = saved;
  renderTariff();
})();

/* -------------------------------------------
   RENDER UI
------------------------------------------- */
function renderTariff() {

  /* ========== ROOMS ========== */
  const rt = document.getElementById("roomTariffs");
  rt.innerHTML = "";

  tariffData.rooms.forEach((r, i) => {
    rt.innerHTML += `
      <div class="tariff-item">
        <label>Room Type</label>
        <input value="${r.name}" 
               oninput="tariffData.rooms[${i}].name=this.value">

        <label>Rate (per day)</label>
        <input type="number" value="${r.rate}" 
               oninput="tariffData.rooms[${i}].rate=+this.value">

        <button class="delete-btn" onclick="deleteRoom(${i})">Delete</button>
      </div>
    `;
  });

  /* ========== MISC CHARGES ========== */
  document.getElementById("miscTariffs").innerHTML = `
    <div class="tariff-item">
      <label>Nursing Charge (per day)</label>
      <input type="number" value="${tariffData.misc.nursing}"
        oninput="tariffData.misc.nursing=+this.value">

      <label>RMO/DMO Charge (per day)</label>
      <input type="number" value="${tariffData.misc.rmo}"
        oninput="tariffData.misc.rmo=+this.value">

      <label>Consultation Charge (per session)</label>
      <input type="number" value="${tariffData.misc.consult}"
        oninput="tariffData.misc.consult=+this.value">
    </div>
  `;

  /* ========== OT TARIFF ========== */
  document.getElementById("otTariffs").innerHTML = `
    <div class="tariff-item">
      <label>OT Base Rate</label>
      <input type="number" value="${tariffData.ot.base}"
        oninput="tariffData.ot.base=+this.value">

      <label>OT Hourly Rate</label>
      <input type="number" value="${tariffData.ot.hourly}"
        oninput="tariffData.ot.hourly=+this.value">

      <label>Anesthesia (per 30 min)</label>
      <input type="number" value="${tariffData.ot.anes30}"
        oninput="tariffData.ot.anes30=+this.value">
    </div>
  `;

  /* ========== PACKAGES ========== */
  const pk = document.getElementById("packageList");
  pk.innerHTML = "";

  tariffData.packages.forEach((p, i) => {
    pk.innerHTML += `
      <div class="tariff-item">
        <label>Package Name</label>
        <input value="${p.name}" 
               oninput="tariffData.packages[${i}].name=this.value">

        <label>Package Items (JSON array)</label>
        <textarea oninput="updatePackage(${i}, this.value)">
${JSON.stringify(p.items, null, 2)}</textarea>

        <button class="delete-btn" onclick="deletePackage(${i})">Delete</button>
      </div>
    `;
  });

  /* ========== INVESTIGATIONS ========== */
  const inv = document.getElementById("investigationList");
  inv.innerHTML = "";

  tariffData.investigations.forEach((r, i) => {
    inv.innerHTML += `
      <div class="tariff-item">
        <label>Description</label>
        <input value="${r.desc}" oninput="tariffData.investigations[${i}].desc=this.value">

        <label>Rate</label>
        <input type="number" value="${r.rate}" 
               oninput="tariffData.investigations[${i}].rate=+this.value">

        <label>GST %</label>
        <input type="number" value="${r.gst}" 
               oninput="tariffData.investigations[${i}].gst=+this.value">

        <button class="delete-btn" onclick="deleteInvestigation(${i})">Delete</button>
      </div>
    `;
  });
}

/* -------------------------------------------
   UPDATE PACKAGE JSON SAFELY
------------------------------------------- */
function updatePackage(i, txt) {
  try {
    tariffData.packages[i].items = JSON.parse(txt);
  } catch (e) {}
}

/* -------------------------------------------
   DELETE FUNCTIONS
------------------------------------------- */
function deleteRoom(i){ tariffData.rooms.splice(i,1); renderTariff(); }
function deletePackage(i){ tariffData.packages.splice(i,1); renderTariff(); }
function deleteInvestigation(i){ tariffData.investigations.splice(i,1); renderTariff(); }

/* -------------------------------------------
   ADD NEW ITEMS
------------------------------------------- */
document.getElementById("addRoomTariff").onclick = () => {
  tariffData.rooms.push({ name: "", rate: 0 });
  renderTariff();
};

document.getElementById("addPackageBtn").onclick = () => {
  tariffData.packages.push({ name: "", items: [] });
  renderTariff();
};

document.getElementById("addInvestigationBtn").onclick = () => {
  tariffData.investigations.push({ desc: "", rate: 0, gst: 0 });
  renderTariff();
};

/* -------------------------------------------
   EXPORT JSON
------------------------------------------- */
document.getElementById("exportTariff").onclick = () => {
  const blob = new Blob([JSON.stringify(tariffData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "tariff.json";
  a.click();
};

/* -------------------------------------------
   IMPORT JSON
------------------------------------------- */
document.getElementById("importTariffBtn").onclick = () => {
  document.getElementById("importTariff").click();
};

document.getElementById("importTariff").onchange = async function () {
  const file = this.files[0];
  if (!file) return;

  try {
    const txt = await file.text();
    tariffData = JSON.parse(txt);
    await storeSet("tariffs", tariffData);
    renderTariff();
  } catch (e) {
    alert("Invalid JSON file");
  }
};

/* -------------------------------------------
   AUTO SAVE BEFORE LEAVING
------------------------------------------- */
window.onbeforeunload = () => storeSet("tariffs", tariffData);
