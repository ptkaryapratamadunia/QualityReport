# Fix the kanan section indentation
with open('app.py', 'r', encoding='utf-8-sig', errors='ignore') as f:
    lines = f.readlines()

# Find and fix the problematic section
# Replace lines 1114-1116 (0-indexed: 1113-1115) with corrected version
# Current problematic structure:
# 1114: pivot_df_bulan_line3 = pd.concat([....total_data], ignore_index=True) [5 tabs]
# 1115: pivot_df_bulan_line3 = pivot_df_bulan_line3.set_index('Date') [6 tabs - WRONG]
# 1116: except: [3 tabs]
# 1117: pass [5 tabs - should be 4]

# The correct structure should be:
# After concat, add else: block with sort logic
# Then after the if/else, add the set_index

# Replace lines 1114-1115 with the correct else block
tab = '\t'
correct_lines = [
    lines[1113],  # Line 1114 - the concat line
    f"{tab*4}else:\n",  # Add else: at proper indentation
    f"{tab*5}pivot_df_bulan_line3['Date_sort'] = pd.to_datetime(pivot_df_bulan_line3['Date'], format='%b-%Y', errors='coerce')\n",
    f"{tab*5}pivot_df_bulan_line3 = pivot_df_bulan_line3.sort_values('Date_sort')\n",
    f"{tab*5}pivot_df_bulan_line3 = pivot_df_bulan_line3.drop('Date_sort', axis=1)\n",
    f"{tab*4}\n",  # blank line
    f"{tab*4}if 'Date' in pivot_df_bulan_line3.columns:\n",
    f"{tab*5}pivot_df_bulan_line3 = pivot_df_bulan_line3.set_index('Date')\n",
    lines[1115],  # except: line (but should adjust indent)
]

print(f"Original line 1114 tabs: 5")
print(f"Original line 1115 tabs: 6 (wrong)")
print(f"Original line 1116 (except:) tabs: 3")

# Rebuild the file
new_lines = lines[:1113] + correct_lines + lines[1116:]

with open('app.py', 'w', encoding='utf-8', newline='\n') as f:
    f.writelines(new_lines)

print(f"File fixed! Original {len(lines)} lines, now {len(new_lines)} lines")
