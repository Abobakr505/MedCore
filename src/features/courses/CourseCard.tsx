import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  GraduationCap,
  PlayCircle,
  Star,
  Stethoscope,
  ToothbrushSparkles,
  Pill,
  Users,
} from "lucide-react";

import type { Course } from "@/types";
import { COLLEGE_LABELS } from "@/types";
import { formatCurrency } from "@/utils/format";
import { getPublicUrl } from "@/lib/supabase";

interface CourseCardProps {
  course: Course;
  index?: number;
}

/* =========================================================
   College visual identity (icon + gradient)
   نفس الفكرة المستخدمة في FeaturedCoursesSection باللاندنج
========================================================= */

type CollegeMeta = {
  icon: typeof Stethoscope;
  gradient: string;
};

const COLLEGE_META: Record<string, CollegeMeta> = {
  medicine: {
    icon: Stethoscope,
    gradient: "from-brand-700 via-brand-600 to-cyan-600",
  },
  dentistry: {
    icon: ToothbrushSparkles,
    gradient: "from-violet-600 via-violet-500 to-brand-600",
  },
  pharmacy: {
    icon: Pill,
    gradient: "from-emerald-600 via-emerald-500 to-teal-600",
  },
};

const DEFAULT_COLLEGE_META: CollegeMeta = {
  icon: Stethoscope,
  gradient: "from-brand-700 via-brand-600 to-cyan-600",
};

export function CourseCard({ course, index = 0 }: CourseCardProps) {
  const thumbnail = course.thumbnail_path
    ? getPublicUrl("course-thumbnails", course.thumbnail_path)
    : null;

  const studentsCount = Number(course.students_count ?? 0);
  const price = Number(course.price ?? 0);

  const collegeLabel =
    COLLEGE_LABELS[course.college] ?? "تخصص طبي";

  const collegeMeta =
    COLLEGE_META[course.college as string] ?? DEFAULT_COLLEGE_META;

  const CollegeIcon = collegeMeta.icon;

  const teacherName =
    course.teacher?.full_name?.trim() || "فريق Med Core";

  const teacherInitial = teacherName.charAt(0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Link
        to={`/courses/${course.slug}`}
        aria-label={`عرض تفاصيل كورس ${course.title}`}
        className="group relative flex h-full min-h-[470px] flex-col overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_15px_45px_rgba(15,23,42,0.06)] transition-all duration-500 hover:border-brand-200 hover:shadow-[0_25px_65px_rgba(37,99,235,0.13)] focus:outline-none focus:ring-4 focus:ring-brand-100"
      >
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-32 w-32 rounded-full bg-brand-100/50 blur-3xl transition-all duration-700 group-hover:bg-brand-200/70" />

        {/* Thumbnail */}
        <div
          className={`relative h-[220px] shrink-0 overflow-hidden bg-gradient-to-br ${collegeMeta.gradient}`}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={course.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/20 bg-white/10 backdrop-blur-md">
                <CollegeIcon className="h-10 w-10 text-white/90" />
              </div>
            </div>
          )}

          {/* Image overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/30 to-transparent" />

          {/* Shine animation */}
          <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-1000 group-hover:left-[120%] group-hover:opacity-100" />

          {/* College badge */}
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[11px] font-extrabold text-brand-800 shadow-lg backdrop-blur-md">
              <GraduationCap className="h-3.5 w-3.5" />
              {collegeLabel}
            </span>
          </div>

          {/* Free / paid */}
          <div className="absolute bottom-4 right-4">
            <span
              className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold shadow-lg backdrop-blur-md ${
                price > 0
                  ? "border border-white/20 bg-slate-950/70 text-white"
                  : "border border-emerald-200/50 bg-emerald-500/90 text-white"
              }`}
            >
              {price > 0 ? "كورس مدفوع" : "مجاني"}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-5">
          {/* Category */}
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold text-brand-600">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            كورس طبي متخصص
          </div>

          {/* Title */}
          <h3 className="line-clamp-2 min-h-[40px] text-2xl font-black leading-7 text-slate-900 transition-colors duration-300 group-hover:text-brand-700">
            {course.title}
          </h3>

          {/* Description */}
          {course.description && (
            <p className="mt-2 line-clamp-2 min-h-[40px] text-xs leading-5 text-slate-500">
              {course.description}
            </p>
          )}

          {/* Teacher */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-black text-white shadow-md shadow-brand-200">
              {teacherInitial}
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-medium text-slate-400">
                تقديم
              </p>

              <p className="truncate text-xs font-bold text-slate-700">
                {teacherName}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                <Users className="h-3.5 w-3.5 text-brand-500" />
              </div>

              <div>
                <p className="text-[9px] text-slate-400">
                  الطلاب
                </p>
                <p className="text-[11px] font-extrabold text-slate-700">
                  {studentsCount}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm">
                <BookOpen className="h-3.5 w-3.5 text-brand-500" />
              </div>

              <div>
                <p className="text-[9px] text-slate-400">
                  المحتوى
                </p>
                <p className="text-[11px] font-extrabold text-slate-700">
                  دروس متخصصة
                </p>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div>
              <p className="text-[10px] font-medium text-slate-400">
                سعر الكورس
              </p>

              <p className="mt-0.5 text-lg font-black text-brand-700">
                {price > 0 ? formatCurrency(price) : "مجانًا"}
              </p>
            </div>

            <motion.div
              whileHover={{ x: -4 }}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2.5 text-xs font-extrabold text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white"
            >
              <span>عرض الكورس</span>

              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </motion.div>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute inset-x-0 bottom-0 h-1 origin-right scale-x-0 bg-gradient-to-l from-brand-500 to-cyan-500 transition-transform duration-500 group-hover:scale-x-100" />
      </Link>
    </motion.article>
  );
}