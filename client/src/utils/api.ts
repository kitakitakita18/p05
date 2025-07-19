import axios from 'axios';
import { User, Meeting, Agenda, GarbageSchedule, Announcement, MeetingAttendance, DateCandidate, DateVote, AttendanceSummary, Association } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5105/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  console.log('Token from localStorage:', token ? token.substring(0, 20) + '...' : 'none');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // User management
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    return response.data as User[];
  },

  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await axios.post(`${API_BASE_URL}/users`, userData, { headers: getAuthHeaders() });
    return response.data as User;
  },

  updateUser: async (userId: number, userData: Partial<User>): Promise<User> => {
    const response = await axios.put(`${API_BASE_URL}/users/${userId}`, userData, { headers: getAuthHeaders() });
    return response.data as User;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/users/${userId}`, { headers: getAuthHeaders() });
  },

  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    await axios.put(`${API_BASE_URL}/users/${userId}/reset-password`, { newPassword }, { headers: getAuthHeaders() });
  },

  // Meeting management
  getMeetings: async (): Promise<Meeting[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings`, { headers: getAuthHeaders() });
    return response.data as Meeting[];
  },

  getMeetingsByYear: async (year: string): Promise<Meeting[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/by-year/${year}`, { headers: getAuthHeaders() });
    return response.data as Meeting[];
  },

  getMeetingYears: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/years`, { headers: getAuthHeaders() });
    return response.data as string[];
  },

  getRecentMeetings: async (): Promise<Meeting[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/recent`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  getNextMeeting: async (): Promise<Meeting | null> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/next`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  createMeeting: async (meetingData: Partial<Meeting>): Promise<Meeting> => {
    const response = await axios.post(`${API_BASE_URL}/meetings`, meetingData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  updateMeeting: async (meetingId: number, meetingData: Partial<Meeting>): Promise<Meeting> => {
    const response = await axios.put(`${API_BASE_URL}/meetings/${meetingId}`, meetingData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  deleteMeeting: async (meetingId: number): Promise<{message: string, deletedId: number}> => {
    const response = await axios.delete(`${API_BASE_URL}/meetings/${meetingId}`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  generateMeetingSchedule: async (): Promise<{message: string, meetings: Meeting[], count: number}> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/generate-schedule`, {}, { headers: getAuthHeaders() });
    return response.data as any;
  },

  sendAttendanceEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/send-attendance-email`, {}, { headers: getAuthHeaders() });
    return response.data as any;
  },

  sendReminderEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/send-reminder`, {}, { headers: getAuthHeaders() });
    return response.data as any;
  },

  getAttendanceSummary: async (meetingId: number): Promise<AttendanceSummary> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/attendance-summary`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Agenda management
  getAllAgendas: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  getAgendas: async (meetingId: number): Promise<Agenda[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas/${meetingId}`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  createAgenda: async (agendaData: Partial<Agenda>): Promise<Agenda> => {
    const response = await axios.post(`${API_BASE_URL}/agendas`, agendaData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  updateAgenda: async (agendaId: number, agendaData: Partial<Agenda>): Promise<Agenda> => {
    const response = await axios.put(`${API_BASE_URL}/agendas/${agendaId}`, agendaData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  deleteAgenda: async (agendaId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/agendas/${agendaId}`, { headers: getAuthHeaders() });
  },

  reorderAgendas: async (meetingId: number, agendas: {id: number, order_no: number}[]): Promise<any> => {
    const response = await axios.put(`${API_BASE_URL}/agendas/${meetingId}/reorder`, { agendas }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  sendAgendaListEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/agendas/${meetingId}/send-email`, {}, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Agenda documents
  getAgendaDocuments: async (agendaId: number): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas/${agendaId}/documents`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  uploadAgendaDocument: async (agendaId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE_URL}/agendas/${agendaId}/documents/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as any;
  },

  deleteAgendaDocument: async (documentId: number): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/agendas/documents/${documentId}`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Garbage schedule
  getGarbageSchedule: async (): Promise<GarbageSchedule[]> => {
    const response = await axios.get(`${API_BASE_URL}/garbage-schedule`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  createGarbageSchedule: async (scheduleData: Partial<GarbageSchedule>): Promise<GarbageSchedule> => {
    const response = await axios.post(`${API_BASE_URL}/garbage-schedule`, scheduleData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    const response = await axios.get(`${API_BASE_URL}/announcements`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  createAnnouncement: async (announcementData: Partial<Announcement>): Promise<Announcement> => {
    const response = await axios.post(`${API_BASE_URL}/announcements`, announcementData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // File upload
  uploadFile: async (file: File): Promise<{ filename: string; originalname: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as any;
  },

  // Meeting attendance
  getMeetingAttendance: async (meetingId: number): Promise<MeetingAttendance[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/attendance`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  updateAttendanceStatus: async (meetingId: number, status: string, userId?: number): Promise<MeetingAttendance> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/attendance`, { status, userId }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  saveBulkAttendance: async (meetingId: number, attendances: { user_id: number; status: string }[]): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/attendance/bulk`, { attendances }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Meeting minutes
  getMeetingMinutes: async (meetingId: number): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/minutes`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  uploadMeetingMinutes: async (meetingId: number, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/minutes/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data as any;
  },

  deleteMeetingMinutes: async (fileId: number): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Date scheduling
  getDateCandidates: async (meetingId: number): Promise<DateCandidate[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/candidates`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  createDateCandidate: async (meetingId: number, candidateDate: string): Promise<DateCandidate> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/candidates`, { candidate_date: candidateDate }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  getDateVotes: async (candidateId: number): Promise<DateVote[]> => {
    const response = await axios.get(`${API_BASE_URL}/candidates/${candidateId}/votes`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  submitDateVote: async (candidateId: number, availability: string): Promise<DateVote> => {
    const response = await axios.post(`${API_BASE_URL}/candidates/${candidateId}/votes`, { availability }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  getAllDateVotes: async (meetingId: number): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/votes`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // Association master
  getAssociation: async (): Promise<Association> => {
    const response = await axios.get(`${API_BASE_URL}/association`, { headers: getAuthHeaders() });
    return response.data as any;
  },

  updateAssociation: async (associationData: Partial<Association>): Promise<Association> => {
    const response = await axios.put(`${API_BASE_URL}/association`, associationData, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // OpenAI API functions
  chatCompletion: async (messages: Array<{role: string, content: string}>): Promise<{role: string, content: string}> => {
    const response = await axios.post(`${API_BASE_URL}/ai/chat`, {
      messages
    }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // バックエンド経由OpenAI API (ユーザー指定の実装)
  sendChatMessage: async (messages: any[]): Promise<{content: string, searchResults?: any[], hasSearchResults?: boolean}> => {
    const response = await axios.post(`${API_BASE_URL}/openai/chat`, { 
      messages 
    }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  summarizeMinutes: async (content: string, meetingTitle: string, meetingDate?: string): Promise<{summary: string, original_length: number, summary_length: number}> => {
    const response = await axios.post(`${API_BASE_URL}/ai/summarize-minutes`, {
      content,
      meetingTitle,
      meetingDate
    }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  suggestAgendas: async (meetingType?: string, previousMinutes?: string, currentIssues?: string): Promise<{suggestions: string, meeting_type: string, generated_at: string}> => {
    const response = await axios.post(`${API_BASE_URL}/ai/suggest-agendas`, {
      meetingType,
      previousMinutes,
      currentIssues
    }, { headers: getAuthHeaders() });
    return response.data as any;
  },

  // ベクトル検索API
  searchDocuments: async (question: string, matchThreshold: number = 0.2, matchCount: number = 10): Promise<{question: string, results: any[]}> => {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      question,
      matchThreshold,
      matchCount
    }, { headers: getAuthHeaders() });
    return response.data as any;
  },
};

// ユーザー指定の実装に合わせた個別エクスポート
export const sendChatMessage = async (messages: any[]): Promise<{content: string, searchResults?: any[], hasSearchResults?: boolean}> => {
  console.log('Sending chat message to:', `${API_BASE_URL}/openai/chat`);
  console.log('Headers:', getAuthHeaders());
  try {
    const response = await axios.post(`${API_BASE_URL}/openai/chat`, { 
      messages 
    }, { headers: getAuthHeaders() });
    return response.data as any;
  } catch (error: any) {
    console.error('sendChatMessage error:', error.response?.data || error.message);
    throw error;
  }
};

export const searchDocuments = async (question: string, matchThreshold: number = 0.2, matchCount: number = 10): Promise<{question: string, results: any[]}> => {
  console.log('🔍 Searching documents for:', question);
  console.log('🔍 Search params:', { question, matchThreshold, matchCount });
  console.log('🔍 Headers:', getAuthHeaders());
  console.log('🔍 API URL:', `${API_BASE_URL}/search`);
  try {
    const response = await axios.post(`${API_BASE_URL}/search`, {
      question,
      matchThreshold,
      matchCount
    }, { headers: getAuthHeaders() });
    console.log('🔍 Raw API response:', response);
    console.log('🔍 Response data:', response.data);
    return response.data as any;
  } catch (error: any) {
    console.error('❌ searchDocuments error:', error.response?.data || error.message);
    console.error('❌ Full error object:', error);
    throw error;
  }
};