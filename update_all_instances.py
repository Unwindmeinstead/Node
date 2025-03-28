import re

with open('index.html', 'r') as file:
    content = file.read()

# Find all instances of setupCardEvents function
pattern = r'(function setupCardEvents\(card\) \{[\s\S]*?// Add flag button functionality[\s\S]*?const flagButton = card\.querySelector\(\'\.card-priority-flag\'\);)[\s\S]*?(// Add delete functionality)'

replacement = r'\1\n            // Use setupFlagPriorityButton from flag_priority.js\n            setupFlagPriorityButton(flagButton);\n            \n            \2'

# Replace the pattern in the content
updated_content = re.sub(pattern, replacement, content)

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.write(updated_content)

print("Updated all instances of setupCardEvents function in index.html") 