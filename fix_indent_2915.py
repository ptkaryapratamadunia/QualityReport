"""Manually fix indentation issue"""
with open('app.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Fix line numbers around 2914-2920
# Line 2914: indent 4 (inside else)
# Line 2915: change from indent 2 to indent 3
# Line 2916: change from indent 2 to indent 3  
# Line 2917-2918: empty+indent 2 → empty+indent 3
# Line 2919-2920: indent 2 should stay

for i in range(len(lines)):
    # Lines 2914-2920 are at indices 2913-2919
    line_num = i + 1
    
    if line_num == 2915:  # #endregion
        # Change from 2 tabs to 3 tabs
        if lines[i].startswith('\t\t#'):
            lines[i] = '\t\t\t' + lines[i][2:]
    elif line_num == 2916:  # #------
        # Change from 2 tabs to 3 tabs
        if lines[i].startswith('\t\t#'):
            lines[i] = '\t\t\t' + lines[i][2:]

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed lines 2915-2916 indentation")
