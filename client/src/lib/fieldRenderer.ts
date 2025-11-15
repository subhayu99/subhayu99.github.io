/**
 * Dynamic Field Renderer for Terminal Portfolio
 *
 * Automatically detects and renders custom fields in resume entries.
 * Supports multiple field types: strings, numbers, booleans, arrays, URLs, dates.
 *
 * Usage:
 *   import { renderCustomFields } from '../lib/fieldRenderer';
 *   const customFieldsHtml = renderCustomFields(experienceEntry, 'experience');
 */

// Core fields that are always handled separately (don't show in "Additional Info")
const CORE_FIELDS = {
  experience: ['company', 'position', 'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'],
  education: ['institution', 'area', 'degree', 'location', 'start_date', 'end_date', 'date', 'summary', 'highlights'],
  projects: ['name', 'date', 'summary', 'highlights', 'show_on_resume'],
  social_networks: ['network', 'username'],
  technologies: ['label', 'details'],
  publication: ['title', 'authors', 'date', 'journal', 'doi', 'url'],
} as const;

type EntryType = keyof typeof CORE_FIELDS;

/**
 * Detects the type of a field value for appropriate rendering
 */
function detectFieldType(value: unknown): 'string' | 'number' | 'boolean' | 'array' | 'url' | 'date' | 'object' {
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') {
    // Check if it's a URL
    if (value.startsWith('http://') || value.startsWith('https://')) return 'url';
    // Check if it's a date (YYYY, YYYY-MM, or YYYY-MM-DD format)
    if (value.match(/^\d{4}(-\d{2})?(-\d{2})?$/)) return 'date';
    return 'string';
  }
  if (typeof value === 'object' && value !== null) return 'object';
  return 'string';
}

/**
 * Formats field name for display (snake_case -> Title Case)
 * Examples:
 *   tech_stack -> Tech Stack
 *   github_team -> Github Team
 *   gpa -> Gpa
 */
function formatFieldName(fieldName: string): string {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Renders a field value based on its detected type
 */
function renderFieldValue(value: unknown, type: string): string {
  switch (type) {
    case 'url':
      return `<a href="${value}" target="_blank" class="text-terminal-bright-green hover:underline transition-colors duration-200">${value}</a>`;

    case 'boolean':
      return (value as boolean)
        ? '<span class="text-terminal-green">✓ Yes</span>'
        : '<span class="text-white/50">✗ No</span>';

    case 'array': {
      const arr = value as unknown[];
      if (arr.length === 0) {
        return '<span class="text-white/50">None</span>';
      }
      // If array of strings, join with commas
      if (typeof arr[0] === 'string') {
        return arr
          .map(item => `<span class="text-white bg-terminal-green/10 px-2 py-0.5 rounded text-xs">${item}</span>`)
          .join(' ');
      }
      // If array of objects or complex types
      return `<span class="text-white/70">[${arr.length} items]</span>`;
    }

    case 'number':
      return `<span class="text-white font-semibold">${value}</span>`;

    case 'object':
      // For complex objects, show as JSON or simplified representation
      try {
        const obj = value as Record<string, unknown>;
        const entries = Object.entries(obj).slice(0, 3); // Show first 3 entries
        if (entries.length > 0) {
          return entries
            .map(([k, v]) => `<span class="text-white/70">${k}: ${v}</span>`)
            .join(', ');
        }
      } catch {
        // Fallback
      }
      return '<span class="text-white/70">[Complex data]</span>';

    case 'date':
    case 'string':
    default:
      // Escape HTML to prevent XSS
      const escaped = String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      return `<span class="text-white">${escaped}</span>`;
  }
}

/**
 * Main function: Generates HTML for custom fields in an entry
 *
 * @param entry - The resume entry object (experience, education, project, etc.)
 * @param entryType - Type of entry to determine which fields are "core"
 * @returns HTML string for custom fields section, or empty string if no custom fields
 *
 * @example
 * ```typescript
 * const exp = {
 *   company: "Acme Corp",
 *   position: "Engineer",
 *   tech_stack: ["React", "Node.js"],
 *   team_size: 8
 * };
 * const html = renderCustomFields(exp, 'experience');
 * // Returns HTML showing tech_stack and team_size (company/position are core fields)
 * ```
 */
export function renderCustomFields(
  entry: Record<string, unknown>,
  entryType: EntryType
): string {
  const coreFields = CORE_FIELDS[entryType] || [];
  const customFields = Object.entries(entry).filter(
    ([key]) => !coreFields.includes(key as never)
  );

  if (customFields.length === 0) {
    return '';
  }

  const fieldsHtml = customFields
    .map(([key, value]) => {
      // Skip null/undefined values
      if (value === null || value === undefined) {
        return '';
      }

      const type = detectFieldType(value);
      const displayName = formatFieldName(key);
      const displayValue = renderFieldValue(value, type);

      return `
        <div class="flex gap-2 text-xs">
          <span class="text-terminal-yellow font-semibold min-w-[120px]">${displayName}:</span>
          <span class="flex-1">${displayValue}</span>
        </div>
      `;
    })
    .filter(html => html !== '') // Remove empty entries
    .join('');

  // Only return section if there are fields to show
  if (!fieldsHtml.trim()) {
    return '';
  }

  return `
    <div class="mt-2 pt-2 border-t border-terminal-green/20">
      <div class="text-terminal-bright-green font-semibold text-xs mb-2">📋 Additional Info:</div>
      <div class="ml-2 space-y-1">
        ${fieldsHtml}
      </div>
    </div>
  `;
}
