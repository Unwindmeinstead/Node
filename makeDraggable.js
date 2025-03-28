// Function to make a card draggable
function makeDraggable(card) {
    let offsetX, offsetY;
    
    // Handle mousedown event
    card.addEventListener('mousedown', function(e) {
        // Don't drag when clicking interactive elements
        if (e.target.closest('.delete-card, .toggle-collapse, .task-checkbox, .delete-task, .add-step, .color-picker, [contenteditable="true"]')) {
            return;
        }
        
        e.preventDefault();
        
        // Get the card's current position
        const rect = card.getBoundingClientRect();
        
        // Store the offset between mouse position and card corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Prepare card for dragging - absolute positioning is key
        card.classList.add('positioned');
        card.classList.add('dragging');
        card.dataset.moved = 'true';
        card.style.position = 'fixed'; // Use fixed to avoid scrolling issues
        card.style.margin = '0';
        card.style.transform = 'none'; // Clear transforms
        
        // Set initial position
        updateCardPosition(e);
        
        // Add document-level event listeners
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    // Handle mousemove event
    function onMouseMove(e) {
        e.preventDefault();
        updateCardPosition(e);
    }
    
    // Handle mouseup event
    function onMouseUp(e) {
        // Clean up listeners
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        card.classList.remove('dragging');
        
        // Make sure the card stays positioned
        card.classList.add('positioned');
        card.dataset.moved = 'true';
        
        // Save the final position
        saveCardsToStorage();
    }
    
    // Helper function to update card position during drag
    function updateCardPosition(e) {
        card.style.left = (e.clientX - offsetX) + 'px';
        card.style.top = (e.clientY - offsetY) + 'px';
    }
    
    // Add touch support
    card.addEventListener('touchstart', function(e) {
        // Don't drag when touching interactive elements
        if (e.target.closest('.delete-card, .toggle-collapse, .task-checkbox, .delete-task, .add-step, .color-picker, [contenteditable="true"]')) {
            return;
        }
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        
        // Store the offset between touch position and card corner
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;
        
        // Prepare card for dragging
        card.classList.add('positioned');
        card.classList.add('dragging');
        card.dataset.moved = 'true';
        card.style.position = 'fixed'; // Use fixed for touch too
        card.style.margin = '0';
        card.style.transform = 'none'; // Clear transforms
        
        // Set initial position
        updateTouchPosition(touch);
        
        // Add document-level touch event listeners
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }, { passive: false });
    
    // Handle touchmove event
    function onTouchMove(e) {
        e.preventDefault();
        updateTouchPosition(e.touches[0]);
    }
    
    // Handle touchend event
    function onTouchEnd() {
        // Clean up listeners
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        
        card.classList.remove('dragging');
        
        // Make sure the card stays positioned
        card.classList.add('positioned');
        card.dataset.moved = 'true';
        
        // Save the final position
        saveCardsToStorage();
    }
    
    // Helper function to update card position during touch
    function updateTouchPosition(touch) {
        card.style.left = (touch.clientX - offsetX) + 'px';
        card.style.top = (touch.clientY - offsetY) + 'px';
    }
} 