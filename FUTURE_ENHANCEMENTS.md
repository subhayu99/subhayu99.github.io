# 🚀 Future Enhancements

Living list of ideas for upcoming work. Items already shipped live in the **Archive** at the bottom — kept for design history, not as active work.

---

## ⭐ Active

### High Priority

#### `cat resume.txt` is broken — needs fix

#### Make Resume Sections Optional for Students
**Issue**: Currently all sections (experience, projects) are required, which isn't ideal for students who may not have work experience yet.

**Solution**: Make these sections optional in the schema:
- `experience: z.array(experienceSchema).optional()`
- `professional_projects: z.array(projectSchema).optional()`
- `personal_projects: z.array(projectSchema).optional()`

**Work Required**:
1. Update schema in `shared/schema.ts`
2. Add null checks in `client/src/hooks/useTerminal.ts`:
   - `showExperience()` - check if experience exists
   - `showProjects()` - check if projects exist
   - `showTimeline()` - handle missing sections
3. Update default data in `client/src/lib/portfolioData.ts`
4. Test with resume that has empty/missing sections
5. Show friendly message when section is empty (e.g., "No work experience yet - check out my projects!")

**Estimated effort**: 2-3 hours

**Benefits**:
- Students can use template without fake data
- More inclusive for early-career developers
- Cleaner resumes for career changers

### Medium Priority

#### Fix TypeScript Strict Null-Checking Errors
**Issue**: ~50 TypeScript errors in `client/src/hooks/useTerminal.ts` due to accessing optional schema fields without null checks.

**Background**:
- Schema fields were made optional (education.highlights, phone, location, etc.) to support flexible resumes
- Dynamic command system checks data availability at runtime
- Build succeeds but TypeScript reports type errors

**Current State**:
- Errors don't block compilation (Vite builds successfully)
- Runtime behavior is correct (proper null checks in isAvailable functions)
- Type safety could be improved

**Solution**: Add optional chaining operators (`?.`) and nullish coalescing throughout useTerminal.ts

**Affected areas**:
- Social network access: `portfolioData.cv.social_networks`
- Optional contact fields: `portfolioData.cv.phone`, `cv.website`
- Section arrays: `cv.sections.intro`, `cv.sections.technologies`, etc.
- Education fields: `edu.location`, `edu.highlights`

**Estimated effort**: 2-3 hours

**Benefits**:
- Clean TypeScript compilation
- Better IDE autocomplete and error detection
- Improved type safety
- Professional code quality

### Low Priority

#### Voice Commands
Enable voice input for terminal commands using Web Speech API.

#### Custom Command Framework
Allow users to define custom commands in config file.

#### Multi-language Support
Support for resume in multiple languages.

---

## ✅ Archive — Shipped

These items are live in the codebase. Kept here for design rationale and history; not active work.

### Date Parsing Logic
**Status**: Implemented with date-fns multi-format parser.

**Issue**: Original regex-based date parsing broke on common formats, causing incorrect dates in timeline and displays.

**Problems**:
- `"May 2025"` → parsed as `"January 2025"` (month information lost)
- `"Oct 2023 — Dec 2023"` → failed to parse (em-dash not handled)
- Date ranges with en-dash/em-dash (`–`, `—`) caused parsing failures
- No validation or error messages for unparseable formats

**Original Implementation** (`client/src/hooks/useTerminal.ts:23-39`):
```typescript
const parseDate = (dateStr: string): Date => {
  const cleanDate = dateStr.replace(/[^\d-]/g, '').trim();
  // This strips ALL non-digit chars, losing "May" in "May 2025"
  if (cleanDate.includes('-')) {
    const [year, month] = cleanDate.split('-');
    return new Date(parseInt(year), month ? parseInt(month) - 1 : 0);
  }
  return new Date(parseInt(cleanDate), 0);
};
```

**Solution**: Use `date-fns` library (already in package.json) to support multiple formats:
- ISO formats: `"2023-03-28"`, `"2022-06"`, `"2021"`
- Month-Year: `"May 2025"`, `"Jan 2024"`, `"Sep 2021"`
- Date ranges: `"Jul 2025 – Present"`, `"Oct 2023 — Dec 2023"`

**Implementation** (`client/src/hooks/useTerminal.ts:23-72`):
- Replaced regex-based parser with date-fns multi-format parser
- Added support for ISO formats, Month-Year formats, and date ranges
- Handles "Present" keyword for ongoing dates
- Includes proper validation and fallback error handling
- Supports en-dash (–), em-dash (—), hyphen (-), and "to" as range separators

