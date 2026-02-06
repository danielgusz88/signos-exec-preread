// Annotation handling
class AnnotationManager {
    constructor() {
        this.currentExec = localStorage.getItem('current_exec') || null;
        this.sectionStatus = JSON.parse(localStorage.getItem('section_status') || '{}');
        this.selectedReactions = {};
    }
    
    // Initialize annotation areas
    init() {
        this.setupReactionButtons();
        this.setupSaveButtons();
        this.loadExistingAnnotations();
        
        // Listen for real-time updates
        window.annotationStore.addListener((payload) => {
            this.handleRealtimeUpdate(payload);
        });
    }
    
    // Setup reaction button handlers
    setupReactionButtons() {
        document.querySelectorAll('.reaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = btn.closest('.content-section');
                const sectionId = section.dataset.section;
                const reaction = btn.dataset.reaction;
                
                // Toggle selection
                const buttons = section.querySelectorAll('.reaction-btn');
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                this.selectedReactions[sectionId] = reaction;
            });
        });
    }
    
    // Setup save button handlers
    setupSaveButtons() {
        document.querySelectorAll('.btn-save-annotation').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const section = btn.closest('.content-section');
                const sectionId = section.dataset.section;
                const textarea = section.querySelector('.comment-input');
                const statusEl = section.querySelector('.save-status');
                
                const comment = textarea.value.trim();
                const reaction = this.selectedReactions[sectionId];
                
                if (!comment && !reaction) {
                    this.showToast('Please add a reaction or comment');
                    return;
                }
                
                if (!this.currentExec) {
                    this.showToast('Please select your name first');
                    document.getElementById('execModal').classList.remove('hidden');
                    return;
                }
                
                // Save annotation
                btn.disabled = true;
                btn.textContent = 'Saving...';
                
                try {
                    const annotation = {
                        section_id: sectionId,
                        exec_name: this.currentExec,
                        reaction_type: reaction || null,
                        comment_text: comment || null
                    };
                    
                    await window.annotationStore.saveAnnotation(annotation);
                    
                    // Update UI
                    statusEl.textContent = '✓ Saved!';
                    setTimeout(() => { statusEl.textContent = ''; }, 3000);
                    
                    // DON'T clear the textarea - keep the user's text visible
                    // so they can see and edit their submission
                    
                    // Mark section as reviewed
                    this.markSectionReviewed(sectionId);
                    
                    // Reload annotations for this section (shows in Team Feedback)
                    this.loadSectionAnnotations(sectionId);
                    
                    this.showToast('Annotation saved! Your feedback is visible below.');
                    
                } catch (error) {
                    console.error('Error saving:', error);
                    this.showToast('Error saving annotation');
                }
                
                btn.disabled = false;
                btn.textContent = 'Save Annotation';
            });
        });
    }
    
    // Load existing annotations
    async loadExistingAnnotations() {
        for (const section of CONFIG.SECTIONS) {
            await this.loadSectionAnnotations(section.id);
        }
    }
    
    // Load annotations for a specific section
    async loadSectionAnnotations(sectionId) {
        const annotations = await window.annotationStore.getAnnotations(sectionId);
        const section = document.querySelector(`[data-section="${sectionId}"]`);
        if (!section) return;
        
        const container = section.querySelector('.existing-annotations');
        const textarea = section.querySelector('.comment-input');
        
        // Find current user's annotation and pre-populate the input
        if (this.currentExec && textarea) {
            const myAnnotation = annotations.find(a => a.exec_name === this.currentExec);
            if (myAnnotation) {
                // Pre-populate textarea with user's existing comment
                if (myAnnotation.comment_text && !textarea.value) {
                    textarea.value = myAnnotation.comment_text;
                }
                // Pre-select their reaction button
                if (myAnnotation.reaction_type) {
                    const reactionBtn = section.querySelector(`.reaction-btn[data-reaction="${myAnnotation.reaction_type}"]`);
                    if (reactionBtn) {
                        section.querySelectorAll('.reaction-btn').forEach(b => b.classList.remove('selected'));
                        reactionBtn.classList.add('selected');
                        this.selectedReactions[sectionId] = myAnnotation.reaction_type;
                    }
                }
            }
        }
        
        if (annotations.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        let html = '<div class="annotations-title">💬 Team Feedback</div>';
        
        annotations.forEach(a => {
            const reactionInfo = CONFIG.REACTIONS[a.reaction_type] || { emoji: '', label: '' };
            const time = a.created_at ? new Date(a.created_at).toLocaleString() : '';
            const isCurrentUser = a.exec_name === this.currentExec;
            
            html += `
                <div class="annotation-item ${a.reaction_type || ''} ${isCurrentUser ? 'my-annotation' : ''}">
                    <div class="annotation-meta">
                        <span class="annotation-exec">${a.exec_name}${isCurrentUser ? ' (you)' : ''}</span>
                        ${a.reaction_type ? `<span class="annotation-reaction">${reactionInfo.emoji} ${reactionInfo.label}</span>` : ''}
                        <span class="annotation-time">${time}</span>
                    </div>
                    ${a.comment_text ? `<div class="annotation-text">${this.escapeHtml(a.comment_text)}</div>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    // Handle real-time updates
    handleRealtimeUpdate(payload) {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const sectionId = payload.new.section_id;
            this.loadSectionAnnotations(sectionId);
        } else if (payload.eventType === 'DELETE') {
            const sectionId = payload.old.section_id;
            this.loadSectionAnnotations(sectionId);
        }
    }
    
    // Mark section as reviewed
    markSectionReviewed(sectionId) {
        this.sectionStatus[sectionId] = 'reviewed';
        localStorage.setItem('section_status', JSON.stringify(this.sectionStatus));
        this.updateProgress();
        this.updateNavigation();
    }
    
    // Update progress bar
    updateProgress() {
        const total = CONFIG.SECTIONS.length;
        const reviewed = Object.values(this.sectionStatus).filter(s => s === 'reviewed').length;
        const percent = (reviewed / total) * 100;
        
        document.getElementById('progressFill').style.width = `${percent}%`;
        document.getElementById('progressText').textContent = `${reviewed} of ${total} sections reviewed`;
        
        // Enable submit button if all sections reviewed
        const submitBtn = document.getElementById('submitAllBtn');
        if (submitBtn) {
            submitBtn.disabled = reviewed < total;
        }
    }
    
    // Update navigation
    updateNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            const sectionId = item.dataset.section;
            if (this.sectionStatus[sectionId] === 'reviewed') {
                item.classList.add('completed');
            }
        });
    }
    
    // Set current exec
    setCurrentExec(name) {
        this.currentExec = name;
        localStorage.setItem('current_exec', name);
        document.getElementById('currentExecName').textContent = name;
        document.getElementById('execModal').classList.add('hidden');
    }
    
    // Show toast notification
    showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    // Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
window.annotationManager = new AnnotationManager();
