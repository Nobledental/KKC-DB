/* ============================================================================
   Krishna Kidney Centre — Tariff Master
   100% Offline — Used by Billing Page
============================================================================ */

const tariffs = {

  /* ============================================================
     A. ROOM & DAILY CHARGES
  ============================================================ */
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
      room: 3000,
      nursing: 800,
      duty: 500,
      consult: 700
    },
    "Deluxe Room": {
      room: 4500,
      nursing: 1200,
      duty: 600,
      consult: 900
    }
  },

  /* ============================================================
     B. SURGICAL PACKAGES (CATEGORY-WISE)
     – Auto package_total included
  ============================================================ */
  packages: {
    /* ------------------------------
       Urology
    ------------------------------ */
    "URS Laser": {
      category: "Urology",
      ot: 18000,
      surgeon: 15000,
      assistant: 5000,
      anesthetist: 6000,
      implant: 0,
      gas: 2000,
      consumables: 3500
    },

    "PCNL": {
      category: "Urology",
      ot: 28000,
      surgeon: 20000,
      assistant: 8000,
      anesthetist: 7000,
      implant: 0,
      gas: 3000,
      consumables: 4000
    },

    "Cystoscopy": {
      category: "Urology",
      ot: 8000,
      surgeon: 6000,
      assistant: 2000,
      anesthetist: 3000,
      implant: 0,
      gas: 1500,
      consumables: 1000
    },

    /* ------------------------------
       General Surgery
    ------------------------------ */
    "Appendicectomy": {
      category: "General Surgery",
      ot: 15000,
      surgeon: 12000,
      assistant: 5000,
      anesthetist: 6000,
      implant: 0,
      gas: 2000,
      consumables: 3000
    },

    "Laparoscopic Hernia": {
      category: "General Surgery",
      ot: 25000,
      surgeon: 20000,
      assistant: 7000,
      anesthetist: 7000,
      implant: 10000,
      gas: 3000,
      consumables: 4000
    },

    /* ------------------------------
       Orthopedics
    ------------------------------ */
    "Knee Arthroscopy": {
      category: "Ortho",
      ot: 30000,
      surgeon: 25000,
      assistant: 8000,
      anesthetist: 7000,
      implant: 0,
      gas: 2500,
      consumables: 5000
    },

    "Total Knee Replacement": {
      category: "Ortho",
      ot: 60000,
      surgeon: 40000,
      assistant: 15000,
      anesthetist: 12000,
      implant: 85000,
      gas: 4000,
      consumables: 7000
    },

    /* ------------------------------
       ENT
    ------------------------------ */
    "Septoplasty": {
      category: "ENT",
      ot: 15000,
      surgeon: 16000,
      assistant: 5000,
      anesthetist: 7000,
      implant: 0,
      gas: 1500,
      consumables: 2000
    },

    "Tympanoplasty": {
      category: "ENT",
      ot: 20000,
      surgeon: 22000,
      assistant: 7000,
      anesthetist: 7000,
      implant: 3000,
      gas: 2000,
      consumables: 3000
    },

    /* ------------------------------
       Ophthalmology
    ------------------------------ */
    "Cataract Surgery": {
      category: "Ophthal",
      ot: 12000,
      surgeon: 15000,
      assistant: 3000,
      anesthetist: 4000,
      implant: 6000,
      gas: 1000,
      consumables: 2000
    }
  },

  /* ============================================================
     C. INVESTIGATIONS — SIMPLE LIST
  ============================================================ */
  investigations: [
    { name: "CBC", price: 350 },
    { name: "RFT", price: 600 },
    { name: "LFT", price: 700 },
    { name: "ECG", price: 300 },
    { name: "Ultrasound", price: 1500 },
    { name: "X-Ray", price: 400 },
    { name: "CT Scan", price: 4500 }
  ]
};

/* ============================================================
   AUTO-CALCULATE PACKAGE TOTAL FOR ALL PROCEDURES
============================================================ */
Object.keys(tariffs.packages).forEach(key => {
  const pkg = tariffs.packages[key];
  pkg.package_total =
    pkg.ot +
    pkg.surgeon +
    pkg.assistant +
    pkg.anesthetist +
    pkg.implant +
    pkg.gas +
    pkg.consumables;
});
