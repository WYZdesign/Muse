# Agent Notes

## User Preferences
- Always open `.sql` files in VS Code when creating or referencing them:
  `& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" "<file>.sql"`
- Windows box; PowerShell 7. `npm install` can be slow/flaky — if optional-dep
  errors appear in vitest (`rolldown` binding), run:
  `npm i --no-save "@rolldown/binding-win32-x64-msvc"`
- Local tsc shows ~34 pre-existing `SupabaseAuthClient`/rekognition type-drift
  errors unrelated to code changes; compare against baseline before blaming new work.
