#!/usr/bin/env python3
# Fix indentation issues in app.py

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix lines 3710-3714 (0-indexed: 3709-3713)
# These lines should have 4 tabs to match the indentation of the code block
for i in range(3709, 3715):  # Lines 3710-3715 in 1-indexed notation
    if i < len(lines):
        line = lines[i]
        # If the line starts with 3 tabs and is not empty and not just whitespace
        if line.startswith('\t\t\t') and not line.startswith('\t\t\t\t') and line.strip():
            # Add one more tab
            lines[i] = '\t' + line

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Fixed indentation on lines 3710-3715')
