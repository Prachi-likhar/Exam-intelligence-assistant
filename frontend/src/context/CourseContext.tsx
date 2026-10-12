import React, { createContext, useContext, useState, useEffect } from 'react';
import { Course } from '../types';
import { api } from '../services/api';

interface CourseContextType {
  courses: Course[];
  activeCourse: Course | null;
  setActiveCourse: (c: Course) => void;
  isLoading: boolean;
  refreshCourses: (preferredCourseId?: string) => Promise<void>;
  loadDemoMode: () => Promise<void>;
  createCourse: (data: { code: string; name: string; exam_date?: string }) => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export const CourseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleSetActiveCourse = (c: Course) => {
    setActiveCourse(c);
    try {
      localStorage.setItem('examiq_active_course_id', c.id);
    } catch {}
  };

  const refreshCourses = async (preferredCourseId?: string) => {
    try {
      setIsLoading(true);
      const list = await api.getCourses();
      setCourses(list);
      if (list.length > 0) {
        let targetId = preferredCourseId;
        if (!targetId) {
          try {
            targetId = localStorage.getItem('examiq_active_course_id') || undefined;
          } catch {}
        }
        if (!targetId && activeCourse) {
          targetId = activeCourse.id;
        }

        const matched = list.find((c) => c.id === targetId) || list[0];
        setActiveCourse(matched);
        try {
          localStorage.setItem('examiq_active_course_id', matched.id);
        } catch {}
      } else {
        // If no course exists on server, auto-seed demo course
        try {
          const demo = await api.loadDemoCourse();
          setCourses([demo]);
          setActiveCourse(demo);
          try {
            localStorage.setItem('examiq_active_course_id', demo.id);
          } catch {}
        } catch (demoErr) {
          console.warn('Initial demo auto-seed deferred:', demoErr);
        }
      }
    } catch (err: any) {
      console.error('Failed to load courses', err);
      showToast('Backend connection notice: ' + (err.message || 'Connecting to backend...'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoMode = async () => {
    try {
      setIsLoading(true);

      // 1. If demo course is already in the loaded courses list, activate it immediately!
      const existingDemo = courses.find((c) => c.is_demo === 1 || c.id === 'demo-cs302-os');
      if (existingDemo) {
        handleSetActiveCourse(existingDemo);
        showToast(`Loaded Demo Subject: ${existingDemo.code} - ${existingDemo.name} (with 4 exam papers & 38 questions)`);
        return;
      }

      // 2. Otherwise request server to seed/fetch demo dataset
      showToast('Loading Demo Subject: CS302 Operating Systems...');
      const demoCourse = await api.loadDemoCourse();
      await refreshCourses(demoCourse.id);
      showToast('Loaded Demo Subject: CS302 Operating Systems (with 4 exam papers & 38 questions)');
    } catch (err: any) {
      // 3. Fallback: check again if courses has demo course
      const existingDemo = courses.find((c) => c.is_demo === 1 || c.id === 'demo-cs302-os');
      if (existingDemo) {
        handleSetActiveCourse(existingDemo);
        showToast('Active Demo Subject: CS302 Operating Systems');
      } else {
        const errorMsg = err?.message || 'Server connection timed out';
        showToast('Failed to load demo course: ' + errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const createCourse = async (data: { code: string; name: string; exam_date?: string }) => {
    try {
      setIsLoading(true);
      const created = await api.createCourse(data);
      showToast(`Subject "${created.code} - ${created.name}" created!`);
      await refreshCourses(created.id);
    } catch (err: any) {
      showToast('Error creating course: ' + err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCourses();
  }, []);

  return (
    <CourseContext.Provider
      value={{
        courses,
        activeCourse,
        setActiveCourse: handleSetActiveCourse,
        isLoading,
        refreshCourses,
        loadDemoMode,
        createCourse,
        darkMode,
        toggleDarkMode,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourse = () => {
  const context = useContext(CourseContext);
  if (!context) throw new Error('useCourse must be used within CourseProvider');
  return context;
};
