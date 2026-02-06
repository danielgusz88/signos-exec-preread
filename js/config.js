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
    
    // Current Signos Team Roster (as of Feb 6, 2026)
    // defaultPod: growth, acquisition, retention, platform, infrastructure, enterprise, ops, offboard
    TEAM_ROSTER: [
        // Executive Leadership
        { name: 'Sharam Fouladgar-Mercer', currentRole: 'CEO', department: 'Leadership', defaultPod: 'ops' },
        { name: 'Dan Gusz', currentRole: 'Chief of Staff', department: 'Leadership', defaultPod: 'ops' },
        { name: 'Lindsay Peterson', currentRole: 'VP of Finance & Operations', department: 'Leadership', defaultPod: 'ops' },
        { name: 'Colin Rogers', currentRole: 'VP of Healthcare', department: 'Leadership', defaultPod: 'enterprise' },
        { name: 'Roger Neel', currentRole: 'Chief Technology Officer', department: 'Leadership', defaultPod: 'growth' },
        { name: 'Emma Allison', currentRole: 'VP of Product', department: 'Leadership', defaultPod: 'retention' },
        
        // Engineering - Management
        { name: 'Pierre Wehbe', currentRole: 'Chief Architect Officer', department: 'Engineering', defaultPod: 'infrastructure' },
        { name: 'Dmitri Levonian', currentRole: 'Head of Machine Learning', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Jacob Smith', currentRole: 'Engineering Manager', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Prashanth Nambiar', currentRole: 'Engineering Manager', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Valerie Lord', currentRole: 'Quality Engineering Manager', department: 'Engineering', defaultPod: 'platform' },
        
        // Engineering - Individual Contributors
        { name: 'Artur Ergashev', currentRole: 'Principal Software Engineer', department: 'Engineering', defaultPod: 'infrastructure' },
        { name: 'Tomas Jonasson', currentRole: 'Principal Software Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Andrew Bloom', currentRole: 'Senior Android Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Christopher Liotta', currentRole: 'Senior Software Engineer', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Ethan Ransom', currentRole: 'Senior Software Engineer', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Melissa Hanson', currentRole: 'Senior Software Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Noah Kellem', currentRole: 'Senior Software Engineer', department: 'Engineering', defaultPod: 'platform' },
        { name: 'Jossi Cruz', currentRole: 'Software Engineer', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Rebecca Anderson', currentRole: 'Software Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Tyler Grant', currentRole: 'Software Engineer', department: 'Engineering', defaultPod: 'platform' },
        { name: 'Maggie Falkenberg', currentRole: 'Quality Engineering Analyst', department: 'Engineering', defaultPod: 'platform' },
        { name: 'Julien (Contractor)', currentRole: 'Full Stack Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Antonio (Contractor)', currentRole: 'iOS Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        { name: 'Leo (Contractor)', currentRole: 'iOS Engineer', department: 'Engineering', defaultPod: 'retention' },
        { name: 'Agustin (Contractor)', currentRole: 'Android Engineer', department: 'Engineering', defaultPod: 'acquisition' },
        
        // Product
        { name: 'Brent Williams', currentRole: 'Principal Product Manager', department: 'Product', defaultPod: 'acquisition' },
        { name: 'Claudia Wasch', currentRole: 'Principal PM, Machine Learning', department: 'Product', defaultPod: 'retention' },
        { name: 'Jeff Steele', currentRole: 'Product Analyst', department: 'Product', defaultPod: 'growth' },
        { name: 'David Forsythe', currentRole: 'Principal Product Content Designer', department: 'Product', defaultPod: 'acquisition' },
        { name: 'Pawel Kozinski', currentRole: 'Principal B2B', department: 'Product', defaultPod: 'enterprise' },
        
        // Design
        { name: 'Benji Michalek', currentRole: 'VP of Design', department: 'Design', defaultPod: 'acquisition' },
        { name: 'Lizzie Peterson', currentRole: 'Product Design Lead', department: 'Design', defaultPod: 'retention' },
        { name: 'Nicole Ulgado', currentRole: 'Lead Product Designer', department: 'Design', defaultPod: 'acquisition' },
        { name: 'Nadin Radwan', currentRole: 'Art Director', department: 'Design', defaultPod: 'acquisition' },
        { name: 'Marquel Coaxum', currentRole: 'Videographer/Multimedia Producer', department: 'Design', defaultPod: 'acquisition' },
        { name: 'Laz (Contractor)', currentRole: 'Designer', department: 'Design', defaultPod: 'acquisition' },
        
        // Marketing
        { name: 'Tiffani Davidson', currentRole: 'VP Marketing', department: 'Marketing', defaultPod: 'acquisition' },
        { name: 'Serina Stow', currentRole: 'Director of Growth', department: 'Marketing', defaultPod: 'growth' },
        { name: 'Brittany Barry', currentRole: 'Senior Content Manager', department: 'Marketing', defaultPod: 'acquisition' },
        { name: 'Alyssa Fackler', currentRole: 'Social Media Manager', department: 'Marketing', defaultPod: 'acquisition' },
        { name: 'Gwyneth Ramsey', currentRole: 'Lifecycle Marketing Manager', department: 'Marketing', defaultPod: 'retention' },
        { name: 'Bill Tancer', currentRole: 'Chief Data Scientist', department: 'Marketing', defaultPod: 'growth' },
        
        // Enterprise Sales
        { name: 'David Lucarelli', currentRole: 'Director of Enterprise Sales', department: 'Enterprise', defaultPod: 'enterprise' },
        { name: 'Richard Yax', currentRole: 'Director of Enterprise Sales', department: 'Enterprise', defaultPod: 'enterprise' },
        { name: 'Keriann Granato', currentRole: 'Enterprise Account Manager', department: 'Enterprise', defaultPod: 'enterprise' },
        { name: 'Carli Grant', currentRole: 'Sales Operations Manager', department: 'Enterprise', defaultPod: 'enterprise' },
        
        // Operations & G&A
        { name: 'Karen Morris', currentRole: 'Head of Talent', department: 'Operations', defaultPod: 'ops' },
        { name: 'Samantha Willden', currentRole: 'Sr. Manager, People Ops', department: 'Operations', defaultPod: 'ops' },
        { name: 'Zhang Bin Wu', currentRole: 'Sr. Manager Supply Chain', department: 'Operations', defaultPod: 'ops' },
        { name: 'Trevor Denbo', currentRole: 'Head of QA and Reg Affairs', department: 'Operations', defaultPod: 'ops' },
        
        // Customer Success
        { name: 'Gwen Pflumm', currentRole: 'Sr. Manager, Client Success', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Hannah Gadient', currentRole: 'Customer Success Agent', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Bettina Morando', currentRole: 'Customer Success Agent', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Laura Decher', currentRole: 'Customer Success Agent', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Zachary Derade', currentRole: 'Customer Success Agent', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Ian (Contractor)', currentRole: 'Customer Service', department: 'Customer Success', defaultPod: 'retention' },
        { name: 'Juliyanna (Contractor)', currentRole: 'Customer Service', department: 'Customer Success', defaultPod: 'retention' },
        
        // Clinical
        { name: 'Grace Shryack', currentRole: 'Clinical Lead', department: 'Clinical', defaultPod: 'retention' },
        { name: 'Sarah Steele', currentRole: 'Metabolic Wellness Program Manager', department: 'Clinical', defaultPod: 'retention' }
    ]
};

// Export for use in other files
window.CONFIG = CONFIG;
