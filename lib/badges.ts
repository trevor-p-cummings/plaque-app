import type { Badge } from "../types";

export const BADGES: Badge[] = [
  { id: "first_visit", name: "First Visit", description: "Check in to your first plaque", icon: "🏅", requirement: 1 },
  { id: "explorer_5", name: "Explorer", description: "Check in to 5 plaques", icon: "🗺️", requirement: 5 },
  { id: "historian_10", name: "Historian", description: "Check in to 10 plaques", icon: "📜", requirement: 10 },
  { id: "veteran_25", name: "Veteran", description: "Check in to 25 plaques", icon: "🏆", requirement: 25 },
  { id: "master_50", name: "Master", description: "Check in to 50 plaques", icon: "👑", requirement: 50 },
];

export function getEarnedBadges(checkInCount: number): Badge[] {
  return BADGES.filter((b) => checkInCount >= b.requirement);
}

export const POINTS_PER_CHECKIN = 10;
export const POINTS_PER_PHOTO = 5;
export const POINTS_PER_QUIZ = 15;
