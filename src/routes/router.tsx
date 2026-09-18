import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LandingPage from "@/features/landing/LandingPage";
import AboutPage from "@/features/landing/AboutPage";
import CollegesPage from "@/features/landing/CollegesPage";
import ContactPage from "@/features/landing/ContactPage";

import LoginPage from "@/features/auth/LoginPage";
import AdminLoginPage from "@/features/auth/AdminLoginPage";

import RegisterPage from "@/features/auth/RegisterPage";

import CoursesListPage from "@/features/courses/CoursesListPage";
import CourseDetailsPage from "@/features/courses/CourseDetailsPage";

import CartPage from "@/features/cart/CartPage";
import CheckoutPage from "@/features/cart/CheckoutPage";

import HomePage from "@/features/home/HomePage";

import MyCoursesPage from "@/features/student/MyCoursesPage";
import LearningPage from "@/features/student/LearningPage";
import ProgressPage from "@/features/student/ProgressPage";
import QuizzesListPage from "@/features/student/QuizzesListPage";
import QuizAttemptPage from "@/features/student/QuizAttemptPage";
import GradesPage from "@/features/student/GradesPage";
import PaymentsHistoryPage from "@/features/student/PaymentsHistoryPage";
import ProfilePage from "@/features/student/ProfilePage";

import TeacherCoursesPage from "@/features/teacher/TeacherCoursesPage";
import CourseBuilderPage from "@/features/teacher/CourseBuilderPage";
import QuizBuilderPage from "@/features/teacher/QuizBuilderPage";
import TeacherPaymentsPage from "@/features/teacher/TeacherPaymentsPage";
import TeacherStudentsPage from "@/features/teacher/TeacherStudentsPage";

import StudentsAdminPage from "@/features/admin/StudentsAdminPage";
import TeachersAdminPage from "@/features/admin/TeachersAdminPage";
import CoursesAdminPage from "@/features/admin/CoursesAdminPage";
import PaymentsAdminPage from "@/features/admin/PaymentsAdminPage";
import EnrollmentsAdminPage from "@/features/admin/EnrollmentsAdminPage";
import TicketsAdminPage from "@/features/admin/TicketsAdminPage";
import DevicesAdminPage from "@/features/admin/DevicesAdminPage";
import SettingsAdminPage from "@/features/admin/SettingsAdminPage";
import ReportsAdminPage from "@/features/admin/ReportsAdminPage";

import SupportPage from "@/features/support/SupportPage";

import NotFoundPage from "@/features/NotFoundPage";
import ContactMessagesAdminPage from "@/features/admin/ContactMessagesAdminPage";
import PendingApprovalPage from "@/features/auth/PendingApprovalPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <LandingPage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/colleges", element: <CollegesPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/courses", element: <CoursesListPage /> },
      { path: "/courses/:slug", element: <CourseDetailsPage /> },
    ],
  },
  { path: "/auth/login", element: <LoginPage /> },
  { path: "/auth/admin-login", element: <AdminLoginPage /> },
  { path: "/auth/register", element: <RegisterPage /> },
{ path:"/auth/pending-approval" , element: <PendingApprovalPage /> },

  // صفحة التعلّم بدون Sidebar عادي (تخطيط خاص بمشغّل الفيديو)
  {
    path: "/app/student/courses/:courseId/learn",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <LearningPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="home" replace /> },
      { path: "home", element: <HomePage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },

      // ===== Student =====
      { path: "student/courses", element: <MyCoursesPage /> },
      { path: "student/progress", element: <ProgressPage /> },
      { path: "student/quizzes", element: <QuizzesListPage /> },
      { path: "student/quizzes/:quizId", element: <QuizAttemptPage /> },
      { path: "student/grades", element: <GradesPage /> },
      { path: "student/payments", element: <PaymentsHistoryPage /> },
      { path: "student/support", element: <SupportPage /> },
      { path: "student/profile", element: <ProfilePage /> },

      // ===== Teacher =====
      { path: "teacher/courses", element: <TeacherCoursesPage /> },
      { path: "teacher/courses/:courseId/builder", element: <CourseBuilderPage /> },
      { path: "teacher/courses/:courseId/quiz-builder", element: <QuizBuilderPage /> },
      { path: "teacher/payments", element: <TeacherPaymentsPage /> },
      { path: "teacher/students", element: <TeacherStudentsPage /> },
      { path: "teacher/profile", element: <ProfilePage /> },

      // ===== Admin =====
      { path: "admin/students", element: <StudentsAdminPage /> },
      { path: "admin/teachers", element: <TeachersAdminPage /> },
      { path: "admin/courses", element: <CoursesAdminPage /> },
      { path: "admin/messages", element: <ContactMessagesAdminPage /> },
      { path: "admin/payments", element: <PaymentsAdminPage /> },
      { path: "admin/enrollments", element: <EnrollmentsAdminPage /> },
      { path: "admin/tickets", element: <TicketsAdminPage /> },
      { path: "admin/devices", element: <DevicesAdminPage /> },
      { path: "admin/settings", element: <SettingsAdminPage /> },
      { path: "admin/reports", element: <ReportsAdminPage /> },

      // ===== مشترك =====
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
