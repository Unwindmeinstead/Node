with open('index.html', 'r') as file:
    lines = file.readlines()

# Remove the incorrectly placed comment
lines.pop(17083)

# Find the deleteButton line
for i in range(17083, 17090):
    if 'deleteButton' in lines[i]:
        # Insert the comment before the deleteButton line
        lines.insert(i, '            // Add delete functionality for the card\n')
        break

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.writelines(lines)

print("Fixed the order of lines in index.html") 