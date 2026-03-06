#!/usr/bin/env python
# Fix indentation error by removing the two extra-indented lines

with open('app.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Remove lines 1115 and 1116 (0-indexed: 1114 and 1115)
# These are the two lines with extra indentation that are causing the syntax error
new_lines = lines[:1114] + lines[1116:]

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed: Removed 2 lines with extra indentation")
print(f"Original length: {len(lines)} lines")
print(f"New length: {len(new_lines)} lines")
