/* ============================================================================
   TARIFF MASTER — FULL DATA CONFIG
   Krishna Kidney Centre — Hospital Billing OS
   100% offline tariff dataset
============================================================================ */

const TariffMaster = {

  /* ----------------------------------------------------------
     A. ROOM & DAILY CHARGES
  ---------------------------------------------------------- */
  rooms: {
    "General Ward": {
      room: 1200,
      nursing: 400,
      duty: 300,
      consult: 500
    },
    "Semi-Private": {
      room: 2000,
      nursing: 600,
      duty: 400,
      consult: 600
    },
    "Private Room": {
      room: 3500,
      nursing: 750,
      duty: 450,
      consult: 700
    },
    "Deluxe Room": {
      room: 4500,
      nursing: 900,
      duty: 500,
      consult: 800
    },
    "Suite": {
      room: 6000,
      nursing: 1200,
      duty: 600,
      consult: 1000
    }
  },

  /* ----------------------------------------------------------
     B. SURGICAL PACKAGES (Grouped)
  ---------------------------------------------------------- */
  packages: [

    /* ---------------- ENT ---------------- */
    {
      category: "ENT",
      name: "Septoplasty",
      ot: 12000,
      surgeon: 18000,
      assistant: 6000,
      anesthetist: 5000,
      implant: 0,
      gas: 2000,
      consumables: 3000
    },
    {
      category: "ENT",
      name: "Tonsillectomy",
      ot: 10000,
      surgeon: 15000,
      assistant: 5000,
      anesthetist: 4000,
      implant: 0,
      gas: 2000,
      consumables: 2500
    },

    /* ---------------- ORTHO ---------------- */
    {
      category: "Ortho",
      name: "ACL Reconstruction",
      ot: 25000,
      surgeon: 40000,
      assistant: 15000,
      anesthetist: 8000,
      implant: 35000,
      gas: 6000,
      consumables: 12000
    },
    {
      category: "Ortho",
      name: "Hip Replacement",
      ot: 35000,
      surgeon: 50000,
      assistant: 20000,
      anesthetist: 9000,
      implant: 70000,
      gas: 8000,
      consumables: 18000
    },

    /* ---------------- UROLOGY ---------------- */
    {
      category: "Urology",
      name: "PCNL",
      ot: 18000,
      surgeon: 35000,
      assistant: 12000,
      anesthetist: 6000,
      implant: 25000,
      gas: 5000,
      consumables: 10000
    },
    {
      category: "Urology",
      name: "TURP",
      ot: 15000,
      surgeon: 30000,
      assistant: 10000,
      anesthetist: 5000,
      implant: 0,
      gas: 4000,
      consumables: 8000
    },

    /* ----------- GENERAL SURGERY ----------- */
    {
      category: "General Surgery",
      name: "Appendicectomy",
      ot: 12000,
      surgeon: 22000,
      assistant: 9000,
      anesthetist: 6000,
      implant: 0,
      gas: 3000,
      consumables: 6000
    },
    {
      category: "General Surgery",
      name: "Laparoscopic Cholecystectomy",
      ot: 20000,
      surgeon: 35000,
      assistant: 15000,
      anesthetist: 7000,
      implant: 0,
      gas: 5000,
      consumables: 10000
    },

    /* ---------------- OBGY ---------------- */
    {
      category: "OBGY",
      name: "Cesarean Delivery",
      ot: 18000,
      surgeon: 30000,
      assistant: 10000,
      anesthetist: 6000,
      implant: 0,
      gas: 4000,
      consumables: 7000
    },
    {
      category: "OBGY",
      name: "Hysterectomy",
      ot: 25000,
      surgeon: 38000,
      assistant: 15000,
      anesthetist: 9000,
      implant: 0,
      gas: 6000,
      consumables: 12000
    },

    /* ---------------- CARDIAC ---------------- */
    {
      category: "Cardiac",
      name: "Angioplasty",
      ot: 40000,
      surgeon: 60000,
      assistant: 25000,
      anesthetist: 12000,
      implant: 80000,
      gas: 6000,
      consumables: 20000
    },
    {
      category: "Cardiac",
      name: "CABG",
      ot: 50000,
      surgeon: 80000,
      assistant: 30000,
      anesthetist: 15000,
      implant: 100000,
      gas: 10000,
      consumables: 25000
    },

    /* ---------------- OPHTHAL ---------------- */
    {
      category: "Ophthal",
      name: "Cataract Surgery",
      ot: 8000,
      surgeon: 12000,
      assistant: 4000,
      anesthetist: 3000,
      implant: 15000,
      gas: 2000,
      consumables: 3000
    },
    {
      category: "Ophthal",
      name: "Vitrectomy",
      ot: 15000,
      surgeon: 25000,
      assistant: 10000,
      anesthetist: 6000,
      implant: 30000,
      gas: 4000,
      consumables: 8000
    }
  ],

  /* ----------------------------------------------------------
     C. INVESTIGATIONS TARIFF
  ---------------------------------------------------------- */
  investigations: [
    { name: "Complete Blood Count", price: 450 },
    { name: "Renal Function Test", price: 900 },
    { name: "Liver Function Test", price: 800 },
    { name: "Urine Routine", price: 200 },
    { name: "Ultrasound Abdomen", price: 1500 },
    { name: "X-Ray Chest", price: 400 },
    { name: "ECG", price: 300 },
    { name: "CT Scan", price: 5000 },
    { name: "MRI Scan", price: 8000 }
  ]
};


/* ============================================================================
   AUTO-GENERATE PACKAGE TOTALS
============================================================================ */
TariffMaster.packages = TariffMaster.packages.map(pkg => ({
  ...pkg,
  package_total:
    pkg.ot +
    pkg.surgeon +
    pkg.assistant +
    pkg.anesthetist +
    pkg.implant +
    pkg.gas +
    pkg.consumables
}));

