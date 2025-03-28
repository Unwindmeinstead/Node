import re

with open('index.html', 'r') as file:
    content = file.read()

# Pattern to match the flag button functionality in setupCardEvents
pattern = r'(// Add flag button functionality\s+const flagButton = card\.querySelector\(\'\.card-priority-flag\'\);)[\s\S]*?(// Add delete functionality)'

# Replacement with setupFlagPriorityButton
replacement = r'\1\n            // Use setupFlagPriorityButton from flag_priority.js\n            setupFlagPriorityButton(flagButton);\n            \n            \2'

# Replace all occurrences
updated_content = re.sub(pattern, replacement, content)

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.write(updated_content)

print("Updated all instances of flag button functionality in index.html") 