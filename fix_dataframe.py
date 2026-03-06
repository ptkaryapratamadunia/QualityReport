# Fix st.dataframe indentation
with open('app.py', 'r', encoding='utf-8-sig', errors='ignore') as f:
    lines = f.readlines()

print(f"Current total lines: {len(lines)}")

# Check lines 1124-1135
print("\nCurrent indentation:")
for i in range(1123, min(1136, len(lines))):
    line = lines[i]
    tabs = len(line) - len(line.lstrip('\t'))
    content = line.lstrip('\t').strip()[:50]
    print(f"Line {i+1} ({tabs} tabs): {content}")

# Fix st.dataframe and similar lines - they should be at 3 tabs (with kanan level)
tab = '\t'
for i in range(1123, min(1130, len(lines))):
    line = lines[i]
    current_tabs = len(line) - len(line.lstrip('\t'))
    stripped = line.lstrip(tab)
    
    # st.dataframe should be at 3 tabs
    if 'st.dataframe' in line and current_tabs == 4:
        lines[i] = f"{tab*3}{stripped}"
        print(f"Fixed st.dataframe indentation on line {i+1}: 4 tabs -> 3 tabs")

with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(lines)

print(f"\nDone! {len(lines)} lines")
