#!/usr/bin/env python3
"""Fix the indentation error at line 2918"""

with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Problem: Lines 2915-2916 have 2 tabs but they're breaking out of an else block at 4 tabs
# Solution: Make line 2915-2916 have 3 tabs (still inside sum_tab1, after else closes)
# And line 2918 also needs to be 3 tabs

changes = []
for i, line in enumerate(lines):
    line_num = i + 1
    
    # Line 2915: #endregion - change from 2 tabs to 3 tabs
    if line_num == 2915 and line.startswith('\t\t#endregion'):
        lines[i] = '\t\t\t#endregion\n'
        changes.append(f"Line {line_num}: Fixed #endregion indent")
    
    # Line 2916: #------ - change from 2 tabs to 3 tabs  
    elif line_num == 2916 and line.startswith('\t\t#'):
        lines[i] = '\t\t\t' + line[2:]
        changes.append(f"Line {line_num}: Fixed comment indent")
    
    # Line 2918: st.markdown - change from 2 tabs to 3 tabs
    elif line_num == 2918 and line.startswith('\t\tst.markdown'):
        lines[i] = '\t\t\tst.markdown("---")\n'
        changes.append(f"Line {line_num}: Fixed st.markdown indent")

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

for change in changes:
    print(change)
print("✓ Fixed indentation issues")
