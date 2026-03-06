# Final fix - correct the except block and lines after it
with open('app.py', 'r', encoding='utf-8-sig', errors='ignore') as f:
    lines = f.readlines()

print(f"Current total lines: {len(lines)}")

# Check current indentation around line 1122-1128
for i in range(1120, min(1130, len(lines))):
    line = lines[i]
    tabs = len(line) - len(line.lstrip('\t'))
    content = line.lstrip('\t').strip()[:50]
    print(f"Line {i+1} ({tabs} tabs): {content}")

# Fix indentation: 
# Line 1122 (index 1121): pass should have 4 tabs
# Lines 1124-1127: should be at 3 tabs (outside try/except, inside with kanan)

tab = '\t'
new_lines = list(lines)  # Make a copy

# Fix line 1123 (0-indexed 1122) - pass should be 4 tabs, not 5
if 'pass' in new_lines[1122]:
    # Replace with correct indentation
    new_lines[1122] = f"{tab*4}pass\n"
    print("Fixed pass indentation (line 1123)")

# Fix lines 1124-1127 - should move from 4 tabs to 3 tabs
for i in range(1123, 1127):  # lines 1124-1127 in 1-indexed is 1123-1126 in 0-indexed
    if i < len(new_lines):
        line = new_lines[i]
        if line.strip() and not line.strip().startswith('#'):
            current_tabs = len(line) - len(line.lstrip('\t'))
            if current_tabs == 4:
                # This should be 3 tabs (outside try/except)
                new_lines[i] = f"{tab*3}{line.lstrip(tab)}"
                print(f"Fixed indentation for line {i+1}")

with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"Fixed! Still {len(new_lines)} lines")
