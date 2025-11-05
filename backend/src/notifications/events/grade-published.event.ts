export interface GradePublishedEvent {
  gradeId: string;
  studentId: string;
  labId: string;
  category: string;
  score: number;
  maxScore?: number;
  gradedAt: string;
}

