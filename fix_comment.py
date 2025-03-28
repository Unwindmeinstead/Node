with open('index.html', 'r') as file:
    lines = file.readlines()

# Find the deleteButton line and the comment line
for i in range(17080, 17090):
    if 'deleteButton.addEventListener' in lines[i]:
        # Check if the next line is the comment
        if '// Add delete functionality' in lines[i + 1]:
            # Move the comment before the deleteButton.addEventListener line
            comment_line = lines.pop(i + 1)
            lines.insert(i, comment_line)
            break

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.writelines(lines)

print("Fixed the comment line order in index.html") 