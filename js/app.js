// Main Application
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize navigation
    initNavigation();
    
    // Check for existing exec
    const savedExec = localStorage.getItem('current_exec');
    if (savedExec) {
        document.getElementById('currentExecName').textContent = savedExec;
        document.getElementById('execModal').classList.add('hidden');
        window.annotationManager.currentExec = savedExec;
    }
    
    // Setup exec selector buttons
    document.querySelectorAll('.exec-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.exec;
            window.annotationManager.setCurrentExec(name);
        });
    });
    
    // Setup change exec button
    document.getElementById('changeExec').addEventListener('click', () => {
        document.getElementById('execModal').classList.remove('hidden');
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
