import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Plus, Trash2, UploadCloud, Eye, EyeOff, ClipboardList, ChevronDown, Video, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/contexts/ToastContext";
import {
  fetchSections, createSection, deleteSection, createLesson, deleteLesson,
  setPreview, uploadLessonVideo,
} from "@/services/teacherCourses";
import { fetchCourseBySlugOrId } from "@/services/coursesById";
import type { Course, CourseSection, Lesson } from "@/types";
import { formatDuration } from "@/utils/format";

export default function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [lessonModalSection, setLessonModalSection] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", isPreview: false });
  const [uploadTarget, setUploadTarget] = useState<Lesson | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const [c, sec] = await Promise.all([fetchCourseBySlugOrId(courseId), fetchSections(courseId)]);
    setCourse(c);
    setSections(sec);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleAddSection = async () => {
    if (!courseId || !newSectionTitle.trim()) return;
    try {
      await createSection(courseId, newSectionTitle.trim(), sections.length);
      setNewSectionTitle("");
      load();
    } catch {
      showToast("تعذّر إضافة القسم", "error");
    }
  };

  const handleAddLesson = async () => {
    if (!lessonModalSection || !lessonForm.title.trim()) return;
    const section = sections.find((s) => s.id === lessonModalSection);
    try {
      await createLesson({
        sectionId: lessonModalSection,
        title: lessonForm.title,
        description: lessonForm.description,
        orderIndex: section?.lessons?.length ?? 0,
        isPreview: lessonForm.isPreview,
      });
      setLessonForm({ title: "", description: "", isPreview: false });
      setLessonModalSection(null);
      load();
    } catch {
      showToast("تعذّر إضافة الدرس", "error");
    }
  };

  const handleUploadVideo = async (file: File) => {
    if (!uploadTarget || !courseId) return;
    setUploading(true);
    try {
      await uploadLessonVideo(courseId, uploadTarget.id, file);
      showToast("تم رفع الفيديو بنجاح", "success");
      setUploadTarget(null);
      load();
    } catch {
      showToast("تعذّر رفع الفيديو، تأكد من حجم الملف والصيغة", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64 rounded-2xl" /></div>;
  if (!course) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-900">إدارة محتوى: {course.title}</h1>
          <p className="mt-1 text-sm text-slate-500">أضف الأقسام والدروس ورتّبها، وحدّد المعاينات المجانية</p>
        </div>
        <Link to={`/app/teacher/courses/${course.id}/quiz-builder`}>
          <Button variant="secondary"><ClipboardList className="w-4 h-4" /> بناء الاختبارات</Button>
        </Link>
      </div>

      <div className="mt-6 flex gap-2">
        <Input placeholder="عنوان قسم جديد (مثال: الوحدة الأولى)" value={newSectionTitle} onChange={(e) => setNewSectionTitle(e.target.value)} />
        <Button onClick={handleAddSection}><Plus className="w-4 h-4" /> إضافة قسم</Button>
      </div>

      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onAddLesson={() => setLessonModalSection(section.id)}
            onDeleteSection={async () => {
              await deleteSection(section.id);
              load();
            }}
            onDeleteLesson={async (lessonId) => {
              await deleteLesson(lessonId);
              load();
            }}
            onTogglePreview={async (lesson) => {
              await setPreview(lesson.id, !lesson.is_preview);
              load();
            }}
            onUploadClick={setUploadTarget}
          />
        ))}
      </div>

      <Modal open={!!lessonModalSection} onClose={() => setLessonModalSection(null)} title="إضافة درس جديد">
        <div className="space-y-4">
          <Input label="عنوان الدرس" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} />
          <div>
            <label className="block mb-1.5 text-sm font-medium text-slate-700">وصف مختصر</label>
            <textarea rows={2} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30" value={lessonForm.description} onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={lessonForm.isPreview} onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })} />
            اجعل هذا الدرس معاينة مجانية للزوار
          </label>
          <Button className="w-full" onClick={handleAddLesson}>إضافة الدرس</Button>
        </div>
      </Modal>

      <Modal open={!!uploadTarget} onClose={() => setUploadTarget(null)} title={`رفع فيديو: ${uploadTarget?.title ?? ""}`}>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-brand-300">
          <UploadCloud className="h-8 w-8 text-brand-400" />
          <span className="text-sm text-slate-500">اضغط لاختيار ملف الفيديو (MP4)</span>
          <input type="file" accept="video/*" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])} />
        </label>
        {uploading && <p className="mt-3 text-center text-sm text-brand-500">جاري الرفع...</p>}
      </Modal>
    </div>
  );
}

function SectionBlock({
  section,
  onAddLesson,
  onDeleteSection,
  onDeleteLesson,
  onTogglePreview,
  onUploadClick,
}: {
  section: CourseSection;
  onAddLesson: () => void;
  onDeleteSection: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onTogglePreview: (lesson: Lesson) => void;
  onUploadClick: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <button className="flex items-center gap-2 font-bold text-slate-800" onClick={() => setOpen(!open)}>
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
          {section.title}
          <span className="text-xs font-normal text-slate-400">({section.lessons?.length ?? 0} دروس)</span>
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={onAddLesson}><Plus className="w-3.5 h-3.5" /> درس</Button>
          <Button size="sm" variant="outline" onClick={onDeleteSection}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-50">
          {(section.lessons ?? []).map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-50">
              <div className="flex items-center gap-2">
                {lesson.video_path ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Video className="w-4 h-4 text-slate-300" />}
                <span className="font-medium text-slate-700">{lesson.title}</span>
                {lesson.duration_seconds > 0 && <span className="text-xs text-slate-400">{formatDuration(lesson.duration_seconds)}</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onTogglePreview(lesson)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="معاينة مجانية">
                  {lesson.is_preview ? <Eye className="w-4 h-4 text-brand-500" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => onUploadClick(lesson)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" title="رفع فيديو">
                  <UploadCloud className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteLesson(lesson.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50" title="حذف">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
