#!/usr/bin/env python3
# More aggressive fix for indentation

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic section with properly indented version
old_text = '''			#region tabel hasil filter by Line, Jenis NG dan Partname
			st.write("Tabel Hasil Filter Berdasarkan Line, Jenis NG dan Part Name")
			# Pilihan Jenis NG untuk filter
			df_with_pcs['Date'] = pd.to_datetime(df_with_pcs['Date'], errors='coerce').dt.normalize()  # pastikan hanya tanggal (tanpa waktu)
			date_min = df_with_pcs['Date'].min()
			date_max = df_with_pcs['Date'].max()

				partname_options = df_daily['PartName'].dropna().unique().tolist()'''

new_text = '''			#region tabel hasil filter by Line, Jenis NG dan Partname
				st.write("Tabel Hasil Filter Berdasarkan Line, Jenis NG dan Part Name")
				# Pilihan Jenis NG untuk filter
				df_with_pcs['Date'] = pd.to_datetime(df_with_pcs['Date'], errors='coerce').dt.normalize()  # pastikan hanya tanggal (tanpa waktu)
				date_min = df_with_pcs['Date'].min()
				date_max = df_with_pcs['Date'].max()

				partname_options = df_daily['PartName'].dropna().unique().tolist()'''

content = content.replace(old_text, new_text)

with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed indentation with direct text replacement')
