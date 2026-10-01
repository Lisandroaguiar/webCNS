import type { ParsedAnalytic } from "@/lib/academic/analytic-parser";
import type { DegreeType, Enrollment } from "@/lib/academic/multicarrera";

export type TrajectoryProgram = { id: string; family: string; degree_type: DegreeType; name: string };
export type TrajectoryPlan = { id: string; family: string; requires_orientation: boolean; display_name: string };
export type TrajectoryOrientation = { id: string; family: string; name: string };
export type DetectedTrajectory = {
  programId: string;
  curriculumId: string;
  orientationId: string | null;
  degreeType: DegreeType;
};

/** A partial document is not enough evidence to create a trajectory. */
export function detectAnalyticTrajectory(
  parsed: ParsedAnalytic,
  programs: TrajectoryProgram[],
  plans: TrajectoryPlan[],
  orientations: TrajectoryOrientation[],
): DetectedTrajectory | null {
  if (!parsed.detectedProgramFamily || !parsed.detectedPlanYear || !parsed.detectedTitle) return null;
  const program = programs.filter(row => row.family === parsed.detectedProgramFamily && row.degree_type === parsed.detectedTitle);
  const plan = plans.filter(row => row.family === parsed.detectedProgramFamily && row.id.endsWith(`-${parsed.detectedPlanYear}`));
  if (program.length !== 1 || plan.length !== 1) return null;
  const orientationId = plan[0].requires_orientation ? parsed.detectedOrientation : null;
  if (plan[0].requires_orientation && !orientations.some(row => row.id === orientationId && row.family === plan[0].family)) return null;
  return { programId: program[0].id, curriculumId: plan[0].id, orientationId: orientationId ?? null, degreeType: program[0].degree_type };
}

export function findMatchingEnrollment<T extends Pick<Enrollment, "programId" | "curriculumId" | "orientationId">>(
  target: DetectedTrajectory, enrollments: T[],
): T | undefined {
  return enrollments.find(row => row.programId === target.programId && row.curriculumId === target.curriculumId && row.orientationId === target.orientationId);
}
