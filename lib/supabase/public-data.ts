import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const publicClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const getPublishedAcademicEvents = unstable_cache(async () => {
  const { data, error } = await publicClient().from("academic_events")
    .select("id,title,event_type,registration_start,registration_end,starts_at,ends_at,source_label,updated_at")
    .eq("status", "published").order("starts_at", { ascending: true }).limit(30);
  if (error) throw error;
  return data ?? [];
}, ["published-academic-events"], { revalidate: 300, tags: ["academic-events"] });

export const getPublishedCourseSchedules = unstable_cache(async () => {
  const { data, error } = await publicClient().from("course_schedules")
    .select("raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,notes,source_label,source_url")
    .eq("status", "published").order("weekday").order("start_time");
  if (error) throw error;
  return data ?? [];
}, ["published-course-schedules"], { revalidate: 300, tags: ["course-schedules"] });

export const getPublishedCommunityPosts = unstable_cache(async () => {
  const { data, error } = await publicClient().from("community_posts")
    .select("id,title,body,event_type,event_date,event_time,location,image_url,link_url,accent,created_at,updated_at")
    .eq("is_published", true).order("event_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}, ["published-community-posts"], { revalidate: 300, tags: ["community-posts"] });
