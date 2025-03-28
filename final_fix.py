with open('index.html', 'r') as file:
    lines = file.readlines()

# Find the flag button functionality section at line 17079
start_line = 17078  # 0-indexed
flag_button_line = start_line + 1  # Line with flagButton declaration

# Find the delete functionality comment line
end_line = -1
for i in range(start_line + 2, min(start_line + 100, len(lines))):
    if '// Add delete functionality' in lines[i]:
        end_line = i
        break

if end_line != -1:
    # Keep the flag button declaration
    flag_button_declaration = lines[flag_button_line]
    
    # Create the new section
    new_section = [
        lines[start_line],  # Keep the comment line
        flag_button_declaration,  # Keep the flagButton declaration
        '            // Use setupFlagPriorityButton from flag_priority.js\n',
        '            setupFlagPriorityButton(flagButton);\n',
        '\n'
    ]
    
    # Replace the section
    lines[start_line:end_line] = new_section
    
    # Write the updated content back to the file
    with open('index.html', 'w') as file:
        file.writelines(lines)
    
    print(f"Updated flag button functionality in index.html (lines {start_line+1} to {end_line})")
else:
    print("Could not find the delete functionality comment line") 