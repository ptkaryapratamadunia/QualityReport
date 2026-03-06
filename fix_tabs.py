# Fix indentation issues throughout the file
import re

with open('app.py', 'r', encoding='utf-8-sig', errors='ignore') as f:
    content = f.read()

# Count occurrences of problematic patterns
issues = [
    ('with sum_tab2:', 2923),
    ('with sum_tab3:', 3150),
]

lines = content.split('\n')
print(f"Total lines: {len(lines)}")

# Check lines around 2920-2930
for i in range(2920, min(2935, len(lines))):
    line = lines[i]
    tabs = len(line) - len(line.lstrip('\t'))
    print(f"Line {i+1} ({tabs} tabs): {line[:80]}")

# The section from line 944-1122 uses:
# - 2 tabs for "with kiri/tengah/kanan:"
# - 3 tabs for content inside with blocks
# - 4 tabs for nested if/try blocks

# But the rest of the file uses standard 2-tab indentation
# Let's just fix the problematic lines

lines_fixed = list(lines)

# The issue is that with sum_tab2/tab3 should have proper indentation
# These should be indented normally at 2 tabs level (inside the with sum_tab1 context)

print("\n\nSearching for with sum_tab2 and with sum_tab3...")
for i in range(len(lines_fixed)):
    if 'with sum_tab2:' in lines_fixed[i]:
        print(f"Found 'with sum_tab2:' at line {i+1}")
        # Check indentation
        tabs = len(lines_fixed[i]) - len(lines_fixed[i].lstrip('\t'))
        print(f"Current indent: {tabs} tabs, Line: {repr(lines_fixed[i][:80])}")
        # It should be at 2 tabs (same level as with sum_tab1)
        if tabs > 2:
            # Fix it
            lines_fixed[i] = '\t\t' + lines_fixed[i].lstrip('\t')
            print(f"Fixed to: {repr(lines_fixed[i][:80])}")

    if 'with sum_tab3:' in lines_fixed[i]:
        print(f"Found 'with sum_tab3:' at line {i+1}")
        tabs = len(lines_fixed[i]) - len(lines_fixed[i].lstrip('\t'))
        print(f"Current indent: {tabs} tabs, Line: {repr(lines_fixed[i][:80])}")
        if tabs > 2:
            lines_fixed[i] = '\t\t' + lines_fixed[i].lstrip('\t')
            print(f"Fixed to: {repr(lines_fixed[i][:80])}")

# Write back
with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines_fixed))

print("\n✓ Fixed indentation issues")
