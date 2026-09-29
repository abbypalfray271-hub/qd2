// Helper to strip duplicate leading question numbers (e.g., "3. ", "25．", "4.")
export const cleanStem = (stem?: string): string => {
  if (!stem) return '';
  return stem
    .replace(/^\d+[\.．、\s]+/, '')
    .replace(/^\d+[\.．]/, '')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
};

// Helper to format reading passage and materials (convert markdown asterisks to HTML tags)
export const cleanPassage = (passage?: string): string => {
  if (!passage) return '';
  return passage.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
};

