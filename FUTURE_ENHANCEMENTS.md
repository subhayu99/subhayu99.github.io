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

### Resume to YAML Converter (AI Prompt Based)
**Goal**: Help users convert existing resumes (PDF/text) to `resume.yaml` format without manual work.

**Approach**: Provide a ready-to-use AI prompt (no API integration needed).

**Implementation Plan**:
- [ ] Create comprehensive AI prompt template for resume conversion
  - [ ] Include clear instructions for the AI
  - [ ] Embed TypeScript schema from `shared/schema.ts` in human-readable format
  - [ ] Include sample YAML from `resume.yaml.example` as reference
  - [ ] Add instructions for user to paste their resume content
  - [ ] Specify output format requirements (valid YAML matching schema)

- [ ] Add UI in replicate command page
  - [ ] Display pre-made prompt in copyable text area
  - [ ] Add "Copy Prompt" button
  - [ ] Show instructions: "Paste this prompt + your resume into ChatGPT/Claude/Gemini"
  - [ ] Optionally: Add textarea for users to paste their resume, which auto-appends to prompt
  - [ ] Optionally: Add file upload to extract text from PDF/DOC (client-side only)

**User workflow**:
1. User visits replicate command page
2. Copies the ready-made prompt
3. Pastes their resume content after the prompt
4. Runs it in any AI tool (ChatGPT, Claude, Gemini, etc.)
5. Gets valid `resume.yaml` output
6. Downloads and uses it

**Technical considerations**:
- No API keys or backend required - users bring their own AI
- Prompt should be comprehensive enough to generate valid YAML consistently
- Consider providing validation instructions in the prompt
- Client-side PDF text extraction using libraries like pdf.js if file upload is added

**Estimated effort**: 4-6 hours

**Benefits**:
- Eliminates manual YAML writing
- Reduces barrier to entry for non-technical users
- Works with any AI tool (user's choice)
- No API costs or rate limits

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

## Low Priority

### Voice Commands
Enable voice input for terminal commands using Web Speech API

### Custom Command Framework
Allow users to define custom commands in config file

### Multi-language Support
Support for resume in multiple languages

---

**Note**: Keep this file updated as new ideas emerge!
