# Features

Spec for each module. "Phase" refers to ROADMAP.md.

---

## Avatar (Phase 1)

The centerpiece of the app. Lives on the dashboard, always visible.

### The egg philosophy
**You don't start with an avatar. You start with an egg.**

The avatar is not customized at signup — it's *earned* through living inside kopyme. The egg cracks and evolves as you document your life. This is the philosophical core: you discover who you are by observing yourself over time.

**Evolution stages:**

| Stage | Trigger | Visual |
|---|---|---|
| `egg` | New user, 0-6 days of data | Whole egg, tiny heartbeat pulse |
| `cracking` | 7+ days, 3+ modules used | Visible cracks, light peeking through |
| `hatching` | 30+ days, consistent data | Shell breaking open |
| `emerging` | 60+ days, all modules touched | Blurry figure taking shape |
| `self` | 90+ days, rich history | Your avatar, fully formed |

Each crack appears tied to a real moment: first diary entry, first completed goal, first memory with a photo. The cracks are *yours*.

**Avatar states (once emerged):** energized · neutral · sad · nostalgic · celebratory · reflective

**What it does:**
- Displays the current evolution stage with ambient animation
- Speaks short contextual messages based on recent data (static logic first, Claude API in Phase 6)
- Reacts visibly to: mood logged, habit completed, goal achieved, memory created

**Critical note:** The avatar must feel like a mirror, not a pet. It reflects the user back at themselves. If mood has been low for 3 days, it doesn't say "cheer up!" — it says "hey, you've been heavy lately. want to write about it?"

**Critical note on the egg:** Every crack must feel *earned*, not automatic. Don't just tie it to days elapsed — tie it to meaningful actions. A user who opens the app every day but never writes anything shouldn't hatch faster than one who writes deeply twice a week.

---

## Habit Tracker (Phase 2)

**What it does:**
- Create habits with name, icon, color, frequency (daily/weekly/custom days)
- Log completion per day with optional note
- Streak counter
- Weekly/monthly completion heatmap

**User can:**
- Create up to 20 habits
- Archive habits (not delete — history is preserved)
- See streaks and longest streak
- View chart: completion rate over last 30/90 days

---

## Mood Tracker (Phase 2)

**What it does:**
- Daily mood score (1-10, with visual scale)
- Emotion tags (multi-select: happy, anxious, grateful, tired, angry, nostalgic, excited, etc.)
- Optional short note
- Energy level (1-5)

**User can:**
- Log mood once per day (editable)
- View mood chart over time
- See correlation hints ("you tend to feel better on Fridays" — Phase 6 AI feature)

**Critical note:** Mood is linked to diary entries and memories. A bad mood day + a diary entry + a memory creates a rich picture. Design the UI to encourage this linkage naturally, not force it.

---

## Diary (Phase 2)

**What it does:**
- Rich text entries (markdown)
- Linked to mood entry of the day (optional)
- Tags
- Date picker (can write about past days)

**User can:**
- Write freely
- Add tags
- See entries in timeline or calendar view
- Search entries by keyword or tag

**Critical note:** The diary prompt from the avatar ("you haven't written in 5 days — what happened?") should feel like an invitation, not a notification. Tone matters enormously here.

---

## Goals (Phase 3)

**What it does:**
- Create goals with title, description, category, target date
- Add milestones (checklist items)
- Track status: active / completed / paused / abandoned

**Categories:** Personal · Health · Career · Travel · Relationships · Creative · Other

**User can:**
- Mark milestones complete
- Mark goal complete (with celebratory avatar reaction)
- View goals by category or status
- See completed goals as a "life achievement wall"

**Critical note:** The "abandoned" status is intentional and important — life changes, goals change. Don't hide it. Reflecting on abandoned goals is as valuable as celebrating completed ones.

---

## Connections / Vínculos (Phase 3)

**What it does:**
- Create a person record: name, relationship type, photo, birthday, notes
- Log interactions: call, in-person, message, letter, gift
- Set a "contact goal" (e.g. see in person monthly)
- Visual relationship map (React Flow graph)

**User can:**
- See who they haven't contacted in a while (vs their contact goal)
- See interactions timeline per person
- Link memories, letters, gifts to a person
- View the full map: family cluster, friend cluster, romantic, etc.

**Critical note:** This is a private relationship CRM. It should feel warm and human, not like a sales tool. The map visualization is key — it's a visual of who matters in your life. Invest in making it beautiful.

---

## Memories / Recuerdos (Phase 4)

**What it does:**
- Create a memory: title, type (travel/event/anecdote), description, location, dates, mood score
- Attach photos and videos
- Tag people from Connections
- Tag with emotions

**User can:**
- Browse memories in timeline or map view (by location)
- Filter by person, year, type, emotion
- Create a "travel" memory as a multi-day event with media per day

**Critical note:** This is the most emotionally rich module. The UX should feel like flipping through a photo album with feelings attached — not like a file manager. Consider a "memory of the day" surface on the dashboard (e.g. "3 years ago today...").

---

## Letters & Gifts (Phase 4)

**What it does:**
- Log letters: direction (sent/received), date, person, subject, body (or scan)
- Log gifts: direction (given/received), date, person, description, occasion, photo

**User can:**
- See full exchange history with a person
- Filter by year, person, direction
- See gift occasions (birthdays, random, holidays)

**Critical note:** This is simple but emotionally powerful. "On your birthday in 2019, X gave you a handwritten letter" — that's the kind of thing worth preserving. Keep the UI lightweight; the data does the heavy lifting.

---

## Sharing (Phase 5 — replaces generic Chat)

Instead of a full chat product, Phase 5 focuses on **sharing specific content** with specific people — which is unique to kopyme and much more valuable than another messaging app.

**What it does:**
- Share a memory, diary entry, or mood moment with a connected friend
- Friend receives it in a dedicated "shared with me" inbox
- Can reply with a short reaction or message (not a full chat thread)

**Why this instead of chat:** The value of kopyme is in the *depth* of what you document. Sharing that depth selectively with someone you care about is more meaningful than "hey what's up" messages. If users want to chat, they have WhatsApp.

**Full real-time chat:** Can be revisited later if there's genuine demand. Not killed, just deprioritized.

---

## AI / Psychologist mode (Phase 6)

**What it does:**
- Avatar generates context-aware messages daily
- "Deep dive" mode: Claude asks guided questions based on recent diary/mood data
- Optional: weekly emotional summary ("this week you felt...")
- Pattern detection: "you tend to log low mood on Sundays — is there something there?"

**Critical note:** This needs ethical guardrails. Claude is not a therapist. The tone should be: curious and reflective, not diagnostic. Always offer the option to just write without prompts. Never suggest the user has a condition or needs professional help beyond "if this feels heavy, talking to someone can help."

---

## Multi-user & Privacy (Phase 7)

**What it does:**
- Each piece of content has visibility: private / friends / public
- Users can connect with each other (friend request model)
- Connected users can see what the other has shared publicly or with friends
- Profile page shows a curated "public life" view

**Open questions to resolve in this phase:**
- Can friends comment on your memories? Like them?
- Can you share a specific memory with a specific person only?
- Is there a "feed" of friends' public content?
