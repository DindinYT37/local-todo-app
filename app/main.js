import { TaskManager } from './modules/TaskManager.js';
import { CategoryManager } from './modules/CategoryManager.js';
import { UIManager } from './modules/UIManager.js';
import { CalendarManager } from './modules/CalendarManager.js';
import { EditorManager } from './modules/EditorManager.js';
import { ThemeManager } from './modules/ThemeManager.js';

class TodoApplication {
    constructor() {
        this.taskManager = new TaskManager(this);
        this.categoryManager = new CategoryManager(this);
        this.uiManager = new UIManager(this);
        this.calendarManager = new CalendarManager(this);
        this.editorManager = new EditorManager(this);
        this.themeManager = new ThemeManager();
        
        // Initial render
        this.uiManager.renderTasks();
        this.calendarManager.render();
    }
}

// Create global instance
window.app = new TodoApplication();
