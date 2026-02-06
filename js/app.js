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
    
    // Setup sprint feedback save button
    document.getElementById('saveSprintFeedback')?.addEventListener('click', saveSprintFeedback);
    
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
    
    // Also load decision inputs and sprint feedback
    loadDecisionInputs(execName);
    loadSprintFeedback(execName);
}

// Save sprint feedback to Supabase
async function saveSprintFeedback() {
    const execName = window.annotationManager?.currentExec || localStorage.getItem('current_exec');
    if (!execName) {
        alert('Please log in first');
        return;
    }
    
    const saveBtn = document.getElementById('saveSprintFeedback');
    const statusEl = document.getElementById('sprintFeedbackStatus');
    
    if (!saveBtn) return;
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';
    
    // Gather sprint feedback
    const feedback = {
        speed: document.querySelector('.feedback-textarea[data-field="speed"]')?.value || '',
        output: document.querySelector('.feedback-textarea[data-field="output"]')?.value || '',
        structure: document.querySelector('.feedback-textarea[data-field="structure"]')?.value || '',
        performance: document.querySelector('.feedback-textarea[data-field="performance"]')?.value || '',
        recommendations: document.querySelector('.feedback-textarea[data-field="recommendations"]')?.value || ''
    };
    
    try {
        const { data: existing } = await window.supabase
            .from('sprint_feedback')
            .select('id')
            .eq('exec_name', execName)
            .single();
        
        if (existing) {
            const { error } = await window.supabase
                .from('sprint_feedback')
                .update({ 
                    feedback: feedback,
                    updated_at: new Date().toISOString()
                })
                .eq('exec_name', execName);
            if (error) throw error;
        } else {
            const { error } = await window.supabase
                .from('sprint_feedback')
                .insert({ 
                    exec_name: execName, 
                    feedback: feedback,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        }
        
        statusEl.textContent = '✓ Saved!';
        statusEl.style.color = 'var(--accent-success)';
        window.annotationManager?.showToast('Sprint feedback saved successfully!');
        
        setTimeout(() => { statusEl.textContent = ''; }, 3000);
        
    } catch (error) {
        console.error('Error saving sprint feedback:', error);
        statusEl.textContent = '✗ Error saving';
        statusEl.style.color = 'var(--accent-danger)';
    } finally {
        saveBtn.disabled = false;
    }
}

// Load sprint feedback from Supabase
async function loadSprintFeedback(execName) {
    if (!execName || !window.supabase) return;
    
    try {
        const { data, error } = await window.supabase
            .from('sprint_feedback')
            .select('feedback')
            .eq('exec_name', execName)
            .single();
        
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
            console.error('Error loading sprint feedback:', error);
            return;
        }
        
        if (data && data.feedback) {
            const fb = data.feedback;
            const speedEl = document.querySelector('.feedback-textarea[data-field="speed"]');
            const outputEl = document.querySelector('.feedback-textarea[data-field="output"]');
            const structureEl = document.querySelector('.feedback-textarea[data-field="structure"]');
            const performanceEl = document.querySelector('.feedback-textarea[data-field="performance"]');
            const recommendationsEl = document.querySelector('.feedback-textarea[data-field="recommendations"]');
            
            if (speedEl && fb.speed) speedEl.value = fb.speed;
            if (outputEl && fb.output) outputEl.value = fb.output;
            if (structureEl && fb.structure) structureEl.value = fb.structure;
            if (performanceEl && fb.performance) performanceEl.value = fb.performance;
            if (recommendationsEl && fb.recommendations) recommendationsEl.value = fb.recommendations;
            
            console.log('Loaded sprint feedback for', execName);
        }
    } catch (error) {
        console.error('Error loading sprint feedback:', error);
    }
}

// Save decision inputs to Supabase
async function saveDecisionInputs() {
    const execName = window.annotationManager?.currentExec || localStorage.getItem('current_exec');
    if (!execName) {
        alert('Please log in first');
        return;
    }
    
    const saveBtn = document.getElementById('saveDecisionInputs');
    const statusEl = document.getElementById('decisionSaveStatus');
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';
    
    // Gather all decision inputs
    const decisions = {};
    const decisionIds = ['growth-pod', 'team-allocation', 'glp1-launch', 'enterprise-allocation', 'attach-rate', 'board-ask', 'headcount-changes'];
    
    decisionIds.forEach(decisionId => {
        const selectedOption = document.querySelector(`input[name="decision-${decisionId}"]:checked`);
        const inputText = document.getElementById(`input-${decisionId}`)?.value || '';
        const finalText = document.getElementById(`final-${decisionId}`)?.value || '';
        
        decisions[decisionId] = {
            option: selectedOption ? selectedOption.value : null,
            input: inputText,
            final: finalText
        };
    });
    
    try {
        // Check if entry exists for this exec
        const { data: existing } = await window.supabase
            .from('decision_inputs')
            .select('id')
            .eq('exec_name', execName)
            .single();
        
        if (existing) {
            // Update existing
            const { error } = await window.supabase
                .from('decision_inputs')
                .update({ 
                    decisions: decisions,
                    updated_at: new Date().toISOString()
                })
                .eq('exec_name', execName);
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await window.supabase
                .from('decision_inputs')
                .insert({ 
                    exec_name: execName, 
                    decisions: decisions,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        }
        
        statusEl.textContent = '✓ Saved!';
        statusEl.style.color = 'var(--accent-success)';
        window.annotationManager?.showToast('Decision inputs saved successfully!');
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error saving decision inputs:', error);
        statusEl.textContent = '✗ Error saving';
        statusEl.style.color = 'var(--accent-danger)';
        window.annotationManager?.showToast('Error saving decision inputs. Please try again.');
    } finally {
        saveBtn.disabled = false;
    }
}

// Load decision inputs from Supabase
async function loadDecisionInputs(execName) {
    if (!execName || !window.supabase) return;
    
    try {
        const { data, error } = await window.supabase
            .from('decision_inputs')
            .select('decisions')
            .eq('exec_name', execName)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Error loading decision inputs:', error);
            return;
        }
        
        if (data && data.decisions) {
            const decisions = data.decisions;
            
            Object.keys(decisions).forEach(decisionId => {
                const decision = decisions[decisionId];
                
                // Set the selected option
                if (decision.option) {
                    const radio = document.querySelector(`input[name="decision-${decisionId}"][value="${decision.option}"]`);
                    if (radio) radio.checked = true;
                }
                
                // Set the input text
                if (decision.input) {
                    const textarea = document.getElementById(`input-${decisionId}`);
                    if (textarea) textarea.value = decision.input;
                }
                
                // Set the final decision text
                if (decision.final) {
                    const finalTextarea = document.getElementById(`final-${decisionId}`);
                    if (finalTextarea) finalTextarea.value = decision.final;
                }
            });
            
            console.log('Loaded decision inputs for', execName);
        }
    } catch (error) {
        console.error('Error loading decision inputs:', error);
    }
}

// Initialize decision input save button
document.getElementById('saveDecisionInputs')?.addEventListener('click', saveDecisionInputs);

// Initialize team roster
function initTeamRoster() {
    const container = document.getElementById('teamRosterContainer');
    if (!container || !CONFIG.TEAM_ROSTER) return;
    
    // Group by department
    const departments = {};
    CONFIG.TEAM_ROSTER.forEach(member => {
        if (!departments[member.department]) {
            departments[member.department] = [];
        }
        departments[member.department].push(member);
    });
    
    // Department order
    const deptOrder = ['Leadership', 'Engineering', 'Product', 'Design', 'Marketing', 'Enterprise', 'Operations', 'Customer Success', 'Clinical'];
    
    // Pod options
    const podOptions = CONFIG.PODS.map(pod => 
        `<option value="${pod.id}">${pod.name}</option>`
    ).join('');
    
    let html = '';
    
    deptOrder.forEach(dept => {
        if (!departments[dept]) return;
        
        const deptIcons = {
            'Leadership': '👑',
            'Engineering': '💻',
            'Product': '📱',
            'Design': '🎨',
            'Marketing': '📣',
            'Enterprise': '🏢',
            'Operations': '⚙️',
            'Customer Success': '💬',
            'Clinical': '🏥',
            'Contractor': '📋'
        };
        
        html += `<div class="department-header">${deptIcons[dept] || '👤'} ${dept}</div>`;
        
        departments[dept].forEach(member => {
            const memberId = member.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const defaultPod = member.defaultPod || '';
            html += `
                <div class="team-member-row" data-member="${member.name}">
                    <div class="team-member-info">
                        <div class="team-member-name">${member.name}</div>
                        <div class="team-member-role">${member.currentRole}</div>
                    </div>
                    <div class="team-member-dept">${member.department}</div>
                    <select class="pod-select" id="pod-${memberId}" data-default="${defaultPod}">
                        <option value="">-- Select Pod --</option>
                        ${CONFIG.PODS.map(pod => 
                            `<option value="${pod.id}" ${pod.id === defaultPod ? 'selected' : ''}>${pod.name}</option>`
                        ).join('')}
                    </select>
                    <input type="text" class="team-member-notes" id="notes-${memberId}" placeholder="Notes (optional)">
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
    
    // Add change listeners to all pod selects for live count updates
    container.querySelectorAll('.pod-select').forEach(select => {
        select.addEventListener('change', updatePodCounts);
    });
    
    // Initial count update
    updatePodCounts();
    
    // Load existing assignments
    const execName = window.annotationManager?.currentExec || localStorage.getItem('current_exec');
    if (execName) {
        loadTeamAssignments(execName);
    }
}

// Update pod counts based on current selections
function updatePodCounts() {
    const counts = {
        'Leadership': 0,
        'Growth': 0,
        'Acquisition': 0,
        'Retention': 0,
        'Platform': 0,
        'Infrastructure': 0,
        'Enterprise': 0,
        'Ops/G&A': 0,
        'Offboard/TBD': 0
    };
    
    // Count all pod selections
    document.querySelectorAll('.pod-select').forEach(select => {
        const value = select.value;
        if (value && counts.hasOwnProperty(value)) {
            counts[value]++;
        }
    });
    
    // Update the display
    Object.keys(counts).forEach(pod => {
        const countEl = document.getElementById(`count-${pod}`);
        if (countEl) {
            const oldValue = parseInt(countEl.textContent) || 0;
            const newValue = counts[pod];
            countEl.textContent = newValue;
            
            // Animate if changed
            if (oldValue !== newValue) {
                countEl.style.transform = 'scale(1.2)';
                countEl.style.transition = 'transform 0.2s ease';
                setTimeout(() => {
                    countEl.style.transform = 'scale(1)';
                }, 200);
            }
        }
    });
    
    // Calculate totals
    const totalActive = counts['Leadership'] + counts['Growth'] + counts['Acquisition'] + 
                       counts['Retention'] + counts['Platform'] + counts['Infrastructure'] + 
                       counts['Enterprise'] + counts['Ops/G&A'];
    const totalOffboard = counts['Offboard/TBD'];
    
    // Update totals
    const activeEl = document.getElementById('totalActiveCount');
    const offboardEl = document.getElementById('totalOffboardCount');
    
    if (activeEl) activeEl.textContent = totalActive;
    if (offboardEl) offboardEl.textContent = totalOffboard;
}

// Save team assignments to Supabase
async function saveTeamAssignments() {
    const execName = window.annotationManager?.currentExec || localStorage.getItem('current_exec');
    if (!execName) {
        alert('Please log in first');
        return;
    }
    
    const saveBtn = document.getElementById('saveTeamAssignments');
    const statusEl = document.getElementById('teamAssignmentStatus');
    
    saveBtn.disabled = true;
    statusEl.textContent = 'Saving...';
    statusEl.style.color = 'var(--text-muted)';
    
    // Gather all assignments
    const assignments = {};
    
    CONFIG.TEAM_ROSTER.forEach(member => {
        const memberId = member.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const podSelect = document.getElementById(`pod-${memberId}`);
        const notesInput = document.getElementById(`notes-${memberId}`);
        
        if (podSelect && podSelect.value) {
            assignments[member.name] = {
                pod: podSelect.value,
                notes: notesInput?.value || ''
            };
        }
    });
    
    try {
        // Check if entry exists for this exec
        const { data: existing } = await window.supabase
            .from('team_assignments')
            .select('id')
            .eq('exec_name', execName)
            .single();
        
        if (existing) {
            // Update existing
            const { error } = await window.supabase
                .from('team_assignments')
                .update({ 
                    assignments: assignments,
                    updated_at: new Date().toISOString()
                })
                .eq('exec_name', execName);
            if (error) throw error;
        } else {
            // Insert new
            const { error } = await window.supabase
                .from('team_assignments')
                .insert({ 
                    exec_name: execName, 
                    assignments: assignments,
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        }
        
        statusEl.textContent = '✓ Saved!';
        statusEl.style.color = 'var(--accent-success)';
        window.annotationManager?.showToast('Team assignments saved successfully!');
        
        setTimeout(() => {
            statusEl.textContent = '';
        }, 3000);
        
    } catch (error) {
        console.error('Error saving team assignments:', error);
        statusEl.textContent = '✗ Error saving';
        statusEl.style.color = 'var(--accent-danger)';
        window.annotationManager?.showToast('Error saving assignments. Please try again.');
    } finally {
        saveBtn.disabled = false;
    }
}

// Load team assignments from Supabase
async function loadTeamAssignments(execName) {
    if (!execName || !window.supabase) return;
    
    try {
        const { data, error } = await window.supabase
            .from('team_assignments')
            .select('assignments')
            .eq('exec_name', execName)
            .single();
        
        if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
            console.error('Error loading team assignments:', error);
            return;
        }
        
        if (data && data.assignments) {
            const assignments = data.assignments;
            
            Object.keys(assignments).forEach(memberName => {
                const assignment = assignments[memberName];
                const memberId = memberName.toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                const podSelect = document.getElementById(`pod-${memberId}`);
                const notesInput = document.getElementById(`notes-${memberId}`);
                
                if (podSelect && assignment.pod) {
                    podSelect.value = assignment.pod;
                }
                if (notesInput && assignment.notes) {
                    notesInput.value = assignment.notes;
                }
            });
            
            // Update pod counts after loading assignments
            updatePodCounts();
            
            console.log('Loaded team assignments for', execName);
        }
    } catch (error) {
        console.error('Error loading team assignments:', error);
    }
}

// Initialize team roster and save button
document.getElementById('saveTeamAssignments')?.addEventListener('click', saveTeamAssignments);

// Wait for DOM and then initialize team roster
setTimeout(initTeamRoster, 600);
