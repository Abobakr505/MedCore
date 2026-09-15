-- Add optional course section / lesson scope to existing quizzes.
alter table public.quizzes
  add column if not exists section_id uuid references public.course_sections(id) on delete set null,
  add column if not exists lesson_id uuid references public.lessons(id) on delete set null;

create index if not exists idx_quizzes_section on public.quizzes(section_id);
create index if not exists idx_quizzes_lesson on public.quizzes(lesson_id);