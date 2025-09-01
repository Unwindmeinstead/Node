// Function to setup the priority flag button functionality
function setupFlagPriorityButton(flagButton) {
    flagButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        const card = flagButton.closest('.card');
        if (!card) return;
        
        // Get current priority or set to none if not defined
        let currentPriority = 'none';
        if (flagButton.classList.contains('card-priority-high')) {
            currentPriority = 'high';
        } else if (flagButton.classList.contains('card-priority-medium')) {
            currentPriority = 'medium';
        } else if (flagButton.classList.contains('card-priority-low')) {
            currentPriority = 'low';
        }
        
        // Remove all priority classes
        flagButton.classList.remove('card-priority-high', 'card-priority-medium', 'card-priority-low');
        
        // Cycle through priorities: none -> high -> medium -> low -> none
        let newPriority;
        switch (currentPriority) {
            case 'none':
                newPriority = 'high';
                break;
            case 'high':
                newPriority = 'medium';
                break;
            case 'medium':
                newPriority = 'low';
                break;
            case 'low':
                newPriority = 'none';
                break;
            default:
                newPriority = 'high';
        }
        
        // Apply new priority class if not none
        if (newPriority !== 'none') {
            flagButton.classList.add(`card-priority-${newPriority}`);
            
            // Update the SVG fill and stroke color based on priority
            const flagSvg = flagButton.querySelector('svg');
            if (flagSvg) {
                switch (newPriority) {
                    case 'high':
                        flagSvg.style.fill = 'rgba(229, 57, 53, 0.2)';
                        flagSvg.style.stroke = '#e53935';
                        break;
                    case 'medium':
                        flagSvg.style.fill = 'rgba(251, 140, 0, 0.2)';
                        flagSvg.style.stroke = '#fb8c00';
                        break;
                    case 'low':
                        flagSvg.style.fill = 'rgba(67, 160, 71, 0.2)';
                        flagSvg.style.stroke = '#43a047';
                        break;
                }
            }
        } else {
            // Reset SVG to default styling if priority is none
            const flagSvg = flagButton.querySelector('svg');
            if (flagSvg) {
                flagSvg.style.fill = 'none';
                flagSvg.style.stroke = 'currentColor';
            }
        }
        
        // Update card data attribute for storage
        card.dataset.priority = newPriority;
        
        // Update timestamp and save changes
        if (typeof formatDateTime === 'function' && typeof saveCardsToStorage === 'function') {
            const newDateTime = formatDateTime();
            const timestampElement = card.querySelector('.card-timestamp');
            if (timestampElement) {
                timestampElement.textContent = newDateTime.fullStr;
            }
            
            // Save to storage
            saveCardsToStorage();
            
            // Show notification
            if (typeof showNotification === 'function') {
                if (newPriority !== 'none') {
                    showNotification(`Priority set to ${newPriority}`);
                } else {
                    showNotification('Priority cleared');
                }
            }
        }
    });
}

// Function to initialize a flag button with the stored priority value
function initializeFlagButton(flagButton, priority) {
    if (priority && priority !== 'none') {
        // Apply the priority class
        flagButton.classList.add(`card-priority-${priority}`);
        
        // Update the SVG fill and stroke color based on priority
        const flagSvg = flagButton.querySelector('svg');
        if (flagSvg) {
            switch (priority) {
                case 'high':
                    flagSvg.style.fill = 'rgba(229, 57, 53, 0.2)';
                    flagSvg.style.stroke = '#e53935';
                    break;
                case 'medium':
                    flagSvg.style.fill = 'rgba(251, 140, 0, 0.2)';
                    flagSvg.style.stroke = '#fb8c00';
                    break;
                case 'low':
                    flagSvg.style.fill = 'rgba(67, 160, 71, 0.2)';
                    flagSvg.style.stroke = '#43a047';
                    break;
            }
        }
    }
} 