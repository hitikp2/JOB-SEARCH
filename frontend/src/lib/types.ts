export interface User {
  id: string;
  email: string;
  phone?: string;
}

export interface Profile {
  id: string;
  email: string;
  primary_roles?: string[];
  skills?: string[];
  seniority_level?: string;
  remote_preference?: string;
  salary_expectation?: string;
  preferred_locations?: string[];
  notification_method?: string;
  profile_complete?: boolean;
}

export interface Job {
  id: string;
  title: string;
  company?: string;
  location?: string;
  salary?: string;
  url?: string;
  description?: string;
}

export interface Match {
  id: string;
  score: number;
  ai_summary?: string;
  jobs?: Job;
  created_at?: string;
}

export interface MatchStats {
  total_matches: number;
  today_matches: number;
  notifications_sent: number;
  avg_score: number;
}
