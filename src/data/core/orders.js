// CANONICAL FIXTURE - the 50 orders.
// Every feature fixture references these by id. Never invent a new id in a
// feature fixture file; add it here or reuse an existing one.
// Generated once and committed. Edit by hand from here on.

export const orders = [
  {
    "id": "ORD-0001",
    "jewellerId": "JWL-001",
    "manufacturerIds": [
      "MFR-008",
      "MFR-007",
      "MFR-006"
    ],
    "status": "delivered",
    "placedAt": "2026-07-14T04:30:00.000Z",
    "confirmedAt": "2026-07-14T23:30:00.000Z",
    "dispatchedAt": "2026-07-17T21:30:00.000Z",
    "deliveredAt": "2026-07-25T01:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0001-L1",
        "productId": "PRD-008",
        "manufacturerId": "MFR-008",
        "title": "24K Polki Charm Bracelet",
        "sku": "008-BRA-0008",
        "purity": 24,
        "netWeight": 14.902,
        "quantity": 3,
        "unitPrice": 145784,
        "lineTotal": 437352,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0001-L2",
        "productId": "PRD-021",
        "manufacturerId": "MFR-007",
        "title": "18K Polki Antique Bangle",
        "sku": "007-BAN-0021",
        "purity": 18,
        "netWeight": 18.822,
        "quantity": 1,
        "unitPrice": 146869,
        "lineTotal": 146869,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0001-L3",
        "productId": "PRD-034",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Stud Nose Pin",
        "sku": "006-NOS-0034",
        "purity": 22,
        "netWeight": 0.808,
        "quantity": 3,
        "unitPrice": 7322,
        "lineTotal": 21966,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 65.952,
    "goodsValue": 606187,
    "shipping": 850,
    "insurance": 909,
    "total": 607946,
    "commissionPercent": 3.86,
    "commission": 23399,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY376611",
      "capturedAt": "2026-07-13T23:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 582788,
      "settledAt": "2026-07-29T17:30:00.000Z",
      "nodalReference": "NODAL34013"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": "SEQ4208532"
  },
  {
    "id": "ORD-0002",
    "jewellerId": "JWL-002",
    "manufacturerIds": [
      "MFR-001",
      "MFR-025"
    ],
    "status": "delivered",
    "placedAt": "2026-08-08T03:30:00.000Z",
    "confirmedAt": "2026-08-08T22:30:00.000Z",
    "dispatchedAt": "2026-08-17T04:30:00.000Z",
    "deliveredAt": "2026-08-21T02:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0002-L1",
        "productId": "PRD-015",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Long Mangalsutra",
        "sku": "001-MAN-0015",
        "purity": 22,
        "netWeight": 15.94,
        "quantity": 1,
        "unitPrice": 154719,
        "lineTotal": 154719,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0002-L2",
        "productId": "PRD-028",
        "manufacturerId": "MFR-025",
        "title": "24K Temple Chandbali Pair",
        "sku": "025-EAR-0028",
        "purity": 24,
        "netWeight": 16.349,
        "quantity": 3,
        "unitPrice": 167306,
        "lineTotal": 501918,
        "metalRateAtConfirmation": 7850
      }
    ],
    "totalNetWeight": 64.987,
    "goodsValue": 656637,
    "shipping": 850,
    "insurance": 985,
    "total": 658472,
    "commissionPercent": 5.23,
    "commission": 34342,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY353998",
      "capturedAt": "2026-08-07T19:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 622295,
      "settledAt": "2026-08-26T19:30:00.000Z",
      "nodalReference": "NODAL94315"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ5927420"
  },
  {
    "id": "ORD-0003",
    "jewellerId": "JWL-003",
    "manufacturerIds": [
      "MFR-008"
    ],
    "status": "delivered",
    "placedAt": "2026-04-06T02:30:00.000Z",
    "confirmedAt": "2026-04-06T19:30:00.000Z",
    "dispatchedAt": "2026-04-11T23:30:00.000Z",
    "deliveredAt": "2026-04-12T23:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0003-L1",
        "productId": "PRD-022",
        "manufacturerId": "MFR-008",
        "title": "22K Polki Stud Nose Pin",
        "sku": "008-NOS-0022",
        "purity": 22,
        "netWeight": 1.093,
        "quantity": 1,
        "unitPrice": 11428,
        "lineTotal": 11428,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 1.093,
    "goodsValue": 11428,
    "shipping": 850,
    "insurance": 17,
    "total": 12295,
    "commissionPercent": 3.86,
    "commission": 441,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY689610",
      "capturedAt": "2026-04-06T00:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 10987,
      "settledAt": "2026-04-22T16:30:00.000Z",
      "nodalReference": "NODAL22353"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ8370435"
  },
  {
    "id": "ORD-0004",
    "jewellerId": "JWL-004",
    "manufacturerIds": [
      "MFR-001",
      "MFR-010",
      "MFR-005"
    ],
    "status": "delivered",
    "placedAt": "2026-05-05T03:30:00.000Z",
    "confirmedAt": "2026-05-05T23:30:00.000Z",
    "dispatchedAt": "2026-05-10T20:30:00.000Z",
    "deliveredAt": "2026-05-14T03:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0004-L1",
        "productId": "PRD-029",
        "manufacturerId": "MFR-001",
        "title": "24K Temple Antique Anklet Pair",
        "sku": "001-ANK-0029",
        "purity": 24,
        "netWeight": 29.531,
        "quantity": 1,
        "unitPrice": 306606,
        "lineTotal": 306606,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0004-L2",
        "productId": "PRD-052",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Lakshmi Pendant",
        "sku": "010-PEN-0052",
        "purity": 18,
        "netWeight": 7.398,
        "quantity": 2,
        "unitPrice": 61397,
        "lineTotal": 122794,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0004-L3",
        "productId": "PRD-005",
        "manufacturerId": "MFR-005",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "005-MAN-0005",
        "purity": 22,
        "netWeight": 10.288,
        "quantity": 1,
        "unitPrice": 99361,
        "lineTotal": 99361,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 54.615,
    "goodsValue": 528761,
    "shipping": 850,
    "insurance": 793,
    "total": 530404,
    "commissionPercent": 5.23,
    "commission": 27654,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY531168",
      "capturedAt": "2026-05-04T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 501107,
      "settledAt": "2026-05-20T19:30:00.000Z",
      "nodalReference": "NODAL32825"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Mumbai",
    "awb": "SEQ5667316"
  },
  {
    "id": "ORD-0005",
    "jewellerId": "JWL-005",
    "manufacturerIds": [
      "MFR-008",
      "MFR-003"
    ],
    "status": "delivered",
    "placedAt": "2026-02-14T23:30:00.000Z",
    "confirmedAt": "2026-02-15T21:30:00.000Z",
    "dispatchedAt": "2026-02-19T22:30:00.000Z",
    "deliveredAt": "2026-02-26T00:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0005-L1",
        "productId": "PRD-036",
        "manufacturerId": "MFR-008",
        "title": "24K Polki Charm Bracelet",
        "sku": "008-BRA-0036",
        "purity": 24,
        "netWeight": 20.718,
        "quantity": 1,
        "unitPrice": 202649,
        "lineTotal": 202649,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0005-L2",
        "productId": "PRD-059",
        "manufacturerId": "MFR-003",
        "title": "18K Kada Pair",
        "sku": "003-BAN-0059",
        "purity": 18,
        "netWeight": 50.566,
        "quantity": 3,
        "unitPrice": 420805,
        "lineTotal": 1262415,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 172.416,
    "goodsValue": 1465064,
    "shipping": 850,
    "insurance": 2198,
    "total": 1468112,
    "commissionPercent": 3.86,
    "commission": 56551,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY619112",
      "capturedAt": "2026-02-14T22:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 1408513,
      "settledAt": "2026-03-05T22:30:00.000Z",
      "nodalReference": "NODAL88129"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": "SEQ5808842"
  },
  {
    "id": "ORD-0006",
    "jewellerId": "JWL-006",
    "manufacturerIds": [
      "MFR-011"
    ],
    "status": "delivered",
    "placedAt": "2026-04-11T04:30:00.000Z",
    "confirmedAt": "2026-04-11T23:30:00.000Z",
    "dispatchedAt": "2026-04-18T21:30:00.000Z",
    "deliveredAt": "2026-04-23T01:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0006-L1",
        "productId": "PRD-053",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Stud Nose Pin",
        "sku": "011-NOS-0053",
        "purity": 22,
        "netWeight": 0.621,
        "quantity": 1,
        "unitPrice": 5841,
        "lineTotal": 5841,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 0.621,
    "goodsValue": 5841,
    "shipping": 850,
    "insurance": 9,
    "total": 6700,
    "commissionPercent": 5.57,
    "commission": 325,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY255885",
      "capturedAt": "2026-04-11T01:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 5516,
      "settledAt": "2026-04-25T04:30:00.000Z",
      "nodalReference": "NODAL55165"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": "SEQ2433751"
  },
  {
    "id": "ORD-0007",
    "jewellerId": "JWL-007",
    "manufacturerIds": [
      "MFR-004"
    ],
    "status": "delivered",
    "placedAt": "2026-03-27T03:30:00.000Z",
    "confirmedAt": "2026-03-28T04:30:00.000Z",
    "dispatchedAt": "2026-03-30T01:30:00.000Z",
    "deliveredAt": "2026-04-04T04:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0007-L1",
        "productId": "PRD-060",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Cocktail Ring",
        "sku": "004-RIN-0060",
        "purity": 22,
        "netWeight": 8.832,
        "quantity": 1,
        "unitPrice": 87087,
        "lineTotal": 87087,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 8.832,
    "goodsValue": 87087,
    "shipping": 850,
    "insurance": 131,
    "total": 88068,
    "commissionPercent": 5.16,
    "commission": 4494,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY159470",
      "capturedAt": "2026-03-26T22:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 82593,
      "settledAt": "2026-04-12T19:30:00.000Z",
      "nodalReference": "NODAL48802"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": "SEQ7870533"
  },
  {
    "id": "ORD-0008",
    "jewellerId": "JWL-008",
    "manufacturerIds": [
      "MFR-007"
    ],
    "status": "delivered",
    "placedAt": "2026-06-19T18:30:00.000Z",
    "confirmedAt": "2026-06-20T21:30:00.000Z",
    "dispatchedAt": "2026-06-24T23:30:00.000Z",
    "deliveredAt": "2026-07-01T04:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0008-L1",
        "productId": "PRD-007",
        "manufacturerId": "MFR-007",
        "title": "14K Polki Daily Wear Bangle Pair",
        "sku": "007-BAN-0007",
        "purity": 14,
        "netWeight": 43.64,
        "quantity": 2,
        "unitPrice": 270830,
        "lineTotal": 541660,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 87.28,
    "goodsValue": 541660,
    "shipping": 850,
    "insurance": 812,
    "total": 543322,
    "commissionPercent": 3.64,
    "commission": 19716,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY289464",
      "capturedAt": "2026-06-20T00:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 521944,
      "settledAt": "2026-07-06T20:30:00.000Z",
      "nodalReference": "NODAL80735"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": "SEQ9895437"
  },
  {
    "id": "ORD-0009",
    "jewellerId": "JWL-009",
    "manufacturerIds": [
      "MFR-025",
      "MFR-024",
      "MFR-006",
      "MFR-003"
    ],
    "status": "delivered",
    "placedAt": "2026-03-07T18:30:00.000Z",
    "confirmedAt": "2026-03-08T18:30:00.000Z",
    "dispatchedAt": "2026-03-12T21:30:00.000Z",
    "deliveredAt": "2026-03-18T00:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0009-L1",
        "productId": "PRD-014",
        "manufacturerId": "MFR-025",
        "title": "22K Temple Temple Armlet",
        "sku": "025-TEM-0014",
        "purity": 22,
        "netWeight": 106.909,
        "quantity": 3,
        "unitPrice": 989661,
        "lineTotal": 2968983,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0009-L2",
        "productId": "PRD-027",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Gents Ring",
        "sku": "024-RIN-0027",
        "purity": 22,
        "netWeight": 5.456,
        "quantity": 3,
        "unitPrice": 47282,
        "lineTotal": 141846,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0009-L3",
        "productId": "PRD-048",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Long Mangalsutra",
        "sku": "006-MAN-0048",
        "purity": 22,
        "netWeight": 25.267,
        "quantity": 3,
        "unitPrice": 212539,
        "lineTotal": 637617,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0009-L4",
        "productId": "PRD-003",
        "manufacturerId": "MFR-003",
        "title": "22K Tennis Bracelet",
        "sku": "003-BRA-0003",
        "purity": 22,
        "netWeight": 14.561,
        "quantity": 1,
        "unitPrice": 131381,
        "lineTotal": 131381,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 427.457,
    "goodsValue": 3879827,
    "shipping": 850,
    "insurance": 5820,
    "total": 3886497,
    "commissionPercent": 3.78,
    "commission": 146657,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY589521",
      "capturedAt": "2026-03-08T01:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 3733170,
      "settledAt": "2026-03-27T03:30:00.000Z",
      "nodalReference": "NODAL63879"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ6205845"
  },
  {
    "id": "ORD-0010",
    "jewellerId": "JWL-010",
    "manufacturerIds": [
      "MFR-007",
      "MFR-006"
    ],
    "status": "delivered",
    "placedAt": "2026-06-11T02:30:00.000Z",
    "confirmedAt": "2026-06-12T04:30:00.000Z",
    "dispatchedAt": "2026-06-18T20:30:00.000Z",
    "deliveredAt": "2026-06-17T17:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0010-L1",
        "productId": "PRD-021",
        "manufacturerId": "MFR-007",
        "title": "18K Polki Antique Bangle",
        "sku": "007-BAN-0021",
        "purity": 18,
        "netWeight": 18.822,
        "quantity": 2,
        "unitPrice": 146869,
        "lineTotal": 293738,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0010-L2",
        "productId": "PRD-034",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Stud Nose Pin",
        "sku": "006-NOS-0034",
        "purity": 22,
        "netWeight": 0.808,
        "quantity": 1,
        "unitPrice": 7322,
        "lineTotal": 7322,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 38.452,
    "goodsValue": 301060,
    "shipping": 850,
    "insurance": 452,
    "total": 302362,
    "commissionPercent": 3.64,
    "commission": 10959,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY652963",
      "capturedAt": "2026-06-10T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 290101,
      "settledAt": "2026-06-28T20:30:00.000Z",
      "nodalReference": "NODAL37629"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ8785854"
  },
  {
    "id": "ORD-0011",
    "jewellerId": "JWL-012",
    "manufacturerIds": [
      "MFR-025",
      "MFR-009"
    ],
    "status": "delivered",
    "placedAt": "2026-03-17T17:30:00.000Z",
    "confirmedAt": "2026-03-18T21:30:00.000Z",
    "dispatchedAt": "2026-03-21T21:30:00.000Z",
    "deliveredAt": "2026-03-25T16:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0011-L1",
        "productId": "PRD-028",
        "manufacturerId": "MFR-025",
        "title": "24K Temple Chandbali Pair",
        "sku": "025-EAR-0028",
        "purity": 24,
        "netWeight": 16.349,
        "quantity": 2,
        "unitPrice": 167306,
        "lineTotal": 334612,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0011-L2",
        "productId": "PRD-051",
        "manufacturerId": "MFR-009",
        "title": "14K Kundan Solitaire Pendant",
        "sku": "009-PEN-0051",
        "purity": 14,
        "netWeight": 5.575,
        "quantity": 3,
        "unitPrice": 35386,
        "lineTotal": 106158,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 49.423,
    "goodsValue": 440770,
    "shipping": 850,
    "insurance": 661,
    "total": 442281,
    "commissionPercent": 3.78,
    "commission": 16661,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY939270",
      "capturedAt": "2026-03-18T03:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 424109,
      "settledAt": "2026-04-05T23:30:00.000Z",
      "nodalReference": "NODAL92315"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": "SEQ7005291"
  },
  {
    "id": "ORD-0012",
    "jewellerId": "JWL-013",
    "manufacturerIds": [
      "MFR-007",
      "MFR-002",
      "MFR-011",
      "MFR-010"
    ],
    "status": "delivered",
    "placedAt": "2026-02-23T23:30:00.000Z",
    "confirmedAt": "2026-02-25T04:30:00.000Z",
    "dispatchedAt": "2026-03-04T16:30:00.000Z",
    "deliveredAt": "2026-03-06T19:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0012-L1",
        "productId": "PRD-035",
        "manufacturerId": "MFR-007",
        "title": "22K Polki Kada Pair",
        "sku": "007-BAN-0035",
        "purity": 22,
        "netWeight": 51.048,
        "quantity": 3,
        "unitPrice": 487936,
        "lineTotal": 1463808,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0012-L2",
        "productId": "PRD-058",
        "manufacturerId": "MFR-002",
        "title": "24K Antique Full Bridal Suite",
        "sku": "002-BRI-0058",
        "purity": 24,
        "netWeight": 139.536,
        "quantity": 3,
        "unitPrice": 1456811,
        "lineTotal": 4370433,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0012-L3",
        "productId": "PRD-011",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Long Mangalsutra",
        "sku": "011-MAN-0011",
        "purity": 22,
        "netWeight": 22.873,
        "quantity": 2,
        "unitPrice": 200823,
        "lineTotal": 401646,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0012-L4",
        "productId": "PRD-024",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Nakshi Pendant",
        "sku": "010-PEN-0024",
        "purity": 18,
        "netWeight": 2.732,
        "quantity": 3,
        "unitPrice": 24846,
        "lineTotal": 74538,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 625.694,
    "goodsValue": 6310425,
    "shipping": 850,
    "insurance": 9466,
    "total": 6320741,
    "commissionPercent": 3.64,
    "commission": 229699,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY443001",
      "capturedAt": "2026-02-24T01:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 6080726,
      "settledAt": "2026-03-10T21:30:00.000Z",
      "nodalReference": "NODAL86295"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": "SEQ2352907"
  },
  {
    "id": "ORD-0013",
    "jewellerId": "JWL-014",
    "manufacturerIds": [
      "MFR-010",
      "MFR-005"
    ],
    "status": "delivered",
    "placedAt": "2026-07-02T20:30:00.000Z",
    "confirmedAt": "2026-07-04T04:30:00.000Z",
    "dispatchedAt": "2026-07-06T23:30:00.000Z",
    "deliveredAt": "2026-07-16T21:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0013-L1",
        "productId": "PRD-052",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Lakshmi Pendant",
        "sku": "010-PEN-0052",
        "purity": 18,
        "netWeight": 7.398,
        "quantity": 2,
        "unitPrice": 61397,
        "lineTotal": 122794,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0013-L2",
        "productId": "PRD-005",
        "manufacturerId": "MFR-005",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "005-MAN-0005",
        "purity": 22,
        "netWeight": 10.288,
        "quantity": 3,
        "unitPrice": 99361,
        "lineTotal": 298083,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 45.66,
    "goodsValue": 420877,
    "shipping": 850,
    "insurance": 631,
    "total": 422358,
    "commissionPercent": 4.2,
    "commission": 17677,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY720323",
      "capturedAt": "2026-07-03T03:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 403200,
      "settledAt": "2026-07-19T00:30:00.000Z",
      "nodalReference": "NODAL89151"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": "SEQ2309766"
  },
  {
    "id": "ORD-0014",
    "jewellerId": "JWL-015",
    "manufacturerIds": [
      "MFR-003",
      "MFR-023",
      "MFR-011",
      "MFR-010"
    ],
    "status": "delivered",
    "placedAt": "2026-02-04T03:30:00.000Z",
    "confirmedAt": "2026-02-05T01:30:00.000Z",
    "dispatchedAt": "2026-02-08T03:30:00.000Z",
    "deliveredAt": "2026-02-10T18:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0014-L1",
        "productId": "PRD-059",
        "manufacturerId": "MFR-003",
        "title": "18K Kada Pair",
        "sku": "003-BAN-0059",
        "purity": 18,
        "netWeight": 50.566,
        "quantity": 3,
        "unitPrice": 420805,
        "lineTotal": 1262415,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0014-L2",
        "productId": "PRD-012",
        "manufacturerId": "MFR-023",
        "title": "18K Bridal Set",
        "sku": "023-BRI-0012",
        "purity": 18,
        "netWeight": 161.895,
        "quantity": 1,
        "unitPrice": 1209706,
        "lineTotal": 1209706,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0014-L3",
        "productId": "PRD-025",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Nallapusalu Chain",
        "sku": "011-MAN-0025",
        "purity": 22,
        "netWeight": 20.356,
        "quantity": 2,
        "unitPrice": 183180,
        "lineTotal": 366360,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0014-L4",
        "productId": "PRD-038",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "010-MAN-0038",
        "purity": 22,
        "netWeight": 15.337,
        "quantity": 1,
        "unitPrice": 155320,
        "lineTotal": 155320,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 369.642,
    "goodsValue": 2993801,
    "shipping": 850,
    "insurance": 4491,
    "total": 2999142,
    "commissionPercent": 3.57,
    "commission": 106879,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY537027",
      "capturedAt": "2026-02-03T19:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 2886922,
      "settledAt": "2026-02-17T21:30:00.000Z",
      "nodalReference": "NODAL19154"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": "SEQ6172333"
  },
  {
    "id": "ORD-0015",
    "jewellerId": "JWL-016",
    "manufacturerIds": [
      "MFR-006"
    ],
    "status": "placed",
    "placedAt": "2026-08-12T18:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0015-L1",
        "productId": "PRD-006",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Stud Nose Pin",
        "sku": "006-NOS-0006",
        "purity": 22,
        "netWeight": 0.882,
        "quantity": 2,
        "unitPrice": 8322,
        "lineTotal": 16644,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 1.764,
    "goodsValue": 16644,
    "shipping": 850,
    "insurance": 25,
    "total": 17519,
    "commissionPercent": 4.82,
    "commission": 802,
    "payment": {
      "status": "pending",
      "method": "Net Banking",
      "reference": "PAY134240",
      "capturedAt": null,
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 15842,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": null
  },
  {
    "id": "ORD-0016",
    "jewellerId": "JWL-017",
    "manufacturerIds": [
      "MFR-024"
    ],
    "status": "placed",
    "placedAt": "2026-08-07T19:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0016-L1",
        "productId": "PRD-013",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Kada Bracelet",
        "sku": "024-BRA-0013",
        "purity": 22,
        "netWeight": 23.564,
        "quantity": 2,
        "unitPrice": 208515,
        "lineTotal": 417030,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 47.128,
    "goodsValue": 417030,
    "shipping": 850,
    "insurance": 626,
    "total": 418506,
    "commissionPercent": 3.29,
    "commission": 13720,
    "payment": {
      "status": "pending",
      "method": "UPI",
      "reference": "PAY515152",
      "capturedAt": null,
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 403310,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": null
  },
  {
    "id": "ORD-0017",
    "jewellerId": "JWL-018",
    "manufacturerIds": [
      "MFR-006",
      "MFR-005"
    ],
    "status": "placed",
    "placedAt": "2026-08-09T16:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0017-L1",
        "productId": "PRD-020",
        "manufacturerId": "MFR-006",
        "title": "14K Antique Daily Wear Bangle Pair",
        "sku": "006-BAN-0020",
        "purity": 14,
        "netWeight": 48.281,
        "quantity": 3,
        "unitPrice": 263753,
        "lineTotal": 791259,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0017-L2",
        "productId": "PRD-033",
        "manufacturerId": "MFR-005",
        "title": "14K CZ Studded Bridal Bangle Set",
        "sku": "005-BAN-0033",
        "purity": 14,
        "netWeight": 51.175,
        "quantity": 1,
        "unitPrice": 318487,
        "lineTotal": 318487,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 196.018,
    "goodsValue": 1109746,
    "shipping": 850,
    "insurance": 1665,
    "total": 1112261,
    "commissionPercent": 4.82,
    "commission": 53490,
    "payment": {
      "status": "pending",
      "method": "NEFT",
      "reference": "PAY360688",
      "capturedAt": null,
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 1056256,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Mumbai",
    "awb": null
  },
  {
    "id": "ORD-0018",
    "jewellerId": "JWL-019",
    "manufacturerIds": [
      "MFR-024"
    ],
    "status": "confirmed",
    "placedAt": "2026-08-08T00:30:00.000Z",
    "confirmedAt": "2026-08-09T04:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0018-L1",
        "productId": "PRD-027",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Gents Ring",
        "sku": "024-RIN-0027",
        "purity": 22,
        "netWeight": 5.456,
        "quantity": 2,
        "unitPrice": 47282,
        "lineTotal": 94564,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 10.912,
    "goodsValue": 94564,
    "shipping": 850,
    "insurance": 142,
    "total": 95556,
    "commissionPercent": 3.29,
    "commission": 3111,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY832264",
      "capturedAt": "2026-08-07T23:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 91453,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": null
  },
  {
    "id": "ORD-0019",
    "jewellerId": "JWL-020",
    "manufacturerIds": [
      "MFR-006",
      "MFR-001",
      "MFR-010"
    ],
    "status": "confirmed",
    "placedAt": "2026-08-11T21:30:00.000Z",
    "confirmedAt": "2026-08-12T19:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0019-L1",
        "productId": "PRD-034",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Stud Nose Pin",
        "sku": "006-NOS-0034",
        "purity": 22,
        "netWeight": 0.808,
        "quantity": 1,
        "unitPrice": 7322,
        "lineTotal": 7322,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0019-L2",
        "productId": "PRD-057",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Antique Anklet Pair",
        "sku": "001-ANK-0057",
        "purity": 22,
        "netWeight": 17.348,
        "quantity": 3,
        "unitPrice": 158117,
        "lineTotal": 474351,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0019-L3",
        "productId": "PRD-010",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Lakshmi Pendant",
        "sku": "010-PEN-0010",
        "purity": 22,
        "netWeight": 2.045,
        "quantity": 2,
        "unitPrice": 20113,
        "lineTotal": 40226,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 56.942,
    "goodsValue": 521899,
    "shipping": 850,
    "insurance": 783,
    "total": 523532,
    "commissionPercent": 4.82,
    "commission": 25156,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY464588",
      "capturedAt": "2026-08-12T02:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 496743,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": null
  },
  {
    "id": "ORD-0020",
    "jewellerId": "JWL-021",
    "manufacturerIds": [
      "MFR-009",
      "MFR-004",
      "MFR-003"
    ],
    "status": "confirmed",
    "placedAt": "2026-08-10T03:30:00.000Z",
    "confirmedAt": "2026-08-11T04:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0020-L1",
        "productId": "PRD-051",
        "manufacturerId": "MFR-009",
        "title": "14K Kundan Solitaire Pendant",
        "sku": "009-PEN-0051",
        "purity": 14,
        "netWeight": 5.575,
        "quantity": 2,
        "unitPrice": 35386,
        "lineTotal": 70772,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0020-L2",
        "productId": "PRD-004",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Engagement Band",
        "sku": "004-RIN-0004",
        "purity": 22,
        "netWeight": 5.861,
        "quantity": 1,
        "unitPrice": 53849,
        "lineTotal": 53849,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0020-L3",
        "productId": "PRD-017",
        "manufacturerId": "MFR-003",
        "title": "14K Lakshmi Pendant",
        "sku": "003-PEN-0017",
        "purity": 14,
        "netWeight": 7.206,
        "quantity": 1,
        "unitPrice": 41851,
        "lineTotal": 41851,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 24.217,
    "goodsValue": 166472,
    "shipping": 850,
    "insurance": 250,
    "total": 167572,
    "commissionPercent": 4.41,
    "commission": 7341,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY997647",
      "capturedAt": "2026-08-09T20:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 159131,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": null
  },
  {
    "id": "ORD-0021",
    "jewellerId": "JWL-023",
    "manufacturerIds": [
      "MFR-002",
      "MFR-011"
    ],
    "status": "in_production",
    "placedAt": "2026-08-22T00:30:00.000Z",
    "confirmedAt": "2026-08-22T19:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0021-L1",
        "productId": "PRD-058",
        "manufacturerId": "MFR-002",
        "title": "24K Antique Full Bridal Suite",
        "sku": "002-BRI-0058",
        "purity": 24,
        "netWeight": 139.536,
        "quantity": 1,
        "unitPrice": 1456811,
        "lineTotal": 1456811,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0021-L2",
        "productId": "PRD-011",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Long Mangalsutra",
        "sku": "011-MAN-0011",
        "purity": 22,
        "netWeight": 22.873,
        "quantity": 2,
        "unitPrice": 200823,
        "lineTotal": 401646,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 185.282,
    "goodsValue": 1858457,
    "shipping": 850,
    "insurance": 2788,
    "total": 1862095,
    "commissionPercent": 4.73,
    "commission": 87905,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY973301",
      "capturedAt": "2026-08-21T23:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 1770552,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": null
  },
  {
    "id": "ORD-0022",
    "jewellerId": "JWL-024",
    "manufacturerIds": [
      "MFR-005"
    ],
    "status": "in_production",
    "placedAt": "2026-08-18T16:30:00.000Z",
    "confirmedAt": "2026-08-19T16:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0022-L1",
        "productId": "PRD-005",
        "manufacturerId": "MFR-005",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "005-MAN-0005",
        "purity": 22,
        "netWeight": 10.288,
        "quantity": 3,
        "unitPrice": 99361,
        "lineTotal": 298083,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 30.864,
    "goodsValue": 298083,
    "shipping": 850,
    "insurance": 447,
    "total": 299380,
    "commissionPercent": 5.94,
    "commission": 17706,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY456462",
      "capturedAt": "2026-08-19T00:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 280377,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": null
  },
  {
    "id": "ORD-0023",
    "jewellerId": "JWL-035",
    "manufacturerIds": [
      "MFR-023",
      "MFR-011",
      "MFR-010",
      "MFR-001"
    ],
    "status": "in_production",
    "placedAt": "2026-08-05T16:30:00.000Z",
    "confirmedAt": "2026-08-07T02:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0023-L1",
        "productId": "PRD-012",
        "manufacturerId": "MFR-023",
        "title": "18K Bridal Set",
        "sku": "023-BRI-0012",
        "purity": 18,
        "netWeight": 161.895,
        "quantity": 3,
        "unitPrice": 1209706,
        "lineTotal": 3629118,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0023-L2",
        "productId": "PRD-025",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Nallapusalu Chain",
        "sku": "011-MAN-0025",
        "purity": 22,
        "netWeight": 20.356,
        "quantity": 3,
        "unitPrice": 183180,
        "lineTotal": 549540,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0023-L3",
        "productId": "PRD-038",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "010-MAN-0038",
        "purity": 22,
        "netWeight": 15.337,
        "quantity": 2,
        "unitPrice": 155320,
        "lineTotal": 310640,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0023-L4",
        "productId": "PRD-001",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Stud Nose Pin",
        "sku": "001-NOS-0001",
        "purity": 22,
        "netWeight": 2.19,
        "quantity": 1,
        "unitPrice": 19910,
        "lineTotal": 19910,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 579.617,
    "goodsValue": 4509208,
    "shipping": 850,
    "insurance": 6764,
    "total": 4516822,
    "commissionPercent": 5.06,
    "commission": 228166,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY923343",
      "capturedAt": "2026-08-05T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 4281042,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": null
  },
  {
    "id": "ORD-0024",
    "jewellerId": "JWL-036",
    "manufacturerIds": [
      "MFR-005",
      "MFR-004"
    ],
    "status": "in_production",
    "placedAt": "2026-08-04T17:30:00.000Z",
    "confirmedAt": "2026-08-05T17:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0024-L1",
        "productId": "PRD-019",
        "manufacturerId": "MFR-005",
        "title": "18K CZ Studded Daily Wear Bangle Pair",
        "sku": "005-BAN-0019",
        "purity": 18,
        "netWeight": 39.506,
        "quantity": 3,
        "unitPrice": 338006,
        "lineTotal": 1014018,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0024-L2",
        "productId": "PRD-032",
        "manufacturerId": "MFR-004",
        "title": "18K Antique Engagement Band",
        "sku": "004-RIN-0032",
        "purity": 18,
        "netWeight": 11.213,
        "quantity": 3,
        "unitPrice": 87302,
        "lineTotal": 261906,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 152.157,
    "goodsValue": 1275924,
    "shipping": 850,
    "insurance": 1914,
    "total": 1278688,
    "commissionPercent": 5.94,
    "commission": 75790,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY995957",
      "capturedAt": "2026-08-05T00:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 1200134,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": null
  },
  {
    "id": "ORD-0025",
    "jewellerId": "JWL-037",
    "manufacturerIds": [
      "MFR-023",
      "MFR-005"
    ],
    "status": "ready_to_dispatch",
    "placedAt": "2026-08-26T17:30:00.000Z",
    "confirmedAt": "2026-08-28T04:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0025-L1",
        "productId": "PRD-026",
        "manufacturerId": "MFR-023",
        "title": "14K Bridal Set",
        "sku": "023-BRI-0026",
        "purity": 14,
        "netWeight": 129.331,
        "quantity": 1,
        "unitPrice": 721588,
        "lineTotal": 721588,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0025-L2",
        "productId": "PRD-047",
        "manufacturerId": "MFR-005",
        "title": "22K CZ Studded Nath",
        "sku": "005-NOS-0047",
        "purity": 22,
        "netWeight": 1.834,
        "quantity": 2,
        "unitPrice": 17205,
        "lineTotal": 34410,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 132.999,
    "goodsValue": 755998,
    "shipping": 850,
    "insurance": 1134,
    "total": 757982,
    "commissionPercent": 5.06,
    "commission": 38253,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY601793",
      "capturedAt": "2026-08-26T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 717745,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": null
  },
  {
    "id": "ORD-0026",
    "jewellerId": "JWL-038",
    "manufacturerIds": [
      "MFR-005",
      "MFR-025"
    ],
    "status": "ready_to_dispatch",
    "placedAt": "2026-08-19T03:30:00.000Z",
    "confirmedAt": "2026-08-20T02:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0026-L1",
        "productId": "PRD-033",
        "manufacturerId": "MFR-005",
        "title": "14K CZ Studded Bridal Bangle Set",
        "sku": "005-BAN-0033",
        "purity": 14,
        "netWeight": 51.175,
        "quantity": 1,
        "unitPrice": 318487,
        "lineTotal": 318487,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0026-L2",
        "productId": "PRD-056",
        "manufacturerId": "MFR-025",
        "title": "22K Temple Tennis Bracelet",
        "sku": "025-BRA-0056",
        "purity": 22,
        "netWeight": 23.786,
        "quantity": 2,
        "unitPrice": 229436,
        "lineTotal": 458872,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 98.747,
    "goodsValue": 777359,
    "shipping": 850,
    "insurance": 1166,
    "total": 779375,
    "commissionPercent": 5.94,
    "commission": 46175,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY773596",
      "capturedAt": "2026-08-18T19:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 731184,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": null
  },
  {
    "id": "ORD-0027",
    "jewellerId": "JWL-039",
    "manufacturerIds": [
      "MFR-006",
      "MFR-003",
      "MFR-002"
    ],
    "status": "dispatched",
    "placedAt": "2026-08-16T21:30:00.000Z",
    "confirmedAt": "2026-08-18T01:30:00.000Z",
    "dispatchedAt": "2026-08-23T22:30:00.000Z",
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0027-L1",
        "productId": "PRD-048",
        "manufacturerId": "MFR-006",
        "title": "22K Antique Long Mangalsutra",
        "sku": "006-MAN-0048",
        "purity": 22,
        "netWeight": 25.267,
        "quantity": 3,
        "unitPrice": 212539,
        "lineTotal": 637617,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0027-L2",
        "productId": "PRD-003",
        "manufacturerId": "MFR-003",
        "title": "22K Tennis Bracelet",
        "sku": "003-BRA-0003",
        "purity": 22,
        "netWeight": 14.561,
        "quantity": 3,
        "unitPrice": 131381,
        "lineTotal": 394143,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0027-L3",
        "productId": "PRD-016",
        "manufacturerId": "MFR-002",
        "title": "18K Antique Choker Necklace",
        "sku": "002-NEC-0016",
        "purity": 18,
        "netWeight": 63.855,
        "quantity": 1,
        "unitPrice": 474729,
        "lineTotal": 474729,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 183.339,
    "goodsValue": 1506489,
    "shipping": 850,
    "insurance": 2260,
    "total": 1509599,
    "commissionPercent": 4.82,
    "commission": 72613,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY943703",
      "capturedAt": "2026-08-16T20:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 1433876,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Mumbai",
    "awb": "SEQ4138991"
  },
  {
    "id": "ORD-0028",
    "jewellerId": "JWL-040",
    "manufacturerIds": [
      "MFR-001"
    ],
    "status": "dispatched",
    "placedAt": "2026-08-21T01:30:00.000Z",
    "confirmedAt": "2026-08-22T00:30:00.000Z",
    "dispatchedAt": "2026-08-26T01:30:00.000Z",
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0028-L1",
        "productId": "PRD-057",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Antique Anklet Pair",
        "sku": "001-ANK-0057",
        "purity": 22,
        "netWeight": 17.348,
        "quantity": 3,
        "unitPrice": 158117,
        "lineTotal": 474351,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 52.044,
    "goodsValue": 474351,
    "shipping": 850,
    "insurance": 712,
    "total": 475913,
    "commissionPercent": 5.23,
    "commission": 24809,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY578621",
      "capturedAt": "2026-08-20T23:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 449542,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": "SEQ5313964"
  },
  {
    "id": "ORD-0029",
    "jewellerId": "JWL-001",
    "manufacturerIds": [
      "MFR-004",
      "MFR-003"
    ],
    "status": "dispatched",
    "placedAt": "2026-08-15T04:30:00.000Z",
    "confirmedAt": "2026-08-15T16:30:00.000Z",
    "dispatchedAt": "2026-08-19T20:30:00.000Z",
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0029-L1",
        "productId": "PRD-004",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Engagement Band",
        "sku": "004-RIN-0004",
        "purity": 22,
        "netWeight": 5.861,
        "quantity": 2,
        "unitPrice": 53849,
        "lineTotal": 107698,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0029-L2",
        "productId": "PRD-017",
        "manufacturerId": "MFR-003",
        "title": "14K Lakshmi Pendant",
        "sku": "003-PEN-0017",
        "purity": 14,
        "netWeight": 7.206,
        "quantity": 3,
        "unitPrice": 41851,
        "lineTotal": 125553,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 33.34,
    "goodsValue": 233251,
    "shipping": 850,
    "insurance": 350,
    "total": 234451,
    "commissionPercent": 5.16,
    "commission": 12036,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY498478",
      "capturedAt": "2026-08-14T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 221215,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": "SEQ7172695"
  },
  {
    "id": "ORD-0030",
    "jewellerId": "JWL-002",
    "manufacturerIds": [
      "MFR-011",
      "MFR-010",
      "MFR-009",
      "MFR-004"
    ],
    "status": "delivered",
    "placedAt": "2026-06-25T01:30:00.000Z",
    "confirmedAt": "2026-06-25T16:30:00.000Z",
    "dispatchedAt": "2026-06-28T03:30:00.000Z",
    "deliveredAt": "2026-06-30T19:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0030-L1",
        "productId": "PRD-011",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Long Mangalsutra",
        "sku": "011-MAN-0011",
        "purity": 22,
        "netWeight": 22.873,
        "quantity": 1,
        "unitPrice": 200823,
        "lineTotal": 200823,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0030-L2",
        "productId": "PRD-024",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Nakshi Pendant",
        "sku": "010-PEN-0024",
        "purity": 18,
        "netWeight": 2.732,
        "quantity": 3,
        "unitPrice": 24846,
        "lineTotal": 74538,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0030-L3",
        "productId": "PRD-037",
        "manufacturerId": "MFR-009",
        "title": "22K Kundan Nath",
        "sku": "009-NOS-0037",
        "purity": 22,
        "netWeight": 2.17,
        "quantity": 3,
        "unitPrice": 22167,
        "lineTotal": 66501,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0030-L4",
        "productId": "PRD-060",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Cocktail Ring",
        "sku": "004-RIN-0060",
        "purity": 22,
        "netWeight": 8.832,
        "quantity": 2,
        "unitPrice": 87087,
        "lineTotal": 174174,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 55.243,
    "goodsValue": 516036,
    "shipping": 850,
    "insurance": 774,
    "total": 517660,
    "commissionPercent": 5.57,
    "commission": 28743,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY137078",
      "capturedAt": "2026-06-24T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 487293,
      "settledAt": "2026-07-09T01:30:00.000Z",
      "nodalReference": "NODAL82377"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ5703681"
  },
  {
    "id": "ORD-0031",
    "jewellerId": "JWL-003",
    "manufacturerIds": [
      "MFR-004",
      "MFR-003",
      "MFR-023"
    ],
    "status": "delivered",
    "placedAt": "2026-04-28T18:30:00.000Z",
    "confirmedAt": "2026-04-29T22:30:00.000Z",
    "dispatchedAt": "2026-05-04T21:30:00.000Z",
    "deliveredAt": "2026-05-11T21:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0031-L1",
        "productId": "PRD-018",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Temple Vaddanam",
        "sku": "004-TEM-0018",
        "purity": 22,
        "netWeight": 60.098,
        "quantity": 1,
        "unitPrice": 537213,
        "lineTotal": 537213,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0031-L2",
        "productId": "PRD-031",
        "manufacturerId": "MFR-003",
        "title": "14K Antique Bangle",
        "sku": "003-BAN-0031",
        "purity": 14,
        "netWeight": 38.286,
        "quantity": 2,
        "unitPrice": 234736,
        "lineTotal": 469472,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0031-L3",
        "productId": "PRD-054",
        "manufacturerId": "MFR-023",
        "title": "24K Full Bridal Suite",
        "sku": "023-BRI-0054",
        "purity": 24,
        "netWeight": 153.611,
        "quantity": 2,
        "unitPrice": 1500797,
        "lineTotal": 3001594,
        "metalRateAtConfirmation": 7850
      }
    ],
    "totalNetWeight": 443.892,
    "goodsValue": 4008279,
    "shipping": 850,
    "insurance": 6012,
    "total": 4015141,
    "commissionPercent": 5.16,
    "commission": 206827,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY695302",
      "capturedAt": "2026-04-28T21:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 3801452,
      "settledAt": "2026-05-14T04:30:00.000Z",
      "nodalReference": "NODAL83389"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ4307806"
  },
  {
    "id": "ORD-0032",
    "jewellerId": "JWL-004",
    "manufacturerIds": [
      "MFR-011",
      "MFR-010"
    ],
    "status": "delivered",
    "placedAt": "2026-02-03T00:30:00.000Z",
    "confirmedAt": "2026-02-03T16:30:00.000Z",
    "dispatchedAt": "2026-02-09T22:30:00.000Z",
    "deliveredAt": "2026-02-11T23:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0032-L1",
        "productId": "PRD-025",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Nallapusalu Chain",
        "sku": "011-MAN-0025",
        "purity": 22,
        "netWeight": 20.356,
        "quantity": 3,
        "unitPrice": 183180,
        "lineTotal": 549540,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0032-L2",
        "productId": "PRD-038",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "010-MAN-0038",
        "purity": 22,
        "netWeight": 15.337,
        "quantity": 3,
        "unitPrice": 155320,
        "lineTotal": 465960,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 107.079,
    "goodsValue": 1015500,
    "shipping": 850,
    "insurance": 1523,
    "total": 1017873,
    "commissionPercent": 5.57,
    "commission": 56563,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY588704",
      "capturedAt": "2026-02-02T22:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 958937,
      "settledAt": "2026-02-20T00:30:00.000Z",
      "nodalReference": "NODAL70703"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Mumbai",
    "awb": "SEQ8250118"
  },
  {
    "id": "ORD-0033",
    "jewellerId": "JWL-005",
    "manufacturerIds": [
      "MFR-004",
      "MFR-024"
    ],
    "status": "delivered",
    "placedAt": "2026-02-18T21:30:00.000Z",
    "confirmedAt": "2026-02-20T02:30:00.000Z",
    "dispatchedAt": "2026-02-27T20:30:00.000Z",
    "deliveredAt": "2026-02-25T01:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0033-L1",
        "productId": "PRD-032",
        "manufacturerId": "MFR-004",
        "title": "18K Antique Engagement Band",
        "sku": "004-RIN-0032",
        "purity": 18,
        "netWeight": 11.213,
        "quantity": 3,
        "unitPrice": 87302,
        "lineTotal": 261906,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0033-L2",
        "productId": "PRD-055",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Charm Bracelet",
        "sku": "024-BRA-0055",
        "purity": 22,
        "netWeight": 14.149,
        "quantity": 2,
        "unitPrice": 131658,
        "lineTotal": 263316,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 61.937,
    "goodsValue": 525222,
    "shipping": 850,
    "insurance": 788,
    "total": 526860,
    "commissionPercent": 5.16,
    "commission": 27101,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY661338",
      "capturedAt": "2026-02-18T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 498121,
      "settledAt": "2026-03-11T01:30:00.000Z",
      "nodalReference": "NODAL36778"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": "SEQ4454456"
  },
  {
    "id": "ORD-0034",
    "jewellerId": "JWL-006",
    "manufacturerIds": [
      "MFR-005"
    ],
    "status": "delivered",
    "placedAt": "2026-01-07T18:30:00.000Z",
    "confirmedAt": "2026-01-08T23:30:00.000Z",
    "dispatchedAt": "2026-01-11T03:30:00.000Z",
    "deliveredAt": "2026-01-17T20:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0034-L1",
        "productId": "PRD-047",
        "manufacturerId": "MFR-005",
        "title": "22K CZ Studded Nath",
        "sku": "005-NOS-0047",
        "purity": 22,
        "netWeight": 1.834,
        "quantity": 3,
        "unitPrice": 17205,
        "lineTotal": 51615,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 5.502,
    "goodsValue": 51615,
    "shipping": 850,
    "insurance": 77,
    "total": 52542,
    "commissionPercent": 5.94,
    "commission": 3066,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY971540",
      "capturedAt": "2026-01-07T22:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 48549,
      "settledAt": "2026-01-28T00:30:00.000Z",
      "nodalReference": "NODAL36842"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": "SEQ4354595"
  },
  {
    "id": "ORD-0035",
    "jewellerId": "JWL-007",
    "manufacturerIds": [
      "MFR-025",
      "MFR-009"
    ],
    "status": "cancelled",
    "placedAt": "2026-01-11T04:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0035-L1",
        "productId": "PRD-056",
        "manufacturerId": "MFR-025",
        "title": "22K Temple Tennis Bracelet",
        "sku": "025-BRA-0056",
        "purity": 22,
        "netWeight": 23.786,
        "quantity": 2,
        "unitPrice": 229436,
        "lineTotal": 458872,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0035-L2",
        "productId": "PRD-009",
        "manufacturerId": "MFR-009",
        "title": "14K Kundan Solitaire Pendant",
        "sku": "009-PEN-0009",
        "purity": 14,
        "netWeight": 4.979,
        "quantity": 1,
        "unitPrice": 33769,
        "lineTotal": 33769,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 52.551,
    "goodsValue": 492641,
    "shipping": 850,
    "insurance": 739,
    "total": 494230,
    "commissionPercent": 3.78,
    "commission": 18622,
    "payment": {
      "status": "pending",
      "method": "NEFT",
      "reference": "PAY876421",
      "capturedAt": null,
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 474019,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": "Jeweller cancelled before confirmation",
    "shippingCity": "Rajkot",
    "awb": null
  },
  {
    "id": "ORD-0036",
    "jewellerId": "JWL-008",
    "manufacturerIds": [
      "MFR-003"
    ],
    "status": "cancelled",
    "placedAt": "2026-06-02T03:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0036-L1",
        "productId": "PRD-003",
        "manufacturerId": "MFR-003",
        "title": "22K Tennis Bracelet",
        "sku": "003-BRA-0003",
        "purity": 22,
        "netWeight": 14.561,
        "quantity": 3,
        "unitPrice": 131381,
        "lineTotal": 394143,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 43.683,
    "goodsValue": 394143,
    "shipping": 850,
    "insurance": 591,
    "total": 395584,
    "commissionPercent": 3.57,
    "commission": 14071,
    "payment": {
      "status": "pending",
      "method": "NEFT",
      "reference": "PAY806662",
      "capturedAt": null,
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 380072,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": "Jeweller cancelled before confirmation",
    "shippingCity": "Surat",
    "awb": null
  },
  {
    "id": "ORD-0037",
    "jewellerId": "JWL-009",
    "manufacturerIds": [
      "MFR-010"
    ],
    "status": "returned",
    "placedAt": "2026-07-12T04:30:00.000Z",
    "confirmedAt": "2026-07-12T22:30:00.000Z",
    "dispatchedAt": "2026-07-18T22:30:00.000Z",
    "deliveredAt": "2026-07-26T02:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0037-L1",
        "productId": "PRD-010",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Lakshmi Pendant",
        "sku": "010-PEN-0010",
        "purity": 22,
        "netWeight": 2.045,
        "quantity": 3,
        "unitPrice": 20113,
        "lineTotal": 60339,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 6.135,
    "goodsValue": 60339,
    "shipping": 850,
    "insurance": 91,
    "total": 61280,
    "commissionPercent": 4.2,
    "commission": 2534,
    "payment": {
      "status": "captured",
      "method": "NEFT",
      "reference": "PAY444596",
      "capturedAt": "2026-07-11T21:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 57805,
      "settledAt": null,
      "nodalReference": null
    },
    "return": {
      "reason": "Net weight short by 1.8g",
      "raisedAt": "2026-08-01T16:30:00.000Z",
      "verifiedAt": null,
      "refundStatus": "awaiting_verification"
    },
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ4559680"
  },
  {
    "id": "ORD-0038",
    "jewellerId": "JWL-010",
    "manufacturerIds": [
      "MFR-003",
      "MFR-002",
      "MFR-011"
    ],
    "status": "returned",
    "placedAt": "2026-06-14T02:30:00.000Z",
    "confirmedAt": "2026-06-15T03:30:00.000Z",
    "dispatchedAt": "2026-06-21T04:30:00.000Z",
    "deliveredAt": "2026-06-27T03:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0038-L1",
        "productId": "PRD-017",
        "manufacturerId": "MFR-003",
        "title": "14K Lakshmi Pendant",
        "sku": "003-PEN-0017",
        "purity": 14,
        "netWeight": 7.206,
        "quantity": 2,
        "unitPrice": 41851,
        "lineTotal": 83702,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0038-L2",
        "productId": "PRD-030",
        "manufacturerId": "MFR-002",
        "title": "14K Antique Bridal Set",
        "sku": "002-BRI-0030",
        "purity": 14,
        "netWeight": 125.381,
        "quantity": 1,
        "unitPrice": 816574,
        "lineTotal": 816574,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0038-L3",
        "productId": "PRD-053",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Stud Nose Pin",
        "sku": "011-NOS-0053",
        "purity": 22,
        "netWeight": 0.621,
        "quantity": 3,
        "unitPrice": 5841,
        "lineTotal": 17523,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 141.656,
    "goodsValue": 917799,
    "shipping": 850,
    "insurance": 1377,
    "total": 920026,
    "commissionPercent": 3.57,
    "commission": 32765,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY347908",
      "capturedAt": "2026-06-13T16:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 885034,
      "settledAt": null,
      "nodalReference": null
    },
    "return": {
      "reason": "Net weight short by 1.8g",
      "raisedAt": "2026-07-05T03:30:00.000Z",
      "verifiedAt": null,
      "refundStatus": "awaiting_verification"
    },
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ4391313"
  },
  {
    "id": "ORD-0039",
    "jewellerId": "JWL-012",
    "manufacturerIds": [
      "MFR-010",
      "MFR-009",
      "MFR-004"
    ],
    "status": "payment_failed",
    "placedAt": "2026-08-20T18:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0039-L1",
        "productId": "PRD-024",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Nakshi Pendant",
        "sku": "010-PEN-0024",
        "purity": 18,
        "netWeight": 2.732,
        "quantity": 1,
        "unitPrice": 24846,
        "lineTotal": 24846,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0039-L2",
        "productId": "PRD-037",
        "manufacturerId": "MFR-009",
        "title": "22K Kundan Nath",
        "sku": "009-NOS-0037",
        "purity": 22,
        "netWeight": 2.17,
        "quantity": 2,
        "unitPrice": 22167,
        "lineTotal": 44334,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0039-L3",
        "productId": "PRD-060",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Cocktail Ring",
        "sku": "004-RIN-0060",
        "purity": 22,
        "netWeight": 8.832,
        "quantity": 3,
        "unitPrice": 87087,
        "lineTotal": 261261,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 33.568,
    "goodsValue": 330441,
    "shipping": 850,
    "insurance": 496,
    "total": 331787,
    "commissionPercent": 4.2,
    "commission": 13879,
    "payment": {
      "status": "failed",
      "method": "UPI",
      "reference": "PAY626699",
      "capturedAt": null,
      "failureReason": "Bank declined the mandate"
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 316562,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": null
  },
  {
    "id": "ORD-0040",
    "jewellerId": "JWL-013",
    "manufacturerIds": [
      "MFR-003",
      "MFR-023"
    ],
    "status": "payment_failed",
    "placedAt": "2026-08-16T00:30:00.000Z",
    "confirmedAt": null,
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0040-L1",
        "productId": "PRD-031",
        "manufacturerId": "MFR-003",
        "title": "14K Antique Bangle",
        "sku": "003-BAN-0031",
        "purity": 14,
        "netWeight": 38.286,
        "quantity": 1,
        "unitPrice": 234736,
        "lineTotal": 234736,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0040-L2",
        "productId": "PRD-054",
        "manufacturerId": "MFR-023",
        "title": "24K Full Bridal Suite",
        "sku": "023-BRI-0054",
        "purity": 24,
        "netWeight": 153.611,
        "quantity": 1,
        "unitPrice": 1500797,
        "lineTotal": 1500797,
        "metalRateAtConfirmation": 7850
      }
    ],
    "totalNetWeight": 191.897,
    "goodsValue": 1735533,
    "shipping": 850,
    "insurance": 2603,
    "total": 1738986,
    "commissionPercent": 3.57,
    "commission": 61959,
    "payment": {
      "status": "failed",
      "method": "NEFT",
      "reference": "PAY532314",
      "capturedAt": null,
      "failureReason": "Bank declined the mandate"
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 1673574,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": null
  },
  {
    "id": "ORD-0041",
    "jewellerId": "JWL-014",
    "manufacturerIds": [
      "MFR-010",
      "MFR-001",
      "MFR-025"
    ],
    "status": "refunded",
    "placedAt": "2026-02-24T03:30:00.000Z",
    "confirmedAt": "2026-02-24T19:30:00.000Z",
    "dispatchedAt": "2026-02-26T19:30:00.000Z",
    "deliveredAt": "2026-03-07T16:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0041-L1",
        "productId": "PRD-038",
        "manufacturerId": "MFR-010",
        "title": "22K CZ Studded Short Mangalsutra",
        "sku": "010-MAN-0038",
        "purity": 22,
        "netWeight": 15.337,
        "quantity": 3,
        "unitPrice": 155320,
        "lineTotal": 465960,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0041-L2",
        "productId": "PRD-001",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Stud Nose Pin",
        "sku": "001-NOS-0001",
        "purity": 22,
        "netWeight": 2.19,
        "quantity": 2,
        "unitPrice": 19910,
        "lineTotal": 39820,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0041-L3",
        "productId": "PRD-014",
        "manufacturerId": "MFR-025",
        "title": "22K Temple Temple Armlet",
        "sku": "025-TEM-0014",
        "purity": 22,
        "netWeight": 106.909,
        "quantity": 2,
        "unitPrice": 989661,
        "lineTotal": 1979322,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 264.209,
    "goodsValue": 2485102,
    "shipping": 850,
    "insurance": 3728,
    "total": 2489680,
    "commissionPercent": 4.2,
    "commission": 104374,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY352944",
      "capturedAt": "2026-02-24T02:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 2380728,
      "settledAt": null,
      "nodalReference": null
    },
    "return": {
      "reason": "Purity below declared 22K on assay",
      "raisedAt": "2026-03-16T22:30:00.000Z",
      "verifiedAt": "2026-03-24T00:30:00.000Z",
      "refundStatus": "processed"
    },
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": "SEQ7412657"
  },
  {
    "id": "ORD-0042",
    "jewellerId": "JWL-015",
    "manufacturerIds": [
      "MFR-024",
      "MFR-008",
      "MFR-007"
    ],
    "status": "disputed",
    "placedAt": "2026-01-01T17:30:00.000Z",
    "confirmedAt": "2026-01-02T18:30:00.000Z",
    "dispatchedAt": null,
    "deliveredAt": null,
    "lines": [
      {
        "id": "ORD-0042-L1",
        "productId": "PRD-055",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Charm Bracelet",
        "sku": "024-BRA-0055",
        "purity": 22,
        "netWeight": 14.149,
        "quantity": 2,
        "unitPrice": 131658,
        "lineTotal": 263316,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0042-L2",
        "productId": "PRD-008",
        "manufacturerId": "MFR-008",
        "title": "24K Polki Charm Bracelet",
        "sku": "008-BRA-0008",
        "purity": 24,
        "netWeight": 14.902,
        "quantity": 3,
        "unitPrice": 145784,
        "lineTotal": 437352,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0042-L3",
        "productId": "PRD-021",
        "manufacturerId": "MFR-007",
        "title": "18K Polki Antique Bangle",
        "sku": "007-BAN-0021",
        "purity": 18,
        "netWeight": 18.822,
        "quantity": 2,
        "unitPrice": 146869,
        "lineTotal": 293738,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 110.648,
    "goodsValue": 994406,
    "shipping": 850,
    "insurance": 1492,
    "total": 996748,
    "commissionPercent": 3.29,
    "commission": 32716,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY675672",
      "capturedAt": "2026-01-02T00:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "not_due",
      "manufacturerPayout": 961690,
      "settledAt": null,
      "nodalReference": null
    },
    "return": null,
    "disputeReason": "Jeweller disputes the wastage percentage applied",
    "cancellationReason": null,
    "shippingCity": "Surat",
    "awb": null
  },
  {
    "id": "ORD-0043",
    "jewellerId": "JWL-016",
    "manufacturerIds": [
      "MFR-002",
      "MFR-001",
      "MFR-025",
      "MFR-009"
    ],
    "status": "delivered",
    "placedAt": "2026-04-02T01:30:00.000Z",
    "confirmedAt": "2026-04-02T21:30:00.000Z",
    "dispatchedAt": "2026-04-05T23:30:00.000Z",
    "deliveredAt": "2026-04-07T19:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0043-L1",
        "productId": "PRD-002",
        "manufacturerId": "MFR-002",
        "title": "22K Antique Long Rani Haar",
        "sku": "002-NEC-0002",
        "purity": 22,
        "netWeight": 55.582,
        "quantity": 3,
        "unitPrice": 543071,
        "lineTotal": 1629213,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0043-L2",
        "productId": "PRD-015",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Long Mangalsutra",
        "sku": "001-MAN-0015",
        "purity": 22,
        "netWeight": 15.94,
        "quantity": 2,
        "unitPrice": 154719,
        "lineTotal": 309438,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0043-L3",
        "productId": "PRD-028",
        "manufacturerId": "MFR-025",
        "title": "24K Temple Chandbali Pair",
        "sku": "025-EAR-0028",
        "purity": 24,
        "netWeight": 16.349,
        "quantity": 3,
        "unitPrice": 167306,
        "lineTotal": 501918,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0043-L4",
        "productId": "PRD-051",
        "manufacturerId": "MFR-009",
        "title": "14K Kundan Solitaire Pendant",
        "sku": "009-PEN-0051",
        "purity": 14,
        "netWeight": 5.575,
        "quantity": 3,
        "unitPrice": 35386,
        "lineTotal": 106158,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 264.398,
    "goodsValue": 2546727,
    "shipping": 850,
    "insurance": 3820,
    "total": 2551397,
    "commissionPercent": 4.73,
    "commission": 120460,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY830644",
      "capturedAt": "2026-04-02T04:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 2426267,
      "settledAt": "2026-04-21T19:30:00.000Z",
      "nodalReference": "NODAL88433"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ6080814"
  },
  {
    "id": "ORD-0044",
    "jewellerId": "JWL-017",
    "manufacturerIds": [
      "MFR-009",
      "MFR-008",
      "MFR-007"
    ],
    "status": "delivered",
    "placedAt": "2026-02-20T20:30:00.000Z",
    "confirmedAt": "2026-02-21T21:30:00.000Z",
    "dispatchedAt": "2026-03-01T16:30:00.000Z",
    "deliveredAt": "2026-03-05T17:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0044-L1",
        "productId": "PRD-009",
        "manufacturerId": "MFR-009",
        "title": "14K Kundan Solitaire Pendant",
        "sku": "009-PEN-0009",
        "purity": 14,
        "netWeight": 4.979,
        "quantity": 3,
        "unitPrice": 33769,
        "lineTotal": 101307,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0044-L2",
        "productId": "PRD-022",
        "manufacturerId": "MFR-008",
        "title": "22K Polki Stud Nose Pin",
        "sku": "008-NOS-0022",
        "purity": 22,
        "netWeight": 1.093,
        "quantity": 1,
        "unitPrice": 11428,
        "lineTotal": 11428,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0044-L3",
        "productId": "PRD-035",
        "manufacturerId": "MFR-007",
        "title": "22K Polki Kada Pair",
        "sku": "007-BAN-0035",
        "purity": 22,
        "netWeight": 51.048,
        "quantity": 1,
        "unitPrice": 487936,
        "lineTotal": 487936,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 67.078,
    "goodsValue": 600671,
    "shipping": 850,
    "insurance": 901,
    "total": 602422,
    "commissionPercent": 4.41,
    "commission": 26490,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY988889",
      "capturedAt": "2026-02-20T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 574181,
      "settledAt": "2026-03-09T17:30:00.000Z",
      "nodalReference": "NODAL53575"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ3080157"
  },
  {
    "id": "ORD-0045",
    "jewellerId": "JWL-018",
    "manufacturerIds": [
      "MFR-002",
      "MFR-001",
      "MFR-010"
    ],
    "status": "delivered",
    "placedAt": "2026-02-18T23:30:00.000Z",
    "confirmedAt": "2026-02-20T01:30:00.000Z",
    "dispatchedAt": "2026-02-27T18:30:00.000Z",
    "deliveredAt": "2026-03-04T00:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0045-L1",
        "productId": "PRD-016",
        "manufacturerId": "MFR-002",
        "title": "18K Antique Choker Necklace",
        "sku": "002-NEC-0016",
        "purity": 18,
        "netWeight": 63.855,
        "quantity": 3,
        "unitPrice": 474729,
        "lineTotal": 1424187,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0045-L2",
        "productId": "PRD-029",
        "manufacturerId": "MFR-001",
        "title": "24K Temple Antique Anklet Pair",
        "sku": "001-ANK-0029",
        "purity": 24,
        "netWeight": 29.531,
        "quantity": 2,
        "unitPrice": 306606,
        "lineTotal": 613212,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0045-L3",
        "productId": "PRD-052",
        "manufacturerId": "MFR-010",
        "title": "18K CZ Studded Lakshmi Pendant",
        "sku": "010-PEN-0052",
        "purity": 18,
        "netWeight": 7.398,
        "quantity": 2,
        "unitPrice": 61397,
        "lineTotal": 122794,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 265.423,
    "goodsValue": 2160193,
    "shipping": 850,
    "insurance": 3240,
    "total": 2164283,
    "commissionPercent": 4.73,
    "commission": 102177,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY552704",
      "capturedAt": "2026-02-18T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 2058016,
      "settledAt": "2026-03-11T03:30:00.000Z",
      "nodalReference": "NODAL35681"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Mumbai",
    "awb": "SEQ5526250"
  },
  {
    "id": "ORD-0046",
    "jewellerId": "JWL-019",
    "manufacturerIds": [
      "MFR-009",
      "MFR-008",
      "MFR-003",
      "MFR-023"
    ],
    "status": "delivered",
    "placedAt": "2026-06-27T00:30:00.000Z",
    "confirmedAt": "2026-06-27T22:30:00.000Z",
    "dispatchedAt": "2026-07-04T02:30:00.000Z",
    "deliveredAt": "2026-07-09T04:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0046-L1",
        "productId": "PRD-023",
        "manufacturerId": "MFR-009",
        "title": "24K Kundan Solitaire Pendant",
        "sku": "009-PEN-0023",
        "purity": 24,
        "netWeight": 5.815,
        "quantity": 2,
        "unitPrice": 58348,
        "lineTotal": 116696,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0046-L2",
        "productId": "PRD-036",
        "manufacturerId": "MFR-008",
        "title": "24K Polki Charm Bracelet",
        "sku": "008-BRA-0036",
        "purity": 24,
        "netWeight": 20.718,
        "quantity": 3,
        "unitPrice": 202649,
        "lineTotal": 607947,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0046-L3",
        "productId": "PRD-059",
        "manufacturerId": "MFR-003",
        "title": "18K Kada Pair",
        "sku": "003-BAN-0059",
        "purity": 18,
        "netWeight": 50.566,
        "quantity": 2,
        "unitPrice": 420805,
        "lineTotal": 841610,
        "metalRateAtConfirmation": 5890
      },
      {
        "id": "ORD-0046-L4",
        "productId": "PRD-012",
        "manufacturerId": "MFR-023",
        "title": "18K Bridal Set",
        "sku": "023-BRI-0012",
        "purity": 18,
        "netWeight": 161.895,
        "quantity": 1,
        "unitPrice": 1209706,
        "lineTotal": 1209706,
        "metalRateAtConfirmation": 5890
      }
    ],
    "totalNetWeight": 336.811,
    "goodsValue": 2775959,
    "shipping": 850,
    "insurance": 4164,
    "total": 2780973,
    "commissionPercent": 4.41,
    "commission": 122420,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY968766",
      "capturedAt": "2026-06-26T22:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 2653539,
      "settledAt": "2026-07-14T16:30:00.000Z",
      "nodalReference": "NODAL14398"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Coimbatore",
    "awb": "SEQ9714943"
  },
  {
    "id": "ORD-0047",
    "jewellerId": "JWL-020",
    "manufacturerIds": [
      "MFR-002",
      "MFR-011"
    ],
    "status": "delivered",
    "placedAt": "2026-06-21T00:30:00.000Z",
    "confirmedAt": "2026-06-21T23:30:00.000Z",
    "dispatchedAt": "2026-06-23T16:30:00.000Z",
    "deliveredAt": "2026-07-02T20:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0047-L1",
        "productId": "PRD-030",
        "manufacturerId": "MFR-002",
        "title": "14K Antique Bridal Set",
        "sku": "002-BRI-0030",
        "purity": 14,
        "netWeight": 125.381,
        "quantity": 2,
        "unitPrice": 816574,
        "lineTotal": 1633148,
        "metalRateAtConfirmation": 4580
      },
      {
        "id": "ORD-0047-L2",
        "productId": "PRD-053",
        "manufacturerId": "MFR-011",
        "title": "22K Antique Stud Nose Pin",
        "sku": "011-NOS-0053",
        "purity": 22,
        "netWeight": 0.621,
        "quantity": 1,
        "unitPrice": 5841,
        "lineTotal": 5841,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 251.383,
    "goodsValue": 1638989,
    "shipping": 850,
    "insurance": 2458,
    "total": 1642297,
    "commissionPercent": 4.73,
    "commission": 77524,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY402684",
      "capturedAt": "2026-06-20T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "pending",
      "manufacturerPayout": 1561465,
      "settledAt": "2026-07-10T22:30:00.000Z",
      "nodalReference": "NODAL32218"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Kolkata",
    "awb": "SEQ1321191"
  },
  {
    "id": "ORD-0048",
    "jewellerId": "JWL-021",
    "manufacturerIds": [
      "MFR-009",
      "MFR-004",
      "MFR-024",
      "MFR-023"
    ],
    "status": "delivered",
    "placedAt": "2026-03-23T00:30:00.000Z",
    "confirmedAt": "2026-03-23T23:30:00.000Z",
    "dispatchedAt": "2026-03-28T17:30:00.000Z",
    "deliveredAt": "2026-04-04T03:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0048-L1",
        "productId": "PRD-037",
        "manufacturerId": "MFR-009",
        "title": "22K Kundan Nath",
        "sku": "009-NOS-0037",
        "purity": 22,
        "netWeight": 2.17,
        "quantity": 1,
        "unitPrice": 22167,
        "lineTotal": 22167,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0048-L2",
        "productId": "PRD-060",
        "manufacturerId": "MFR-004",
        "title": "22K Antique Cocktail Ring",
        "sku": "004-RIN-0060",
        "purity": 22,
        "netWeight": 8.832,
        "quantity": 1,
        "unitPrice": 87087,
        "lineTotal": 87087,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0048-L3",
        "productId": "PRD-013",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Kada Bracelet",
        "sku": "024-BRA-0013",
        "purity": 22,
        "netWeight": 23.564,
        "quantity": 2,
        "unitPrice": 208515,
        "lineTotal": 417030,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0048-L4",
        "productId": "PRD-026",
        "manufacturerId": "MFR-023",
        "title": "14K Bridal Set",
        "sku": "023-BRI-0026",
        "purity": 14,
        "netWeight": 129.331,
        "quantity": 1,
        "unitPrice": 721588,
        "lineTotal": 721588,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 187.461,
    "goodsValue": 1247872,
    "shipping": 850,
    "insurance": 1872,
    "total": 1250594,
    "commissionPercent": 4.41,
    "commission": 55031,
    "payment": {
      "status": "captured",
      "method": "RTGS",
      "reference": "PAY442859",
      "capturedAt": "2026-03-22T18:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 1192841,
      "settledAt": "2026-04-08T21:30:00.000Z",
      "nodalReference": "NODAL53159"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Rajkot",
    "awb": "SEQ6022615"
  },
  {
    "id": "ORD-0049",
    "jewellerId": "JWL-023",
    "manufacturerIds": [
      "MFR-023",
      "MFR-007"
    ],
    "status": "delivered",
    "placedAt": "2026-08-02T03:30:00.000Z",
    "confirmedAt": "2026-08-03T01:30:00.000Z",
    "dispatchedAt": "2026-08-09T21:30:00.000Z",
    "deliveredAt": "2026-08-11T16:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0049-L1",
        "productId": "PRD-054",
        "manufacturerId": "MFR-023",
        "title": "24K Full Bridal Suite",
        "sku": "023-BRI-0054",
        "purity": 24,
        "netWeight": 153.611,
        "quantity": 1,
        "unitPrice": 1500797,
        "lineTotal": 1500797,
        "metalRateAtConfirmation": 7850
      },
      {
        "id": "ORD-0049-L2",
        "productId": "PRD-007",
        "manufacturerId": "MFR-007",
        "title": "14K Polki Daily Wear Bangle Pair",
        "sku": "007-BAN-0007",
        "purity": 14,
        "netWeight": 43.64,
        "quantity": 3,
        "unitPrice": 270830,
        "lineTotal": 812490,
        "metalRateAtConfirmation": 4580
      }
    ],
    "totalNetWeight": 284.531,
    "goodsValue": 2313287,
    "shipping": 850,
    "insurance": 3470,
    "total": 2317607,
    "commissionPercent": 5.06,
    "commission": 117052,
    "payment": {
      "status": "captured",
      "method": "UPI",
      "reference": "PAY624607",
      "capturedAt": "2026-08-02T02:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 2196235,
      "settledAt": "2026-08-19T00:30:00.000Z",
      "nodalReference": "NODAL34042"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Hyderabad",
    "awb": "SEQ7082609"
  },
  {
    "id": "ORD-0050",
    "jewellerId": "JWL-024",
    "manufacturerIds": [
      "MFR-001",
      "MFR-025",
      "MFR-024"
    ],
    "status": "delivered",
    "placedAt": "2026-04-15T18:30:00.000Z",
    "confirmedAt": "2026-04-16T19:30:00.000Z",
    "dispatchedAt": "2026-04-23T20:30:00.000Z",
    "deliveredAt": "2026-04-22T02:30:00.000Z",
    "lines": [
      {
        "id": "ORD-0050-L1",
        "productId": "PRD-001",
        "manufacturerId": "MFR-001",
        "title": "22K Temple Stud Nose Pin",
        "sku": "001-NOS-0001",
        "purity": 22,
        "netWeight": 2.19,
        "quantity": 2,
        "unitPrice": 19910,
        "lineTotal": 39820,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0050-L2",
        "productId": "PRD-014",
        "manufacturerId": "MFR-025",
        "title": "22K Temple Temple Armlet",
        "sku": "025-TEM-0014",
        "purity": 22,
        "netWeight": 106.909,
        "quantity": 2,
        "unitPrice": 989661,
        "lineTotal": 1979322,
        "metalRateAtConfirmation": 7195
      },
      {
        "id": "ORD-0050-L3",
        "productId": "PRD-027",
        "manufacturerId": "MFR-024",
        "title": "22K Nakshi Gents Ring",
        "sku": "024-RIN-0027",
        "purity": 22,
        "netWeight": 5.456,
        "quantity": 1,
        "unitPrice": 47282,
        "lineTotal": 47282,
        "metalRateAtConfirmation": 7195
      }
    ],
    "totalNetWeight": 223.654,
    "goodsValue": 2066424,
    "shipping": 850,
    "insurance": 3100,
    "total": 2070374,
    "commissionPercent": 5.23,
    "commission": 108074,
    "payment": {
      "status": "captured",
      "method": "Net Banking",
      "reference": "PAY301270",
      "capturedAt": "2026-04-15T17:30:00.000Z",
      "failureReason": null
    },
    "settlement": {
      "status": "settled",
      "manufacturerPayout": 1958350,
      "settledAt": "2026-05-01T22:30:00.000Z",
      "nodalReference": "NODAL31937"
    },
    "return": null,
    "disputeReason": null,
    "cancellationReason": null,
    "shippingCity": "Jaipur",
    "awb": "SEQ5481251"
  }
];

export default orders;
