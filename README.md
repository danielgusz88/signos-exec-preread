# Signos Executive Offsite Pre-Read Tool

Interactive pre-read platform for the Feb 9-10, 2026 executive offsite, with real-time annotation sync and AI-powered synthesis.

## Quick Start

### 1. Set Up Supabase (for real-time sync)

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Once created, go to **Settings > API** and copy:
   - Project URL (e.g., `https://xxxx.supabase.co`)
   - `anon` public key
3. In the Supabase SQL Editor, run this to create the annotations table:

```sql
-- Create annotations table
create table annotations (
  id uuid default gen_random_uuid() primary key,
  section_id text not null,
  exec_name text not null,
  reaction_type text check (reaction_type in ('agree', 'question', 'concern', 'idea')),
  comment_text text,
  highlighted_text text,
  created_at timestamp with time zone default now()
);

-- Create general_feedback table
create table general_feedback (
  id uuid default gen_random_uuid() primary key,
  exec_name text not null unique,
  feedback jsonb not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create decision_inputs table
create table decision_inputs (
  id uuid default gen_random_uuid() primary key,
  exec_name text not null unique,
  decisions jsonb not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create team_assignments table
create table team_assignments (
  id uuid default gen_random_uuid() primary key,
  exec_name text not null unique,
  assignments jsonb not null default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (optional but recommended)
alter table annotations enable row level security;
alter table general_feedback enable row level security;
alter table decision_inputs enable row level security;
alter table team_assignments enable row level security;

-- Allow all operations for now (you can tighten this later)
create policy "Allow all" on annotations for all using (true);
create policy "Allow all" on general_feedback for all using (true);
create policy "Allow all" on decision_inputs for all using (true);
create policy "Allow all" on team_assignments for all using (true);

-- Enable real-time
alter publication supabase_realtime add table annotations;
alter publication supabase_realtime add table general_feedback;
alter publication supabase_realtime add table decision_inputs;
alter publication supabase_realtime add table team_assignments;
```

4. Update `js/config.js` with your Supabase credentials:
```javascript
SUPABASE_URL: 'https://your-project.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-key',
```

### 2. Deploy to Netlify

1. Push this folder to a GitHub repo
2. Go to [netlify.com](https://netlify.com) and create a new site
3. Connect to your GitHub repo
4. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `.` or `/`
5. Deploy!

Or use Netlify CLI:
```bash
npx netlify-cli deploy --prod
```

## Features

### For Executives (index.html)
- 12 sections covering offsite topics:
  1. Current State & Urgency
  2. Sprint Review
  3. Competitive Landscape
  4. Go-Forward Strategy
  5. Operating Structure (Pods)
  6. Team Size & Capacity
  7. D2C Revenue Plan
  8. Enterprise Strategy
  9. Board Messaging
  10. General Feedback
  11. **Decision Tracker** - Vote on 6 key decisions with rationale
  12. **Team Roster** - Assign team members to pods
- Reaction buttons (Agree, Question, Concern, Idea)
- Freeform comments per section
- Progress tracking
- Real-time sync of others' annotations

### For Admin (admin.html)
- Overview stats (total comments, by reaction type)
- Executive participation breakdown
- **General Feedback Summary** - View feedback from all execs
- **Decision Summary** - See how execs voted on each decision + their rationale
- **Team Roster Summary** - See aggregated pod assignments
- Filter by section or reaction type
- **AI-Powered Summary** - Claude analyzes all feedback and provides:
  - Executive Summary Narrative
  - Feedback by Executive
  - Feedback by Section
  - Strategic Synthesis

## Files

```
signos-offsite-preread/
├── index.html          # Main pre-read page
├── admin.html          # Admin dashboard
├── css/
│   └── styles.css      # All styling
├── js/
│   ├── config.js       # Configuration (API keys)
│   ├── supabase-client.js  # Database client
│   ├── annotations.js  # Annotation handling
│   └── app.js          # Main app logic
└── README.md           # This file
```

## Without Supabase

The tool works with localStorage as a fallback. Each exec's annotations will be stored locally in their browser. To aggregate:

1. Have each exec export their annotations (add this feature or manually copy from localStorage)
2. Collect all exports
3. Use the admin dashboard to view combined data

For the offsite, Supabase is recommended for real-time sync across all execs.

## Claude API

The AI summary feature uses Claude API. For security, the key is stored in your browser's localStorage (not in the code):

1. Go to the admin dashboard (`/admin.html`)
2. Click "Generate AI Summary"
3. Enter your Claude API key when prompted (first time only)
4. The key is saved in localStorage for future use

To change the API key, clear your browser's localStorage or use browser developer tools.

## Support

Questions? Contact the engineering team or check the Sprint Hub for related documentation.
