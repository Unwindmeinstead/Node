with open('index.html', 'r') as file:
    lines = file.readlines()

# Find the flag button functionality section
start_line = -1
end_line = -1
for i, line in enumerate(lines):
    if '// Add flag button functionality' in line and start_line == -1:
        start_line = i
    if start_line != -1 and '// Add delete functionality' in line:
        end_line = i
        break

if start_line != -1 and end_line != -1:
    # Replace the section with the new code
    new_section = [
        '            // Add flag button functionality\n',
        '            const flagButton = card.querySelector(\'.card-priority-flag\');\n',
        '            // Use setupFlagPriorityButton from flag_priority.js\n',
        '            setupFlagPriorityButton(flagButton);\n',
        '\n',
        '            // Add delete functionality for the task\n'
    ]
    
    # Replace the lines
    lines[start_line:end_line] = new_section
    
    # Write the updated content back to the file
    with open('index.html', 'w') as file:
        file.writelines(lines)
    
    print(f"Updated flag button functionality in index.html (lines {start_line+1} to {end_line})")
else:
    print("Could not find the flag button functionality section") 