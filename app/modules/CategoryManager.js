export class CategoryManager {
    constructor(app) {
        this.app = app;
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { name: 'Personal', color: 'blue' },
            { name: 'Work', color: 'green' }
        ];
        this.visibleCategories = new Set(this.categories.map(cat => cat.name));
        this.activeCategory = 'all';
    }

    addCategory(name, color) {
        if (!this.categories.find(cat => cat.name === name)) {
            this.categories.push({ name, color });
            this.visibleCategories.add(name);
            this.saveCategories();
            return true;
        }
        return false;
    }

    updateCategory(oldName, newName, newColor) {
        const index = this.categories.findIndex(cat => cat.name === oldName);
        if (index !== -1) {
            this.categories[index] = { name: newName, color: newColor };
            
            if (this.visibleCategories.has(oldName)) {
                this.visibleCategories.delete(oldName);
                this.visibleCategories.add(newName);
            }
            
            if (this.activeCategory === oldName) {
                this.activeCategory = newName;
            }
            
            this.saveCategories();
            return true;
        }
        return false;
    }

    getCategoryColor(categoryName) {
        const category = this.categories.find(cat => cat.name === categoryName);
        return category ? category.color : 'blue';
    }

    toggleCategoryVisibility(categoryName) {
        if (this.visibleCategories.has(categoryName)) {
            this.visibleCategories.delete(categoryName);
        } else {
            this.visibleCategories.add(categoryName);
        }
    }

    setActiveCategory(category) {
        this.activeCategory = category;
    }

    saveCategories() {
        localStorage.setItem('categories', JSON.stringify(this.categories));
    }
}
