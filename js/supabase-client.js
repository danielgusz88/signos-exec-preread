// Supabase Client with localStorage fallback
class AnnotationStore {
    constructor() {
        this.supabase = null;
        this.useSupabase = false;
        this.listeners = [];
        this.init();
    }
    
    async init() {
        // Try to initialize Supabase
        if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
            try {
                this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
                
                // Test connection
                const { data, error } = await this.supabase.from('annotations').select('count').limit(1);
                if (!error) {
                    this.useSupabase = true;
                    console.log('✅ Connected to Supabase');
                    this.setupRealtimeSubscription();
                } else {
                    console.warn('⚠️ Supabase error, falling back to localStorage:', error.message);
                }
            } catch (e) {
                console.warn('⚠️ Could not connect to Supabase, using localStorage:', e.message);
            }
        } else {
            console.log('ℹ️ No Supabase configured, using localStorage');
        }
    }
    
    setupRealtimeSubscription() {
        if (!this.supabase) return;
        
        this.supabase
            .channel('annotations_changes')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'annotations' },
                (payload) => {
                    console.log('Real-time update:', payload);
                    this.notifyListeners(payload);
                }
            )
            .subscribe();
    }
    
    addListener(callback) {
        this.listeners.push(callback);
    }
    
    notifyListeners(payload) {
        this.listeners.forEach(cb => cb(payload));
    }
    
    // Get all annotations
    async getAnnotations(sectionId = null) {
        if (this.useSupabase) {
            let query = this.supabase.from('annotations').select('*').order('created_at', { ascending: true });
            if (sectionId) {
                query = query.eq('section_id', sectionId);
            }
            const { data, error } = await query;
            if (error) {
                console.error('Error fetching annotations:', error);
                return this.getFromLocalStorage(sectionId);
            }
            return data;
        } else {
            return this.getFromLocalStorage(sectionId);
        }
    }
    
    // Get annotations by exec
    async getAnnotationsByExec(execName) {
        if (this.useSupabase) {
            const { data, error } = await this.supabase
                .from('annotations')
                .select('*')
                .eq('exec_name', execName)
                .order('created_at', { ascending: true });
            if (error) {
                console.error('Error fetching annotations:', error);
                return this.getFromLocalStorage().filter(a => a.exec_name === execName);
            }
            return data;
        } else {
            return this.getFromLocalStorage().filter(a => a.exec_name === execName);
        }
    }
    
    // Save annotation (upserts by section_id + exec_name to prevent duplicates)
    async saveAnnotation(annotation) {
        if (this.useSupabase) {
            try {
                // Check if an annotation already exists for this user + section
                const { data: existing } = await this.supabase
                    .from('annotations')
                    .select('id, created_at')
                    .eq('section_id', annotation.section_id)
                    .eq('exec_name', annotation.exec_name)
                    .single();
                
                const annotationData = {
                    ...annotation,
                    id: existing ? existing.id : (annotation.id || crypto.randomUUID()),
                    created_at: existing ? existing.created_at : new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                const { data, error } = await this.supabase
                    .from('annotations')
                    .upsert(annotationData)
                    .select();
                if (error) {
                    console.error('Error saving annotation:', error);
                    return this.saveToLocalStorage(annotationData);
                }
                return data[0];
            } catch (e) {
                console.error('Error in saveAnnotation:', e);
                const fallbackData = {
                    ...annotation,
                    id: annotation.id || crypto.randomUUID(),
                    created_at: new Date().toISOString()
                };
                return this.saveToLocalStorage(fallbackData);
            }
        } else {
            const annotationData = {
                ...annotation,
                id: annotation.id || crypto.randomUUID(),
                created_at: annotation.created_at || new Date().toISOString()
            };
            // For localStorage, also deduplicate by section_id + exec_name
            const allAnnotations = this.getFromLocalStorage();
            const existingIdx = allAnnotations.findIndex(
                a => a.section_id === annotation.section_id && a.exec_name === annotation.exec_name
            );
            if (existingIdx >= 0) {
                annotationData.id = allAnnotations[existingIdx].id;
                annotationData.created_at = allAnnotations[existingIdx].created_at;
                allAnnotations[existingIdx] = annotationData;
            } else {
                allAnnotations.push(annotationData);
            }
            localStorage.setItem('offsite_annotations', JSON.stringify(allAnnotations));
            return annotationData;
        }
    }
    
    // Delete annotation
    async deleteAnnotation(id) {
        if (this.useSupabase) {
            const { error } = await this.supabase
                .from('annotations')
                .delete()
                .eq('id', id);
            if (error) {
                console.error('Error deleting annotation:', error);
                this.deleteFromLocalStorage(id);
            }
        } else {
            this.deleteFromLocalStorage(id);
        }
    }
    
    // LocalStorage methods
    getFromLocalStorage(sectionId = null) {
        const stored = localStorage.getItem('offsite_annotations');
        let annotations = stored ? JSON.parse(stored) : [];
        if (sectionId) {
            annotations = annotations.filter(a => a.section_id === sectionId);
        }
        return annotations;
    }
    
    saveToLocalStorage(annotation) {
        const annotations = this.getFromLocalStorage();
        const existingIndex = annotations.findIndex(a => a.id === annotation.id);
        if (existingIndex >= 0) {
            annotations[existingIndex] = annotation;
        } else {
            annotations.push(annotation);
        }
        localStorage.setItem('offsite_annotations', JSON.stringify(annotations));
        return annotation;
    }
    
    deleteFromLocalStorage(id) {
        const annotations = this.getFromLocalStorage().filter(a => a.id !== id);
        localStorage.setItem('offsite_annotations', JSON.stringify(annotations));
    }
    
    // Get summary stats
    async getStats() {
        const annotations = await this.getAnnotations();
        const stats = {
            total: annotations.length,
            bySection: {},
            byExec: {},
            byReaction: {
                agree: 0,
                question: 0,
                concern: 0,
                idea: 0
            }
        };
        
        annotations.forEach(a => {
            // By section
            stats.bySection[a.section_id] = (stats.bySection[a.section_id] || 0) + 1;
            
            // By exec
            stats.byExec[a.exec_name] = (stats.byExec[a.exec_name] || 0) + 1;
            
            // By reaction
            if (a.reaction_type) {
                stats.byReaction[a.reaction_type] = (stats.byReaction[a.reaction_type] || 0) + 1;
            }
        });
        
        return stats;
    }
}

// Create global instance
window.annotationStore = new AnnotationStore();
