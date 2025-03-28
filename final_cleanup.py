with open('index.html', 'r') as file:
    lines = file.readlines()

# Find the deleteButton line
for i in range(17080, 17090):
    if 'deleteButton' in lines[i]:
        # Insert the comment before the deleteButton line
        lines.insert(i, '            // Add delete functionality for the card\n')
        
        # Get the deleteButton line
        deleteButton_line = lines[i + 1]
        
        # Remove the deleteButton line
        lines.pop(i + 1)
        
        # Find the const declaration for deleteButton
        const_line = -1
        for j in range(i - 10, i):
            if 'const deleteButton' in lines[j]:
                const_line = j
                break
        
        if const_line != -1:
            # Insert the deleteButton line after the const declaration
            lines.insert(const_line + 1, deleteButton_line)
        else:
            # If we can't find the const declaration, add it
            lines.insert(i, '            const deleteButton = card.querySelector(\'.delete-card\');\n')
            lines.insert(i + 1, deleteButton_line)
        
        break

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.writelines(lines)

print("Fixed the deleteButton line in index.html") 