// Configuration
// API keys should be set in Netlify Environment Variables or entered at runtime
const CONFIG = {
    // Supabase Configuration
    // Set in Netlify: SUPABASE_URL and SUPABASE_ANON_KEY
    SUPABASE_URL: 'YOUR_SUPABASE_URL', // e.g., 'https://xxxx.supabase.co'
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    
    // Claude API Configuration
    // Will be entered via prompt in admin dashboard for security
    CLAUDE_API_KEY: null,
    
    // Section definitions
    SECTIONS: [
        { id: '1', title: 'Current State & Urgency', short: 'Urgency' },
        { id: '2', title: 'Sprint Review', short: 'Sprints' },
        { id: '3', title: 'Competitive Landscape', short: 'Competition' },
        { id: '4', title: 'Go-Forward Strategy', short: 'Strategy' },
        { id: '5', title: 'Operating Structure', short: 'Pods' },
        { id: '6', title: 'Team Size & Capacity', short: 'Team' },
        { id: '7', title: 'Revenue Plan', short: 'Revenue' },
        { id: '8', title: 'Board Messaging', short: 'Board' }
    ],
    
    // Executives list
    EXECUTIVES: [
        'Sharam',
        'Roger',
        'Lindsay',
        'Emma',
        'Colin',
        'Kate'
    ],
    
    // Reaction types
    REACTIONS: {
        agree: { emoji: '✅', label: 'Agree', color: '#34d399' },
        question: { emoji: '❓', label: 'Question', color: '#60a5fa' },
        concern: { emoji: '⚠️', label: 'Concern', color: '#fbbf24' },
        idea: { emoji: '💡', label: 'Idea', color: '#a78bfa' }
    }
};

// Export for use in other files
window.CONFIG = CONFIG;
