/**
 * Procedure display name mapping utility.
 * Converts procedure IDs (snake_case) to human-readable display names.
 */

export const PROCEDURE_DISPLAY_NAMES = {
  extraction: 'Tooth Extraction',
  root_canal: 'Root Canal Treatment',
  dental_implant: 'Dental Implant',
};

/**
 * Get the human-readable display name for a procedure ID.
 * @param {string} procedureId - The procedure ID (e.g., 'root_canal')
 * @returns {string} The display name (e.g., 'Root Canal Treatment')
 */
export function getProcedureDisplayName(procedureId) {
  if (!procedureId) return 'Unknown Procedure';
  // Check the mapping first
  if (PROCEDURE_DISPLAY_NAMES[procedureId]) {
    return PROCEDURE_DISPLAY_NAMES[procedureId];
  }
  // Fallback: replace underscores with spaces and title-case
  return procedureId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}