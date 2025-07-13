export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'chairperson' | 'board_member' | 'resident';
  role_cd?: number;
  room_number?: string;
  phone?: string;
  created_at: string;
}

export interface Meeting {
  id: number;
  title: string;
  date: string;
  time_start?: string;
  time_end?: string;
  location?: string;
  description?: string;
  status: 'confirmed' | 'tentative' | 'completed' | 'cancelled';
  meeting_type: 'regular' | 'emergency';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingAttendance {
  id: number;
  meeting_id: number;
  user_id: number;
  member_name?: string;
  status: 'pending' | 'attending' | 'absent' | 'maybe';
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export interface AttendanceSummary {
  meeting_id: number;
  total_invitees: number;
  attending: number;
  absent: number;
  pending: number;
  attendance_rate: number;
}

export interface EmailNotification {
  id: number;
  meeting_id: number;
  type: 'meeting_confirmed' | 'attendance_request' | 'reminder';
  recipient_email: string;
  subject: string;
  body: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export interface DateCandidate {
  id: number;
  meeting_id: number;
  candidate_date: string;
  start_time?: string;
  end_time?: string;
  created_at: string;
}

export interface DateVote {
  id: number;
  candidate_id: number;
  user_id: number;
  availability: 'available' | 'unavailable' | 'maybe';
  created_at: string;
  user_name?: string;
}

export interface Agenda {
  id: number;
  meeting_id: number;
  title: string;
  description?: string;
  order_no: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'finished';
  discussion_result?: string;
  category?: string;
  approval_status?: 'approved' | 'rejected';
  priority: 'S' | 'A' | 'B' | 'C';
  start_date?: string;
  due_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface MeetingMinutes {
  id: number;
  meeting_id: number;
  content: string;
  is_approved: boolean;
  approved_by?: number;
  approved_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  meeting_id?: number;
  agenda_id?: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: number;
  created_at: string;
}

export interface GarbageSchedule {
  id: number;
  date: string;
  type: string;
  description?: string;
  created_at: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  is_important: boolean;
  is_published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AgendaComment {
  id: number;
  agenda_id: number;
  user_id: number;
  comment: string;
  created_at: string;
}

export interface Association {
  id: number;
  association_code: string;
  association_name: string;
  chairperson_name: string;
  meeting_frequency: number;
  meeting_week?: number;
  meeting_day_of_week?: number;
  meeting_start_time?: string;
  meeting_end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}