#!/usr/bin/env python3
import re

# Read the file
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the indentation issue around line 3710-3712
# Find the section and replace it
old_pattern = r'#region tabel hasil filter by Line, Jenis NG dan Partname\n\t+st\.write\("Tabel Hasil Filter Berdasarkan Line, Jenis NG dan Part Name"\)\n\t+# Pilihan Jenis NG untuk filter\n\t+df_with_pcs\[\'Date\'\]'

new_replacement = '''#region tabel hasil filter by Line, Jenis NG dan Partname
\t\t\t\tst.write("Tabel Hasil Filter Berdasarkan Line, Jenis NG dan Part Name")
\t\t\t\t# Pilihan Jenis NG untuk filter
\t\t\t\tdf_with_pcs['Date']'''

# Replace with proper indentation
content = re.sub(
    old_pattern,
    new_replacement,
    content,
    flags=re.MULTILINE
)

# More direct approach - just add tabs directly to lines that are missing indentation
lines = content.split('\n')
fixed_lines = []
for i, line in enumerate(lines):
    # Around line 3709-3711 (Python is 0-indexed)
    if 3709 <= i <= 3711:
        # These lines should have 4 tabs of indentation
        if line.startswith('\t\t\tdf_with_pcs') or line.startswith('\t\t\tdate_min') or line.startswith('\t\t\tdate_max'):
            # Add one more tab
            line = '\t' + line
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed indentation')
