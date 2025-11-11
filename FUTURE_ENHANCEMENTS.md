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

## Low Priority

### Voice Commands
Enable voice input for terminal commands using Web Speech API

### Custom Command Framework
Allow users to define custom commands in config file

### Multi-language Support
Support for resume in multiple languages

---

**Note**: Keep this file updated as new ideas emerge!
