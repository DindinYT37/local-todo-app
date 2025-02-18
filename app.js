class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { name: 'Personal', color: 'blue' },
            { name: 'Work', color: 'green' }
        ];
        this.currentView = 'list';
        this.modal = document.getElementById('task-modal');
        this.categoryModal = document.getElementById('category-modal');
        this.activeCategory = 'all';
        this.sortDirection = 1; // 1 for ascending, -1 for descending
        this.currentSortCriterion = 'priority';
        this.currentDate = new Date();
        this.visibleCategories = new Set(this.categories.map(cat => cat.name)); // Update this line
        this.editingTask = null;
        this.categoryEditModal = document.getElementById('category-edit-modal');
        this.editingCategory = null;
        this.deleteConfirmationVisible = false;
        this.initializeApp();
        this.setupTheme();
        this.setupEditors();
        this.setupClickOutside();
    }

    initializeApp() {
        this.setupEventListeners();
        this.renderCategories();
        this.sortTasks('priority'); // Apply initial sorting
        this.setupCalendar();
    }

    setupTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('theme') === 'dark';
        
        if (savedTheme) {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon();
        }

        themeToggle.innerHTML = `
            <i class="fas fa-moon"></i>
            <i class="fas fa-sun"></i>
        `;
        
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
            this.updateThemeIcon();
        });
    }

    updateThemeIcon() {
        const isDark = document.body.classList.contains('dark-mode');
        const toggle = document.getElementById('theme-toggle');
        toggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }

    setupEventListeners() {
        document.getElementById('add-task').addEventListener('click', () => this.addTask());
        document.getElementById('sort-select').addEventListener('change', (e) => this.sortTasks(e.target.value));
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit(e);
        });
        
        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalType = btn.dataset.modal;
                if (modalType === 'category') {
                    this.categoryModal.classList.remove('active');
                } else if (modalType === 'category-edit') {
                    this.categoryEditModal.classList.remove('active');
                    this.editingCategory = null;
                } else {
                    this.modal.classList.remove('active');
                }
            });
        });
        document.getElementById('add-category').addEventListener('click', () => this.addCategory());
        document.getElementById('category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategorySubmit(e);
        });
        document.getElementById('sort-direction').addEventListener('click', () => {
            this.sortDirection *= -1;
            document.getElementById('sort-direction').classList.toggle('reversed');
            this.sortTasks(this.currentSortCriterion);
        });
        document.getElementById('category-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategoryEdit(e);
        });
    }

    setupEditors() {
        document.querySelectorAll('.close-editor').forEach(btn => {
            btn.addEventListener('click', () => this.closeEditor());
        });
        
        document.querySelectorAll('.edit-task-form').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTaskEdit(e.target.closest('.task-editor'));
            });
        });
        
        document.getElementById('delete-task').addEventListener('click', (e) => {
            e.preventDefault();
            const editor = e.target.closest('.task-editor');
            this.showDeleteConfirmation(editor, this.editingTask.title);
        });

        document.querySelector('.floating-delete-task').addEventListener('click', (e) => {
            e.preventDefault();
            const editor = e.target.closest('.task-editor');
            this.showDeleteConfirmation(editor, this.editingTask.title);
        });
    }

    setupClickOutside() {
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('task-edit-sidebar');
            const floating = document.getElementById('floating-editor');
            
            // Don't close if clicking inside editors or on tasks
            if (e.target.closest('.task-editor') || 
                e.target.closest('.task-item') || 
                e.target.closest('.calendar-task')) {
                return;
            }

            // Close editors when clicking outside
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
            if (floating.classList.contains('active')) {
                floating.classList.remove('active');
            }
            this.editingTask = null;
        });
    }

    addTask() {
        this.modal.classList.add('active');
        const categorySelect = document.getElementById('task-category');
        categorySelect.innerHTML = this.categories.map(cat => 
            `<option value="${cat.name}">${cat.name}</option>`
        ).join('');
    }

    handleTaskSubmit(e) {
        const task = {
            id: Date.now(),
            title: document.getElementById('task-title').value,
            dueDate: document.getElementById('task-date').value,
            category: document.getElementById('task-category').value,
            priority: parseInt(document.getElementById('task-priority').value),
            completed: false
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.sortTasks(this.currentSortCriterion);
        this.renderTasks();
        this.modal.classList.remove('active');
        e.target.reset();

        const container = document.getElementById('tasks-container');
        const taskEl = container.lastElementChild;
        if (taskEl) taskEl.classList.add('new');
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.sortTasks(this.currentSortCriterion); // Reapply current sorting
            this.renderTasks();
        }
    }

    getTaskStatus(dueDate, completed = false) {
        if (!dueDate || completed) return '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const taskDate = new Date(dueDate);
        taskDate.setHours(0, 0, 0, 0);

        if (taskDate.getTime() === today.getTime()) return 'due-today';
        if (taskDate < today) return 'overdue';
        return '';
    }

    getTaskStatusText(dueDate, completed = false) {
        if (!dueDate || completed) return '';
        
        const status = this.getTaskStatus(dueDate, completed);
        if (status === 'due-today') return '<span class="due-status due-today"><i class="fas fa-exclamation-circle"></i> Due today</span>';
        if (status === 'overdue') return '<span class="due-status overdue"><i class="fas fa-exclamation-triangle"></i> Overdue</span>';
        return '';
    }

    sortTasks(criterion) {
        this.currentSortCriterion = criterion;
        
        const prioritizeDueTasks = (a, b) => {
            // Don't prioritize completed tasks
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            if (a.completed && b.completed) return 0;

            // Only prioritize incomplete tasks
            const statusA = this.getTaskStatus(a.dueDate);
            const statusB = this.getTaskStatus(b.dueDate);
            
            if (statusA === 'overdue' && statusB !== 'overdue') return -1;
            if (statusB === 'overdue' && statusA !== 'overdue') return 1;
            if (statusA === 'due-today' && statusB !== 'due-today') return -1;
            if (statusB === 'due-today' && statusA !== 'due-today') return 1;
            
            return 0;
        };

        const compareValues = (a, b) => {
            const dueSort = prioritizeDueTasks(a, b);
            if (dueSort !== 0) return dueSort;

            let comparison = 0;
            switch(criterion) {
                case 'priority':
                    comparison = b.priority - a.priority;
                    break;
                case 'date':
                    comparison = new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999');
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
            }
            return comparison * this.sortDirection;
        };

        this.tasks.sort(compareValues);
        this.renderTasks();
    }

    switchView(view) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Switch category controls
        document.querySelectorAll('.category-controls').forEach(control => {
            control.classList.remove('active');
        });
        document.getElementById(`${view}-categories`).classList.add('active');
        
        if (view === 'calendar') {
            this.renderCalendarCategories();
            this.renderCalendar();
        }
    }

    setupCalendar() {
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
    }

    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    }

    getTasksForDate(date) {
        return this.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.getDate() === date.getDate() &&
                   taskDate.getMonth() === date.getMonth() &&
                   taskDate.getFullYear() === date.getFullYear() &&
                   this.visibleCategories.has(task.category);
        });
    }

    renderCalendar() {
        const MAX_TASKS_PER_DAY = 3;
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        document.getElementById('calendar-title').textContent = 
            new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = this.getDaysInMonth(year, month);
        const today = new Date();
        
        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.innerHTML = `
            <div class="calendar-weekdays">
                ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
                    `<div>${day}</div>`
                ).join('')}
            </div>
            <div class="calendar-days-grid"></div>
        `;

        const days = [];
        
        // Previous month days
        const prevMonth = new Date(year, month, 0);
        const daysInPrevMonth = prevMonth.getDate();
        for (let i = firstDay - 1; i >= 0; i--) {
            const date = new Date(year, month - 1, daysInPrevMonth - i);
            const tasks = this.getTasksForDate(date);
            days.push({ date, tasks, different: true });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const tasks = this.getTasksForDate(date);
            days.push({ date, tasks, different: false });
        }

        // Next month days
        const remainingDays = 42 - days.length; // 6 rows * 7 days = 42
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            const tasks = this.getTasksForDate(date);
            days.push({ date, tasks, different: true });
        }

        const daysGrid = calendarGrid.querySelector('.calendar-days-grid');
        daysGrid.innerHTML = days.map(({ date, tasks, different }) => {
            const isToday = date.toDateString() === today.toDateString();
            const visibleTasks = tasks.slice(0, MAX_TASKS_PER_DAY);
            const remainingTasks = tasks.length - MAX_TASKS_PER_DAY;
            
            const taskElements = visibleTasks.map(task => `
                <div class="calendar-task ${task.completed ? 'completed' : ''} 
                                        ${this.getTaskStatus(task.dueDate, task.completed)}"
                     data-category-color="${this.getCategoryColor(task.category)}"
                     onclick="app.openEditor(${task.id}, true, event); event.stopPropagation();"
                     title="${task.title}">
                    ${task.title}
                </div>
            `).join('');

            const moreTasks = remainingTasks > 0 
                ? `<div class="more-tasks">+${remainingTasks} more</div>` 
                : '';
            
            return `
                <div class="calendar-day ${different ? 'different-month' : ''} 
                                        ${isToday ? 'today' : ''}">
                    <div class="day-number">${date.getDate()}</div>
                    ${taskElements}
                    ${moreTasks}
                </div>
            `;
        }).join('');
    }

    renderCalendarCategories() {
        const list = document.getElementById('category-checkbox-list');
        const checkAll = document.getElementById('check-all-categories');
        
        // Update "check all" state
        checkAll.checked = this.visibleCategories.size === this.categories.length;
        
        list.innerHTML = this.categories.map(cat => `
            <li class="calendar-category-item" data-color="${cat.color}">
                <label>
                    <input type="checkbox" 
                           class="category-checkbox" 
                           value="${cat.name}" 
                           ${this.visibleCategories.has(cat.name) ? 'checked' : ''}>
                    <span>${cat.name}</span>
                </label>
            </li>
        `).join('');

        // Add event listeners
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.visibleCategories.add(e.target.value);
                } else {
                    this.visibleCategories.delete(e.target.value);
                }
                checkAll.checked = this.visibleCategories.size === this.categories.length;
                this.renderCalendar();
            });
        });

        checkAll.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.visibleCategories = new Set(this.categories.map(cat => cat.name));
            } else {
                this.visibleCategories.clear();
            }
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            this.renderCalendar();
        });
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    formatDate(dateString) {
        if (!dateString) return 'No due date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    addCategory() {
        this.categoryModal.classList.add('active');
    }

    handleCategorySubmit(e) {
        const categoryName = document.getElementById('category-name').value;
        const categoryColor = document.getElementById('category-color').value;
        
        if (categoryName && !this.categories.find(cat => cat.name === categoryName)) {
            this.categories.push({ name: categoryName, color: categoryColor });
            this.visibleCategories.add(categoryName);
            localStorage.setItem('categories', JSON.stringify(this.categories));
            this.renderCategories();
            if (this.currentView === 'calendar') {
                this.renderCalendarCategories();
            }
            this.categoryModal.classList.remove('active');
            e.target.reset();
        }
    }

    filterByCategory(category) {
        this.activeCategory = category;
        this.renderCategories();
        this.renderTasks();
    }

    getFilteredTasks() {
        if (this.activeCategory === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.category === this.activeCategory);
    }

    getCategoryColor(categoryName) {
        const category = this.categories.find(cat => cat.name === categoryName);
        return category ? category.color : 'blue'; // default to blue if not found
    }

    renderTasks() {
        const container = document.getElementById('tasks-container');
        const oldItems = Array.from(container.children);
        const oldPositions = new Map();
        
        // First: Store old positions
        oldItems.forEach(item => {
            const id = item.dataset.id;
            const rect = item.getBoundingClientRect();
            oldPositions.set(id, rect);
        });
        
        // Last: Update DOM
        const filteredTasks = this.getFilteredTasks();
        container.innerHTML = filteredTasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''} ${this.getTaskStatus(task.dueDate, task.completed)}" 
                 data-id="${task.id}"
                 data-category-color="${this.getCategoryColor(task.category)}"
                 onclick="app.openEditor(${task.id})">
                <div class="priority-indicator priority-${task.priority === 3 ? 'high' : task.priority === 2 ? 'medium' : 'low'}"></div>
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="app.toggleTask(${task.id})">
                    ${task.completed ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <div class="task-content">
                    <h3>${task.title}</h3>
                    <div class="task-meta">
                        <span><i class="far fa-calendar"></i> ${this.formatDate(task.dueDate)}</span>
                        <span><i class="fas fa-tag"></i> ${task.category}</span>
                        <span><i class="fas fa-flag"></i> Priority ${task.priority}</span>
                        ${this.getTaskStatusText(task.dueDate, task.completed)}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Force reflow
        container.offsetHeight;
        
        // Invert & Play: Animate new positions
        Array.from(container.children).forEach(item => {
            const id = item.dataset.id;
            const oldRect = oldPositions.get(id);
            
            if (oldRect) {
                const newRect = item.getBoundingClientRect();
                const deltaY = oldRect.top - newRect.top;
                
                // Invert
                item.style.transform = `translateY(${deltaY}px)`;
                item.style.transition = 'none';
                
                // Force reflow
                item.offsetHeight;
                
                // Play
                item.classList.add('moving');
                item.style.transform = '';
                item.style.transition = '';
                
                const onTransitionEnd = () => {
                    item.classList.remove('moving');
                    item.removeEventListener('transitionend', onTransitionEnd);
                };
                
                item.addEventListener('transitionend', onTransitionEnd);
            } else {
                item.classList.add('new');
            }
        });
    }

    openEditor(taskId, floating = false, event = null) {
        event?.stopPropagation();
        
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.editingTask = task;
        const editor = floating ? 
            document.getElementById('floating-editor') : 
            document.getElementById('task-edit-sidebar');

        // Close other editor if open
        const otherEditor = floating ? 
            document.getElementById('task-edit-sidebar') : 
            document.getElementById('floating-editor');
        otherEditor.classList.remove('active');

        // Get correct form field IDs based on editor type
        const prefix = floating ? 'floating-task-' : 'edit-task-';
        
        // Populate form fields
        editor.querySelector(`#${prefix}title`).value = task.title;
        editor.querySelector(`#${prefix}date`).value = task.dueDate;
        editor.querySelector(`#${prefix}priority`).value = task.priority;
        editor.querySelector(`#${prefix}completed`).checked = task.completed;

        const categorySelect = editor.querySelector(`#${prefix}category`);
        categorySelect.innerHTML = this.categories.map(cat => 
            `<option value="${cat.name}" ${cat.name === task.category ? 'selected' : ''}>${cat.name}</option>`
        ).join('');

        if (floating && event) {
            editor.style.visibility = 'hidden';
            editor.classList.add('active');
            
            const editorRect = editor.getBoundingClientRect();
            const taskRect = event.target.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const MARGIN = 20;

            // Determine if there's more space to the left or right of the task
            const spaceLeft = taskRect.left;
            const spaceRight = viewportWidth - taskRect.right;
            
            // Calculate vertical position - align with task
            let top = taskRect.top;
            
            // Ensure vertical position is within viewport
            if (top + editorRect.height > viewportHeight - MARGIN) {
                top = Math.max(MARGIN, viewportHeight - editorRect.height - MARGIN);
            }
            top = Math.max(MARGIN, top);

            // Calculate horizontal position
            let left;
            if (spaceRight >= editorRect.width + MARGIN || spaceRight > spaceLeft) {
                // Position to the right
                left = taskRect.right + 10;
                if (left + editorRect.width > viewportWidth - MARGIN) {
                    left = viewportWidth - editorRect.width - MARGIN;
                }
            } else {
                // Position to the left
                left = taskRect.left - editorRect.width - 10;
                if (left < MARGIN) {
                    left = MARGIN;
                }
            }

            // Apply final position and make visible
            editor.style.left = `${left}px`;
            editor.style.top = `${top}px`;
            editor.style.visibility = 'visible';
        } else {
            editor.classList.add('active');
        }

        // Clear any existing delete confirmation
        const existingConfirmation = editor.querySelector('.delete-confirmation');
        if (existingConfirmation) {
            existingConfirmation.remove();
            editor.querySelector('.editor-actions').style.display = 'flex';
            this.deleteConfirmationVisible = false;
        }
    }

    closeEditor() {
        document.querySelectorAll('.task-editor').forEach(editor => {
            // Clear any delete confirmation when closing
            const confirmation = editor.querySelector('.delete-confirmation');
            if (confirmation) {
                confirmation.remove();
                editor.querySelector('.editor-actions').style.display = 'flex';
                this.deleteConfirmationVisible = false;
            }
            editor.classList.remove('active');
        });
        this.editingTask = null;
    }

    handleTaskEdit(editor) {
        if (!this.editingTask) return;

        const prefix = editor.id === 'floating-editor' ? 'floating-task-' : 'edit-task-';
        
        const updatedTask = {
            ...this.editingTask,
            title: editor.querySelector(`#${prefix}title`).value,
            dueDate: editor.querySelector(`#${prefix}date`).value,
            category: editor.querySelector(`#${prefix}category`).value,
            priority: parseInt(editor.querySelector(`#${prefix}priority`).value),
            completed: editor.querySelector(`#${prefix}completed`).checked
        };

        const index = this.tasks.findIndex(t => t.id === this.editingTask.id);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            this.saveTasks();
            
            // Always update both views regardless of current view
            this.sortTasks(this.currentSortCriterion);
            this.renderTasks();
            this.renderCalendar();
            
            this.closeEditor();
        }
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
            this.executeTaskDelete();
            this.deleteConfirmationVisible = false;
        });
    }

    executeTaskDelete() {
        if (!this.editingTask) return;
        
        this.tasks = this.tasks.filter(t => t.id !== this.editingTask.id);
        this.saveTasks();
        this.sortTasks(this.currentSortCriterion);
        this.renderTasks();
        if (this.currentView === 'calendar') {
            this.renderCalendar();
        }
        this.closeEditor();
    }

    deleteTask() {
        if (!this.editingTask) return;

        this.tasks = this.tasks.filter(t => t.id !== this.editingTask.id);
        this.saveTasks();
        this.sortTasks(this.currentSortCriterion);
        this.renderTasks();
        if (this.currentView === 'calendar') {
            this.renderCalendar();
        }
        this.closeEditor();
    }

    renderCategories() {
        const list = document.getElementById('category-list');
        list.innerHTML = `
            <li class="${this.activeCategory === 'all' ? 'active' : ''}" 
                onclick="app.filterByCategory('all')">
                <i class="fas fa-list"></i> All Tasks
            </li>
            ${this.categories.map(cat => `
                <li class="${this.activeCategory === cat.name ? 'active' : ''}"
                    onclick="app.filterByCategory('${cat.name}')">
                    <span class="category-color" style="background: var(--category-${cat.color})"></span>
                    ${cat.name}
                    <button class="category-edit" onclick="app.editCategory('${cat.name}', event)">
                        <i class="fas fa-pen"></i>
                    </button>
                </li>
            `).join('')}
        `;
    }

    editCategory(categoryName, event) {
        event.stopPropagation();
        const category = this.categories.find(cat => cat.name === categoryName);
        if (!category) return;

        this.editingCategory = category;
        
        const nameInput = document.getElementById('edit-category-name');
        const colorSelect = document.getElementById('edit-category-color');
        
        nameInput.value = category.name;
        colorSelect.value = category.color;
        
        this.categoryEditModal.classList.add('active');
    }

    handleCategoryEdit(e) {
        if (!this.editingCategory) return;

        const newName = document.getElementById('edit-category-name').value;
        const newColor = document.getElementById('edit-category-color').value;
        
        // Update tasks with the new category name
        if (newName !== this.editingCategory.name) {
            this.tasks.forEach(task => {
                if (task.category === this.editingCategory.name) {
                    task.category = newName;
                }
            });
            
            // Update visibleCategories Set
            if (this.visibleCategories.has(this.editingCategory.name)) {
                this.visibleCategories.delete(this.editingCategory.name);
                this.visibleCategories.add(newName);
            }
            
            // Update activeCategory if it's the one being edited
            if (this.activeCategory === this.editingCategory.name) {
                this.activeCategory = newName;
            }
        }

        // Update category
        const index = this.categories.findIndex(cat => cat.name === this.editingCategory.name);
        this.categories[index] = { name: newName, color: newColor };
        
        // Save and refresh
        localStorage.setItem('categories', JSON.stringify(this.categories));
        this.saveTasks();
        this.renderCategories();
        this.renderTasks();
        if (this.currentView === 'calendar') {
            this.renderCalendarCategories();
            this.renderCalendar();
        }
        
        this.categoryEditModal.classList.remove('active');
        this.editingCategory = null;
    }
}

const app = new TodoApp();
