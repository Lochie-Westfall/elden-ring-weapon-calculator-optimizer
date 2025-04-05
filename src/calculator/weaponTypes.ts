export const WeaponType = {
  DAGGER: 1,
  STRAIGHT_SWORD: 3,
  GREATSWORD: 5,
  COLOSSAL_SWORD: 7,
  CURVED_SWORD: 9,
  CURVED_GREATSWORD: 11,
  KATANA: 13,
  TWINBLADE: 14,
  THRUSTING_SWORD: 15,
  HEAVY_THRUSTING_SWORD: 16,
  AXE: 17,
  GREATAXE: 19,
  HAMMER: 21,
  GREAT_HAMMER: 23,
  FLAIL: 24,
  SPEAR: 25,
  GREAT_SPEAR: 28,
  HALBERD: 29,
  REAPER: 31,
  FIST: 35,
  CLAW: 37,
  WHIP: 39,
  COLOSSAL_WEAPON: 41,
  LIGHT_BOW: 50,
  BOW: 51,
  GREATBOW: 53,
  CROSSBOW: 55,
  BALLISTA: 56,
  GLINTSTONE_STAFF: 57,
  DUAL_CATALYST: 59,
  SACRED_SEAL: 61,
  SMALL_SHIELD: 65,
  MEDIUM_SHIELD: 67,
  GREATSHIELD: 69,
  TORCH: 87,
  HAND_TO_HAND: 88,
  PERFUME_BOTTLE: 89,
  THRUSTING_SHIELD: 90,
  THROWING_BLADE: 91,
  BACKHAND_BLADE: 92,
  LIGHT_GREATSWORD: 93,
  GREAT_KATANA: 94,
  BEAST_CLAW: 95,
} as const;

export type WeaponType = typeof WeaponType[keyof typeof WeaponType];
