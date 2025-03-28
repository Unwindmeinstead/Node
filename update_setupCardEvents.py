import re

# Read the index.html file
with open('index.html', 'r') as file:
    content = file.read()

# Define the pattern to match the setupCardEvents function
pattern = r'(function setupCardEvents\(card\) \{\s+// Make card draggable\s+makeDraggable\(card\);\s+)// Initialize priority flag if set\s+const flagButton = card\.querySelector\(\\\'\.card-priority-flag\\\'\);\s+const priority = card\.dataset\.priority;\s+\s+// Use the initializeFlagButton function from flag_priority\.js\s+initializeFlagButton\(flagButton, priority\);\s+\s+// Setup flag priority button functionality\s+setupFlagPriorityButton\(flagButton\);'

# Define the replacement
replacement = r'\1// Initialize priority flag if set\n            const flagButton = card.querySelector(\'.card-priority-flag\');\n            const priority = card.dataset.priority;\n            \n            // Use the initializeFlagButton function from flag_priority.js\n            initializeFlagButton(flagButton, priority);\n            \n            // Setup flag priority button functionality\n            setupFlagPriorityButton(flagButton);'

# Replace the pattern in the content
updated_content = re.sub(pattern, replacement, content)

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.write(updated_content)

print("Updated setupCardEvents function in index.html") 