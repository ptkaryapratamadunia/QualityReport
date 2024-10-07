# Khusus untuk cleaning data keluaran dari autocon untuk ke Excel, Looker, Tableau dll
# 03 Oct 2024

import streamlit as st
import pandas as pd
import xlrd
from xlsxwriter import Workbook
import numpy as np
from streamlit_extras.dataframe_explorer import dataframe_explorer
from st_aggrid import AgGrid, GridOptionsBuilder
import base64
import webbrowser
from io import BytesIO	#untuk menyimpan df di memory IO sebelum di download

# Fungsi untuk mengubah gambar menjadi base64
def get_image_as_base64(image_path):
	with open(image_path, "rb") as img_file:
		return base64.b64encode(img_file.read()).decode()
		
# heading
kolkir,kolnan=st.columns(2)

with kolkir:
	st.markdown("""<h2 style="color:yellow;margin-top:-10px;margin-bottom:0px;"> 🧹CLEANING DATA </h2>""", unsafe_allow_html=True)
	st.write("Data output dari Autocon agar siap disantap.")
	st.write("Beberapa data output dari aplikasi AUTOCON-KPD belum siap pakai,\
			 oleh karena itu dilakukan proses cleaning, seperti mengkonversi data TEXT menjadi angka,\
			 konversi type NG ABCDSEFGIJKLMN menjadi definisi type NG, menghapus kolom yang tidak perlu\
			 dan menambah kolom yang diperlukan,dll.")
with kolnan:

	# Memuat gambar dan mengubahnya menjadi base64
	logo_KPD ='logoKPD.PNG'
	image_base64 = get_image_as_base64(logo_KPD)
	
    # Menampilkan gambar dan teks di kolom kanan dengan posisi berdampingan
	st.markdown(
        f"""
        <style>
        .container {{
            display: flex;
            align-items:center;
            justify-content: flex-end;
            flex-wrap: wrap;
        }}
        .container img {{
            width: 50px;
            margin-top: -20px;
        }}
        .container h2 {{
            color: grey;
            font-size: 20px;
            margin-top: -20px;
            margin-right: 10px;
            margin-bottom: 0px;
        }}
        @media (min-width: 600px) {{
            .container {{
                justify-content: center;
            }}
            .container img {{
                margin-top: 0;
            }}
            .container h2 {{
                margin-top: 0;
                text-align: center;
            }}
        }}
        </style>
        <div class="container">
            <h2 style="color:blue;">PT. KARYAPRATAMA DUNIA</h2>
            <img src='data:image/png;base64,{image_base64}'/>
        </div>
        """,
        unsafe_allow_html=True
	)

	st.markdown("---")
	st.info('Link to Prefessional Summary Report',icon="📊")
	if st.button('Quality Summary Web Report'):
        	webbrowser.open_new_tab('https://lookerstudio.google.com/reporting/e4a5c3f7-bf91-44e0-9ced-2b7a01eafa3d/page/FsgzD?s=qyZPms8Wytc')

    
    # --------akhir naroh Logo

st.markdown("---")

#Upload File Data

uploaded_file=st.file_uploader("Pilih file Excel (.xls, .xlsx, csv):")

