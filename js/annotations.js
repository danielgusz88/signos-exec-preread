// Annotation handling
class AnnotationManager {
    constructor() {
        this.currentExec = localStorage.getItem('current_exec') || null;
        this.sectionStatus = JSON.parse(localStorage.getItem('section_status') || '{}');
        this.selectedReactions = {};
    }
    
    // Initialize annotation areas
    init() {
        // #region agent log
        console.log('[DEBUG H1,H2] init() called, currentExec:', this.currentExec);
        // #endregion
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
            btn.addEventListener('click', async (e) => {
                const section = btn.closest('.content-section');
                const sectionId = section.dataset.section;
                const reaction = btn.dataset.reaction;
                const textarea = section.querySelector('.comment-input');
                const statusEl = section.querySelector('.save-status');
                
                if (!this.currentExec) {
                    this.showToast('Please log in first');
                    document.getElementById('execModal').classList.remove('hidden');
                    return;
                }
                
                // Toggle selection
                const buttons = section.querySelectorAll('.reaction-btn');
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                this.selectedReactions[sectionId] = reaction;
                
                // Auto-save the reaction immediately
                btn.style.opacity = '0.7';
                
                try {
                    const annotation = {
                        section_id: sectionId,
                        exec_name: this.currentExec,
                        reaction_type: reaction,
                        comment_text: textarea?.value?.trim() || null
                    };
                    
                    await window.annotationStore.saveAnnotation(annotation);
                    
                    // Show saved feedback
                    statusEl.textContent = '✓ Reaction saved!';
                    statusEl.style.color = 'var(--accent-success)';
                    setTimeout(() => { statusEl.textContent = ''; }, 2000);
                    
                    // Mark section as reviewed
                    this.markSectionReviewed(sectionId);
                    
                    // Reload annotations
                    this.loadSectionAnnotations(sectionId);
                    
                    this.showToast(`${CONFIG.REACTIONS[reaction].emoji} ${CONFIG.REACTIONS[reaction].label} saved!`);
                    
                } catch (error) {
                    console.error('Error saving reaction:', error);
                    this.showToast('Error saving reaction');
                }
                
                btn.style.opacity = '1';
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
        // #region agent log
        console.log('[DEBUG H1] loadExistingAnnotations called, currentExec:', this.currentExec, 'sections:', CONFIG.SECTIONS?.length);
        // #endregion
        for (const section of CONFIG.SECTIONS) {
            await this.loadSectionAnnotations(section.id, true); // true = initial load
        }
        // Update progress after loading all annotations
        localStorage.setItem('section_status', JSON.stringify(this.sectionStatus));
        this.updateProgress();
        this.updateNavigation();
    }
    
    // Load annotations for a specific section
    // isInitialLoad: if true, always populate textarea; if false (realtime update), don't overwrite user's typing
    async loadSectionAnnotations(sectionId, isInitialLoad = false) {
        const annotations = await window.annotationStore.getAnnotations(sectionId);
        // Use .content-section to avoid matching nav-items which also have data-section
        const section = document.querySelector(`.content-section[data-section="${sectionId}"]`);
        if (!section) return;
        
        const container = section.querySelector('.existing-annotations');
        const textarea = section.querySelector('.comment-input');
        
        // #region agent log
        if (sectionId === '1') { // Only log for section 1 to avoid spam
            const allTextareas = section ? section.querySelectorAll('textarea') : [];
            const commentInputs = section ? section.querySelectorAll('.comment-input') : [];
            console.log('[DEBUG H2,H3] loadSectionAnnotations section 1:', {sectionId, isInitialLoad, currentExec: this.currentExec, annotationsCount: annotations?.length, annotations, hasTextarea: !!textarea, hasSection: !!section});
            console.log('[DEBUG H7] DOM state:', {sectionId: section?.dataset?.section, sectionHTML: section?.className, allTextareasCount: allTextareas.length, commentInputsCount: commentInputs.length, textareaElement: textarea});
        }
        // #endregion
        
        // Find current user's annotation and pre-populate the input/reaction
        if (this.currentExec) {
            const myAnnotation = annotations.find(a => a.exec_name === this.currentExec);
            // #region agent log
            if (sectionId === '1') {
                console.log('[DEBUG H5] Looking for my annotation:', {sectionId, myAnnotation, execName: this.currentExec});
                console.log('[DEBUG H6] myAnnotation contents:', {comment_text: myAnnotation?.comment_text, reaction_type: myAnnotation?.reaction_type, hasTextarea: !!textarea});
            }
            // #endregion
            if (myAnnotation) {
                // #region agent log
                if (sectionId === '1') {
                    console.log('[DEBUG H6b] Entered myAnnotation block, checking conditions:', {hasCommentText: !!myAnnotation.comment_text, hasReactionType: !!myAnnotation.reaction_type, hasTextarea: !!textarea, isInitialLoad});
                }
                // #endregion
                // Pre-populate textarea with user's existing comment
                // On initial load, always set it. On realtime updates, only if textarea is empty
                if (myAnnotation.comment_text && textarea) {
                    if (isInitialLoad || !textarea.value.trim()) {
                        textarea.value = myAnnotation.comment_text;
                        // #region agent log
                        if (sectionId === '1') {
                            console.log('[DEBUG H4] Textarea populated with:', myAnnotation.comment_text);
                        }
                        // #endregion
                    }
                }
                
                // Pre-select their reaction button (always, independent of textarea)
                if (myAnnotation.reaction_type) {
                    const reactionBtn = section.querySelector(`.reaction-btn[data-reaction="${myAnnotation.reaction_type}"]`);
                    // #region agent log
                    if (sectionId === '1') {
                        console.log('[DEBUG H4] Reaction button lookup:', {sectionId, reactionType: myAnnotation.reaction_type, foundButton: !!reactionBtn});
                    }
                    // #endregion
                    if (reactionBtn) {
                        // Clear all selections first
                        section.querySelectorAll('.reaction-btn').forEach(b => b.classList.remove('selected'));
                        // Select the saved reaction
                        reactionBtn.classList.add('selected');
                        this.selectedReactions[sectionId] = myAnnotation.reaction_type;
                    }
                }
                
                // Mark section as reviewed if user has annotation
                if (isInitialLoad) {
                    this.sectionStatus[sectionId] = 'reviewed';
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
        
        // Reload annotations to restore user's saved reactions and comments
        this.loadExistingAnnotations();
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
