with open('index.html', 'r') as file:
    lines = file.readlines()

# Add the missing comment before the deleteButton line
lines.insert(17083, '            // Add delete functionality for the card\n')

# Write the updated content back to the file
with open('index.html', 'w') as file:
    file.writelines(lines)

print("Added missing comment in index.html") 