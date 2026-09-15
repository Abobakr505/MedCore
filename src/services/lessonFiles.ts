import { supabase } from "@/lib/supabase";
import type { LessonFile } from "@/types";

const FILE_BUCKET = "course-files";

export async function fetchLessonFiles(
  lessonId: string
): Promise<LessonFile[]> {
  const { data, error } = await supabase
    .from("lesson_files")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function uploadLessonFile(
  lessonId: string,
  file: File,
  title: string,
  orderIndex: number
): Promise<LessonFile> {
  const extension =
    file.name.split(".").pop()?.toLowerCase() || "file";

  const path =
    `${lessonId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } =
    await supabase.storage
      .from(FILE_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: file.type,
      });

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } = await supabase
    .from("lesson_files")
    .insert({
      lesson_id: lessonId,
      title: title.trim() || file.name,
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage
      .from(FILE_BUCKET)
      .remove([path]);

    throw error;
  }

  return data;
}

export async function deleteLessonFile(
  file: LessonFile
) {
  const { error: storageError } =
    await supabase.storage
      .from(FILE_BUCKET)
      .remove([file.file_path]);

  if (storageError) {
    throw storageError;
  }

  const { error } = await supabase
    .from("lesson_files")
    .delete()
    .eq("id", file.id);

  if (error) {
    throw error;
  }
}

export async function getLessonFileUrl(
  filePath: string
) {
  const { data, error } =
    await supabase.storage
      .from(FILE_BUCKET)
      .createSignedUrl(
        filePath,
        60 * 60
      );

  if (error) {
    throw error;
  }

  return data.signedUrl;
}