if uploaded_file is not None:

    # ---- READ FILE XLS, XLSX, CSV ----

    #flexible read data:
	def read_file(uploaded_file):
		# Mendapatkan nama file
		file_name = uploaded_file.name
		
		# Memeriksa ekstensi file
		if file_name.endswith('.xls'):
			# Menggunakan engine 'xlrd' untuk file .xls
			df2 = pd.read_excel(uploaded_file, engine='xlrd')
		elif file_name.endswith('.xlsx'):
			# Menggunakan engine 'openpyxl' untuk file .xlsx
			df2 = pd.read_excel(uploaded_file, engine='openpyxl')
		elif file_name.endswith('.csv'):
			# Menggunakan pandas untuk membaca file .csv
			df2 = pd.read_csv(uploaded_file)
		else:
			raise ValueError("File harus memiliki ekstensi .xls, .xlsx, atau .csv")
		
		return df2
	
	# baca dataframe df2

	df2 = read_file(uploaded_file)

	#dataframe - script ini untuk filtering model tree
	with st.expander("Preview Original Data"):
		df = dataframe_explorer(df2, case=False)
		st.dataframe(df2, use_container_width=True)

	df=pd.DataFrame(df2)

	if df is not None:

		# Cleaning Process

		# Membersihkan nama kolom dari spasi atau karakter tersembunyi
		df.columns = df.columns.str.strip()

		df['DocDate'] = pd.to_datetime(df['DocDate'],errors='coerce')             #konversi tanggal ke tanggal pandas
		df['Cust.ID'] = df['ItemCode'].str.split(' ').str[0]            # Membuat kolom baru 'Cust_ID' dengan mengambil karakter sebelum spasi pertama
		df.rename(columns={'DocDate': 'Date'}, inplace=True)                        #'DocDate' menjadi 'Date'
		df['Cust.ID'] = df['Cust.ID'].str.strip().str.upper()			#cust id huruf besar semua
		
		df.rename(columns={'ItemCode': 'Part.ID'}, inplace=True)              # Mengganti nama kolom 'Keterangan' menjadi 'Kategori'
		df.rename(columns={'Description': 'PartName'}, inplace=True)     # Mengganti nama kolom 'Keterangan' menjadi 'Kategori'
		#df.rename(columns={'OK(B/H)': 'OK(Lot)'}, inplace=True)     # Mengganti nama kolom 'Keterangan' menjadi 'Kategori'
		df.rename(columns={'Keterangan': 'Kategori'}, inplace=True)                 # Mengganti nama kolom 'Keterangan' menjadi 'Kategori'
		
		# df["Month"] = pd.to_datetime(df["Date"]).dt.month               # menambah kolom 'Month' hasil ekstrasi dari kolom 'Date
		# df["Year"] = pd.to_datetime(df["Date"]).dt.year                 # menambah kolom 'Month' hasil ekstrasi dari kolom 'Date
		#df['Month']=df['Date'].dt.strftime('%b-%Y')                        # Short month name, like 'Jan', 'Feb'
        
        # menghapus kolom yg tidak akan digunakan'
		df.drop(columns=['Cheklist'], inplace=True)
		df.drop(columns=['DocNo'], inplace=True)
		
		pd.set_option('display.max_columns', None)                      # Mengatur pandas untuk menampilkan semua kolom
		# memindahkan posisi kolom Y ke setelah kolom X
			# 1. Daftar kolom saat ini
		# columns = df.columns.tolist()
		#     # 2. Pindahkan kolom 'Y' setelah kolom 'X'
		# columns.insert(columns.index('X'), columns.pop(columns.index('Y')))
		#     # 3. Atur ulang dataframe dengan urutan kolom baru
		# df = df.reindex(columns=columns)
		
		# Mengganti nama kolom jenis NG ke nama Aslinya
		new_columns = {
					'A': 'Warna',
					'B': 'Buram',
					'C': 'Berbayang',
					'D': 'Kotor',
					'E': 'Tdk Terplating',
					'F': 'Rontok/ Blister',
					'G': 'Tipis/ EE No Plating',
					'H': 'Flek Kuning',
					'I': 'Terbakar',
					'J': 'Watermark',
					'K': 'Jig Mark/ Renggang',
					'L': 'Lecet/ Scratch',
					'M': 'Seret',
					'N': 'Flek Hitam',
					'O': 'Flek Tangan',
					'P': 'Belang/ Dempet',
					'Q': 'Bintik',
					'R': 'Kilap',
					'S': 'Tebal',
					'T': 'Flek Putih',
					'U': 'Spark',
					'V': 'Kotor H/ Oval',
					'W': 'Terkikis/ Crack',
					'X': 'Dimensi/ Penyok',
					'Y': 'MTL/ SLipMelintir'
				}

		df.rename(columns=new_columns, inplace=True)
		
		# mengkonversi isi kolom NG dari pcs ke Lot dgn membagi dgn Stdr Loading
		kolom_untuk_dibagi=['Warna',
								'Buram',
								'Berbayang',
								'Kotor',
								'Tdk Terplating',
								'Rontok/ Blister',
								'Tipis/ EE No Plating',
								'Flek Kuning',
								'Terbakar',
								'Watermark',
								'Jig Mark/ Renggang',
								'Lecet/ Scratch',
								'Seret',
								'Flek Hitam',
								'Flek Tangan',
								'Belang/ Dempet',
								'Bintik',
								'Kilap',
								'Tebal',
								'Flek Putih',
								'Spark',
								'Kotor H/ Oval',
								'Terkikis/ Crack',
								'Dimensi/ Penyok',
								'MTL/ SLipMelintir']

		for col in kolom_untuk_dibagi:
			df[col]=df[col]/df['Std Load']		#konversi dari pcs ke lot
	   
			# Menjumlahkan kolom 'Wrn1', 'Brm1', 'Fhitam1', dan 'ktor1' pada setiap baris
			df['Tot_NG'] = df[['Warna',
								'Buram',
								'Berbayang',
								'Kotor',
								'Tdk Terplating',
								'Rontok/ Blister',
								'Tipis/ EE No Plating',
								'Flek Kuning',
								'Terbakar',
								'Watermark',
								'Jig Mark/ Renggang',
								'Lecet/ Scratch',
								'Seret',
								'Flek Hitam',
								'Flek Tangan',
								'Belang/ Dempet',
								'Bintik',
								'Kilap',
								'Tebal',
								'Flek Putih',
								'Spark',
								'Kotor H/ Oval',
								'Terkikis/ Crack',
								'Dimensi/ Penyok',
								# 'MTL/ SLipMelintir'
							]].sum(axis=1)

		# menghitung prosentase NG dengan syarat TotInsp(Lot) <>0, jika 0 maka 0
		df['NG_%'] = np.where(df['Insp(B/H)'] == 0, 0, (df['Tot_NG'] / df['Insp(B/H)']) * 100)


		# Mengganti nilai kosong dengan 0
		df['NG_%'] = df['NG_%'].fillna(0)
		# Mengganti nilai kosong (string kosong) dengan 0
		df['NG_%'] = df['NG_%'].replace('', 0)

		## Fungsi untuk menghapus nilai yang mengandung awalan 'CU', ' CU', dan 'CU '
		df['Kategori'] = df['Kategori'].astype(str)       # Mengonversi semua nilai dalam kolom NoJig menjadi string
		def remove_cu_prefix(kategori):
			if kategori.strip().startswith('CU'):
				return "RACK 1"  # atau "" jika ingin menggantinya dengan string kosong
			else:
				return kategori   
		df['Kategori'] = df['Kategori'].apply(remove_cu_prefix)         # Menggunakan apply untuk menerapkan fungsi pada kolom Kategori
		
		# Membersihkan nama kolom dari spasi atau karakter tersembunyi
		df.columns = df.columns.str.strip()

		# Daftar nilai yang diizinkan 26.09.2024
		allowed_values = ['BUSI','SMP','OTH', 'RACK 1', 'NICKEL', 'HDI']

		# Menghapus nilai yang tidak diizinkan
		df['Kategori'] = df['Kategori'].apply(lambda x: x if x in allowed_values else 'kosong') 
		#kosong pengganti '' yang tidak terdeteksi sebagai .isna() -- 28 Sept 2024 at home after short gowes

		# Mengisi kolom Kategori yang kosong berdasarkan kondisi
		df.loc[(df['Line'] == 'Barrel 4') & (df['Cust.ID'] == 'HDI') & (df['Kategori'].isna()), 'Kategori'] = 'HDI'
		df.loc[(df['Line'] == 'Barrel 4') & (df['Kategori']=='kosong'), 'Kategori'] = 'BUSI'
		df.loc[(df['Line'] == 'Rack 1') & (df['Kategori']=='kosong'), 'Kategori'] = 'RACK 1'
		df.loc[(df['Line'] == 'Nickel') & (df['Kategori']=='kosong'), 'Kategori'] = 'NICKEL'
		
		df['Kategori'] = df['Kategori'].str.strip().str.upper()
		

		# Fungsi untuk menentukan nilai kolom M/C No dari ekstraksi kolom NoJig
		
		df['NoJig'] = df['NoJig'].astype(str)       # Mengonversi semua nilai dalam kolom NoJig menjadi string
		def get_mc_no(nojig):
			if len(nojig) == 17:
				return nojig[9:11]
			else:
				return ""

		# Mengisi kolom M/C No. berdasarkan kondisi
		df['M/C No.'] = df['NoJig'].apply(get_mc_no)

		# Mengubah tipe data kolom 'SHift ' menjadi string
		df['Shift'] = df['Shift'].astype(str)
		df['NoBarrelHanger']=df['NoBarrelHanger'].astype(str)
		
		# st.write('Preview Data setelah dirapihkan (cleaning):')
		#dataframe - script ini untuk filtering model tree
		with st.expander("Preview Data setelah dirapihkan (cleaning)"):
			df3 = dataframe_explorer(df, case=False)
			st.dataframe(df, use_container_width=True)
		# AgGrid(df, height=400)
		# st.write(df)

        # menghapus kolom yg tidak akan digunakan'
		# df.drop(columns=['Tot_NG'], inplace=True)

		#simpan di memori dan harus di-download
		# Simpan DataFrame ke file Excel dalam memori
		output = BytesIO()
		with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
			df.to_excel(writer, index=False, sheet_name='Sheet1')
			writer.close()
		output.seek(0)

		bariskiri,bariskanan=st.columns(2)

		with bariskiri:
			# Tampilkan tautan unduhan di Streamlit
			st.download_button(
				label="Download File Excel after Cleaning",
				data=output,
				file_name='File_after_Cleaning.xlsx',
				mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			
		with bariskanan:
			st.markdown("""<h4 style="color:yellow;" > ⬅️Klik tombol download </h4>""", unsafe_allow_html=True)
		# df.to_excel('File_after_Cleaning.xlsx',index=False)
		# st.write("File after Cleaning juga telah disimpan dalam bentuk .xlsx dengan nama : 'File after Cleaning'")
		st.markdown("---")

		# -------------------------------------
		# Membuat tabel pivot by MONTH and LINE---------------
		df['Date']=pd.to_datetime(df['Date'])
		df['Date'] = df['Date'].dt.strftime("%b-%Y")
		pivot_df_bulan_line= pd.pivot_table(df, values='NG_%', index='Date',columns='Line', aggfunc={'NG_%': 'mean'},margins=True,margins_name='Total')
		pivot_df_bulan_line2= pd.pivot_table(df, values='Insp(B/H)', index='Date',columns='Line', aggfunc='sum',margins=True,margins_name='Total')
		pivot_df_bulan_line.to_csv('pivot_bulan_line.csv',index=False)
		# # Pisahkan baris 'Total'
		# total_row = pivot_df_bulan_line.loc['Total']
		# pivot_df_bulan_line = pivot_df_bulan_line.drop('Total')

		# Urutkan bulan secara ascending
		# pivot_df_bulan_line = pivot_df_bulan_line.sort_index(key=lambda x: pd.to_datetime(x, format='%b-%Y'))
		# pivot_df_bulan_line2 = pivot_df_bulan_line2.sort_index(key=lambda x: pd.to_datetime(x, format='%b-%Y'))
		# pivot_df_bulan_line['Date'] = pd.to_datetime(pivot_df_bulan_line['Date'])
		# pivot_df_bulan_line['Date'] = pivot_df_bulan_line['Date'].dt.strftime('%b-%Y')
		# pivot_df_bulan_line = pivot_df_bulan_line.sort_values(by='Date')

		# pivot_df_bulan_line.sort_index(inplace=True)
		# pivot_df_bulan_line.reset_index(inplace=True)
		st.subheader('Summary Data')
		kiri,kanan=st.columns(2)
		with kiri:
			st.write('Data NG (%) by Line & Month')
			st.write(pivot_df_bulan_line)
		with kanan:
			st.write('Data Quantity (lot) by Line & Month')
			st.write(pivot_df_bulan_line2)
# ---------------------------------------

# ---------------------------------------
		# Membuat tabel pivot NG by Kategori and LINE---------------

		pt_kategori_line=pd.pivot_table(df,values='NG_%',index='Kategori',columns='Line',aggfunc='mean',margins=True,margins_name='Total')
		pt_kategori_line2=pd.pivot_table(df,values='Insp(B/H)',index='Kategori',columns='Line',aggfunc='sum',margins=True,margins_name='Total')

		colkir,colnan=st.columns(2)
		with colkir:
			st.write('Data NG (%) by Line & Kategori')
			st.write(pt_kategori_line)
		with colnan:
			st.write('Data Quantity (lot) by Line & Kategori')
			st.write(pt_kategori_line2)


		#----------------- JUMLAH KOLOM TYPE NG ----------------
		# Daftar kolom yang ingin dijumlahkan
		new_columns = [
			'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
			'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
			'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet', 'Bintik',
			'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval', 'Terkikis/ Crack',
			'Dimensi/ Penyok', 'MTL/ SLipMelintir'
		]

		# # Menjumlahkan kolom-kolom yang diinginkan
		total_row = df[new_columns].sum().to_frame().T
		total_row['index'] = 'Total_NG(lot)'
		total_row.set_index('index', inplace=True)
		st.write(total_row)

		# # Menambahkan baris total ke DataFrame
		# df = pd.concat([df, total_row])

		# # Menampilkan DataFrame dengan baris Total
		# st.write(df)
		#-------------------------------------------------------
		st.write(df['Tot_NG'].sum())
		total_rowNG = (total_row/df['Tot_NG'].sum())*100
		total_rowNG['index']='Total_NG%'
		total_rowNG.set_index('index', inplace=True)
		st.write(total_rowNG)

		# df_total_JenisNG['NG%']=(df_total_JenisNG[new_columns]/TotalNG)*100
		# st.write(df_total_JenisNG)
		

	else:
		st.write("File tidak ditemukan")

else:
	st.write("Menunggu file diupload....")


# End of Cleaning Data
