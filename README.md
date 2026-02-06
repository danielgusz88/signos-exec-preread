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

-- Enable Row Level Security (optional but recommended)
alter table annotations enable row level security;

-- Allow all operations for now (you can tighten this later)
create policy "Allow all" on annotations for all using (true);

-- Enable real-time
alter publication supabase_realtime add table annotations;
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
- 8 sections covering offsite topics
- Reaction buttons (Agree, Question, Concern, Idea)
- Freeform comments per section
- Progress tracking
- Real-time sync of others' annotations

### For Admin (admin.html)
- Overview stats (total comments, by reaction type)
- Executive participation breakdown
- Filter by section or reaction type
- **AI-Powered Summary** - Claude analyzes all feedback and provides:
  - Key themes
  - Areas of consensus
  - Areas of friction
  - Recommended discussion topics
  - Board meeting considerations

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

The AI summary feature uses Claude API. The key is already configured. If you need to change it, update `js/config.js`:

```javascript
CLAUDE_API_KEY: 'your-claude-api-key',
```

## Support

Questions? Contact the engineering team or check the Sprint Hub for related documentation.
