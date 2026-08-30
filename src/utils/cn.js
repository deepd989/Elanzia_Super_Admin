// Joins class names, dropping falsey entries. Keeps conditional Tailwind
// classes readable without pulling in a dependency.
export function cn(...values) {
  return values.filter(Boolean).join(' ');
}

export default cn;
