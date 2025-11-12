#!/usr/bin/env node

/**
 * AI Resume Prompt Generator
 *
 * Generates a comprehensive AI prompt for converting existing resumes to resume.yaml format.
 * This script runs during the build process and creates client/public/data/ai-resume-prompt.txt
 *
 * The prompt includes:
 * - YAML schema documentation (auto-generated from shared/schema.ts)
 * - Formatting guidelines
 * - Full resume.yaml.example as reference
 * - Clear instructions for the AI
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📝 Generating AI resume conversion prompt...\n');

// Read the schema file
const schemaPath = join(rootDir, 'shared/schema.ts');
if (!existsSync(schemaPath)) {
  console.error('❌ Error: shared/schema.ts not found!');
  process.exit(1);
}

const schemaContent = readFileSync(schemaPath, 'utf-8');

// Read the example resume
const examplePath = join(rootDir, 'resume.yaml.example');
if (!existsSync(examplePath)) {
  console.error('❌ Error: resume.yaml.example not found!');
  process.exit(1);
}

const exampleYaml = readFileSync(examplePath, 'utf-8');

// Parse schema to extract field information
function parseSchema(schemaContent) {
  const schemas = {};

  // Extract each schema definition
  const schemaRegex = /export const (\w+)Schema = z\.object\(\{([^}]+)\}\);/gs;
  let match;

  while ((match = schemaRegex.exec(schemaContent)) !== null) {
    const schemaName = match[1];
    const fieldsContent = match[2];

    // Parse fields
    const fields = [];
    const fieldRegex = /(\w+):\s*z\.([\w.()[\]]+(?:\([^)]*\))?(?:\.[^,\n]+)?)/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
      const fieldName = fieldMatch[1];
      const fullType = fieldMatch[2];

      // Parse the type expression
      let type = 'string';
      let isArray = false;
      let isOptional = fullType.includes('.optional()');
      let hasDefault = fullType.includes('.default(');
      let arrayItemType = null;

      if (fullType.startsWith('array(')) {
        isArray = true;
        // Extract what's inside the array()
        const arrayMatch = fullType.match(/array\(([^)]+)\)/);
        if (arrayMatch) {
          arrayItemType = arrayMatch[1];
          if (arrayItemType.includes('Schema')) {
            // Reference to another schema (e.g., z.array(socialNetworkSchema))
            type = arrayItemType.replace(/^z\./, '').replace('Schema', '');
          } else if (arrayItemType === 'z.string()') {
            type = 'string';
          }
        }
      } else if (fullType.startsWith('string')) {
        type = 'string';
      } else if (fullType.startsWith('boolean')) {
        type = 'boolean';
      } else if (fullType.startsWith('number')) {
        type = 'number';
      } else if (fullType.startsWith('object(')) {
        type = 'object';
      }

      fields.push({
        name: fieldName,
        type,
        isArray,
        isOptional,
        hasDefault,
        arrayItemType
      });
    }

    schemas[schemaName] = fields;
  }

  // Now parse the nested portfolioSchema structure
  const portfolioMatch = schemaContent.match(/export const portfolioSchema = z\.object\(\{\s*cv: z\.object\(\{([\s\S]+)\}\),?\s*\}\);/);

  if (portfolioMatch) {
    const fullCvContent = portfolioMatch[1];

    // Split at 'sections:' to separate CV fields from sections
    const sectionsSplit = fullCvContent.split(/sections:\s*z\.object\(/);
    const cvOnlyContent = sectionsSplit[0];
    const sectionsContent = sectionsSplit[1]?.split('})')[0] || '';

    // Parse CV-level fields (only those before 'sections')
    const cvFields = [];
    const cvFieldRegex = /(\w+):\s*z\.([\w.()[\]]+(?:\([^)]*\))?(?:\.[^,\n]+)?)/g;
    let cvFieldMatch;

    while ((cvFieldMatch = cvFieldRegex.exec(cvOnlyContent)) !== null) {
      const fieldName = cvFieldMatch[1];
      const fullType = cvFieldMatch[2];

      let isArray = false;
      let isOptional = fullType.includes('.optional()');
      let type = 'string';
      let arrayItemType = null;

      if (fullType.startsWith('array(')) {
        isArray = true;
        const arrayMatch = fullType.match(/array\(([^)]+)\)/);
        if (arrayMatch) {
          arrayItemType = arrayMatch[1];
          if (arrayItemType.includes('Schema')) {
            type = arrayItemType.replace('Schema', '');
          } else if (arrayItemType === 'z.string()') {
            type = 'string';
          }
        }
      }

      cvFields.push({
        name: fieldName,
        type,
        isArray,
        isOptional,
        arrayItemType
      });
    }

    schemas['cv'] = cvFields;

    // Parse sections
    const sectionFields = [];
    const sectionFieldRegex = /(\w+):\s*z\.array\(([^)]+)\)(?:\.optional\(\))?/g;
    let sectionFieldMatch;

    while ((sectionFieldMatch = sectionFieldRegex.exec(sectionsContent)) !== null) {
      const sectionName = sectionFieldMatch[1];
      const arrayContent = sectionFieldMatch[2];

      let type = 'string';
      if (arrayContent.includes('Schema')) {
        type = arrayContent.replace('Schema', '');
      } else if (arrayContent === 'z.string()') {
        type = 'string';
      }

      sectionFields.push({
        name: sectionName,
        type,
        isArray: true,
        isOptional: true
      });
    }

    schemas['sections'] = sectionFields;
  }

  return schemas;
}

const schemas = parseSchema(schemaContent);

// Generate human-readable schema documentation from parsed schemas
function generateSchemaDoc(schemas) {
  const lines = [];

  // Helper to get comment for field
  const getFieldComment = (fieldName, isOptional) => {
    const req = isOptional ? 'Optional' : 'REQUIRED';

    // Field-specific comments
    const comments = {
      // CV-level fields
      'name': 'Full name (e.g., "Jane Developer")',
      'location': 'City, State/Country (e.g., "San Francisco, CA")',
      'email': 'Email address (e.g., "jane@example.com")',
      'phone': 'Phone with tel: prefix (e.g., "tel:+1-555-0123")',
      'website': 'Personal website URL (e.g., "https://janedeveloper.dev")',
      'resume_url': 'Direct link to PDF resume (if hosted elsewhere)',

      // Social network fields
      'network': 'Platform name (e.g., "LinkedIn", "GitHub", "Twitter")',
      'username': 'Your username on that platform',

      // Technology fields
      'label': 'Category name (e.g., "Languages", "Frontend", "Cloud & DevOps")',
      'details': 'Comma-separated list of technologies',

      // Experience fields
      'company': 'Company name',
      'position': 'Job title/role',
      'start_date': 'Format: "YYYY-MM" (e.g., "2021-06")',
      'end_date': 'Format: "YYYY-MM" (omit if current position)',
      'highlights': 'Array of achievements/responsibilities - use **bold** for metrics',

      // Education fields
      'institution': 'School/University name',
      'area': 'Major/Field of study (e.g., "Computer Science")',
      'degree': 'Degree type (e.g., "B.S.", "M.S.", "Ph.D.")',

      // Project fields
      'date': 'Format: "YYYY-MM" or "YYYY-MM – YYYY-MM"',
      'show_on_resume': 'Default: true (set false to hide from PDF)',

      // Publication fields
      'title': 'Publication title',
      'authors': 'Array of author names',
      'journal': 'Publication venue/journal name',
      'doi': 'DOI link or article URL'
    };

    return `${req} - ${comments[fieldName] || fieldName}`;
  };

  // Generate CV structure
  lines.push('cv:');
  lines.push('  # ============================================================================');
  lines.push('  # PERSONAL INFORMATION');
  lines.push('  # ============================================================================');
  lines.push('');

  // CV-level fields
  if (schemas.cv) {
    schemas.cv.forEach(field => {
      if (field.isArray) {
        const indent = '  ';
        const schemaName = field.arrayItemType?.replace('Schema', '') || field.type;
        const comment = getFieldComment(field.name, field.isOptional);

        lines.push(`${indent}# ${comment}`);
        lines.push(`${indent}${field.name}:`);

        // Add array item schema
        if (schemas[schemaName]) {
          schemas[schemaName].forEach(subField => {
            const subComment = getFieldComment(subField.name, subField.isOptional);
            lines.push(`${indent}  - ${subField.name}: ${subField.type}    # ${subComment}`);
          });
        }
      } else {
        const indent = '  ';
        const comment = getFieldComment(field.name, field.isOptional);
        lines.push(`${indent}${field.name}: ${field.type}    # ${comment}`);
      }
    });
  }

  lines.push('');
  lines.push('  # ============================================================================');
  lines.push('  # RESUME SECTIONS');
  lines.push('  # ============================================================================');
  lines.push('');
  lines.push('  sections:');
  lines.push('');

  // Sections
  if (schemas.sections) {
    schemas.sections.forEach(section => {
      const sectionComment = {
        'intro': 'Introduction (Optional Array of Strings)',
        'technologies': 'Technologies (Optional Array)',
        'experience': 'Work Experience (Optional Array)',
        'education': 'Education (Optional Array)',
        'professional_projects': 'Professional Projects (Optional Array) - Work-related projects',
        'personal_projects': 'Personal Projects (Optional Array) - Side projects, open source',
        'publication': 'Publications (Optional Array) - Research papers, blog posts, articles'
      };

      lines.push(`    # ${sectionComment[section.name] || section.name}`);
      lines.push(`    ${section.name}:`);

      // Add section schema
      if (section.type === 'string') {
        lines.push('      - string    # Each paragraph/item');
      } else if (schemas[section.type]) {
        schemas[section.type].forEach(field => {
          const comment = getFieldComment(field.name, field.isOptional);
          if (field.isArray) {
            lines.push(`      - ${field.name}:    # ${comment}`);
            if (field.type === 'string') {
              lines.push(`          - string`);
            }
          } else {
            lines.push(`      - ${field.name}: ${field.type}    # ${comment}`);
          }
        });
      }

      lines.push('');
    });
  }

  return lines.join('\n');
}

const schemaDoc = generateSchemaDoc(schemas);

// Generate the comprehensive prompt
const prompt = `# Resume to YAML Converter - AI Assistant Prompt

You are a professional resume conversion specialist. Your task is to convert a user's resume into a specific YAML format used for terminal-style portfolio websites.

## YAML Schema Specification

The resume follows this exact structure. All fields marked as "Optional" can be omitted if not applicable.

\`\`\`yaml
${schemaDoc}
\`\`\`

## Formatting Guidelines

Follow these rules strictly to ensure proper YAML syntax and consistent formatting:

### 1. Date Formats
- Use **"YYYY-MM"** format for all dates (e.g., "2024-01", "2021-06")
- For date ranges, use: "YYYY-MM – YYYY-MM" (em dash: –)
- For publications, use: "YYYY-MM-DD" format
- **Omit end_date** for current positions/roles

### 2. Text Formatting
- **Bold important metrics**: Use \`**text**\` for numbers, percentages, achievements
  - Example: "Increased revenue by **40%**", "Led team of **5 engineers**"
- **Markdown links**: Use \`[link text](url)\` format
  - Example: "[GitHub](https://github.com/username)"
- **Action verbs**: Start each highlight with strong action verbs
  - Examples: Built, Developed, Architected, Led, Implemented, Optimized, Designed

### 3. YAML Syntax
- **Indentation**: Use exactly 2 spaces per level (no tabs)
- **Strings**: Use quotes for strings containing special characters (: - [ ] { } # | > etc.)
- **Arrays**: Use \`-\` for array items, indented consistently
- **Comments**: Lines starting with \`#\` are comments (optional, for clarity)

### 4. Content Guidelines
- **Be specific**: Include concrete metrics, numbers, and outcomes
- **Quantify impact**: Always include percentages, numbers, scale where possible
- **Highlight achievements**: Focus on results and impact, not just responsibilities
- **Use industry terms**: Include relevant technical keywords and technologies
- **Keep it concise**: Each highlight should be 1-2 lines, clear and impactful

### 5. Optional Sections
- **Omit empty sections**: If a section doesn't apply, remove it entirely
- **Don't leave empty arrays**: Remove the section rather than leaving \`section: []\`

## Complete Example

Here's a full example resume in the correct format. Use this as your reference:

\`\`\`yaml
${exampleYaml}
\`\`\`

## Your Conversion Task

Now, convert the user's resume (provided below) into the exact YAML format specified above.

**Instructions:**
1. **Preserve all information** from the original resume
2. **Format dates** consistently as "YYYY-MM"
3. **Add bold formatting** (\`**text**\`) to all metrics, numbers, and key achievements
4. **Use action verbs** to start each highlight
5. **Ensure proper YAML indentation** (2 spaces per level)
6. **Omit empty sections** that don't apply
7. **Validate output** to ensure it's valid YAML syntax
8. **Add section comments** (#) for clarity if helpful

**Output Requirements:**
- Start with \`cv:\` at the root level
- Follow the exact structure shown in the schema
- Include ALL applicable sections from the original resume
- Format everything exactly as shown in the example
- Make highlights impactful and results-oriented

---

## User's Resume (to be converted):

[PASTE OR ATTACH YOUR RESUME BELOW THIS LINE]

`;

// Ensure output directory exists
const outputDir = join(rootDir, 'client/public/data');
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Write the prompt to file
const outputPath = join(outputDir, 'ai-resume-prompt.txt');
writeFileSync(outputPath, prompt, 'utf-8');

console.log('✅ AI prompt generated successfully!');
console.log(`📁 Output: ${outputPath}`);
console.log(`📏 Prompt size: ${(prompt.length / 1024).toFixed(2)} KB`);
console.log();
