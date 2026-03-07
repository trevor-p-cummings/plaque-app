export interface Plaque {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  plaque_id: string;
  photo_url: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  plaque_id: string;
  question: string;
  options: string[];
  correct_index: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  points: number;
  badges: string[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number; // number of check-ins needed
}
