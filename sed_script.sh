#!/bin/bash

# Create a temporary file
cat > temp_changes.txt << 'EOF'
            // Add flag button functionality
            const flagButton = card.querySelector('.card-priority-flag');
            // Use setupFlagPriorityButton from flag_priority.js
            setupFlagPriorityButton(flagButton);

            // Add delete functionality for the task
EOF

# Use sed to replace the lines
sed -i '' '17079,17150c\\' index.html
cat temp_changes.txt >> index.html

# Clean up
rm temp_changes.txt

echo "Updated flag button functionality in index.html" 