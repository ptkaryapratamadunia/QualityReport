#!/usr/bin/env python3
# Fix the actual indentation problem

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The problem: lines 3714+ have 5 tabs when they should have 4 tabs
# Line 3713 (idx 3712) is blank
# So we need to fix from line 3714 onward until we reach lines that should have a different indentation

# Find where the indentation changes should be
# Look for the pattern: after line 3713 (blank), lines with 5 tabs should be 4 tabs
# until we reach a natural break (like an if statement that expects deeper nesting)

# Actually, looking more carefully:
# Lines 3714-3715 should have 4 tabs (they're at the same level as st.write, df_with_pcs, etc.)
# Lines 3717-3720 should also have different indentation if they're part of an if block

# For now, let's just fix lines 3714-3716 to have 4 tabs instead of 5

lines_to_fix = [3713, 3714]  # 0-indexed
for i in lines_to_fix:
    if i < len(lines):
        line = lines[i]
        if line.startswith('\t\t\t\t\t'):  # Starts with 5 tabs
            #Remove one tab
            lines[i] = line[1:]
            print(f"Fixed line {i+1}: removed 1 tab")

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done")
