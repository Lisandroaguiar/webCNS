export function gradeAverage(rows: { status: string; grade: number | null }[]): string | null {
  const grades = rows.filter(row => row.status === "passed" && typeof row.grade === "number" && Number.isFinite(row.grade) && row.grade >= 1 && row.grade <= 10)
    .map(row => row.grade as number);
  if (!grades.length) return null;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(grades.reduce((total, grade) => total + grade, 0) / grades.length);
}
