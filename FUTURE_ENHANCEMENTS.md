# 🚀 Future Enhancements

Ideas and improvements to implement in future versions.

## High Priority

### Make Resume Sections Optional for Students
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

---

### Fix Date Parsing Logic
**Issue**: Current regex-based date parsing breaks on common formats, causing incorrect dates in timeline and displays.

**Problems**:
- `"May 2025"` → parses as `"January 2025"` (month information lost)
- `"Oct 2023 — Dec 2023"` → fails to parse (em-dash not handled)
- Date ranges with en-dash/em-dash (`–`, `—`) cause parsing failures
- No validation or error messages for unparseable formats

**Current Implementation** (`client/src/hooks/useTerminal.ts:23-39`):
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
- Add proper validation and error handling

**Work Required**:
1. Implement multi-format parser using `date-fns.parse()` with format detection
2. Add date range parser to handle separators (`–`, `—`, `-`, `to`)
3. Handle "Present" keyword for ongoing dates
4. Add validation and fallback for unparseable dates
5. Test against all date formats currently in `resume.yaml`

**Estimated effort**: 5-7 hours

**Benefits**:
- Fixes timeline display bugs for projects and experience
- Supports flexible date formats like RenderCV
- Better error messages help users debug date issues
- No new dependencies needed (date-fns already included)

---

### Fix PDF Section Ordering
**Issue**: Reordering sections in `resume.yaml` doesn't change the section order in the generated PDF resume.

**Current Behavior**:
- Sections appear in a fixed order in PDF regardless of YAML order
- Users cannot customize section ordering for their career stage
- Students cannot prioritize education/projects over limited experience
- Professionals cannot lead with experience over education

**Root Cause** (Investigation needed):
Likely causes in `scripts/generate-resume.js`:
1. **js-yaml sortKeys**: `yaml.load()` might be using `sortKeys: true` (alphabetical sorting)
2. **RenderCV Template**: The classic template might have hardcoded section order
3. **Data Transformation**: The script might be reconstructing objects in fixed order when filtering projects

**How RenderCV Should Handle This**:
- Section order in YAML input should equal section order in PDF output
- Python's dict preserves insertion order (Python 3.7+)
- RenderCV uses `ruamel.yaml` which preserves YAML order

**Solution**: Ensure order preservation throughout the pipeline

**Work Required**:
1. **Fix js-yaml loading** (scripts/generate-resume.js):
   ```javascript
   const fullData = yaml.load(yamlContent, {
     sortKeys: false  // Preserve YAML order
   });
   ```

2. **Investigate object reconstruction** (scripts/generate-resume.js:163-187):
   - When filtering projects, ensure sections object is rebuilt in original order
   - Use `Object.entries()` and reduce to maintain order
   - Avoid object spread which might reorder keys

3. **Verify RenderCV template**: Check if classic template respects input order
   - May need to switch template or configure section order
   - Check RenderCV documentation for section ordering options

4. **Add validation**:
   - Log section order before writing temp YAML
   - Verify order preservation after each transformation

5. **Add tests**:
   - Create test resume with unusual order (education first, then experience)
   - Verify PDF matches YAML order

6. **Document the feature** once working:
   - Add examples to README.md and docs/ADVANCED.md
   - Show different orderings for students vs professionals

**Estimated effort**: 4-6 hours (investigation + implementation + testing)

**Benefits**:
- Users can customize resume structure for their career stage
- Students can prioritize education and projects over limited experience
- Professionals can lead with experience and achievements
- Better alignment with RenderCV's flexible philosophy

---

## Medium Priority

### ✅ Neofetch Auto-Fallback (COMPLETED)
**Status**: Implemented in useTerminal.ts

When neofetch.txt doesn't exist, the system now auto-generates a simple banner showing:
- Name (centered, bold)
- Contact info (email, phone, location, website)
- Top 5 skills
- Clean ASCII art borders
- Helpful tip to create custom banner

Users no longer need to manually create neofetch files.

---

## Medium Priority

### ✅ Resume to YAML Converter (COMPLETED)
**Status**: Implemented with dynamic schema generation and modal UI

