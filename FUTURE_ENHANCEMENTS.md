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

## Low Priority

### Voice Commands
Enable voice input for terminal commands using Web Speech API

### Custom Command Framework
Allow users to define custom commands in config file

### Multi-language Support
Support for resume in multiple languages

---

**Note**: Keep this file updated as new ideas emerge!
