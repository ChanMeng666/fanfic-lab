# FanFic Lab - Comprehensive Testing Guide

This document provides step-by-step testing instructions for the FanFic Lab platform. Follow these tests to verify all features are working correctly.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Environment Variables](#2-environment-variables)
3. [Homepage Tests](#3-homepage-tests)
4. [Authentication Tests](#4-authentication-tests)
5. [Creative Wizard Tests](#5-creative-wizard-tests)
6. [Smart Editor Tests](#6-smart-editor-tests)
7. [AI Features Tests](#7-ai-features-tests)
8. [Fandom Feed Tests](#8-fandom-feed-tests)
9. [Profile Page Tests](#9-profile-page-tests)
10. [Database & Persistence Tests](#10-database--persistence-tests)
11. [Image Generation Tests](#11-image-generation-tests)
12. [Known Issues & Limitations](#12-known-issues--limitations)

---

## 1. Prerequisites & Setup

### Required Software
- Node.js 18+
- npm or yarn
- Git

### Installation Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd fanfic-lab

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations (requires DATABASE_URL)
npx prisma db push

# 5. Start the development server
npm run dev
```

### Verify Installation
- [ ] Open `http://localhost:3000` in your browser
- [ ] The homepage should load with the FanFic Lab branding
- [ ] No console errors should appear

---

## 2. Environment Variables

Create a `.env.local` file with the following variables:

```env
# Database (Required - Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host.neon.tech/fanficlab?sslmode=require

# Stack Auth (Required for authentication)
STACK_SECRET_SERVER_KEY=your_stack_secret_key
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=your_publishable_key

# OpenAI (Required for AI writing features)
OPENAI_API_KEY=sk-...

# Together AI (Required for image generation - FREE!)
# Get your key at: https://www.together.ai/
TOGETHER_API_KEY=your_together_api_key

# Cloudinary (Optional - for permanent image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# LangSmith (Optional - for AI observability)
LANGSMITH_API_KEY=lsv2_...
```

### Environment Variable Tests
- [ ] Application starts without critical errors
- [ ] Database connection works (check Prisma logs)
- [ ] Stack Auth loads without errors
- [ ] OpenAI API key is recognized (test AI features)

---

## 3. Homepage Tests

**URL:** `http://localhost:3000`

### Visual Elements
- [ ] Hero section displays with gradient background
- [ ] "Start Creating" and "Explore Stories" buttons are visible
- [ ] Fandom categories grid displays (12 categories)
- [ ] Popular tags section shows sample tags
- [ ] Feature cards display (Smart Editor, Creative Wizard, Fandom Feed)
- [ ] Footer is visible

### Fandom Categories
Test that these categories are displayed:
- [ ] Anime & Manga
- [ ] Video Games
- [ ] Movies, TV & RPF
- [ ] Books & Literature
- [ ] K-pop & Music
- [ ] Cartoons & Animation

### Navigation
- [ ] Click "Start Creating" -> navigates to `/editor`
- [ ] Click "Explore Stories" -> navigates to `/feed`
- [ ] Click fandom category -> navigates to `/feed` (with filter)
- [ ] Click "Creative Wizard" card -> navigates to `/wizard`

### Responsive Design
- [ ] Test on mobile viewport (375px width)
- [ ] Test on tablet viewport (768px width)
- [ ] Test on desktop viewport (1280px width)

---

## 4. Authentication Tests

Stack Auth provides pre-built authentication pages at `/handler/*`.

### Sign Up Flow
1. [ ] Navigate to `/handler/sign-up`
2. [ ] Sign up form displays correctly
3. [ ] Enter email and password
4. [ ] Submit form
5. [ ] User is created and redirected to `/wizard`

### Sign In Flow
1. [ ] Navigate to `/handler/sign-in`
2. [ ] Sign in form displays correctly
3. [ ] Enter credentials
4. [ ] Submit form
5. [ ] User is authenticated and redirected to `/`

### Protected Routes
Test these routes redirect to sign-in when unauthenticated:
- [ ] `/wizard` -> redirects to `/handler/sign-in`
- [ ] `/editor` -> redirects to `/handler/sign-in`
- [ ] `/profile` -> redirects to `/handler/sign-in`

### Sign Out
1. [ ] Navigate to `/handler/account-settings`
2. [ ] Click sign out
3. [ ] User is signed out and redirected to `/`

---

## 5. Creative Wizard Tests

**URL:** `http://localhost:3000/wizard`

**Prerequisite:** User must be authenticated

### Step 1: Fandom Selection
- [ ] Fandom grid displays (12 popular fandoms)
- [ ] Search box works to filter fandoms
- [ ] Category filter buttons work
- [ ] Can select a fandom by clicking
- [ ] "Custom fandom" option available
- [ ] Selected fandom highlighted
- [ ] Progress indicator shows Step 1/4

### Step 2: Ship Selection
- [ ] Popular ships for selected fandom display
- [ ] Can search/filter ships
- [ ] Can select one or more ships
- [ ] "Skip - No ships (Gen fic)" option works
- [ ] "Custom ship" input available
- [ ] Continue button advances to next step

### Step 3: Character Setup
- [ ] Suggested characters from fandom display
- [ ] Can add custom character
- [ ] Character form has: name, personality traits, speech patterns
- [ ] OC toggle works
- [ ] Can remove added characters
- [ ] Character list shows added characters

### Step 4: AI Chat & Outline
- [ ] CopilotChat interface displays
- [ ] Can type messages to AI
- [ ] AI responds with story suggestions
- [ ] Outline approval card displays when AI generates outline
- [ ] Can approve/edit/regenerate outline

### Complete Wizard
- [ ] "Start Writing" button navigates to `/editor`
- [ ] Story context is preserved (check editor has fandom, ships, characters)

---

## 6. Smart Editor Tests

**URL:** `http://localhost:3000/editor`

**Prerequisite:** User must be authenticated

### Setup Form (New Story)
- [ ] Story title input works
- [ ] Fandom input works
- [ ] Ships input (comma-separated) works
- [ ] Tags input (comma-separated) works
- [ ] Tone badges are selectable (fluff, angst, humor, etc.)
- [ ] "Start Writing" button enables when fandom is entered
- [ ] "Use Creative Wizard" link works

### Editor Interface
- [ ] Header shows story title (editable)
- [ ] Header shows fandom and ships badges
- [ ] Character sidebar displays on left
- [ ] Main editor area displays
- [ ] CopilotKit sidebar available on right
- [ ] Word count displays

### Text Editing
- [ ] Can type in the editor
- [ ] Text formatting preserved
- [ ] Word count updates as you type
- [ ] Autosave indicator appears
- [ ] "Last saved" timestamp updates

### AI Toolbar
- [ ] "Magic Continue" button visible
- [ ] "Expand" dropdown menu works
- [ ] "Polish" dropdown menu works
- [ ] "OOC Check" button visible
- [ ] Selection indicator shows when text is selected

### Character Sidebar
- [ ] "Add Character" button works
- [ ] Character dialog opens
- [ ] Can enter character details (name, personality, speech patterns)
- [ ] OC toggle works
- [ ] Added characters appear in list
- [ ] Can remove characters from list

### Autosave
- [ ] Content saves automatically (check browser localStorage)
- [ ] "Saving..." indicator appears during save
- [ ] "Saved [time]" indicator appears after save
- [ ] Manual save button works
- [ ] Unsaved changes indicator works

---

## 7. AI Features Tests

**Prerequisite:** OpenAI API key configured

### Magic Continue
1. [ ] Type some story content
2. [ ] Click "Magic Continue" button
3. [ ] AI generates continuation
4. [ ] Content approval card appears
5. [ ] Can approve/reject/edit content
6. [ ] Approved content is inserted into editor

### Expand Scene
1. [ ] Type some story content
2. [ ] Select a paragraph
3. [ ] Click "Expand" dropdown
4. [ ] Select expansion type (Dialogue, Description, etc.)
5. [ ] AI expands the selected text
6. [ ] Content approval card appears
7. [ ] Can approve/reject/edit

### Polish Prose
1. [ ] Type some story content
2. [ ] Select text to polish
3. [ ] Click "Polish" dropdown
4. [ ] Select intensity (Light, Medium, Heavy)
5. [ ] AI improves the prose
6. [ ] Content approval card appears
7. [ ] Can approve/reject/edit

### OOC Check
1. [ ] Add characters to the story
2. [ ] Write content with character dialogue
3. [ ] Click "OOC Check" button
4. [ ] OOC results display in collapsible sections
5. [ ] Issues show severity indicators
6. [ ] Can apply suggested fixes
7. [ ] Can dismiss individual issues
8. [ ] "Clear All" button works

### CopilotKit Chat Sidebar
1. [ ] Click sidebar toggle to open
2. [ ] Chat interface displays
3. [ ] Can type messages
4. [ ] AI responds with helpful suggestions
5. [ ] Responses reference story context

---

## 8. Fandom Feed Tests

**URL:** `http://localhost:3000/feed`

### Feed Layout
- [ ] Fandom tabs display at top
- [ ] Story cards display in grid
- [ ] Tag filter sidebar on left
- [ ] Sort options available

### Fandom Filtering
- [ ] "All Fandoms" tab shows all stories
- [ ] Individual fandom tabs filter stories
- [ ] Tab highlights when selected
- [ ] Horizontal scroll works for many tabs

### Tag Filtering
- [ ] Tag categories display (Relationship, Setting, Tone, Content)
- [ ] Can search tags
- [ ] Clicking tag adds to filter
- [ ] Active filters display as badges
- [ ] Can remove individual filters
- [ ] "Clear All" removes all filters

### Rating Filter
- [ ] Rating dropdown works
- [ ] Options: All, General, Teen, Mature, Explicit
- [ ] Filter applies to stories

### Status Filter
- [ ] Status dropdown works
- [ ] Options: All, Published, Complete
- [ ] Filter applies to stories

### Sort Options
- [ ] Sort dropdown works
- [ ] Options: Recent, Popular, Most Comments, Word Count
- [ ] Stories reorder on selection

### Story Cards
- [ ] Cover image displays (or placeholder)
- [ ] Title is clickable
- [ ] Author name and avatar display
- [ ] Tags display as badges
- [ ] Rating badge displays
- [ ] Stats show (likes, comments, chapters, words)
- [ ] Date shows (relative time)

---

## 9. Profile Page Tests

**URL:** `http://localhost:3000/profile`

**Prerequisite:** User must be authenticated

### Profile Card
- [ ] Avatar displays (or fallback)
- [ ] Display name shows
- [ ] Username shows with @ prefix
- [ ] Bio displays (if set)
- [ ] "Edit Profile" button works
- [ ] Social stats show (Stories, Followers, Following)

### Edit Profile Dialog
1. [ ] Click "Edit Profile"
2. [ ] Dialog opens
3. [ ] Can edit display name
4. [ ] Can edit bio
5. [ ] Cancel button closes dialog
6. [ ] Save button updates profile
7. [ ] Toast notification appears on success

### Writing Stats Card
- [ ] Total words count displays
- [ ] Published stories count displays
- [ ] Total likes count displays
- [ ] Total comments count displays

### Stories Tab
- [ ] Your stories list displays
- [ ] Story cards show title, fandom, status
- [ ] "Edit" button links to `/editor/[storyId]`
- [ ] "Delete" button works with confirmation
- [ ] Empty state shows when no stories

### Drafts Tab
- [ ] Drafts list displays
- [ ] Draft cards show title, fandom, updated date
- [ ] "Continue" button works
- [ ] "Delete" button works
- [ ] Empty state shows when no drafts

### Liked Tab
- [ ] Shows placeholder for liked stories
- [ ] (Full implementation would show liked stories)

---

## 10. Database & Persistence Tests

### Story Creation
1. [ ] Create a new story in editor
2. [ ] Add content
3. [ ] Click "Publish" (or save)
4. [ ] Refresh page - story persists
5. [ ] Check story appears in profile

### Story Editing
1. [ ] Navigate to `/editor/[storyId]`
2. [ ] Story data loads correctly
3. [ ] Edit content
4. [ ] Save changes
5. [ ] Refresh - changes persist

### Chapter Management
1. [ ] Multiple chapters display as tabs (if applicable)
2. [ ] Can switch between chapters
3. [ ] Each chapter saves independently

### Draft Persistence
1. [ ] Create content in new editor
2. [ ] Autosave triggers
3. [ ] Refresh page
4. [ ] Draft available (check localStorage or database)

---

## 11. Image Generation Tests

**Prerequisite:** Together AI API key configured (free at https://www.together.ai/)

### Character Portrait
1. [ ] Add a character
2. [ ] Request portrait generation via chat
3. [ ] If API configured: image generates
4. [ ] Image approval card displays
5. [ ] Can approve/reject/regenerate
6. [ ] If Cloudinary configured: image uploads

### Scene Illustration
1. [ ] Write a scene description
2. [ ] Request illustration via chat
3. [ ] If API configured: image generates
4. [ ] Image approval card displays
5. [ ] Can modify prompt and regenerate

### Story Cover
1. [ ] Request cover generation via chat
2. [ ] Provide story details when asked
3. [ ] If API configured: cover generates
4. [ ] Image approval card displays

### Without API Keys
- [ ] Graceful fallback with "pending approval" status
- [ ] Prompt is displayed for review
- [ ] No errors in console

---

## 12. Known Issues & Limitations

### Current Limitations
1. **Image Generation**: Requires Google API key with Imagen access
2. **Cloudinary**: Images stored as base64 without Cloudinary configured
3. **Social Features**: Like/comment/follow UI exists but may need database connection
4. **Real-time Updates**: No WebSocket/SSE for live updates
5. **Search**: Full-text search not implemented

### Expected Behaviors
- Unauthenticated users are redirected to sign-in for protected routes
- Autosave uses localStorage when not signed in
- AI features require OpenAI API key
- Some feed stories are sample data for demonstration

### Browser Compatibility
- Chrome 90+: Full support
- Firefox 88+: Full support
- Safari 14+: Full support
- Edge 90+: Full support

---

## Test Completion Checklist

### Core Functionality
- [ ] Homepage loads correctly
- [ ] Authentication flow works
- [ ] Creative Wizard completes
- [ ] Smart Editor works
- [ ] AI features respond
- [ ] Feed displays stories
- [ ] Profile page loads

### Data Persistence
- [ ] Stories save to database
- [ ] Drafts autosave
- [ ] User profile updates
- [ ] Story edits persist

### Error Handling
- [ ] No console errors during normal use
- [ ] Graceful handling of missing API keys
- [ ] Proper error messages for failed operations

---

## Reporting Issues

If you encounter issues during testing:

1. Check browser console for errors
2. Check terminal for server errors
3. Verify environment variables are set
4. Ensure database is connected
5. Check network requests in DevTools

Report issues with:
- Steps to reproduce
- Expected vs actual behavior
- Console/terminal errors
- Browser and OS information
