#!/usr/bin/env python
# Fix the except indentation to match the try block

with open('app.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# The except on line 1118 (index 1117) has 4 tabs but should have 3 tabs
if lines[1117].strip().startswith('except:'):
    lines[1117] = '\t\t\texcept:\n'
    print(f"Fixed line 1118 - except indentation corrected from 4 tabs to 3 tabs")

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed try/except structure")
