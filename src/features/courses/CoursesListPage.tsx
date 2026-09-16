import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BookX,
  Check,
  Filter,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { CourseCardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { CourseCard } from "./CourseCard";

import { fetchCourses } from "@/services/courses";
import type { Course } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 9;
type SortOption =
  | "rating"
  | "newest"
  | "oldest"
  | "price_asc"
  | "price_desc"
  | "popular";
  
const collegeLabels: Record<string, string> = {
  all: "كل الكليات",
  medicine: "طب بشري",
  dentistry: "طب أسنان",
  pharmacy: "صيدلة",
};

const sortLabels: Record<string, string> = {
  newest: "الأحدث",
  oldest: "الأقدم",
  price_asc: "السعر: الأقل",
  price_desc: "السعر: الأعلى",
  popular: "الأكثر طلبًا",
  rating: "الأعلى تقييمًا",
};

export default function CoursesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { showToast } = useToast();
  const { profile } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(
    searchParams.get("q") ?? ""
  );

  const college = searchParams.get("college") ?? "";
const sortParam = searchParams.get("sort");

const sort: SortOption =
  sortParam === "rating" ||
  sortParam === "newest" ||
  sortParam === "oldest" ||
  sortParam === "price_asc" ||
  sortParam === "price_desc" ||
  sortParam === "popular"
    ? sortParam
    : "newest";

  const rawPage = Number(searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const role = profile?.role;

  const isStudent = role === "student";
  const isTeacher = role === "teacher";

const effectiveCollege = useMemo(() => {
  return college;
}, [college]);

  const collegeLabel = effectiveCollege
    ? collegeLabels[effectiveCollege] ?? "تخصص طبي"
    : "كل التخصصات";

  /*
   * Fetch courses
   */
  useEffect(() => {
    let active = true;

    setLoading(true);

    fetchCourses({
      search: searchParams.get("q") ?? undefined,
      college: effectiveCollege || undefined,
      teacherId: isTeacher ? profile?.id : undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then(({ courses: fetchedCourses, total: fetchedTotal }) => {
        if (!active) return;

        console.log(
          "[CoursesListPage] courses loaded:",
          fetchedCourses
        );

        setCourses(Array.isArray(fetchedCourses) ? fetchedCourses : []);
        setTotal(Number(fetchedTotal ?? 0));
      })
      .catch((error) => {
        console.error("[CoursesListPage] fetchCourses error:", error);

        if (!active) return;

        setCourses([]);
        setTotal(0);

        showToast(
          "تعذّر تحميل الكورسات، حاول مرة أخرى",
          "error"
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    effectiveCollege,
    isTeacher,
    page,
    profile?.id,
    searchParams,
    showToast,
    sort,
  ]);

  /*
   * Update URL filters
   */
  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);

    if (value.trim()) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    if (key !== "page") {
      next.delete("page");
    }

    setSearchParams(next);
  };

  /*
   * Search
   */
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();

    updateParam("q", searchInput);
  };

  /*
   * Reset filters
   */
const resetFilters = () => {
  setSearchInput("");
  setSearchParams({});
};

  /*
   * Pagination
   */
  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;

    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));

    setSearchParams(next);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /*
   * Page title
   */
  const bannerTitle = isTeacher
    ? "كورساتك في المنصة"
    : isStudent
      ? "كورسات تخصصك"
      : "اكتشف كورسات Med Core";

  const bannerSubtitle = isTeacher
    ? "تابع كورساتك التعليمية وأنشئ تجربة تعلم أفضل لطلابك."
    : isStudent
      ? "اكتشف المحتوى الطبي المتخصص المناسب لكلية وتخصصك."
      : "تعلّم من محتوى طبي متخصص صُمم ليساعدك على التطور خطوة بخطوة.";

  const activeSearch = searchParams.get("q") ?? "";

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      {/* =====================================================
          HERO
      ====================================================== */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-900 to-slate-900" />

        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:45px_45px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-14 md:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            {/* Hero text */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold text-brand-100 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-cyan-300" />

                {isTeacher
                  ? "مساحة المعلم"
                  : isStudent
                    ? "مساحة الطالب"
                    : "مكتبة تعليمية متخصصة"}
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
                {bannerTitle}
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-300 md:text-base">
                {bannerSubtitle}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur-md">
                  <BookOpen className="h-4 w-4 text-cyan-300" />
                  محتوى طبي متخصص
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-bold text-white backdrop-blur-md">
                  <Check className="h-4 w-4 text-emerald-300" />
                  تعلّم حسب تخصصك
                </div>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="rounded-[26px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl">
                <p className="text-xs text-slate-400">
                  إجمالي الكورسات
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {total}
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "75%" }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-brand-400"
                  />
                </div>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-xl">
                <p className="text-xs text-slate-400">
                  المعروض الآن
                </p>

                <p className="mt-2 text-3xl font-black text-white">
                  {courses.length}
                </p>

                <p className="mt-3 text-[11px] font-medium text-emerald-300">
                  كورسات متاحة
                </p>
              </div>

              <div className="col-span-2 rounded-[26px] border border-white/10 bg-gradient-to-r from-white/[0.08] to-white/[0.04] p-5 backdrop-blur-xl">
                <p className="text-xs text-slate-400">
                  المجال الحالي
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xl font-black text-white">
                    {collegeLabel}
                  </p>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/20">
                    <BookOpen className="h-5 w-5 text-brand-300" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FILTERS
      ====================================================== */}
      <section className="relative z-10 mx-auto -mt-7 max-w-7xl px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-[0_25px_70px_rgba(15,23,42,0.10)] md:p-5"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
              <Filter className="h-4 w-4 text-brand-600" />
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-800">
                ابحث عن الكورس المناسب
              </h2>

              <p className="text-[11px] text-slate-400">
                استخدم البحث والفلاتر للوصول للمحتوى بسرعة
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_190px_210px_auto]">
            {/* Search */}
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <Input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(event.target.value)
                  }
                  placeholder="ابحث باسم الكورس أو المعلم..."
                  className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-11 text-sm transition-all focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-50"
                />

                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      updateParam("q", "");
                    }}
                    className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label="مسح البحث"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </form>

            {/* College */}
            <Select
              value={effectiveCollege}
              onChange={(event) =>
                updateParam("college", event.target.value)
              }
              className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 text-sm focus:border-brand-300"
            >
              <option value="">كل الكليات</option>
              <option value="medicine">طب بشري</option>
              <option value="dentistry">طب أسنان</option>
              <option value="pharmacy">صيدلة</option>
            </Select>

            {/* Sort */}
            <Select
              value={sort}
              onChange={(event) =>
                updateParam("sort", event.target.value)
              }
              className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 text-sm focus:border-brand-300"
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="price_asc">السعر: الأقل إلى الأعلى</option>
              <option value="price_desc">السعر: الأعلى إلى الأقل</option>
              <option value="popular">الأكثر طلبًا</option>
              <option value="rating">الأعلى تقييمًا</option>
            </Select>

            <Button
              type="button"
              onClick={() => updateParam("q", searchInput)}
              className="h-12 rounded-2xl px-6"
            >
              <Search className="h-4 w-4" />
              بحث
            </Button>
          </div>

          {/* Active filters */}
          {(activeSearch || effectiveCollege) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-[11px] font-bold text-slate-400">
                الفلاتر:
              </span>

              {activeSearch && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700">
                  البحث: {activeSearch}
                </span>
              )}

              {effectiveCollege && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1.5 text-[11px] font-bold text-cyan-700">
                  {collegeLabel}
                </span>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="mr-auto text-[11px] font-bold text-slate-400 transition hover:text-red-500"
              >
                مسح الفلاتر
              </button>
            </div>
          )}
        </motion.div>
      </section>

      {/* =====================================================
          RESULTS
      ====================================================== */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-brand-500" />

              <span className="text-xs font-bold text-brand-600">
                مكتبة Med Core
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
              {activeSearch
                ? `نتائج البحث عن "${activeSearch}"`
                : "اكتشف الكورسات"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
              {total} كورس
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
              {sortLabels[sort] ?? "الأحدث"}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <CourseCardSkeleton key={index} />
              ))}
            </motion.div>
          ) : courses.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="rounded-[32px] border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-brand-50 text-brand-500">
                  <BookX className="h-9 w-9" />
                </div>

                <h3 className="mt-6 text-xl font-black text-slate-800">
                  لا توجد كورسات مطابقة
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500">
                  لم نجد كورسات تطابق البحث أو الفلاتر الحالية.
                  جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر.
                </p>

                <div className="mt-6">
                  <Button
                    variant="outline"
                    onClick={resetFilters}
                    className="rounded-2xl"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    إعادة ضبط الفلاتر
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`courses-${page}-${activeSearch}-${effectiveCollege}-${sort}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {courses.map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* =====================================================
            PAGINATION
        ====================================================== */}
        {!loading && totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 1}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" />
              السابق
            </button>

            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;

              if (
                totalPages > 7 &&
                pageNumber !== 1 &&
                pageNumber !== totalPages &&
                Math.abs(pageNumber - page) > 2
              ) {
                if (
                  pageNumber === 2 ||
                  pageNumber === totalPages - 1
                ) {
                  return (
                    <span
                      key={pageNumber}
                      className="px-1 text-slate-400"
                    >
                      ...
                    </span>
                  );
                }

                return null;
              }

              const active = page === pageNumber;

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => goToPage(pageNumber)}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-black transition-all ${
                    active
                      ? "bg-brand-600 text-white shadow-lg shadow-brand-200"
                      : "border border-slate-200 bg-white text-slate-500 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === totalPages}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              التالي
              <ArrowLeft className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </section>
    </main>
  );
}