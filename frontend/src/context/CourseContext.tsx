import React, { createContext, useContext, useState, useEffect } from 'react';
import { Course } from '../types';
import { api } from '../services/api';

interface CourseContextType {
  courses: Course[];
  activeCourse: Course | null;
  setActiveCourse: (c: Course) => void;
  isLoading: boolean;
  refreshCourses: () => Promise<void>;
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

  const refreshCourses = async () => {
    try {
      setIsLoading(true);
      const list = await api.getCourses();
      setCourses(list);
      if (list.length > 0) {
        if (!activeCourse || !list.some(c => c.id === activeCourse.id)) {
          setActiveCourse(list[0]);
        } else {
          const updated = list.find(c => c.id === activeCourse.id);
          if (updated) setActiveCourse(updated);
        }
      } else {
        // If no course exists, auto-load demo course so user is never faced with an empty, broken state
        const demo = await api.loadDemoCourse();
        setCourses([demo]);
        setActiveCourse(demo);
      }
    } catch (err: any) {
      console.error('Failed to load courses', err);
      showToast('Backend connection error: ' + (err.message || 'Check FastAPI server'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDemoMode = async () => {
    try {
      setIsLoading(true);
      const demoCourse = await api.loadDemoCourse();
      showToast('Loaded Demo Subject: CS302 Operating Systems (with 4 exam papers & 38 questions)');
      await refreshCourses();
      setActiveCourse(demoCourse);
    } catch (err: any) {
      showToast('Failed to load demo course: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createCourse = async (data: { code: string; name: string; exam_date?: string }) => {
    try {
      setIsLoading(true);
      const created = await api.createCourse(data);
      showToast(`Subject "${created.code} - ${created.name}" created!`);
      await refreshCourses();
      setActiveCourse(created);
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
        setActiveCourse,
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
