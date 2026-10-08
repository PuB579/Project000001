import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { getToken, getUser } from "./lib/api";

import FaceAttendLanding from "./components/FaceAttendLanding";
import LoginPage from "./components/LoginPage";

import StudentDashboard from "./components/Student/StudentDashboard";
import CheckinHistory from "./components/Student/CheckinHistory";
import Faceregistration from "./components/Student/Faceregistration";
import StudentCheckin from "./components/Student/StudentCheckin";
import MyCourses from "./components/Student/MyCourses";
import Schedule from "./components/Student/Schedule";
import Profile from "./components/Student/Profile";
import Settings from "./components/Student/Settings";
import Announcements from "./components/Student/Announcements";

import TeacherDashboard from "./components/Teacher/TeacherDashboard";
import TeacherCourses from "./components/Teacher/TeacherCourses";
import TeacherCheckinHistory from "./components/Teacher/TeacherCheckinHistory";
import TeacherAttendanceReport from "./components/Teacher/TeacherAttendanceReport";
import TeacherAttendanceScore from "./components/Teacher/TeacherAttendanceScore";
import TeacherStudents from "./components/Teacher/TeacherStudents";
import TeacherExportData from "./components/Teacher/TeacherExportData";
import TeacherProfile from "./components/Teacher/TeacherProfile";
import TeacherSettings from "./components/Teacher/TeacherSettings";
import TeacherAnnouncements from "./components/Teacher/TeacherAnnouncements";

// ยังไม่ login -> ไปหน้า login, login แล้วแต่ผิดบทบาท -> ไปหน้าหลักของบทบาทตัวเอง
function RequireRole({ role }) {
  const user = getUser();
  if (!getToken() || !user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === "teacher" ? "/teacher-dashboard" : "/dashboard"} replace />;
  }
  return <Outlet />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<FaceAttendLanding />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Student */}
      <Route element={<RequireRole role="student" />}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/checkin" element={<StudentCheckin />} />
        <Route path="/history" element={<CheckinHistory />} />
        <Route path="/face-registration" element={<Faceregistration />} />
        <Route path="/courses" element={<MyCourses />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/announcements" element={<Announcements />} />
      </Route>

      {/* Teacher */}
      <Route element={<RequireRole role="teacher" />}>
        <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher-courses" element={<TeacherCourses />} />
        <Route path="/teacher-history" element={<TeacherCheckinHistory />} />
        <Route path="/teacher-report" element={<TeacherAttendanceReport />} />
        <Route path="/teacher-scores" element={<TeacherAttendanceScore />} />
        <Route path="/teacher-students" element={<TeacherStudents />} />
        <Route path="/teacher-export" element={<TeacherExportData />} />
        <Route path="/teacher-announcements" element={<TeacherAnnouncements />} />
        <Route path="/teacher-profile" element={<TeacherProfile />} />
        <Route path="/teacher-settings" element={<TeacherSettings />} />
      </Route>
    </Routes>
  );
}

export default App;
