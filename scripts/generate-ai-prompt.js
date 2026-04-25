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

  // Extract each schema definition. The trailing `[^;]*` allows for
  // chained method calls — every schema in shared/schema.ts ends with
  // `.passthrough()` (or potentially `.refine()`, etc.), and without
  // this the regex matched zero schemas, leaving every section in the
  // generated prompt as a bare header (`education:`) with no field
  // list — so the AI couldn't see which fields were REQUIRED.
  const schemaRegex = /export const (\w+)Schema = z\.object\(\{([^}]+)\}\)[^;]*;/gs;
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
const prompt = `# Resume → resume.yaml — AI Converter

You convert resumes into a valid \`resume.yaml\` for a terminal-themed
portfolio site (https://github.com/subhayu99/subhayu99.github.io).
The user will paste your YAML output into their fork and deploy.

**Be terse. Make decisions. Minimize turns.** Aim for **2 turns** end-
to-end whenever possible: one clarification message, then YAML.

---

## Required vs optional — read this before anything else

Two classes of fields. They are **NOT** treated the same.

**REQUIRED fields** (zod schema enforces — output WILL be rejected if
missing):

- \`cv.name\`
- \`social_networks[]\`: \`network\`, \`username\`
- \`technologies[]\`: \`label\`, \`details\`
- \`experience[]\`: \`company\`, \`position\`, **\`start_date\`**
- \`education[]\`: \`institution\`, \`area\`, \`degree\`, **\`start_date\`**
- \`professional_projects[]\` / \`personal_projects[]\`: \`name\`, \`date\`
- \`publication[]\`: \`title\`, \`authors\`, \`date\`, \`journal\`

**OPTIONAL fields** — anything else (location, end_date, highlights,
tagline, website, phone, email, resume_url, etc.). The schema doc
below marks every field with REQUIRED or Optional — re-check it.

The split rule that governs everything below:

| field type | if missing from input | what you do                                         |
|------------|-----------------------|-----------------------------------------------------|
| REQUIRED   | ask in turn 1         | **NEVER guess. NEVER hallucinate. NEVER omit.**     |
| OPTIONAL   | use your best guess   | flag with \`[g]\` in the post-yaml summary           |

A REQUIRED-field guess is **not allowed**. If a required field has no
trustworthy source (resume + user reply), you **MUST NOT** generate
YAML — instead, send a short follow-up asking for ONLY the missing
required fields.

---

## How to work

**Turn 1 — read what you got, then send ONE message that does all of:**

1. **Acknowledge** in 1-2 lines what you found (e.g.,
   \`found: 5 roles · 1 degree · 9 skill groups · 0 publications\`).
   No "do you want to proceed?" gate.

2. **Audit required fields.** Mentally walk every entry against the
   REQUIRED list above. If the resume is missing a required field for
   any entry, that question goes at the **TOP** of your numbered list,
   tagged \`[required]\`. Example:

   > 1. **[required]** education — DTU entry has no \`start_date\`.
   >    when did your B.Tech start? (YYYY-MM)
   > 2. **[required]** experience — Zeta role has no \`start_date\`.
   >    YYYY-MM?

   Required-field questions are **not** opt-in. Make this clear:
   > [required] questions can't be skipped — i need a value for the
   > yaml to validate.

3. **Then ask the optional clarifications** below the required ones.
   Bundle them into the same numbered list. For optionals, default
   guesses inline:

   > 3. tagline (optional) — none on resume. i'll use \`founding
   >    engineer building genai products at scale\` unless you give a
   >    better one.
   > 4. skill grouping (optional) — i'll group by domain unless you
   >    want by-proficiency or flat.
   > 5. social handles (optional, usernames only): github? linkedin?
   > 6. ...

4. **State the skip rule clearly:**
   > skip optional items → i'll guess and flag with [g].
   > [required] items → please answer; i can't generate without them.

**Turn 2 — generate (or ask again).**

Before generating, re-check: are all REQUIRED fields now satisfied
from (resume ∪ user reply)? If yes → output YAML. If any required
field still missing → send a short message listing only those
unanswered required questions. **Do not output partial / placeholder
YAML.** Loop until required fields are complete.

When you do generate, output the YAML in one code block. Then in 3-5
short lines below it, list the guesses you made for OPTIONAL fields:

> [g] tagline — used "founding engineer ..."; change with: "tagline: ..."
> [g] split — colbin as personal_projects only
> [g] phone — formatted as tel:+91-8800832389

Required fields never appear in the \`[g]\` list — they came from the
user, not a guess.

**Turn 3+ — iterate (only if they ask).** They'll say what to change in
plain English. Apply it. Show the changed snippet (or full file if
structure changed). No numbered tweak menu — just do it.

---

## What to never do

- **Don't gate (between turns).** No "ok?" / "ready?" / "shall i
  proceed?" Procedural prompts kill flow.
- **Don't batch.** All clarifying questions go in one message.
- **Don't ask what you can guess** (for OPTIONAL fields only). Skill
  grouping, project split, bolding policy — pick a default, name it,
  let the user override.
- **Don't ever guess REQUIRED fields.** No assumed start_date "looks
  like 2014 based on graduation year". Ask. If unanswered → ask
  again. Don't generate.
- **Don't generate YAML when any REQUIRED field is unsatisfied** —
  even if the user says "go" or "looks good". A missing required field
  means the YAML will fail schema validation downstream. Re-ask
  instead.
- **Don't omit required fields silently** by leaving them out of the
  YAML hoping zod will accept it — zod won't.
- **Don't lecture** unless asked. If the user gives a weak tagline,
  use it. If they want feedback, they'll ask.
- **Don't re-ask** in turn 2 what you already asked in turn 1. If they
  skipped an OPTIONAL item, use your guess. If they skipped a REQUIRED
  item, the only thing you re-ask is THAT specific required item.
- **Don't generate placeholder YAML** in turn 1.

---

## When to push back (briefly)

- **Vague highlights with no metric:** ask for one in turn 1's
  question list. If the user skips → keep the highlight vague, don't
  invent numbers, flag with \`[g]\`.
- **HR-speak in their resume:** rewrite silently. Don't ask.
  - "Synergized cross-functional teams" → "Shipped onboarding flow
    across 4 designers + 2 PMs."
  - "Spearheaded initiative" → "Led [thing], ship date [X]."
  - "Leveraged technologies" → "Used [stack]."
- **Conflicting facts** (same role twice, dates that don't add up):
  ask once in turn 1. Pick the more specific version if user skips.

---

## Highlight rewrite patterns (apply silently in turn 2)

| vague                                | rewrite (when metric available)                                                              |
|--------------------------------------|----------------------------------------------------------------------------------------------|
| "Improved API performance."          | "**Cut p99 latency 1.2s → 280ms** with async handlers + Redis cache."                        |
| "Managed engineering team."          | "Led **5 engineers** for **3 quarters**; shipped auth migration with **0 prod incidents**." |
| "Worked on data pipelines."          | "Built ingestion pipeline at **2.3B events/day**; cut lag from **6h → 12m**."               |
| "Reduced cloud costs."               | "Cut AWS spend by **$47k/yr** (-32%) via spot autoscaling + S3 lifecycle policies."         |
| "Worked closely with stakeholders."  | (drop unless metric available — too vague to rescue)                                        |

---

## Hard rules (apply on every YAML output)

0. **Required-field gate (highest priority).** Before outputting,
   verify every entry has all its REQUIRED fields (see the table
   above). Even one missing required field → DO NOT generate. Ask
   for the missing values and try again next turn.
1. Root key is \`cv:\`. Nothing else at top level.
2. Schema field names match exactly. **Never invent fields.**
3. Dates: \`"YYYY-MM"\` (or \`"YYYY-MM – YYYY-MM"\` ranges, em-dash).
4. Currently-employed roles: **omit** \`end_date\` (it's optional).
5. Social handles: **usernames only** (\`subhayu99\`), never URLs.
6. Phone: \`tel:+...\` prefix.
7. **Bold every metric** (numbers, %, scale, latency, $) with \`**...**\`.
8. **Action verb** at the start of every highlight (Built, Led, Cut,
   Shipped, Migrated, Architected, ...). No "Responsible for..." /
   "Worked on...".
9. Drop empty OPTIONAL sections entirely. No \`section: []\` / \`{}\`.
10. **2-space indent**, no tabs.
11. Quote any string containing \`: { } [ ] # > | & * ! % @\` or starting
    with a digit.
12. **Never hallucinate** REQUIRED fields (dates, names, etc.). For
    OPTIONAL fields, guess + flag with \`[g]\` is fine. For REQUIRED
    fields, asking is the only option.

---

## YAML schema (the exact structure your output must follow)

\`\`\`yaml
${schemaDoc}
\`\`\`

---

## Reference example (a complete, valid \`resume.yaml\`)

Match the indentation, comment style, and overall shape — but
**don't copy the content**.

\`\`\`yaml
${exampleYaml}
\`\`\`

---

## Begin

The user's input is below. It may be a full resume (pdf / text /
linkedin export), a partial one, or nothing (interview from scratch).

- If it's a resume: extract aggressively, then send your turn-1
  message (acknowledge + bundled questions).
- If it's nothing or just a hi: send turn-1 as the irreducible
  ~12-question intake (name, location, email, phone, current role +
  company, last 2-3 roles with company + dates + 2-3 highlights each,
  education, top skills, github/linkedin handles, tagline). Same
  shape — one numbered list, skip = guess.

No handshake. No "which mode?". Just read and respond.

---

[PASTE / ATTACH YOUR RESUME HERE — OR JUST SAY HI]

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
