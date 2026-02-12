// lib/gameConstants.ts

export const ROLES = {
  WEREWOLF: "werewolf",
  SEER: "seer",
  VILLAGER: "villager",
  HUNTER: "hunter",
  MADMAN: "madman",
  MEDIUM: "medium",
  FOX: "fox",
  TWINS: "twins",
} as const;

export const TEAMS = {
  VILLAGERS: "VILLAGERS",
  WEREWOLVES: "WEREWOLVES",
  FOX: "FOX",
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];