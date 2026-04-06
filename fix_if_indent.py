#!/usr/bin/env python3
# Fix line 3717 indentation

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 3717 (0-indexed 3716) has if statement with 5 tabs but should have 4 tabs
if len(lines) > 3716:
    line = lines[3716]  # Line 3717
    if line.strip().startswith('if ') and line.startswith('\t\t\t\t\t'):  # 5 tabs
        lines[3716] = line[1:]  # Remove one tab
        print(f"Fixed line 3717: removed 1 tab from if statement")

# Also need to check the else statement
if len(lines) > 3718:
    line = lines[3718]  # Line 3719
    if line.strip().startswith('else:') and line.startswith('\t\t\t\t\t'):  # 5 tabs
        lines[3718] = line[1:]  # Remove one tab
        print(f"Fixed line 3719: removed 1 tab from else statement")

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done")
