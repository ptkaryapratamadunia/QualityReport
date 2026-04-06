#!/usr/bin/env python3
# Fix indentation in if/else blocks

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Lines that have 6 tabs but should have 5 tabs (bodies of if/else at lines 3718, 3720)
# Also need to check further down for more bodies

indices_to_fix = [3717, 3719]  # Line 3718 and 3720 (0-indexed)

for i in indices_to_fix:
    if i < len(lines):
        line = lines[i]
        if line.startswith('\t\t\t\t\t\t'):  # 6 tabs
            lines[i] = line[1:]  # Remove one tab
            print(f"Fixed line {i+1}: removed 1 tab")

# We may also need to fix more lines down the chain - let's find all lines with 6 tabs
# after the if block and reduce them to 5 tabs until we hit a different indentation level

in_if_block = False
for i in range(3717, min(3750, len(lines))):  # Look ahead a bit
    line = lines[i]
    tab_count = len(line) - len(line.lstrip('\t'))
    
    if tab_count == 6 and line.strip() and not in_if_block:
        lines[i] = line[1:]  # Remove one tab to make it 5
        print(f"Fixed line {i+1}: removed 1 tab (6->5)")
        in_if_block = True
    elif tab_count <= 5 and line.strip():
        in_if_block = False

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done")
