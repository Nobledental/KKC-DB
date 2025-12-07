/* ============================================================================
   PATIENT REGISTRATION MODULE — KCC BILLING OS (UPGRADED)
============================================================================ */

/* AUTO-FILL UHID + IP ON LOAD */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("uhid").value = generateUHID();
  document.getElementById("ipNo").value = generateIP();
});

/* VALIDATION HELPER */
function validatePatient(p) {
  if (!p.name) return "Enter patient name.";
  if (!p.age) return "Enter patient age.";
  if (!p.admDate) return "Select admission date.";
  return null;
}

/* SAVE PATIENT ------------------------------------------------------------- */
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

  /* VALIDATE */
  const err = validatePatient(p);
  if (err) return alert(err);

  await storeSet("patients", p);

  alert("Patient Saved Successfully");
  
  /* Generate next UHID/IP ready for next entry */
  document.getElementById("uhid").value = generateUHID();
  document.getElementById("ipNo").value = generateIP();
  document.getElementById("patientForm").reset();
};
