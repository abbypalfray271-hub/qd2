// Helper to strip duplicate leading question numbers (e.g., "3. ", "25．", "4.")
export const cleanStem = (stem?: string): string => {
  if (!stem) return '';
  return stem.replace(/^\d+[\.．、\s]+/, '').replace(/^\d+[\.．]/, '');
};
