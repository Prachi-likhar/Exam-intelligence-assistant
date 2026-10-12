import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  BookOpen,
  HelpCircle,
  BarChart3,
  Flame,
  CalendarCheck2,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { useCourse } from '../../context/CourseContext';

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { activeCourse } = useCourse();

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'Upload Papers', path: '/upload', icon: UploadCloud, badge: activeCourse?.document_count },
    { name: 'Syllabus', path: '/syllabus', icon: BookOpen, badge: activeCourse?.topic_count },
    { name: 'Question Analysis', path: '/questions', icon: HelpCircle, badge: activeCourse?.question_count },
    { name: 'Topic Weightage', path: '/weightage', icon: BarChart3 },
    { name: 'Study Priorities', path: '/priorities', icon: Flame },
    { name: 'Revision Planner', path: '/planner', icon: CalendarCheck2 },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-30 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                ExamIQ
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Exam Intelligence</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md">
            <GraduationCap className="w-6 h-6" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
            collapsed ? 'hidden md:block absolute -right-3 top-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-sm' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm shadow-indigo-100 dark:shadow-none'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                } ${collapsed ? 'justify-center px-2' : ''}`
              }
              title={collapsed ? item.name : undefined}
            >
              <Icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>{item.name}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Course Info Footer */}
      {!collapsed && activeCourse && (
        <div className="p-3 mx-3 mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
              {activeCourse.code}
            </span>
            {activeCourse.is_demo === 1 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                DEMO
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate" title={activeCourse.name}>
            {activeCourse.name}
          </p>
        </div>
      )}
    </aside>
  );
};
