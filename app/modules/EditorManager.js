import { positionElement } from '../utils/domUtils.js';

export class EditorManager {
    constructor(app) {
        this.app = app;
        this.sidebar = document.getElementById('task-edit-sidebar');
        this.floating = document.getElementById('floating-editor');
        this.editingTask = null;
        this.isCreatingTask = false;
        this.lastClickedDay = null;
        this.deleteConfirmationVisible = false;
        
        this.setupEditors();
        this.setupClickOutside();
    }

    setupEditors() {
        document.querySelectorAll('.close-editor').forEach(btn => {
            btn.addEventListener('click', () => {
                this.isCreatingTask = false;
                this.editingTask = null;
                this.closeEditor();
            });
        });
        
        document.querySelectorAll('.edit-task-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTaskEdit(e.target.closest('.task-editor'));
            });
        });
        
        ['delete-task', '.floating-delete-task'].forEach(selector => {
            const btn = selector.startsWith('.') ? 
                document.querySelector(selector) : 
                document.getElementById(selector);
            
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const editor = e.target.closest('.task-editor');
                this.showDeleteConfirmation(editor, this.editingTask.title);
            });
        });
    }

    openEditor(taskId, floating = false, event = null) {
        event?.stopPropagation();
        
        const task = this.app.taskManager.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTask = task;
        const editor = floating ? this.floating : this.sidebar;
        const otherEditor = floating ? this.sidebar : this.floating;
        otherEditor.classList.remove('active');

        editor.style.display = floating ? 'block' : null;
        editor.style.transform = floating ? 'translateY(10px)' : null;
        editor.style.opacity = floating ? '0' : null;

        const prefix = floating ? 'floating-task-' : 'edit-task-';
        
        editor.querySelector(`#${prefix}title`).value = task.title;
        editor.querySelector(`#${prefix}date`).value = task.dueDate;
        editor.querySelector(`#${prefix}priority`).value = task.priority;
        editor.querySelector(`#${prefix}completed`).checked = task.completed;

        const categorySelect = editor.querySelector(`#${prefix}category`);
        categorySelect.innerHTML = this.app.categoryManager.categories.map(cat => 
            `<option value="${cat.name}" ${cat.name === task.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');

        if (floating) {
            this.lastClickedDay = null;
            if (event) {
                const dayRect = event.target.getBoundingClientRect();
                this.positionFloatingEditor(editor, dayRect);
            }
        }
        
        editor.classList.add('active');
        editor.querySelector('h2').textContent = 'Edit Task';
        editor.querySelector('.btn-submit').textContent = 'Save Changes';

        const existingConfirmation = editor.querySelector('.delete-confirmation');
        if (existingConfirmation) {
            existingConfirmation.remove();
            editor.querySelector('.editor-actions').style.display = 'flex';
            this.deleteConfirmationVisible = false;
        }

        const deleteBtn = editor.querySelector('.floating-delete-task, #delete-task');
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
        }
    }

    handleCalendarDayClick(event) {
        if (event.target.closest('.calendar-task') || !event.target.closest('.calendar-day')) {
            return;
        }

        const day = event.target.closest('.calendar-day');
        const date = day.dataset.date;
        
        this.floating.querySelector('.floating-delete-task').style.display = 'none';
        this.isCreatingTask = true;

        const form = this.floating.querySelector('form');
        form.reset();

        this.floating.querySelector('h2').textContent = 'New Task';
        this.floating.querySelector('.btn-submit').textContent = 'Create Task';

        const prefix = 'floating-task-';
        this.floating.querySelector(`#${prefix}date`).value = date;
        const categorySelect = this.floating.querySelector(`#${prefix}category`);
        categorySelect.innerHTML = this.app.categoryManager.categories.map(cat => 
            `<option value="${cat.name}">${cat.name}</option>`
        ).join('');

        this.floating.style.display = 'block';
        this.floating.style.visibility = 'visible';
        this.floating.style.opacity = '0';
        this.floating.style.transform = 'translateY(10px)';
        this.floating.classList.add('active');
        
        const dayRect = day.getBoundingClientRect();
        this.positionFloatingEditor(this.floating, dayRect);

        this.lastClickedDay = day;
    }

    closeEditor() {
        [this.sidebar, this.floating].forEach(editor => {
            const isFloating = editor === this.floating;
            
            if (isFloating) {
                editor.style.opacity = '0';
                editor.style.transform = 'translateY(10px)';
                
                setTimeout(() => {
                    editor.classList.remove('active');
                    editor.style.display = 'none';
                }, 200);
            } else {
                editor.classList.remove('active');
            }
            
            const confirmation = editor.querySelector('.delete-confirmation');
            if (confirmation) {
                confirmation.remove();
                editor.querySelector('.editor-actions').style.display = 'flex';
                this.deleteConfirmationVisible = false;
            }
        });
        
        this.lastClickedDay = null;
        this.editingTask = null;
        this.isCreatingTask = false;
    }

    handleTaskEdit(editor) {
        if (!this.editingTask && !this.isCreatingTask) return;

        const prefix = editor.id === 'floating-editor' ? 'floating-task-' : 'edit-task-';
        const taskData = {
            title: editor.querySelector(`#${prefix}title`).value,
            dueDate: editor.querySelector(`#${prefix}date`).value,
            category: editor.querySelector(`#${prefix}category`).value,
            priority: parseInt(editor.querySelector(`#${prefix}priority`).value),
            completed: editor.querySelector(`#${prefix}completed`).checked
        };
        
        if (this.isCreatingTask) {
            this.app.taskManager.addTask(taskData);
        } else {
            this.app.taskManager.updateTask(this.editingTask.id, taskData);
        }

        this.app.uiManager.renderTasks();
        this.app.calendarManager.render();
        this.closeEditor();
    }

    showDeleteConfirmation(editor, taskTitle) {
        if (this.deleteConfirmationVisible) return;
        
        const confirmation = document.createElement('div');
        confirmation.className = 'delete-confirmation';
        confirmation.innerHTML = `
            <p>Delete "${taskTitle}"?</p>
            <div class="confirmation-actions">
                <button class="btn-cancel">Cancel</button>
                <button class="btn-danger">Delete</button>
            </div>
        `;

        const editorActions = editor.querySelector('.editor-actions');
        editorActions.style.display = 'none';
        editor.querySelector('form').appendChild(confirmation);

        this.deleteConfirmationVisible = true;

        confirmation.querySelector('.btn-cancel').addEventListener('click', () => {
            confirmation.remove();
            editorActions.style.display = 'flex';
            this.deleteConfirmationVisible = false;
        });

        confirmation.querySelector('.btn-danger').addEventListener('click', () => {
            this.app.taskManager.deleteTask(this.editingTask.id);
            this.app.uiManager.renderTasks();
            this.app.calendarManager.render();
            this.closeEditor();
            this.deleteConfirmationVisible = false;
        });
    }

    positionFloatingEditor(editor, targetRect) {
        const { top, left } = positionElement(editor, targetRect);
        editor.style.left = `${left}px`;
        editor.style.top = `${top}px`;
        
        requestAnimationFrame(() => {
            editor.style.opacity = '1';
            editor.style.transform = 'translateY(0)';
        });
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            const clickedTask = e.target.closest('.calendar-task');
            const clickedDay = e.target.closest('.calendar-day');
            
            if (e.target.closest('.task-editor')) {
                return;
            }

            if (this.floating.classList.contains('active')) {
                if (this.isCreatingTask) {
                    if (!clickedDay || clickedDay !== this.lastClickedDay) {
                        this.closeEditor();
                    }
                } else {
                    if (!clickedTask || parseInt(clickedTask.dataset.taskId) !== this.editingTask?.id) {
                        this.closeEditor();
                    }
                }
            }

            if (this.sidebar.classList.contains('active')) {
                if (!e.target.closest('.task-item')) {
                    this.sidebar.classList.remove('active');
                    this.editingTask = null;
                }
            }
        });
    }
}
