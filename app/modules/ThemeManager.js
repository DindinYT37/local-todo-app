export class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.setupTheme();
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') === 'dark';
        
        if (savedTheme) {
            document.body.classList.add('dark-mode');
            this.updateThemeIcon();
        }

        this.themeToggle.innerHTML = `
            <i class="fas fa-moon"></i>
            <i class="fas fa-sun"></i>
        `;
        
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    toggleTheme() {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        this.updateThemeIcon();
    }

    updateThemeIcon() {
        const isDark = document.body.classList.contains('dark-mode');
        this.themeToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
    }
}
