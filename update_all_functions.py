with open('index.html', 'r') as file:
    lines = file.readlines()

# Find all instances of setupCardEvents function
for i in range(len(lines)):
    if 'function setupCardEvents(card)' in lines[i]:
        # Find the flag button section
        flag_button_line = -1
        for j in range(i, min(i + 100, len(lines))):
            if '// Add flag button functionality' in lines[j]:
                flag_button_line = j
                break
        
        if flag_button_line != -1:
            # Find the end of the flag button functionality section
            end_flag_section = -1
            for j in range(flag_button_line, min(flag_button_line + 100, len(lines))):
                if '// Add delete functionality' in lines[j]:
                    end_flag_section = j
                    break
            
            if end_flag_section != -1:
                # Replace the flag button functionality with setupFlagPriorityButton
                flag_button_declaration = lines[flag_button_line + 1]
                
                # Create the new lines
                new_lines = [
                    lines[flag_button_line],  # Keep the comment
                    flag_button_declaration,  # Keep the flagButton declaration
                    '            // Use setupFlagPriorityButton from flag_priority.js\n',
                    '            setupFlagPriorityButton(flagButton);\n',
                    '\n'
                ]
                
                # Replace the old section with the new lines
                lines[flag_button_line:end_flag_section] = new_lines

with open('index.html', 'w') as file:
    file.writelines(lines)

print("Updated all instances of setupCardEvents function in index.html") 