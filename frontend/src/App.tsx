import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CourseProvider } from './context/CourseContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { SyllabusPage } from './pages/SyllabusPage';
import { QuestionsPage } from './pages/QuestionsPage';
import { WeightagePage } from './pages/WeightagePage';
import { PrioritiesPage } from './pages/PrioritiesPage';
import { PlannerPage } from './pages/PlannerPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <CourseProvider>
      <BrowserRouter>
        <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50/70 via-white to-sky-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/40 font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
          {/* Collapsible Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
            <Navbar />

            {/* Scrollable Content Container */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/upload" element={<UploadPage />} />
                  <Route path="/syllabus" element={<SyllabusPage />} />
                  <Route path="/questions" element={<QuestionsPage />} />
                  <Route path="/weightage" element={<WeightagePage />} />
                  <Route path="/priorities" element={<PrioritiesPage />} />
                  <Route path="/planner" element={<PlannerPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </CourseProvider>
  );
};

export default App;
