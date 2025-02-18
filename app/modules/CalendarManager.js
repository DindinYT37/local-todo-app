import { getDaysInMonth, getTaskStatus } from '../utils/dateUtils.js';

export class CalendarManager {
    constructor(app) {
        this.app = app;
        this.currentDate = new Date();
        this.draggedTask = null;
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeTimeout = null;
        this.lastResize = Date.now();
        this.activeOverflowMenu = null;
        this.setupEventListeners();
        this.setupResizeObserver();
        this.setupGlobalListeners();
    }

    setupEventListeners() {
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
        });

        const calendarGrid = document.getElementById('calendar-grid');
        calendarGrid.addEventListener('dragstart', (e) => this.handleDragStart(e));
        calendarGrid.addEventListener('dragend', (e) => this.handleDragEnd(e));
    }

    setupResizeObserver() {
        const calendarGrid = document.querySelector('.calendar-days-grid');
        if (calendarGrid) {
            this.resizeObserver.observe(calendarGrid);
        }

        // Re-setup observer after rendering
        this.resizeObserver.disconnect();
        window.addEventListener('resize', this.handleWindowResize.bind(this));
    }

    setupGlobalListeners() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.overflow-menu') && !e.target.closest('.more-tasks')) {
                this.hideOverflowMenu();
            }
        });
    }

    hideOverflowMenu() {
        if (this.activeOverflowMenu) {
            this.activeOverflowMenu.remove();
            this.activeOverflowMenu = null;
        }
    }

    handleResize() {
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.populateDayTasks();
        }, 100);
    }

    handleWindowResize() {
        if (Date.now() - this.lastResize > 100) {
            this.lastResize = Date.now();
            this.render();
        }
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        document.getElementById('calendar-title').textContent =
            new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

        this.renderGrid(year, month);
        this.renderCalendarCategories();

        requestAnimationFrame(() => {
            this.populateDayTasks();
            this.lastResize = Date.now();
        });
    }

    getTasksForDate(date) {
        return this.app.taskManager.tasks.filter(task => {
            if (!task.dueDate) return false;
            const taskDate = new Date(task.dueDate);
            return taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear() &&
                this.app.categoryManager.visibleCategories.has(task.category);
        });
    }

    renderGrid(year, month) {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = getDaysInMonth(year, month);
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

        const days = this.generateDaysArray(year, month, firstDay, daysInMonth);
        this.renderDaysGrid(days, today);
    }

    generateDaysArray(year, month, firstDay, daysInMonth) {
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
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            const date = new Date(year, month + 1, i);
            const tasks = this.getTasksForDate(date);
            days.push({ date, tasks, different: true });
        }

        return days;
    }

    renderDaysGrid(days, today) {
        const daysGrid = document.querySelector('.calendar-days-grid');
        daysGrid.innerHTML = days.map(({ date, tasks, different }) => {
            const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const isToday = localDate.toDateString() === today.toDateString();
            return this.createDayHTML(localDate, isToday, different, tasks);
        }).join('');
        
        requestAnimationFrame(() => this.populateDayTasks());
    }

    createDayHTML(date, isToday, different, tasks) {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        return `
            <div class="calendar-day ${different ? 'different-month' : ''} ${isToday ? 'today' : ''}"
                 data-date="${dateStr}"
                 data-tasks="${tasks.length}"
                 ondragover="app.calendarManager.handleDragOver(event)"
                 ondrop="app.calendarManager.handleDrop(event)"
                 ondragenter="app.calendarManager.handleDragEnter(event)"
                 ondragleave="app.calendarManager.handleDragLeave(event)"
                 onclick="app.editorManager.handleCalendarDayClick(event)">
                <div class="day-number">${date.getDate()}</div>
                <div class="day-tasks"></div>
            </div>
        `;
    }

    populateDayTasks() {
        document.querySelectorAll('.calendar-day').forEach(dayElement => {
            const tasks = this.getTasksForDate(new Date(dayElement.dataset.date));
            const { visible, remaining } = this.calculateVisibleTasks(dayElement, tasks);
            
            const tasksContainer = dayElement.querySelector('.day-tasks');
            const visibleTasksHtml = visible.map(task => this.createTaskHTML(task)).join('');
            
            const hiddenTasks = tasks.slice(visible.length);
            const hiddenTasksData = JSON.stringify(hiddenTasks)
                .replace(/"/g, '&quot;'); // Escape quotes for HTML attribute

            tasksContainer.innerHTML = `
                ${visibleTasksHtml}
                ${remaining > 0 ? `
                    <div class="more-tasks" 
                         data-hidden-tasks='${hiddenTasksData}'
                         onclick="event.stopPropagation(); app.calendarManager.showOverflowMenu(this, event)">
                        +${remaining} more
                    </div>` : ''}
            `;
        });
    }

    calculateVisibleTasks(dayElement, tasks) {
        if (!tasks.length) return { visible: [], remaining: 0 };

        const dayHeight = dayElement.clientHeight;
        const dayNumberHeight = dayElement.querySelector('.day-number')?.offsetHeight || 0;
        const taskHeight = 26; // Increased to account for margins
        const moreTasksHeight = 24; // More indicator space
        const padding = 20; // Total padding (top + bottom)

        // Calculate available space, always reserve space for "more" indicator
        const availableHeight = dayHeight - dayNumberHeight - moreTasksHeight - padding;
        const maxTasks = Math.max(0, Math.floor(availableHeight / taskHeight));

        return {
            visible: tasks.slice(0, maxTasks),
            remaining: tasks.length > maxTasks ? tasks.length - maxTasks : 0
        };
    }

    handleDragStart(e) {
        const taskElement = e.target.closest('.calendar-task');
        if (taskElement) {
            this.draggedTask = this.app.taskManager.tasks.find(
                t => t.id === parseInt(taskElement.dataset.taskId)
            );
            taskElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', taskElement.dataset.taskId);
        }
    }

    handleDragEnd(e) {
        const taskElement = e.target.closest('.calendar-task');
        if (taskElement) {
            taskElement.classList.remove('dragging');
            this.draggedTask = null;
            document.querySelectorAll('.calendar-day').forEach(day => {
                day.classList.remove('drag-over');
            });
        }
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        const day = e.target.closest('.calendar-day');
        if (day) {
            day.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const day = e.target.closest('.calendar-day');
        if (day && e.target.closest('.calendar-day') === day) {
            day.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const day = e.target.closest('.calendar-day');
        if (!day || !this.draggedTask) return;

        day.classList.remove('drag-over');
        const newDate = day.dataset.date;
        
        this.app.taskManager.updateTask(this.draggedTask.id, { dueDate: newDate });
        this.render();
        this.app.uiManager.renderTasks();
    }

    showOverflowMenu(element, event) {
        event.preventDefault();
        event.stopPropagation();
        this.hideOverflowMenu();

        const tasks = JSON.parse(element.dataset.hiddenTasks);
        
        const menu = document.createElement('div');
        menu.className = 'overflow-menu';
        menu.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');

        document.body.appendChild(menu);
        
        const rect = element.getBoundingClientRect();
        
        // Position menu to the right of the click, or to the left if not enough space
        let left = rect.right + 5;
        let top = rect.top;
        
        menu.style.visibility = 'hidden';
        menu.classList.add('active');
        
        // Wait for menu to be rendered to get its dimensions
        requestAnimationFrame(() => {
            const menuRect = menu.getBoundingClientRect();
            
            if (left + menuRect.width > window.innerWidth) {
                left = rect.left - menuRect.width - 5;
            }
            
            if (top + menuRect.height > window.innerHeight) {
                top = window.innerHeight - menuRect.height - 5;
            }

            menu.style.left = `${Math.max(5, left)}px`;
            menu.style.top = `${Math.max(5, top)}px`;
            menu.style.visibility = 'visible';
        });

        this.activeOverflowMenu = menu;
    }

    createTaskHTML(task) {
        return `
            <div class="calendar-task ${task.completed ? 'completed' : ''} 
                                    ${getTaskStatus(task.dueDate, task.completed)}"
                 data-category-color="${this.app.categoryManager.getCategoryColor(task.category)}"
                 data-task-id="${task.id}"
                 draggable="true"
                 onclick="event.stopPropagation(); app.editorManager.openEditor(${task.id}, true, event)">
                ${task.title}
            </div>
        `;
    }

    renderCalendarCategories() {
        const list = document.getElementById('category-checkbox-list');
        const checkAll = document.getElementById('check-all-categories');
        checkAll.checked = this.app.categoryManager.visibleCategories.size === this.app.categoryManager.categories.length;

        list.innerHTML = this.app.categoryManager.categories.map(cat => this.createCategoryCheckboxHTML(cat)).join('');
        this.setupCategoryListeners();
    }

    createCategoryCheckboxHTML(category) {
        return `
            <li class="calendar-category-item" data-color="${category.color}">
                <label>
                    <input type="checkbox" 
                           class="category-checkbox" 
                           value="${category.name}" 
                           ${this.app.categoryManager.visibleCategories.has(category.name) ? 'checked' : ''}>
                    <span>${category.name}</span>
                </label>
            </li>
        `;
    }

    setupCategoryListeners() {
        document.querySelectorAll('.category-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.app.categoryManager.toggleCategoryVisibility(e.target.value);
                document.getElementById('check-all-categories').checked =
                    this.app.categoryManager.visibleCategories.size === this.app.categoryManager.categories.length;
                this.render();
            });
        });

        document.getElementById('check-all-categories').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.app.categoryManager.visibleCategories = new Set(this.app.categoryManager.categories.map(cat => cat.name));
            } else {
                this.app.categoryManager.visibleCategories.clear();
            }
            document.querySelectorAll('.category-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            this.render();
        });
    }
}
