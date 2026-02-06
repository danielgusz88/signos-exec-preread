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
        
        // Load general feedback for this exec
        setTimeout(() => loadGeneralFeedback(savedExec), 1000);
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
    
    // Setup general feedback save button
    document.getElementById('saveGeneralFeedback')?.addEventListener('click', saveGeneralFeedback);
    
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
        
        // Load their general feedback after a short delay
        setTimeout(() => loadGeneralFeedback(exec.name), 1000);
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

// Save general feedback to Supabase
async function saveGeneralFeedback() {
    const exec = window.annotationManager?.currentExec;
    if (!exec) {
        window.annotationManager?.showToast('Please select an executive first');
        return;
    }
    
    const statusEl = document.getElementById('generalFeedbackStatus');
    const saveBtn = document.getElementById('saveGeneralFeedback');
    
    // Gather all feedback fields
    const feedbackData = {
        priorities: document.getElementById('general-priorities')?.value || '',
        risks: document.getElementById('general-risks')?.value || '',
        ideas: document.getElementById('general-ideas')?.value || '',
        questions: document.getElementById('general-questions')?.value || '',
        other: document.getElementById('general-other')?.value || ''
    };
    
    // Check if there's any content
    const hasContent = Object.values(feedbackData).some(v => v.trim());
    if (!hasContent) {
        window.annotationManager?.showToast('Please add some feedback before saving');
        return;
    }
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-secondary)';
    
    try {
        // Check if feedback already exists for this exec
        const { data: existing, error: fetchError } = await window.supabase
            .from('general_feedback')
            .select('id')
            .eq('exec_name', exec)
            .single();
        
        if (existing) {
            // Update existing
            const { error } = await window.supabase
                .from('general_feedback')
                .update({
                    feedback: feedbackData,
                    updated_at: new Date().toISOString()
                })
                .eq('exec_name', exec);
            
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await window.supabase
                .from('general_feedback')
                .insert({
                    exec_name: exec,
                    feedback: feedbackData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
        }
        
        statusEl.textContent = '✓ Saved!';
        statusEl.style.color = 'var(--accent-success)';
        window.annotationManager?.showToast('General feedback saved successfully!');
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error saving general feedback:', error);
        statusEl.textContent = '✗ Error saving';
        statusEl.style.color = 'var(--accent-danger)';
        window.annotationManager?.showToast('Error saving feedback. Please try again.');
    } finally {
        saveBtn.disabled = false;
    }
}

// Load general feedback from Supabase
async function loadGeneralFeedback(execName) {
    if (!execName || !window.supabase) return;
    
    try {
        const { data, error } = await window.supabase
            .from('general_feedback')
            .select('feedback')
            .eq('exec_name', execName)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error loading general feedback:', error);
            return;
        }
        
        if (data && data.feedback) {
            const fb = data.feedback;
            
            if (fb.priorities) document.getElementById('general-priorities').value = fb.priorities;
            if (fb.risks) document.getElementById('general-risks').value = fb.risks;
            if (fb.ideas) document.getElementById('general-ideas').value = fb.ideas;
            if (fb.questions) document.getElementById('general-questions').value = fb.questions;
            if (fb.other) document.getElementById('general-other').value = fb.other;
            
            console.log('Loaded general feedback for', execName);
        }
    } catch (error) {
        console.error('Error loading general feedback:', error);
    }
}
