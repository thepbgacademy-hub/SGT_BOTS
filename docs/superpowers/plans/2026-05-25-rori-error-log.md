# Rori Error Log

## 2026-05-25 - Generic Room Prompt Matched Specific Tech Room Keywords

**Context:** Rori Phase 3 Academy directory-backed Telegram room routing.

**Problem:** The generic prompt `Which PBG Telegram rooms should I join?` contains `Telegram` and `room`, so the first directory matcher treated it like a specific technical-access problem and returned only the Technical Access Help room.

**Fix applied:** Added a generic room-list check before specific keyword scoring. Generic `which/what/list/all rooms` questions now list all configured room purposes, while specific access trouble still routes to Technical Access Help.

**Rule going forward:** Intent matchers need a generic-list branch before scoring specific support categories, especially when broad prompts naturally contain category keywords.

## 2026-05-25 - Phase 3 Should Not Add Fake Admin Data

**Context:** Rori Phase 3 workshop/event and Telegram room directory data.

**Problem:** It would be easy to make tests pass by seeding fake event dates, registration URLs, or invite links, but that would create user-facing misinformation.

**Fix applied:** Kept workshop data empty until real Academy data exists, marked room invite links as not configured, and asserted no visible HTTP URL appears in the Rori mini-app E2E directory flows.

**Rule going forward:** Directory records should prefer explicit not-configured states over fake placeholders. Never add invented event or invite data to make a demo feel complete.

## 2026-05-25 - Specific Room Questions Were Swallowed By Broader Academy Branches

**Context:** Final review for Rori Phase 3.

**Problem:** Specific questions such as `Which Telegram room is for enrollment help?` were answered by the enrollment branch, and `Which Telegram room is for workshop updates?` was answered by the workshop branch before room routing could run. Tool support room questions also overmatched Technical Access because generic words were counted in the technical keyword set.

**Fix applied:** Added failing tests for Enrollment Help, Workshop Updates, and Tool Support room routing, moved explicit Telegram room routing before broad enrollment/workshop branches, and removed generic `telegram` and `room` keywords from Technical Access scoring.

**Rule going forward:** Room-routing intent must run before broad Academy topic branches when the user asks which Telegram room fits a purpose.

## 2026-05-25 - VPS Manual SQL List Referenced A Missing File

**Context:** Rori Phase 4 added the manual VPS SQL mirror for the Rori directory migration.

**Problem:** The manual apply README was updated to include `007_cursive_category_engine.sql`, but that file is not present in `vps-supabase-manual`. That would make the "exact order" instructions impossible to follow from the folder alone.

**Fix applied:** Kept the manual apply list scoped to files present in `vps-supabase-manual` and added `008_rori_academy_directory.sql` after the existing six manual files.

**Rule going forward:** Manual rollout folders should list only files that are actually present in that folder, unless the notes explicitly point to another location.
