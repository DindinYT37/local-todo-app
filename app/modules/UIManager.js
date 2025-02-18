import { formatDate, getTaskStatus, getTaskStatusText } from '../utils/dateUtils.js';

export class UIManager {
    constructor(app) {
        this.app = app;
        this.currentView = 'list';
        this.setupEventListeners();
        this.renderCategories();
    }

    setupEventListeners() {
        document.getElementById('add-task').addEventListener('click', () => this.showTaskModal());
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.app.taskManager.sortTasks(e.target.value);
            this.renderTasks();
        });
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });
        
        document.getElementById('sort-direction').addEventListener('click', () => {
            this.app.taskManager.sortDirection *= -1;
            document.getElementById('sort-direction').classList.toggle('reversed');
            this.app.taskManager.sortTasks(this.app.taskManager.currentSortCriterion);
            this.renderTasks();
        });

        document.getElementById('task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTaskSubmit(e);
        });
        
        document.getElementById('add-category').addEventListener('click', () => {
            const modal = document.getElementById('category-modal');
            modal.classList.add('active');
        });

        document.getElementById('category-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCategorySubmit(e);
        });

        document.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalType = btn.dataset.modal;
                const modal = document.getElementById(`${modalType}-modal`);
                modal.classList.remove('active');
            });
        });
    }

    renderTasks() {
        const container = document.getElementById('tasks-container');
        const tasks = this.app.taskManager.getFilteredTasks(this.app.categoryManager.activeCategory);
        
        container.innerHTML = tasks.map(task => this.createTaskHTML(task)).join('');
        this.animateTaskPositions(container);
    }

    createTaskHTML(task) {
        return `
            <div class="task-item ${task.completed ? 'completed' : ''} ${getTaskStatus(task.dueDate, task.completed)}" 
                 data-id="${task.id}"
                 data-category-color="${this.app.categoryManager.getCategoryColor(task.category)}">
                <div class="priority-indicator priority-${task.priority === 3 ? 'high' : task.priority === 2 ? 'medium' : 'low'}"></div>
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                     onclick="event.stopPropagation(); app.taskManager.toggleTask(${task.id})">
                    ${task.completed ? '<i class="fas fa-check"></i>' : '<i class="fas fa-check" style="opacity: 0;"></i>'}
                </div>
                <div class="task-content" onclick="app.editorManager.openEditor(${task.id})">
                    <h3>${task.title}</h3>
                    <div class="task-meta">
                        <span><i class="far fa-calendar"></i> ${formatDate(task.dueDate)}</span>
                        <span><i class="fas fa-tag"></i> ${task.category}</span>
                        <span><i class="fas fa-flag"></i> Priority ${task.priority}</span>
                        ${getTaskStatusText(task.dueDate, task.completed)}
                    </div>
                </div>
            </div>
        `;
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        document.querySelectorAll('.category-controls').forEach(control => {
            control.classList.remove('active');
        });
        document.getElementById(`${view}-categories`).classList.add('active');
        
        if (view === 'calendar') {
            this.app.calendarManager.render();
        }
    }

    showTaskModal() {
        const modal = document.getElementById('task-modal');
        const categorySelect = document.getElementById('task-category');
        categorySelect.innerHTML = this.app.categoryManager.categories.map(cat => 
            `<option value="${cat.name}">${cat.name}</option>`
        ).join('');
        modal.classList.add('active');
    }

    renderCategories() {
        const list = document.getElementById('category-list');
        list.innerHTML = `
            <li class="${this.app.categoryManager.activeCategory === 'all' ? 'active' : ''}" 
                onclick="app.categoryManager.setActiveCategory('all'); app.uiManager.renderCategories(); app.uiManager.renderTasks();">
                <i class="fas fa-list"></i> All Tasks
            </li>
            ${this.app.categoryManager.categories.map(cat => `
                <li class="${this.app.categoryManager.activeCategory === cat.name ? 'active' : ''}"
                    onclick="app.categoryManager.setActiveCategory('${cat.name}'); app.uiManager.renderCategories(); app.uiManager.renderTasks();">
                    <span class="category-color" style="background: var(--category-${cat.color})"></span>
                    ${cat.name}
                    <button class="category-edit" onclick="app.uiManager.editCategory('${cat.name}', event)">
                        <i class="fas fa-pen"></i>
                    </button>
                </li>
            `).join('')}
        `;
    }

    handleTaskSubmit(e) {
        const taskData = {
            title: document.getElementById('task-title').value,
            dueDate: document.getElementById('task-date').value,
            category: document.getElementById('task-category').value,
            priority: parseInt(document.getElementById('task-priority').value),
        };
        
        this.app.taskManager.addTask(taskData);
        this.renderTasks();
        document.getElementById('task-modal').classList.remove('active');
        e.target.reset();
    }

    handleCategorySubmit(e) {
        const name = document.getElementById('category-name').value;
        const color = document.getElementById('category-color').value;
        
        if (this.app.categoryManager.addCategory(name, color)) {
            this.renderCategories();
            document.getElementById('category-modal').classList.remove('active');
            e.target.reset();
        }
    }

    editCategory(categoryName, event) {
        event.stopPropagation();
        const category = this.app.categoryManager.categories.find(cat => cat.name === categoryName);
        if (!category) return;
        
        const nameInput = document.getElementById('edit-category-name');
        const colorSelect = document.getElementById('edit-category-color');
        
        nameInput.value = category.name;
        colorSelect.value = category.color;
        
        document.getElementById('category-edit-modal').classList.add('active');
    }

    animateTaskPositions(container) {
        const oldItems = Array.from(container.children);
        const oldPositions = new Map();
        
        oldItems.forEach(item => {
            const rect = item.getBoundingClientRect();
            oldPositions.set(item.dataset.id, rect);
        });
        
        requestAnimationFrame(() => {
            Array.from(container.children).forEach(item => {
                const oldRect = oldPositions.get(item.dataset.id);
                if (oldRect) {
                    const newRect = item.getBoundingClientRect();
                    const deltaY = oldRect.top - newRect.top;
                    
                    if (deltaY !== 0) {  // Only animate if position changed
                        item.style.transform = `translateY(${deltaY}px)`;
                        item.style.transition = 'none';
                        
                        requestAnimationFrame(() => {
                            item.classList.add('moving');
                            item.style.transform = '';
                            item.style.transition = '';
                            
                            // Remove moving class after animation
                            item.addEventListener('transitionend', () => {
                                item.classList.remove('moving');
                            }, { once: true });
                        });
                    }
                } else {
                    item.classList.add('new');
                }
            });
        });
    }
}
