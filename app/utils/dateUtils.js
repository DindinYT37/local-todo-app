export function formatDate(dateString) {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

export function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

export function getTaskStatus(dueDate, completed = false) {
    if (!dueDate || completed) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(dueDate);
    taskDate.setHours(0, 0, 0, 0);

    if (taskDate.getTime() === today.getTime()) return 'due-today';
    if (taskDate < today) return 'overdue';
    return '';
}

export function getTaskStatusText(dueDate, completed = false) {
    if (!dueDate || completed) return '';
    
    const status = getTaskStatus(dueDate, completed);
    if (status === 'due-today') return '<span class="due-status due-today"><i class="fas fa-exclamation-circle"></i> Due today</span>';
    if (status === 'overdue') return '<span class="due-status overdue"><i class="fas fa-exclamation-triangle"></i> Overdue</span>';
    return '';
}
