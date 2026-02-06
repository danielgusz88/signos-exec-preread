// Main Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize navigation
    initNavigation();
    
    // Check for existing exec session
    const savedExec = localStorage.getItem('current_exec');
    if (savedExec && isValidExec(savedExec)) {
        document.getElementById('currentExecName').textContent = savedExec;
        document.getElementById('execModal').classList.add('hidden');
        window.annotationManager.currentExec = savedExec;
    }
    
    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Setup change exec button (logout)
    document.getElementById('changeExec').addEventListener('click', () => {
        // Clear session and show login
        localStorage.removeItem('current_exec');
        document.getElementById('execModal').classList.remove('hidden');
        document.getElementById('loginError').textContent = '';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    });
    
    // Initialize annotation manager
    setTimeout(() => {
        window.annotationManager.init();
        window.annotationManager.updateProgress();
        window.annotationManager.updateNavigation();
    }, 500); // Wait for Supabase to connect
    
    // Setup submit button
    document.getElementById('submitAllBtn')?.addEventListener('click', () => {
        window.annotationManager.showToast('All sections reviewed! You\'re ready for the offsite.');
    });
    
    // Smooth scroll to sections on nav click
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            const section = document.getElementById(`section-${sectionId}`);
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Update active state
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
    
    // Track scroll position for active section
    setupScrollTracking();
});

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.toLowerCase().trim();
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('loginError');
    
    // Find matching executive
    const exec = CONFIG.EXECUTIVES.find(e => 
        e.username === username && e.password === password
    );
    
    if (exec) {
        // Login successful
        errorEl.textContent = '';
        window.annotationManager.setCurrentExec(exec.name);
    } else {
        // Login failed
        errorEl.textContent = 'Invalid username or password. Try your first name (lowercase) and "signos".';
    }
}

// Validate exec is still in the list
function isValidExec(name) {
    return CONFIG.EXECUTIVES.some(e => e.name === name);
}

// Initialize navigation sidebar
function initNavigation() {
    const navItems = document.getElementById('navItems');
    
    CONFIG.SECTIONS.forEach(section => {
        const item = document.createElement('div');
        item.className = 'nav-item';
        item.dataset.section = section.id;
        item.innerHTML = `
            <span class="nav-num">${section.id}</span>
            <span class="nav-text">${section.short}</span>
        `;
        navItems.appendChild(item);
    });
}

// Track scroll position to highlight current section
function setupScrollTracking() {
    const sections = document.querySelectorAll('.content-section');
    const navItems = document.querySelectorAll('.nav-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.dataset.section;
                
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.dataset.section === sectionId) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }, {
        rootMargin: '-20% 0px -70% 0px'
    });
    
    sections.forEach(section => observer.observe(section));
}
