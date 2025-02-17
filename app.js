class TodoApp {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || ['Personal', 'Work'];
        this.currentView = 'list';
        this.modal = document.getElementById('task-modal');
        this.categoryModal = document.getElementById('category-modal');
        this.activeCategory = 'all';
        this.sortDirection = 1; // 1 for ascending, -1 for descending
        this.currentSortCriterion = 'priority';
        this.currentDate = new Date();
        this.visibleCategories = new Set(this.categories); // Add this line
        this.initializeApp();
        this.setupTheme();
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
    }

    addTask() {
        this.modal.classList.add('active');
        const categorySelect = document.getElementById('task-category');
        categorySelect.innerHTML = this.categories.map(cat => 
            `<option value="${cat}">${cat}</option>`
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
            <li class="calendar-category-item">
                <label>
                    <input type="checkbox" 
                           class="category-checkbox" 
                           value="${cat}" 
                           ${this.visibleCategories.has(cat) ? 'checked' : ''}>
                    <span>${cat}</span>
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
                this.visibleCategories = new Set(this.categories);
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
        if (categoryName && !this.categories.includes(categoryName)) {
            this.categories.push(categoryName);
            this.visibleCategories.add(categoryName); // Add this line
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
            <div class="task-item ${task.completed ? 'completed' : ''} ${this.getTaskStatus(task.dueDate, task.completed)}" data-id="${task.id}">
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

    renderCategories() {
        const list = document.getElementById('category-list');
        list.innerHTML = `
            <li class="${this.activeCategory === 'all' ? 'active' : ''}" 
                onclick="app.filterByCategory('all')">
                <i class="fas fa-list"></i> All Tasks
            </li>
            ${this.categories.map(cat => `
                <li class="${this.activeCategory === cat ? 'active' : ''}"
                    onclick="app.filterByCategory('${cat}')">
                    <i class="fas fa-tag"></i> ${cat}
                </li>
            `).join('')}
        `;
    }
}

const app = new TodoApp();
