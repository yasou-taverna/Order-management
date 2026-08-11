const TABLE_BLUEPRINT = [
  { id: 1, seats: 4, zone: "inside", x: 12, y: 90, w: 60, h: 60 },
  { id: 2, seats: 4, zone: "inside", x: 12, y: 66, w: 60, h: 60 },
  { id: 3, seats: 4, zone: "inside", x: 12, y: 44, w: 60, h: 60 },
  { id: 4, seats: 4, zone: "inside", x: 12, y: 22, w: 60, h: 60 },
  { id: 5, seats: 4, zone: "inside", x: 34, y: 66, w: 60, h: 60 },
  { id: 6, seats: 4, zone: "inside", x: 34, y: 44, w: 60, h: 60 },
  { id: 7, seats: 6, zone: "inside", x: 34, y: 22, w: 90, h: 60 },
  { id: 8, seats: 2, zone: "inside", x: 56, y: 66, w: 60, h: 60 },
  { id: 9, seats: 4, zone: "inside", x: 56, y: 44, w: 60, h: 60 },
  { id: 10, seats: 4, zone: "inside", x: 56, y: 22, w: 60, h: 60 },
  { id: 11, seats: 4, zone: "inside", x: 78, y: 90, w: 60, h: 60 },
  { id: 12, seats: 4, zone: "inside", x: 78, y: 66, w: 60, h: 60 },
  { id: 13, seats: 4, zone: "inside", x: 78, y: 44, w: 60, h: 60 },
  { id: 14, seats: 4, zone: "inside", x: 78, y: 22, w: 60, h: 60 },
  { id: 15, seats: 2, zone: "inside", x: 98, y: 66, w: 60, h: 60 },
  { id: 16, seats: 2, zone: "inside", x: 98, y: 44, w: 60, h: 60 },
  { id: 17, seats: 2, zone: "inside", x: 98, y: 22, w: 60, h: 60 },
  { id: 18, seats: 6, zone: "covered", x: 11, y: 62, w: 90, h: 60 },
  { id: 19, seats: 10, zone: "covered", x: 54, y: 68, w: 110, h: 110, round: true },
  { id: 20, seats: 6, zone: "covered", x: 95, y: 62, w: 90, h: 60 },
  { id: 21, seats: 8, zone: "covered", x: 13, y: 25, w: 128, h: 60 },
  { id: 22, seats: 12, zone: "covered", x: 40, y: 25, w: 172, h: 60 },
  { id: 23, seats: 12, zone: "covered", x: 68, y: 25, w: 172, h: 60 },
  { id: 24, seats: 8, zone: "covered", x: 93, y: 25, w: 128, h: 60 },
  { id: 25, seats: 6, zone: "outside", x: 12, y: 28, w: 90, h: 60 },
  { id: 26, seats: 6, zone: "outside", x: 32, y: 28, w: 90, h: 60 },
  { id: 27, seats: 6, zone: "outside", x: 12, y: 74, w: 90, h: 60 },
  { id: 28, seats: 6, zone: "outside", x: 32, y: 74, w: 90, h: 60 },
  { id: 29, seats: 6, zone: "outside", x: 52, y: 28, w: 90, h: 60 },
  { id: 30, seats: 6, zone: "outside", x: 52, y: 74, w: 90, h: 60 },
  { id: 31, seats: 6, zone: "outside", x: 73, y: 28, w: 90, h: 60 },
  { id: 32, seats: 6, zone: "outside", x: 95, y: 28, w: 90, h: 60 },
  { id: 33, seats: 6, zone: "outside", x: 73, y: 74, w: 90, h: 60 },
  { id: 34, seats: 6, zone: "outside", x: 95, y: 74, w: 90, h: 60 }
];

const ZONE_TO_CONTAINER = {
  outside: "zone-outdoor",
  covered: "zone-covered",
  inside: "zone-indoor"
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TABLE_BLUEPRINT, ZONE_TO_CONTAINER };
}
