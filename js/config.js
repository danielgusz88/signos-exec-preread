// Configuration
// API keys should be set in Netlify Environment Variables or entered at runtime
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://zocaivksrrculidpjmmy.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY2FpdmtzcnJjdWxpZHBqbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDYzOTAsImV4cCI6MjA4NDA4MjM5MH0.TSHU3oQwK8vYR0WkXazW-0LdGVHydGW9XCpXrvoAJA8',
    
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
        { id: '7', title: 'D2C Revenue Plan', short: 'D2C Revenue' },
        { id: '8', title: 'Enterprise Strategy', short: 'Enterprise' },
        { id: '9', title: 'Board Messaging', short: 'Board' },
        { id: '10', title: 'General Feedback', short: 'Feedback' }
    ],
    
    // Executives list with credentials (username: firstname lowercase, password: signos)
    EXECUTIVES: [
        { name: 'Sharam', username: 'sharam', password: 'signos' },
        { name: 'Roger', username: 'roger', password: 'signos' },
        { name: 'Lindsay', username: 'lindsay', password: 'signos' },
        { name: 'Emma', username: 'emma', password: 'signos' },
        { name: 'Colin', username: 'colin', password: 'signos' },
        { name: 'Dan', username: 'dan', password: 'signos' }
    ],
    
    // Helper to get exec names for display
    EXEC_NAMES: ['Sharam', 'Roger', 'Lindsay', 'Emma', 'Colin', 'Dan'],
    
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
