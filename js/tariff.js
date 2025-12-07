/* ============================================================================
   TARIFF MANAGEMENT — KCC Billing OS
============================================================================ */

let tariffData = {
  id: "MASTER",
  rooms: [],
  misc: {},
  ot: {},
  packages: [],
  investigations: []
};

/* LOAD SAVED TARIFF */
(async () => {
  const saved = await storeGet("tariffs", "MASTER");
  if (saved) tariffData = saved;
  renderTariff();
})();

/* -------------------------------------------
   RENDER UI
------------------------------------------- */
function renderTariff() {

  /* ROOMS */
  const rt = document.getElementById("roomTariffs");
  rt.innerHTML = "";
  tariffData.rooms.forEach((r, i) => {
    rt.innerHTML += `
      <div>
        <label>Room Type</label>
        <input value="${r.name}" oninput="tariffData.rooms[${i}].name=this.value">
        <label>Rate</label>
        <input value="${r.rate}" type="number" oninput="tariffData.rooms[${i}].rate=this.value">
      </div>
    `;
  });

  /* MISC */
  const misc = document.getElementById("miscTariffs");
  misc.innerHTML = `
    <label>Nursing Charge</label>
    <input type="number" value="${tariffData.misc.nursing || 0}"
      oninput="tariffData.misc.nursing=this.value">

    <label>RMO/DMO Charge</label>
    <input type="number" value="${tariffData.misc.rmo || 0}"
      oninput="tariffData.misc.rmo=this.value">

    <label>Consultation Charge</label>
    <input type="number" value="${tariffData.misc.consult || 0}"
      oninput="tariffData.misc.consult=this.value">
  `;

  /* OT */
  const ot = document.getElementById("otTariffs");
  ot.innerHTML = `
    <label>OT Base Rate</label>
    <input type="number" value="${tariffData.ot.base || 0}"
      oninput="tariffData.ot.base=this.value">

    <label>OT Hourly Rate</label>
    <input type="number" value="${tariffData.ot.hourly || 0}"
      oninput="tariffData.ot.hourly=this.value">

    <label>Anesthesia per 30 min</label>
    <input type="number" value="${tariffData.ot.anes30 || 0}"
      oninput="tariffData.ot.anes30=this.value">
  `;

  /* PACKAGES */
  const pk = document.getElementById("packageList");
  pk.innerHTML = "";
  tariffData.packages.forEach((p, i) => {
    pk.innerHTML += `
      <div>
        <label>Package Name</label>
        <input value="${p.name}" 
          oninput="tariffData.packages[${i}].name=this.value">

        <label>Items (JSON)</label>
        <textarea oninput="tariffData.packages[${i}].items=JSON.parse(this.value)">${JSON.stringify(p.items)}</textarea>
      </div>
    `;
  });

  /* INVESTIGATIONS */
  const inv = document.getElementById("investigationList");
  inv.innerHTML = "";
  tariffData.investigations.forEach((r, i) => {
    inv.innerHTML += `
      <div>
        <label>Description</label>
        <input value="${r.desc}" oninput="tariffData.investigations[${i}].desc=this.value">

        <label>Rate</label>
        <input type="number" value="${r.rate}" 
          oninput="tariffData.investigations[${i}].rate=this.value">

        <label>GST %</label>
        <input type="number" value="${r.gst}" 
          oninput="tariffData.investigations[${i}].gst=this.value">
      </div>
    `;
  });
}

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
  const blob = new Blob([JSON.stringify(tariffData)], { type: "application/json" });
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
  const txt = await file.text();
  tariffData = JSON.parse(txt);
  await storeSet("tariffs", tariffData);
  renderTariff();
};

/* -------------------------------------------
   SAVE ON CHANGE
------------------------------------------- */
window.onbeforeunload = () => storeSet("tariffs", tariffData);
