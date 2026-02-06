// Configuration
// API keys should be set in Netlify Environment Variables or entered at runtime
const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://zocaivksrrculidpjmmy.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvY2FpdmtzcnJjdWxpZHBqbW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1MDYzOTAsImV4cCI6MjA4NDA4MjM5MH0.TSHU3oQwK8vYR0WkXazW-0LdGVHydGW9XCpXrvoAJA8',
    
    // Claude API Configuration (stored in browser localStorage for security)
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
        { id: '10', title: 'General Feedback', short: 'Feedback' },
        { id: '11', title: 'Decisions', short: 'Decisions' },
        { id: '12', title: 'Team Roster', short: 'Roster' }
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
    },
    
    // Pod options for team assignments
    PODS: [
        { id: 'growth', name: 'Growth Pod', description: 'Funnel analytics & prioritization' },
        { id: 'acquisition', name: 'Acquisition Pod', description: 'New user acquisition & GLP-1' },
        { id: 'retention', name: 'Retention Pod', description: 'User journey & engagement' },
        { id: 'platform', name: 'Platform Pod', description: 'Core product & infrastructure' },
        { id: 'infrastructure', name: 'Infrastructure Pod', description: 'DevOps & technical foundation' },
        { id: 'enterprise', name: 'Enterprise Pod', description: 'B2B sales & partnerships' },
        { id: 'ops', name: 'Ops / G&A', description: 'Operations & general admin' },
        { id: 'offboard', name: 'Offboard / TBD', description: 'Role under review' }
    ],
    
    // Current Signos Team Roster
    // NOTE: Update this list with actual team members
    TEAM_ROSTER: [
        // Leadership
        { name: 'Sharam Fouladgar-Mercer', currentRole: 'CEO', department: 'Leadership' },
        { name: 'Roger Neel', currentRole: 'CTO/CMO', department: 'Leadership' },
        { name: 'Lindsay Peterson', currentRole: 'VP Finance', department: 'Leadership' },
        { name: 'Emma Allison', currentRole: 'VP Product', department: 'Leadership' },
        { name: 'Colin Rogers', currentRole: 'VP Healthcare Sales', department: 'Leadership' },
        
        // Engineering
        { name: 'Engineer 1', currentRole: 'Senior Engineer', department: 'Engineering' },
        { name: 'Engineer 2', currentRole: 'Senior Engineer', department: 'Engineering' },
        { name: 'Engineer 3', currentRole: 'Engineer', department: 'Engineering' },
        { name: 'Engineer 4', currentRole: 'Engineer', department: 'Engineering' },
        { name: 'Engineer 5', currentRole: 'Engineer', department: 'Engineering' },
        { name: 'Engineer 6', currentRole: 'Engineer', department: 'Engineering' },
        { name: 'Engineer 7', currentRole: 'Junior Engineer', department: 'Engineering' },
        
        // Product & Design
        { name: 'Product Manager 1', currentRole: 'Product Manager', department: 'Product' },
        { name: 'Designer 1', currentRole: 'Product Designer', department: 'Design' },
        { name: 'Designer 2', currentRole: 'UX Designer', department: 'Design' },
        
        // Marketing
        { name: 'Marketing 1', currentRole: 'Marketing Lead', department: 'Marketing' },
        { name: 'Marketing 2', currentRole: 'Growth Marketing', department: 'Marketing' },
        { name: 'Marketing 3', currentRole: 'Content', department: 'Marketing' },
        
        // Enterprise Sales
        { name: 'Dave (Enterprise)', currentRole: 'Enterprise Sales', department: 'Enterprise' },
        { name: 'Richard (Enterprise)', currentRole: 'Enterprise Sales', department: 'Enterprise' },
        { name: 'Keriann (Enterprise)', currentRole: 'Enterprise', department: 'Enterprise' },
        { name: 'Carli (Enterprise)', currentRole: 'Enterprise', department: 'Enterprise' },
        
        // Operations
        { name: 'Ops 1', currentRole: 'Operations', department: 'Ops' },
        { name: 'Ops 2', currentRole: 'Customer Success', department: 'Ops' },
        { name: 'Ops 3', currentRole: 'Support', department: 'Ops' },
        
        // Clinical/Health
        { name: 'Clinical 1', currentRole: 'Clinical Lead', department: 'Clinical' },
        { name: 'Clinical 2', currentRole: 'Dietitian', department: 'Clinical' },
        
        // Contractors/Consultants
        { name: 'Dan Gusz', currentRole: 'Advisor', department: 'Advisor' },
        { name: 'Consultant 1', currentRole: 'Consultant', department: 'Advisor' },
        { name: 'Consultant 2', currentRole: 'Consultant', department: 'Advisor' }
    ]
};

// Export for use in other files
window.CONFIG = CONFIG;
