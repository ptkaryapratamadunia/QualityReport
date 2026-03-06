# Read the file
with open('app.py', 'r', encoding='utf-8-sig', errors='ignore') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Check the area around line 1113-1123
for i in range(1112, min(1123, len(lines))):
    line = lines[i]
    # Count leading tabs
    tabs = len(line) - len(line.lstrip('\t'))
    print(f"Line {i+1} ({tabs} tabs): {repr(line[:70])}")

# Also check what line 1115 is now
if len(lines) > 1114:
    line_1115 = lines[1114]
    print(f"\nCurrent line 1115 content: {repr(line_1115[:80])}")

