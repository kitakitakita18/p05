import axios from 'axios';
import { User, Meeting, Agenda, GarbageSchedule, Announcement, MeetingAttendance, DateCandidate, DateVote, AttendanceSummary, Association } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5105/api';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // User management
  getUsers: async (): Promise<User[]> => {
    const response = await axios.get(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
    return response.data;
  },

  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await axios.post(`${API_BASE_URL}/users`, userData, { headers: getAuthHeaders() });
    return response.data;
  },

  updateUser: async (userId: number, userData: Partial<User>): Promise<User> => {
    const response = await axios.put(`${API_BASE_URL}/users/${userId}`, userData, { headers: getAuthHeaders() });
    return response.data;
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
    return response.data;
  },

  getMeetingsByYear: async (year: string): Promise<Meeting[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/by-year/${year}`, { headers: getAuthHeaders() });
    return response.data;
  },

  getMeetingYears: async (): Promise<string[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/years`, { headers: getAuthHeaders() });
    return response.data;
  },

  getRecentMeetings: async (): Promise<Meeting[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/recent`, { headers: getAuthHeaders() });
    return response.data;
  },

  getNextMeeting: async (): Promise<Meeting | null> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/next`, { headers: getAuthHeaders() });
    return response.data;
  },

  createMeeting: async (meetingData: Partial<Meeting>): Promise<Meeting> => {
    const response = await axios.post(`${API_BASE_URL}/meetings`, meetingData, { headers: getAuthHeaders() });
    return response.data;
  },

  updateMeeting: async (meetingId: number, meetingData: Partial<Meeting>): Promise<Meeting> => {
    const response = await axios.put(`${API_BASE_URL}/meetings/${meetingId}`, meetingData, { headers: getAuthHeaders() });
    return response.data;
  },

  deleteMeeting: async (meetingId: number): Promise<{message: string, deletedId: number}> => {
    const response = await axios.delete(`${API_BASE_URL}/meetings/${meetingId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  generateMeetingSchedule: async (): Promise<{message: string, meetings: Meeting[], count: number}> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/generate-schedule`, {}, { headers: getAuthHeaders() });
    return response.data;
  },

  sendAttendanceEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/send-attendance-email`, {}, { headers: getAuthHeaders() });
    return response.data;
  },

  sendReminderEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/send-reminder`, {}, { headers: getAuthHeaders() });
    return response.data;
  },

  getAttendanceSummary: async (meetingId: number): Promise<AttendanceSummary> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/attendance-summary`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Agenda management
  getAllAgendas: async (): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas`, { headers: getAuthHeaders() });
    return response.data;
  },

  getAgendas: async (meetingId: number): Promise<Agenda[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas/${meetingId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  createAgenda: async (agendaData: Partial<Agenda>): Promise<Agenda> => {
    const response = await axios.post(`${API_BASE_URL}/agendas`, agendaData, { headers: getAuthHeaders() });
    return response.data;
  },

  updateAgenda: async (agendaId: number, agendaData: Partial<Agenda>): Promise<Agenda> => {
    const response = await axios.put(`${API_BASE_URL}/agendas/${agendaId}`, agendaData, { headers: getAuthHeaders() });
    return response.data;
  },

  deleteAgenda: async (agendaId: number): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/agendas/${agendaId}`, { headers: getAuthHeaders() });
  },

  reorderAgendas: async (meetingId: number, agendas: {id: number, order_no: number}[]): Promise<any> => {
    const response = await axios.put(`${API_BASE_URL}/agendas/${meetingId}/reorder`, { agendas }, { headers: getAuthHeaders() });
    return response.data;
  },

  sendAgendaListEmail: async (meetingId: number): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/agendas/${meetingId}/send-email`, {}, { headers: getAuthHeaders() });
    return response.data;
  },

  // Agenda documents
  getAgendaDocuments: async (agendaId: number): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/agendas/${agendaId}/documents`, { headers: getAuthHeaders() });
    return response.data;
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
    
    return response.data;
  },

  deleteAgendaDocument: async (documentId: number): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/agendas/documents/${documentId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Garbage schedule
  getGarbageSchedule: async (): Promise<GarbageSchedule[]> => {
    const response = await axios.get(`${API_BASE_URL}/garbage-schedule`, { headers: getAuthHeaders() });
    return response.data;
  },

  createGarbageSchedule: async (scheduleData: Partial<GarbageSchedule>): Promise<GarbageSchedule> => {
    const response = await axios.post(`${API_BASE_URL}/garbage-schedule`, scheduleData, { headers: getAuthHeaders() });
    return response.data;
  },

  // Announcements
  getAnnouncements: async (): Promise<Announcement[]> => {
    const response = await axios.get(`${API_BASE_URL}/announcements`, { headers: getAuthHeaders() });
    return response.data;
  },

  createAnnouncement: async (announcementData: Partial<Announcement>): Promise<Announcement> => {
    const response = await axios.post(`${API_BASE_URL}/announcements`, announcementData, { headers: getAuthHeaders() });
    return response.data;
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
    
    return response.data;
  },

  // Meeting attendance
  getMeetingAttendance: async (meetingId: number): Promise<MeetingAttendance[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/attendance`, { headers: getAuthHeaders() });
    return response.data;
  },

  updateAttendanceStatus: async (meetingId: number, status: string, userId?: number): Promise<MeetingAttendance> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/attendance`, { status, userId }, { headers: getAuthHeaders() });
    return response.data;
  },

  saveBulkAttendance: async (meetingId: number, attendances: { user_id: number; status: string }[]): Promise<any> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/attendance/bulk`, { attendances }, { headers: getAuthHeaders() });
    return response.data;
  },

  // Meeting minutes
  getMeetingMinutes: async (meetingId: number): Promise<any[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/minutes`, { headers: getAuthHeaders() });
    return response.data;
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
    return response.data;
  },

  deleteMeetingMinutes: async (fileId: number): Promise<any> => {
    const response = await axios.delete(`${API_BASE_URL}/files/${fileId}`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Date scheduling
  getDateCandidates: async (meetingId: number): Promise<DateCandidate[]> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/candidates`, { headers: getAuthHeaders() });
    return response.data;
  },

  createDateCandidate: async (meetingId: number, candidateDate: string): Promise<DateCandidate> => {
    const response = await axios.post(`${API_BASE_URL}/meetings/${meetingId}/candidates`, { candidate_date: candidateDate }, { headers: getAuthHeaders() });
    return response.data;
  },

  getDateVotes: async (candidateId: number): Promise<DateVote[]> => {
    const response = await axios.get(`${API_BASE_URL}/candidates/${candidateId}/votes`, { headers: getAuthHeaders() });
    return response.data;
  },

  submitDateVote: async (candidateId: number, availability: string): Promise<DateVote> => {
    const response = await axios.post(`${API_BASE_URL}/candidates/${candidateId}/votes`, { availability }, { headers: getAuthHeaders() });
    return response.data;
  },

  getAllDateVotes: async (meetingId: number): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/meetings/${meetingId}/votes`, { headers: getAuthHeaders() });
    return response.data;
  },

  // Association master
  getAssociation: async (): Promise<Association> => {
    const response = await axios.get(`${API_BASE_URL}/association`, { headers: getAuthHeaders() });
    return response.data;
  },

  updateAssociation: async (associationData: Partial<Association>): Promise<Association> => {
    const response = await axios.put(`${API_BASE_URL}/association`, associationData, { headers: getAuthHeaders() });
    return response.data;
  },
};