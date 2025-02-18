import { getTaskStatus } from '../utils/dateUtils.js';

export class TaskManager {
    constructor(app) {
        this.app = app;
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.sortDirection = 1;
        this.currentSortCriterion = 'priority';
    }

    addTask(taskData) {
        const task = {
            id: Date.now(),
            ...taskData,
            completed: false
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.sortTasks(this.currentSortCriterion);
        return task;
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.sortTasks(this.currentSortCriterion);
            this.app.uiManager.renderTasks();
            if (this.app.uiManager.currentView === 'calendar') {
                this.app.calendarManager.render();
            }
        }
    }

    updateTask(id, updates) {
        const index = this.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updates };
            this.saveTasks();
            this.sortTasks(this.currentSortCriterion);
        }
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.sortTasks(this.currentSortCriterion);
    }

    sortTasks(criterion) {
        this.currentSortCriterion = criterion;
        
        const prioritizeDueTasks = (a, b) => {
            if (a.completed && !b.completed) return 1;
            if (!a.completed && b.completed) return -1;
            
            const statusA = getTaskStatus(a.dueDate);
            const statusB = getTaskStatus(b.dueDate);
            
            if (statusA === 'overdue' && statusB !== 'overdue') return -1;
            if (statusB === 'overdue' && statusA !== 'overdue') return 1;
            if (statusA === 'due-today' && statusB !== 'due-today') return -1;
            if (statusB === 'due-today' && statusA !== 'due-today') return 1;
            
            return 0;
        };

        this.tasks.sort((a, b) => {
            const dueSort = prioritizeDueTasks(a, b);
            if (dueSort !== 0) return dueSort;

            switch(criterion) {
                case 'priority':
                    return (b.priority - a.priority) * this.sortDirection;
                case 'date':
                    return (new Date(a.dueDate || '9999') - new Date(b.dueDate || '9999')) * this.sortDirection;
                case 'category':
                    return a.category.localeCompare(b.category) * this.sortDirection;
                default:
                    return 0;
            }
        });
    }

    getFilteredTasks(category = 'all') {
        if (category === 'all') {
            return this.tasks;
        }
        return this.tasks.filter(task => task.category === category);
    }

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }
}
