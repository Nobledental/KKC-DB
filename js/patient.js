/* ============================================================================
   PATIENT REGISTRATION LOGIC — KCC Billing OS
============================================================================ */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uhid").value = generateUHID();
  document.getElementById("ipNo").value = generateIP();
});

/* -------------------------------------------
   SAVE PATIENT
------------------------------------------- */
document.getElementById("savePatientBtn").onclick = async () => {

  const p = {
    uhid: document.getElementById("uhid").value.trim(),
    ipno: document.getElementById("ipNo").value.trim(),
    name: document.getElementById("pName").value.trim(),
    age: document.getElementById("pAge").value,
    gender: document.getElementById("pGender").value,
    doc: document.getElementById("pDoc").value.trim(),
    spec: document.getElementById("pSpec").value.trim(),
    payor: document.getElementById("pPayor").value,
    admDate: document.getElementById("admDate").value,
    bed: document.getElementById("bedType").value,
    nursingUnit: document.getElementById("nursingUnit").value.trim()
  };

  await storeSet("patients", p);
  alert("Patient Saved");
};
