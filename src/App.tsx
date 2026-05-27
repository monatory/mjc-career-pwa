import { Routes, Route, Navigate } from "react-router-dom";
import Start from "./student/Start";
import Profile from "./student/Profile";
import Exam from "./student/Exam";
import Stage2 from "./student/Stage2";
import Result from "./student/Result";
import AdminDashboard from "./admin/Dashboard";
import LegalFooter from "./components/LegalFooter";

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Start />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/exam" element={<Exam />} />
        <Route path="/stage2" element={<Stage2 />} />
        <Route path="/result" element={<Result />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LegalFooter />
    </div>
  );
}