### PDF Section Ordering
**Status**: Implemented with `sortKeys: false` in YAML processing.

**Issue**: Reordering sections in `resume.yaml` didn't change the section order in the generated PDF resume.

**Original Behavior**:
- Sections appeared in a fixed order in PDF regardless of YAML order
- Users couldn't customize section ordering for their career stage
- Students couldn't prioritize education/projects over limited experience
- Professionals couldn't lead with experience over education

**Solution**: Ensure order preservation throughout the pipeline.

**Implementation** (`scripts/generate-resume.js`):
- Added `sortKeys: false` to `yaml.load()` (line 60) to preserve YAML key order
- Added `sortKeys: false` to `yaml.dump()` (line 162) to maintain order when writing
- Added verbose logging to display section order at load and before PDF generation
- Sections now render in PDF in the exact order they appear in `resume.yaml`

**Testing**: Verified by reordering sections in `resume.yaml` and generating PDF ✓

### Neofetch Auto-Fallback
**Status**: Implemented in `useTerminal.ts`.

When `neofetch.txt` doesn't exist, the system now auto-generates a simple banner showing:
- Name (centered, bold)
- Contact info (email, phone, location, website)
- Top 5 skills
- Clean ASCII art borders
- Helpful tip to create custom banner

Users no longer need to manually create neofetch files.

### Resume to YAML Converter
**Status**: Implemented with dynamic schema generation and modal UI.

**Implementation**:
- Created `scripts/generate-ai-prompt.js` that dynamically parses `shared/schema.ts`
- Generates comprehensive AI conversion prompt at build time
- Modal UI in `replicate` command for easy access and clipboard copying
- Prompt includes schema docs, formatting guidelines, and example
- 15KB prompt file generated to `client/public/data/ai-resume-prompt.txt`

**User workflow**:
1. Type `replicate` command in terminal
2. Click "Get AI Conversion Prompt" button
3. Copy prompt from modal
4. Paste into any AI tool (ChatGPT, Claude, Gemini) with resume
5. Get valid `resume.yaml` output

