export function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

export function positionElement(element, targetRect, margin = 20) {
    const elementRect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = targetRect.top;
    if (top + elementRect.height > viewportHeight - margin) {
        top = Math.max(margin, viewportHeight - elementRect.height - margin);
    }
    top = Math.max(margin, top);

    let left;
    const spaceRight = viewportWidth - targetRect.right;
    if (spaceRight >= elementRect.width + margin) {
        left = targetRect.right + 10;
    } else {
        left = targetRect.left - elementRect.width - 10;
        if (left < margin) {
            left = margin;
        }
    }

    return { top, left };
}
