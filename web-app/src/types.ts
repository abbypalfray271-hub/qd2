export interface Question {
  id: string | number;
  section_title?: string;
  group_title?: string;
  knowledge_points?: string[];
  source_info: {
    province: string;
    city: string;
    district?: string;
    year: string;
    exam_type: string;
    subject: string;
    source_file?: string;
  };
  score: string | number;
  question_type: string;
  category: string;
  module: string;
  passage?: string;
  stem: string;
  options: string[];
  answer: string;
  analysis: string;
}

export interface Exam {
  id: string;
  title: string;
  category: '正式真题' | '区县模拟';
  year: string;
  district: string;
  questions: Question[];
}

export type ActiveTab = 'catalog' | 'compare' | 'modules' | 'cart';
