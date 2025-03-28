with open('index.html', 'r') as file:
    lines = file.readlines()

# Find the flag button section
i = 0
while i < len(lines):
    if '// Add flag button functionality' in lines[i]:
        # Check if we have enough lines and the next line defines flagButton
        if i+1 < len(lines) and 'const flagButton = ' in lines[i+1]:
            # Store the flagButton line to keep it
            flag_button_line = lines[i+1]
            
            # Find where to end the replacement (at the next section comment)
            end_idx = i+2
            while end_idx < len(lines) and '// Add ' not in lines[end_idx]:
                end_idx += 1
            
            # If we reached the end without finding another comment, use a safe default
            if end_idx >= len(lines):
                end_idx = i+2
            
            # Create new content
            new_content = [
                lines[i],  # Keep the comment line
                flag_button_line,  # Keep the flagButton declaration
                '            // Use setupFlagPriorityButton from flag_priority.js\n',
                '            setupFlagPriorityButton(flagButton);\n',
                '\n'
            ]
            
            # Replace the content
            lines[i:end_idx] = new_content
            print(f"Updated flag button functionality at line {i+1}")
            
            # Skip ahead to avoid reprocessing
            i = end_idx
        else:
            i += 1
    else:
        i += 1

# Write the changes back
with open('index.html', 'w') as file:
    file.writelines(lines)

print("Finished updating the setupCardEvents function!") 