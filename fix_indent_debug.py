#!/usr/bin/env python3
# Read the file and fix indentation by line number

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Target lines: 3710-3714 (0-indexed: 3709-3713, but also need to include blank line 3715 at 3714)
# These need to have 4 tabs instead of 3 tabs
# First, let's identify the exact lines

# Print what we're working with for debugging
print("Lines 3705-3720:")
for i in range(3704, min(3720, len(lines))):
    line = lines[i]
    # Count leading tabs
    tab_count = len(line) - len(line.lstrip('\t'))
    print(f"Line {i+1} (idx {i}): {tab_count} tabs: {repr(line[:50])}")

# Now fix lines that have 3 tabs but should have 4
# These are lines 3710-3714 (0-indexed 3709-37713), but NOT line 3715 (which is blank)
for i in [3709, 3710, 3711, 3712, 3713]:
    if i < len(lines):
        line = lines[i]
        # Count leading tabs
        tab_count = len(line) - len(line.lstrip('\t'))
        if tab_count == 3 and line.strip():  # Has exactly 3 tabs and is not blank
            lines[i] = '\t' + line
            print(f"Fixed line {i+1}: added 1 tab")

with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Done")