**Benefits achieved**:
- Zero hardcoded schema — fully dynamic from TypeScript definitions
- Always up-to-date with schema changes
- Works with any AI tool (user's choice)
- No API costs or rate limits
- Significantly reduces setup time for new users

### Schema Flexibility (custom fields, optional fields, dynamic sections)
**Status**: Custom fields, optional fields, dynamic rendering, AND dynamic sections all implemented.

**Issue**: Original schema was too rigid — didn't allow custom sections or extra fields like RenderCV does.

**Previous Limitations** (all fixed):

1. **Fixed Section Names**: Only supported hardcoded sections → ✅ Now supports arbitrary sections via `.catchall()`
2. **Strict Field Requirements**: Many fields were required even when not applicable → ✅ Now optional (e.g. `location` for remote roles, `highlights` arrays)
3. **No Custom Fields**: Couldn't add extra fields to entries → ✅ Now supported via `.passthrough()` (e.g. `company_logo_url`, `github_repo`, `relevance_score`)

**How RenderCV Handles This** (now mirrored):
- **Flexible Sections**: section titles are arbitrary
- **Minimal Requirements**: only truly essential fields are required
- **Extra Fields Supported**: any number of extra keys allowed in entries
- **Graceful Handling**: custom fields don't break output

**Implementation** (`shared/schema.ts`):

**Phase 1: Custom Fields Support**
- Added `.passthrough()` to all 6 schemas:
  - `socialNetworkSchema` — custom fields like `profile_url`, `verified`
  - `technologySchema` — custom fields like `proficiency_level`, `years_experience`
  - `experienceSchema` — custom fields like `github_team`, `tech_stack`, `team_size`
  - `educationSchema` — custom fields like `gpa`, `honors`, `thesis_title`
  - `projectSchema` — custom fields like `github_repo`, `live_url`, `tech_stack`
  - `publicationSchema` — custom fields like `citation_count`, `impact_factor`

**Phase 2: Optional Fields**
- Made `location` optional in `experienceSchema` (supports remote/distributed roles)
- Made `highlights` optional with `default([])` in `experienceSchema` and `projectSchema`
- Made `location` and `highlights` optional in `educationSchema`

**Phase 2.5: Dynamic Custom Field Rendering**
- Created `client/src/lib/fieldRenderer.ts` utility for automatic custom field detection and display
- Integrated into terminal display functions: `showExperience`, `showEducation`, `showProjects`
- Type-aware rendering:
  - **URLs**: clickable links with hover effects
  - **Booleans**: ✓ Yes / ✗ No indicators
  - **Arrays**: formatted chip badges
  - **Numbers**: highlighted in bold
  - **Strings**: sanitized for XSS protection
  - **Objects**: simplified representation
- Field name formatting: `tech_stack` → "Tech Stack" (snake_case to Title Case)
- Custom fields display in "📋 Additional Info" section below core content
- Automatically excludes core fields (company, position, highlights, etc.)

**Phase 3: Dynamic Section Names**
```typescript
sections: z.object({
  // Standard sections for backward compatibility
  intro: z.array(z.string()).optional(),
  technologies: z.array(technologySchema).optional(),
  experience: z.array(experienceSchema).optional(),
  education: z.array(educationSchema).optional(),
  professional_projects: z.array(projectSchema).optional(),
  personal_projects: z.array(projectSchema).optional(),
  publication: z.array(publicationSchema).optional(),
}).catchall(z.array(sectionEntrySchema)), // Allow any section names
```

**Implementation across files**:
- `shared/schema.ts:50-80` — `sectionEntrySchema` union type covering all RenderCV entry types; `.catchall()` to validate arbitrary section arrays
- `scripts/generate-resume.js:105-169` — `detectEntryType()` for dynamic type detection; `getAllowedFieldsForEntryType()` for RenderCV compatibility; updated `stripCustomFields()` to handle dynamic sections
- `client/src/hooks/useTerminal.ts:961-1092` — `showGenericSection()` renderer for dynamic sections; auto-detects entry type; supports all RenderCV entry types (Experience, Education, NormalEntry, OneLineEntry, PublicationEntry, TextEntry)
- `client/src/hooks/useTerminal.ts:401-433` — `getAvailableCommands()` dynamically registers custom sections; commands like `certifications`, `awards`, etc. work out-of-the-box

**Documentation**:
- Updated `resume.yaml.example` with custom field examples and comments
- All schemas include inline comments explaining the flexibility
- Updated `scripts/generate-resume.js` with complete RenderCV field mappings; linked to official RenderCV documentation

**How Custom Fields Work**:

1. **Web Interface**: Custom fields are preserved in `resume.json` and surface in both terminal and GUI modes
2. **Terminal Display**: Custom fields automatically render in terminal mode via dynamic field renderer
3. **PDF Generation**: Custom fields are automatically stripped by `scripts/generate-resume.js` before passing to RenderCV
4. **Schema Validation**: Zod schemas use `.passthrough()` to accept any extra fields
5. **Backward Compatibility**: RenderCV's strict Pydantic schema doesn't break the build

**Breaking Changes**: None. Existing `resume.yaml` files continue to work unchanged.

**Example Use Cases** (now supported):

```yaml
social_networks:
  - network: "LinkedIn"
    username: "jane-developer"
    profile_url: "https://linkedin.com/in/jane-developer"  # Custom field
    verified: true  # Custom field

technologies:
  - label: "Languages"
    details: "JavaScript, TypeScript, Python"
    proficiency_level: "Expert"  # Custom field
    years_experience: 5  # Custom field

experience:
  - company: "Acme Corp"
    position: "Senior Engineer"
    # location is now optional - omit for fully remote roles
    github_team: "acme-corp/platform"  # Custom field
    tech_stack: ["TypeScript", "React", "Node.js"]  # Custom field
    team_size: 8  # Custom field
    highlights: []  # Can be empty or omitted entirely

education:
  - institution: "University"
    area: "Computer Science"
    degree: "B.S."
    start_date: "2014"
    end_date: "2018"
    gpa: 3.8  # Custom field
    honors: "Magna Cum Laude"  # Custom field

# Dynamic sections — add ANY section you need:
certifications:
  - name: "AWS Certified Solutions Architect"
    date: "2024-03"
    highlights:
      - "Demonstrated expertise in designing distributed systems"
    issuer: "Amazon Web Services"  # Custom field
    certification_id: "AWS-PSA-12345"  # Custom field

awards:
  - name: "Engineering Excellence Award"
    date: "2024-01"
    highlights:
      - "Recognized for outstanding technical contribution"
    awarded_by: "Tech Corp"  # Custom field

languages:  # Simple text entries
  - "English (Native)"
  - "Spanish (Professional)"

interests:  # OneLineEntry format
  - label: "Technical"
    details: "Open source, Cloud architecture, DevOps"
```

---

**Note**: Keep this file updated as new ideas emerge. Move shipped items to the Archive section so the Active list stays focused on what's actually next.