**Implementation**:
- Created scripts/generate-ai-prompt.js that dynamically parses shared/schema.ts
- Generates comprehensive AI conversion prompt at build time
- Modal UI in replicate command for easy access and clipboard copying
- Prompt includes schema docs, formatting guidelines, and example
- 15KB prompt file generated to client/public/data/ai-resume-prompt.txt

**User workflow**:
1. Type "replicate" command in terminal
2. Click "Get AI Conversion Prompt" button
3. Copy prompt from modal
4. Paste into any AI tool (ChatGPT, Claude, Gemini) with resume
5. Get valid resume.yaml output

**Benefits achieved**:
- Zero hardcoded schema - fully dynamic from TypeScript definitions
- Always up-to-date with schema changes
- Works with any AI tool (user's choice)
- No API costs or rate limits
- Significantly reduces setup time for new users

---

### Fix TypeScript Strict Null-Checking Errors
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

---

### Make Schema More Flexible (Inspired by RenderCV)
**Issue**: Current schema is too rigid - doesn't allow custom sections or extra fields like RenderCV does.

**Current Limitations** (in `shared/schema.ts`):
1. **Fixed Section Names**: Only supports hardcoded sections (`intro`, `technologies`, `experience`, etc.)
   - Cannot add custom sections like "Certifications" or "Awards" without modifying schema
2. **Strict Field Requirements**: Many fields are required even when not applicable
   - Experience requires `location` (problematic for remote-first roles)
   - Projects require `highlights` array (should be optional)
3. **No Custom Fields**: Cannot add extra fields to entries
   - Cannot add `company_logo_url` or `github_repo` to projects
   - Cannot add `relevance_score` or custom metadata

**How RenderCV Handles This**:
- **Flexible Sections**: "Section titles are arbitrary" - use any section names
- **Minimal Requirements**: Only truly essential fields are required
- **Extra Fields Supported**: "RenderCV allows the usage of any number of extra keys in the entries"
- **Graceful Handling**: Custom fields don't break output, can be used in custom designs

**Solution**: Make schema progressive and extensible

**Work Required**:
1. **Add `.passthrough()` to All Schemas** (2 hours):
   ```typescript
   export const experienceSchema = z.object({
     company: z.string(),
     position: z.string(),
     // ... other fields
   }).passthrough(); // Allow extra fields
   ```

2. **Make More Fields Optional** (2 hours):
   - `location` in experience (already done in education)
   - `highlights` in projects/experience (use `.default([])`)
   - Consider making `company`/`position` optional for freelance cases

3. **Support Dynamic Section Names** (3 hours):
   ```typescript
   // Instead of fixed keys, allow any section name
   sections: z.record(
     z.string(), // section name (e.g., "Certifications")
     z.array(z.union([/* all entry types */]))
   ).optional()
   ```

4. **Update Type Handling** (1 hour):
   - Update `client/src/hooks/useTerminal.ts` to handle dynamic sections
   - Add fallback rendering for unknown section types
   - Update TypeScript types to reflect new flexibility

**Estimated effort**: 6-8 hours total

**Benefits**:
- Users can add custom sections without modifying code
- Support for non-traditional career paths (freelancers, consultants)
- Better alignment with RenderCV's philosophy
- Future-proof for new field requirements
- More inclusive for diverse backgrounds

**Breaking Changes**: None if done carefully
- Existing resume.yaml files continue to work
- New features are opt-in via custom fields

**Example Use Cases**:
```yaml
sections:
  certifications:  # Custom section!
    - name: "AWS Certified Solutions Architect"
      issuer: "Amazon Web Services"
      date: "2024"
      credential_id: "ABC123"  # Custom field!

  experience:
    - company: "Acme Corp"
      position: "Senior Engineer"
      github_team: "acme-corp/platform"  # Custom field!
      stack: ["TypeScript", "React"]     # Custom field!
```

---

## Low Priority

### Voice Commands
Enable voice input for terminal commands using Web Speech API

### Custom Command Framework
Allow users to define custom commands in config file

### Multi-language Support
Support for resume in multiple languages

---

**Note**: Keep this file updated as new ideas emerge!
