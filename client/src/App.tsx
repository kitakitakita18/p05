import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MeetingManagement from './components/MeetingManagement';
import BoardMeetingSchedule from './components/BoardMeetingSchedule';
import AgendaManagement from './components/AgendaManagement';
import AgendaRegistration from './components/AgendaRegistration';
import UserManagement from './components/UserManagement';
import AssociationMaster from './components/AssociationMaster';
import RoleManagement from './components/RoleManagement';
import MeetingTest from './components/MeetingTest';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson', 'board_member']}>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/meetings"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson', 'board_member']}>
                <Layout>
                  <MeetingManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agendas"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson']}>
                <Layout>
                  <AgendaManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/agenda-registration"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson']}>
                <Layout>
                  <AgendaRegistration />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/board-meetings"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson']}>
                <Layout>
                  <BoardMeetingSchedule />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <UserManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/association"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <AssociationMaster />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/roles"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Layout>
                  <RoleManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/test"
            element={
              <ProtectedRoute requiredRoles={['admin', 'chairperson']}>
                <Layout>
                  <MeetingTest />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;