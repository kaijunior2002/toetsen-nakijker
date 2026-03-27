export interface Question {
  question_number: string;
  question_text: string;
  max_points: number;
  is_multiple_choice: boolean;
}

export interface StudentPage {
  id: string;
  dataUrl: string; // base64
  fileName: string;
  detectedName: string | null;
  assignedStudentId: string | null;
}

export interface Student {
  id: string;
  name: string;
  pageIds: string[];
}

export type Confidence = 'zeker' | 'twijfel' | 'kan_niet_beoordelen';

export interface GradedQuestion {
  question_number: string;
  points_awarded: number;
  max_points: number;
  confidence: Confidence;
  explanation: string;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  grades: GradedQuestion[];
  totalPoints: number;
  maxPoints: number;
  status: 'pending' | 'grading' | 'done' | 'error';
  error?: string;
}

export interface AppState {
  step: 1 | 2 | 3 | 4;
  // Step 1
  examFileData: string | null; // base64
  examFileName: string | null;
  answerKeyData: string | null;
  answerKeyFileName: string | null;
  questions: Question[];
  // Step 2
  pages: StudentPage[];
  students: Student[];
  // Step 3 + 4
  results: StudentResult[];
}
