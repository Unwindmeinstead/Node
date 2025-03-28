with open('index.html', 'r') as file:
    lines = file.readlines()

# Find all instances of setupCardEvents function
for i in range(len(lines)):
    if 'function setupCardEvents(card)' in lines[i]:
        # Check if the next few lines contain the old implementation
        if 'Initialize priority flag if set' in lines[i+2] and 'if (priority && priority !== \'none\')' in lines[i+6]:
            # Replace with new implementation
            lines[i+2] = '            // Initialize priority flag if set\n'
            lines[i+3] = '            const flagButton = card.querySelector(\'.card-priority-flag\');\n'
            lines[i+4] = '            const priority = card.dataset.priority;\n'
            lines[i+5] = '            \n'
            lines[i+6] = '            // Use the initializeFlagButton function from flag_priority.js\n'
            lines[i+7] = '            initializeFlagButton(flagButton, priority);\n'
            lines[i+8] = '            \n'
            lines[i+9] = '            // Setup flag priority button functionality\n'
            lines[i+10] = '            setupFlagPriorityButton(flagButton);\n'
            
            # Delete the old implementation lines (11-30)
            for j in range(11, 31):
                lines[i+j] = ''

with open('index.html', 'w') as file:
    file.writelines(lines)

print("Fixed setupCardEvents function in index.html") 