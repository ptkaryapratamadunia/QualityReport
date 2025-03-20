# Khusus untuk cleaning data keluaran dari autocon untuk ke Excel, Looker, Tableau dll
# 03 Oct 2024 start build
# 08 Oct 2024 start deploy : qualityreportkpd.streamlit.app atau s.id/kpdqualitydatacleaner

from re import X
from unicodedata import category
from referencing import Anchor
import streamlit as st
import pandas as pd
import numpy as np
from streamlit_extras.dataframe_explorer import dataframe_explorer
import base64
import os
import pickle
# import webbrowser
from io import BytesIO	#untuk menyimpan df di memory IO sebelum di download
import matplotlib.pyplot as plt
import altair as alt
import plotly.express as px
import plotly.graph_objects as go       #cara 2 agar data terlihat saat mouse over
from plotly.subplots import make_subplots
import sys
import subprocess


st.set_page_config(page_title="Quality Report", page_icon=":bar_chart:", layout="wide")

# Apply dark theme to the entire app start 20March2025
dark_theme_css = """
	<style>
	body {
		background-color: #121212;
		color: #e0e0e0;
	}
	.stApp {
		background-color: #121212;
		color: #e0e0e0;
	}
	.stButton button {
		background-color: #333;
		color: #e0e0e0;
	}
	.stTextInput input {
		background-color: #333;
		color: #e0e0e0;
	}
	.stSelectbox select {
		background-color: #333;
		color: #e0e0e0;
	}
	.stDataFrame {
		background-color: #333;
		color: #e0e0e0;
	}
	.stMarkdown {
		color: #e0e0e0;
	}
	.stMetric {
		color: #e0e0e0;
	}
	.stPlotlyChart {
		background-color: #121212;
	}
	</style>
"""
st.markdown(dark_theme_css, unsafe_allow_html=True)

# Fungsi untuk mengubah gambar menjadi base64
def get_image_as_base64(image_path):
	with open(image_path, "rb") as img_file:
		return base64.b64encode(img_file.read()).decode()
		
# heading
kolkir,kolnan=st.columns((2,1))	#artinya kolom sebelahkiri lebih lebar 2x dari kanan

with kolkir:
	st.markdown("""<h2 style="color:green;margin-top:-10px;margin-bottom:0px;"> 🧹 DATA CLEANING </h2>""", unsafe_allow_html=True)
	st.write("Tools Pengolahan Data")
	st.markdown("""<p style="margin-top:-10px;margin-bottom:0px;font-size:14px">Beberapa data output dari aplikasi AUTOCON-KPD belum siap pakai,\
			 oleh karena itu perlu dilakukan proses cleaning, seperti mengkonversi data TEXT menjadi angka,\
			 konversi type NG ABCDSEFGIJKLMN menjadi definisi type NG, mengekstrasi data Nomer Jig\
		  	 menjadi Nomer Mesin Smallpart, menghapus kolom yang tidak perlu\
			 dan menambah kolom yang diperlukan,dll. <br> Menjadi sangat efisien karena sudah disediakan juga\
		  	 Summary Report berupa Tabel dan Grafik yang siap digunakan untuk analisa dan pengambilan keputusan.<br>\
		  	 <span style="color:Blue">Disclaimer: <span> <br>Tools ini dapat dijalankan hanya jika sumber file nya adalah hasil ekspor dari program\
		     Autocon QC yang lengkap dan file original belum diedit\
			(menghapus dan atau menambah kolom)</p>""", unsafe_allow_html=True)
	# st.write("Beberapa data output dari aplikasi AUTOCON-KPD belum siap pakai,\
	# 		 oleh karena itu perlu dilakukan proses cleaning, seperti mengkonversi data TEXT menjadi angka,\
	# 		 konversi type NG ABCDSEFGIJKLMN menjadi definisi type NG, mengekstrasi data Nomer Jig\
	# 	  	 menjadi Nomer Mesin SMallpart, menghapus kolom yang tidak perlu\
	# 		 dan menambah kolom yang diperlukan,dll. Tanpa buang waktu sudah disediakan juga\
	# 	  	 summary report berupa Table dan Grafik yang siap digunakan untuk analisa dan pengambilan keputusan.\
	# 	  	 Disclaimer: Tools ini dapat dijalankan hanya jika sumber file nya adalah hasil ekspor dari program\
	# 	     Autocon QC yang lengkap belum difilter berdasarkan line atau lainnya dan file original belum diedit\
	# 			(menghapus dan atau menambah kolom)")
	
with kolnan:
	# Adjust the file path based on the current directory
	current_dir = os.path.dirname(os.path.abspath(__file__))
	logo_KPD = os.path.join(current_dir, 'logoKPD.png')
	# Memuat gambar dan mengubahnya menjadi base64
	# logo_KPD ='logoKPD.png'
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

	kolkir2,kolnan2=st.columns(2)
	with kolkir2:
		st.write("")
	with kolnan2:
		st.markdown('<div style="color:brown;text-align: right;"> Quality Dept. - 2024', unsafe_allow_html=True)
		st.markdown("---")
		link_url_looker='https://lookerstudio.google.com/reporting/c9e60f2f-eacd-4f3e-9126-243e568b98fd'
		st.link_button('Summary Report',link_url_looker,icon='📊')
		# if st.button('Summary Web Report'):
		# 			webbrowser.open_new_tab('https://lookerstudio.google.com/reporting/e4a5c3f7-bf91-44e0-9ced-2b7a01eafa3d/page/FsgzD?s=qyZPms8Wytc') 
		st.markdown('</div>', unsafe_allow_html=True)
	
st.markdown("---")	#--------------------------batas akhir styling HEADER -----------------

# Fungsi untuk format angka dengan koma
# def format_with_comma(value):
# 	return "{:,.2f}".format(value)
def format_with_comma(value):
	if isinstance(value, (int, float)):
		return "{:,.2f}".format(value)
	return value

def show_footer():

	
	#Footer diisi foto ditaruh ditengah
	st.markdown("---")


	kaki_kiri,kaki_kiri2, kaki_tengah,kaki_kanan2, kaki_kanan=st.columns((2,2,1,2,2))

	with kaki_kiri:
		st.write("")

	with kaki_kiri2:
		st.write("")

	with kaki_tengah:
		# kontener_photo=st.container(border=True)
		# Adjust the file path based on the current directory
		current_dir = os.path.dirname(os.path.abspath(__file__))
		e_WeYe = os.path.join(current_dir, 'eweye.png')
		# Memuat gambar dan mengubahnya menjadi base64
		# logo_KPD ='logoKPD.png'
		image_base64 = get_image_as_base64(e_WeYe)
		st.image(e_WeYe,"Web Developer - eWeYe ©️2024",use_column_width="always")

	with kaki_kanan2:
		st.write("")

	with kaki_kanan:
		st.write("")

def simpan_file(data):
    # Dapatkan direktori tempat file Python ini berada, improved 13Nov2024
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Gabungkan dengan nama file
    file_path = os.path.join(current_dir, "file_arsip.csv")
    # Simpan file
    with open(file_path, 'w+') as f:
        f.write(data)
    st.success("File_arsip.csv berhasil disimpan!")

def data_tanggal(df):
	df['DocDate'] = pd.to_datetime(df['DocDate'])

	# Tanggal tertua
	tanggal_tertua = df['DocDate'].min().strftime('%d-%b-%Y')

	# Tanggal termuda
	tanggal_termuda = df['DocDate'].max().strftime('%d-%b-%Y')

	st.write(f"""
			Periode dari Tanggal: {tanggal_tertua}
			sampai Tanggal : {tanggal_termuda}
			""")
	return df

#---START CLEANING ---------

def cleaning_process(df):
	#dataframe - script ini untuk filtering model tree
	with st.expander("Preview Original Data"):
		df2 = dataframe_explorer(df, case=False)
		st.dataframe(df2, use_container_width=True)

	df=pd.DataFrame(df2)

	#region Cleaning Process
	if df is not None:

		# Membersihkan nama kolom dari spasi atau karakter tersembunyi
		df.columns = df.columns.str.strip()

		df['DocDate'] = pd.to_datetime(df['DocDate'],errors='coerce')             	#konversi tanggal ke tanggal pandas
		df['Cust.ID'] = df['ItemCode'].str.split(' ').str[0]           	 			# Membuat kolom baru 'Cust_ID' dengan mengambil karakter sebelum spasi pertama
		df.rename(columns={'DocDate': 'Date'}, inplace=True)                        #'DocDate' menjadi 'Date'
		df['Cust.ID'] = df['Cust.ID'].str.strip().str.upper()						#cust id huruf besar semua
		
		df.rename(columns={'ItemCode': 'Part.ID'}, inplace=True)              		# Mengganti nama kolom 'ItemCode' menjadi 'Part.ID'
		df.rename(columns={'Description': 'PartName'}, inplace=True)     			# Mengganti nama kolom 'Description' menjadi 'PartName'
		#df.rename(columns={'OK(B/H)': 'OK(Lot)'}, inplace=True)     				# Mengganti nama kolom 
		df.rename(columns={'Keterangan': 'Kategori'}, inplace=True)                 # Mengganti nama kolom 'Keterangan' menjadi 'Kategori'
		
		df["NG(pcs)"]=(df['Qty(NG)']- df['Y'])										#menambah kolom NG(pcs) krn ada permintaan menggunakan satuan pcs start 06Nov2024
		# df["Month"] = pd.to_datetime(df["Date"]).dt.month               			# menambah kolom 'Month' hasil ekstrasi dari kolom 'Date
		# df["Year"] = pd.to_datetime(df["Date"]).dt.year                			# menambah kolom 'Month' hasil ekstrasi dari kolom 'Date
		#df['Month']=df['Date'].dt.strftime('%b-%Y')                        		# Short month name, like 'Jan', 'Feb'
        
        # menghapus kolom yg tidak akan digunakan'
		df.drop(columns=['Cheklist'], inplace=True)
		df.drop(columns=['DocNo'], inplace=True)
		df.drop(columns=['Qty(NG)'], inplace=True)									#kolom ini dihapus krn nilainya belum dikurangin NGM atau kolom Y, diganti mjd kolom NG(pcs)
		df.rename(columns={'NG(pcs)': 'Qty(NG)'}, inplace=True)						#agar tdk report menghapus hingga ke bawah, kolom asli Qty(NG) dikembalikan dengan nilai baru
		
		## Fungsi untuk menghapus nilai yang mengandung awalan 'CU', ' CU', dan 'CU '
		df['Kategori'] = df['Kategori'].astype(str)       # Mengonversi semua nilai dalam kolom ini menjadi string
		df['Shift'] = df['Shift'].astype(str)       # Mengonversi semua nilai dalam kolom ini menjadi string
		df['NoCard'] = df['NoCard'].astype(str)       # Mengonversi semua nilai dalam kolom ini menjadi string


		pd.set_option('display.max_columns', None)                     				 # Mengatur pandas untuk menampilkan semua kolom
		
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
		# Menduplikasi kolom dengan loop 
		for kolom in kolom_untuk_dibagi: #untuk diduplikasi
			df[kolom + '(pcs)'] = df[kolom]	#kolom tambahan 19Nov2024 kolom berisi jenis NG satuan pcs

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

		#mengganti semua nilai pada kolom NG(B/H) dari kolom Tot_NG
		df['NG(B/H)'] = df['Tot_NG']

		# Mengganti nilai kosong dengan 0
		df['NG_%'] = df['NG_%'].fillna(0)
		# Mengganti nilai kosong (string kosong) dengan 0
		df['NG_%'] = df['NG_%'].replace('', 0)

		# def remove_cu_prefix(kategori):
		# 	if kategori.strip().startswith('CU'):
		# 		return "RACK 1"  # atau "" jika ingin menggantinya dengan string kosong
		# 	else:
		# 		return kategori   
		# df['Kategori'] = df['Kategori'].apply(remove_cu_prefix)         # Menggunakan apply untuk menerapkan fungsi pada kolom Kategori

		# Mengganti nilai 'CU' dengan 'RACK 1' - improve 13Nov2024
		df['Kategori'] = df['Kategori'].str.strip()       # menghilangkan white space seperti: ' CU', dan 'CU '
		df['Kategori'] = df['Kategori'].replace('CU', 'RACK 1')
		df['Kategori'] = df['Kategori'].replace('RC', 'Barrel 4') #added 20March2025
		
		# Membersihkan nama kolom dari spasi atau karakter tersembunyi
		df.columns = df.columns.str.strip()

		# Daftar nilai yang diizinkan 26.09.2024
		allowed_values = ['BUSI','SMP','OTH', 'RACK 1', 'NICKEL', 'HDI']

		# Menghapus nilai yang tidak diizinkan
		df['Kategori'] = df['Kategori'].apply(lambda x: x if x in allowed_values else 'kosong') 
		#kosong pengganti '' yang tidak terdeteksi sebagai .isna() -- 28 Sept 2024 at home after short gowes

		# Mengisi kolom Kategori yang kosong berdasarkan kondisi
		df.loc[(df['Line'] == 'Barrel 4') & (df['Cust.ID'] == 'HDI') & (df['Kategori']=='kosong'), 'Kategori'] = 'HDI'
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
		# df['Shift'] = df['Shift'].astype(str)

		# Manambahkan string 'Shift' pada kolom 'Shift' - added 10March2025 because of Looker Studio detected as number
		df['Shift'] = 'Shift ' + df['Shift']

		df['NoBarrelHanger']=df['NoBarrelHanger'].astype(str)
		df['M/C No.'] = df['M/C No.'].astype(str)       # Mengonversi semua nilai dalam kolom ini menjadi string
		
		# Menghapus whitespace pada kolom Part.ID dan PartName - added 10March2025
		df['Part.ID'] = df['Part.ID'].str.strip()
		df['PartName'] = df['PartName'].str.strip()

		# Menghilangkan baris duplicate - added 10March2025
		df.drop_duplicates(inplace=True)

	#endregion
	#------------
			
		# st.write('Preview Data setelah dirapihkan (cleaning):')
		#dataframe - script ini untuk filtering model tree
		with st.expander("Preview Data setelah dirapihkan (cleaning)"):
			df3 = dataframe_explorer(df, case=False)
			st.dataframe(df3, use_container_width=True)

		#------------- merapihkan kolom sama dengan target looker 21Oct2024
		# Menghapus kolom tambahan 19Nov2024 kolom berisi jenis NG satuan pcs
		for kolom in kolom_untuk_dibagi: 
			df.drop(columns=[kolom + '(pcs)'], inplace=True)
		#create variabel df	
		df_4_ekspor=df
        # menghapus kolom yg tidak akan digunakan'
		df_4_ekspor.drop(columns=['Tot_NG'], inplace=False)
		#buka file kolom standar looker studi
		file_kolom=pd.read_csv("df2_standar_kolom.csv")
		# Dapatkan urutan kolom dari df
		kolom_std = file_kolom.columns.tolist()
		# Susun ulang df2 agar kolomnya mengikuti df1
		df_4_ekspor = df_4_ekspor[kolom_std]

		#simpan di memori dan harus di-download
		# Simpan DataFrame ke file Excel dalam memori
		output = BytesIO()
		with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
			df_4_ekspor.to_excel(writer, index=False, sheet_name='Sheet1')
			writer.close()
		output.seek(0)

		#Cara lain menyimpan di memori pickle

		# Simpan DataFrame ke file pickle
		with open('df_cache.pkl', 'wb') as f:
			pickle.dump(df_4_ekspor, f)

		#------------------ view di 2 kolom
		# Membuat tabel pivot NG% by MONTH and LINE---------------
		df['Date']=pd.to_datetime(df['Date'])
		df['Date'] = df['Date'].dt.strftime("%b-%Y")
		df = df.sort_values(by=['Date'])
		# Tambahkan kolom yang mewakili bulan sebagai angka 
		# df['Month'] = df['Date'].dt.month 
		# Urutkan DataFrame berdasarkan kolom Month 
		# df = df.sort_values('Date')

		pivot_df_bulan_line= pd.pivot_table(df, values='NG_%', index='Date',columns='Line', aggfunc='mean',margins=True,margins_name='Total')
		pivot_df_bulan_line_grafik= pd.pivot_table(df, values='NG_%', index='Date', aggfunc='mean')
		# Membuat tabel pivot Qty NG(Lot) by MONTH and LINE---------------
		pivot_df_bulan_line2= pd.pivot_table(df, values='Tot_NG', index=['Date'],columns=['Line'], aggfunc='sum',margins=True,margins_name='Total')
		
		# #Reset index untuk memudahkan plotting
		# pivot_df_bulan_line2.reset_index(inplace=True)
		
		# # Urutkan DataFrame berdasarkan kolom 'Month'
		# pivot_df_bulan_line2.sort_index(inplace=True)


		# Membuat tabel pivot Qty Insp(Lot) by MONTH and LINE---------------
		pivot_df_bulan_line3= pd.pivot_table(df, values='Insp(B/H)', index='Date',columns='Line', aggfunc='sum',margins=True,margins_name='Total')
		pivot_df_bulan_line3_grafik= pd.pivot_table(df, values='Insp(B/H)', index='Date', aggfunc='sum')

		bariskiri,bt1,bt2,bt3,bariskanan=st.columns(5)
		#Metrics column
		with bariskiri:
			# Tampilkan tautan unduhan di Streamlit
			st.download_button(
				label="Download File Excel",
				data=output,
				help="Klik untuk mendownload file hasil Cleaning",
				file_name='File_after_Cleaning.xlsx',
				mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
			# st.success("Jangan lupa selalu bersyukur!")
		with bt1:
			
			st.markdown("""<h6 style="color:blue;" > METRIC SUMMARY  ➡️ </h6>""", unsafe_allow_html=True)

		with bt2: #Total Inspected (lot)
			# container3=st.container(border=True)
			tot_Qty_lot=df['Insp(B/H)'].sum()
			# container3.write(f"Total Inspected (lot)	:{tot_Qty_lot:.0f}")
			# Create a styled container with a border 
			container_html = f""" <div style='border: 2px solid #4CAF50; padding: 2px; border-radius: 5px; text-align: center;'> <h4 style='font-size:12px; margin:0;color:green;'>Total Inspected (lot)</h4> <p style='font-size:46px; margin:0;'>{tot_Qty_lot:,.0f}</p> </div> """
			st.markdown(container_html, unsafe_allow_html=True)
			# bt2.metric("Total Inspected (lot)",f"{tot_Qty_lot:,.0f}")

		with bt3: #Total Inspected (lot)
			# container=st.container(border=True)
			tot_NG_lot=df['Tot_NG'].sum()
			# container.write(f"Tot. NG (lot)  :  {tot_NG_lot:.0f}")
			container_html = f""" <div style='border: 2px solid #4CAF50; padding: 2px; border-radius: 5px; text-align: center;'> <h4 style='font-size:12px; margin:0;color:green;'>Total NG (lot)</h4> <p style='font-size:46px; margin:0;'>{tot_NG_lot:,.2f}</p> </div> """
			st.markdown(container_html, unsafe_allow_html=True)
			# bt3.metric("Total NG (lot):",f"{tot_NG_lot:.2f}")

		with bariskanan:
			# container2=st.container(border=True)
			tot_NG_persen=df['NG_%'].mean()
			# container2.write(f"Tot. NG (%)	: {tot_NG_persen:.2f}")
			container_html = f""" <div style='border: 2px solid #4CAF50; padding: 2px; border-radius: 5px; text-align: center;'> <h4 style='font-size:12px; margin:0;color:green;'>Total NG (%)</h4> <p style='font-size:46px; margin:0;'>{tot_NG_persen:,.2f}</p> </div> """
			st.markdown(container_html, unsafe_allow_html=True)			
			# bariskanan.metric("Total NG (%)",f"{tot_NG_persen:.2f}")

		st.markdown("---")

		# -------------------------------------
		#SUMMARY DATA
		st.subheader('Summary Data')
		kiri,tengah,kanan=st.columns(3)
		with kiri:	#Table NG (%) by Line & Month
			st.write('Table NG (%) by Line & Month')
			pivot_df_bulan_line = pivot_df_bulan_line.round(2)
			pivot_df_bulan_line = pivot_df_bulan_line.reset_index()
			pivot_df_bulan_line = pivot_df_bulan_line[pivot_df_bulan_line['Date'] != 'Total']
			pivot_df_bulan_line = pivot_df_bulan_line.sort_values(by='Date', key=lambda x: pd.to_datetime(x, format='%b-%Y')).set_index('Date')
			st.write(pivot_df_bulan_line)
		with tengah:	#Table Qty NG (lot) by Line & Month
			st.write('Table Qty NG (lot) by Line & Month')
			pivot_df_bulan_line2 = pivot_df_bulan_line2.map(format_with_comma)
			pivot_df_bulan_line2 = pivot_df_bulan_line2.reset_index()
			pivot_df_bulan_line2 = pivot_df_bulan_line2[pivot_df_bulan_line2['Date'] != 'Total']
			pivot_df_bulan_line2 = pivot_df_bulan_line2.sort_values(by='Date', key=lambda x: pd.to_datetime(x, format='%b-%Y')).set_index('Date')
			st.write(pivot_df_bulan_line2)
		with kanan:	#Table Qty Inspected (lot) by Line & Month
			st.write('Table Qty Inspected (lot) by Line & Month')
			pivot_df_bulan_line3 = pivot_df_bulan_line3.round(0)
			pivot_df_bulan_line3 = pivot_df_bulan_line3.reset_index()
			pivot_df_bulan_line3 = pivot_df_bulan_line3[pivot_df_bulan_line3['Date'] != 'Total']
			pivot_df_bulan_line3 = pivot_df_bulan_line3.sort_values(by='Date', key=lambda x: pd.to_datetime(x, format='%b-%Y')).set_index('Date')
			st.write(pivot_df_bulan_line3)

		#3 kolom buat tabel by Line and Shift - 26Nov2024
		col1,col2,col3,=st.columns(3)
			
		with col1: #NG % by Line and Shift - 26Nov2024
			
			pt_NGpersen_line_by_shift=pd.pivot_table(df,values='NG_%',index='Line',columns='Shift',aggfunc='mean',margins=True,margins_name='Total')
			# Bulatkan nilai-nilai ke angka bulat terdekat
			pt_NGpersen_line_by_shift = pt_NGpersen_line_by_shift.round(2)
			pt_NGpersen_line_by_shift_transposed = pt_NGpersen_line_by_shift.transpose()
			st.write('NG (%) by Line & Shift')
			st.write(pt_NGpersen_line_by_shift_transposed)
			
		with col2:	#Qty NG Lot by Line and Shift - 26Nov2024
			
			pt_NGLot_line_by_shift=pd.pivot_table(df,values='NG(B/H)',index='Line',columns='Shift',aggfunc='sum',margins=True,margins_name='Total')
			# Bulatkan nilai-nilai ke angka bulat terdekat
			pt_NGLot_line_by_shift = pt_NGLot_line_by_shift.map(format_with_comma)
			pt_NGLot_line_by_shift_transposed = pt_NGLot_line_by_shift.transpose()

			st.write('Qty NG(lot) by Line-Shift')
			st.write(pt_NGLot_line_by_shift_transposed)

		with col3:	#Qty Inspected Lot by Line and Shift - 26Nov2024
			
			pt_InspLot_line_by_shift=pd.pivot_table(df,values='Insp(B/H)',index='Line',columns='Shift',aggfunc='sum',margins=True,margins_name='Total')
			# Bulatkan nilai-nilai ke angka bulat terdekat
			pt_InspLot_line_by_shift = pt_InspLot_line_by_shift.round(0)
			pt_InspLot_line_by_shift_transposed = pt_InspLot_line_by_shift.transpose()

			st.write('Qty Insp(lot) by Line-Shift')
			st.write(pt_InspLot_line_by_shift_transposed)
			
		# with col3:	
		# 	#Qty Insp pcs by Line and Shift - 26Nov2024
		# 	pt_InspPcs_line_by_shift=pd.pivot_table(df,values='QInspec',index='Line',columns='Shift',aggfunc='sum',margins=True,margins_name='Total')
		# 	# Bulatkan nilai-nilai ke angka bulat terdekat
		# 	pt_InspPcs_line_by_shif = pt_InspPcs_line_by_shift.map(format_with_comma)

		# 	st.write('Qty Insp(pcs) by Line-Shift')
		# 	st.write(pt_InspPcs_line_by_shif)
			
			
		# with col5:	
		# 	#Qty NG pcs by Line and Shift - 26Nov2024
		# 	pt_NGPcs_line_by_shift=pd.pivot_table(df,values='Qty(NG)',index='Line',columns='Shift',aggfunc='sum',margins=True,margins_name='Total')
		# 	# Bulatkan nilai-nilai ke angka bulat terdekat
		# 	pt_NGPcs_line_by_shif = pt_NGPcs_line_by_shift.map(format_with_comma)

		# 	st.write('NG (pcs) by Line-Shift')
		# 	st.write(pt_NGPcs_line_by_shif)
		st.markdown("---")

		#Grafik area
		grafik_kiri,grafik_kanan=st.columns(2)

		with grafik_kiri: #Grafik NG% & Qty Inspected by Month - 26Nov2024
			# Menggambar grafik batang
			data_grafik=pivot_df_bulan_line_grafik.reset_index()
			data_grafik['Date'] = pd.to_datetime(data_grafik['Date'], format='%b-%Y')
			data_grafik = data_grafik.sort_values(by='Date')
			data_grafik['Date'] = data_grafik['Date'].dt.strftime('%b-%Y')

			data_grafik2=pivot_df_bulan_line3_grafik.reset_index()
			data_grafik2['Date'] = pd.to_datetime(data_grafik2['Date'], format='%b-%Y')
			data_grafik2 = data_grafik2.sort_values(by='Date')
			data_grafik2['Date'] = data_grafik2['Date'].dt.strftime('%b-%Y')

			# Create a figure with one subplot
			fig = go.Figure()

			# Add NG_% bar trace
			fig.add_trace(go.Scatter(
				x=data_grafik['Date'],
				y=data_grafik['NG_%'],
				name='NG_%',
				mode='lines+markers',  # Combine line and markers
				marker_color='blue',
				line_color='blue',   # Set line color explicitly
				yaxis='y2'
			))

			# Add Insp(B/H) line trace (overlay on same y-axis)
			fig.add_trace(go.Bar(  # Use Scatter for line chart
				x=data_grafik2['Date'],
				y=data_grafik2['Insp(B/H)'],
				name='Insp(B/H)',
				marker_color='grey',
			))

			# Customize layout
			fig.update_layout(
				
			title='Grafik NG% & Qty Inspected by Month',
			xaxis=dict(title='Month',type='category'),
			yaxis=dict(title='Qty Inspected (pcs)', titlefont=dict(color='grey'), tickfont=dict(color='grey')),
			yaxis2=dict(title='NG%', titlefont=dict(color='blue'), tickfont=dict(color='blue'), overlaying='y', side='right', anchor='x'),
				paper_bgcolor='rgba(0,0,0,0)',      # Warna background keseluruhan
				plot_bgcolor='rgba(0,0,0,0)',       # Warna background area plot
				legend=dict(
					yanchor="top",
					y=-0.2,  # Posisi vertikal di bawah sumbu X
					xanchor="center",
					x=0.5   # Posisi horizontal di tengah
				),
				legend_title_text='Metric'
			
			)
			# Display the plot
			st.plotly_chart(fig)

			# # Create a figure with a 1x2 subplot grid (1 row, 2 columns)
			# fig = make_subplots(rows=1, cols=2)

			# # Add traces to the subplots
			# fig.add_trace(go.Bar(x=data_grafik['Date'], y=data_grafik['NG_%'], name='NG_%', marker_color='blue'), row=1, col=1)
			# fig.add_trace(go.Bar(x=data_grafik2['Date'], y=data_grafik2['Insp(B/H)'], name='Insp(B/H)', marker_color='orange'), row=1, col=2)

			# # Update layout for secondary y-axis (optional)
			# fig.update_layout(
			# 	title='Grafik NG% & Qty Inspeted (lot) by Month',
			# 	xaxis_title='Month',
			# 	yaxis=dict(title='NG_%'),
			# 	yaxis2=dict(title='Qty Inspected (lot)', overlaying='y', side='right')  # If needed for overlay
			# )

			# # Display the plot
			# st.plotly_chart(fig)
			
		with grafik_kanan: #Pie Chart - 26Nov2024 Portion of Qty Inspected by Line
			# Pie Chart
			LotInsp_by_Line=(
				df[["Line","Insp(B/H)"]]
				.groupby(by="Line")
				.sum()
				.sort_values(by="Insp(B/H)",ascending=False)
				.reset_index()
			)
		
			# Create a pie chart
			fig = go.Figure(data=go.Pie(labels=LotInsp_by_Line['Line'], values=LotInsp_by_Line['Insp(B/H)'], marker=dict(colors=['green', 'yellow', 'red', 'blue'])))
			fig.update_layout(title='Porsion Tot. Inspected(lot) by Line',
							xaxis_title='Line',
							yaxis_title='Qty (lot)')

			st.plotly_chart(fig)

		st.markdown("---")

		chart_kiri,chart_kanan=st.columns(2)	#added 19March2025 08.59PM @home 
		with chart_kiri: #Grafik NG% & Qty Inspected by Month - Barrel 4
			# Filter data for Line 'Barrel 4'
			df_barrel4 = df[df['Line'] == 'Barrel 4']

			# Menggambar grafik batang
			data_grafik = pd.pivot_table(df_barrel4, values='NG_%', index='Date', aggfunc='mean').reset_index()
			data_grafik['Date'] = pd.to_datetime(data_grafik['Date'], format='%b-%Y')
			data_grafik = data_grafik.sort_values(by='Date')
			data_grafik['Date'] = data_grafik['Date'].dt.strftime('%b-%Y')

			data_grafik2 = pd.pivot_table(df_barrel4, values='Insp(B/H)', index='Date', aggfunc='sum').reset_index()
			data_grafik2['Date'] = pd.to_datetime(data_grafik2['Date'], format='%b-%Y')
			data_grafik2 = data_grafik2.sort_values(by='Date')
			data_grafik2['Date'] = data_grafik2['Date'].dt.strftime('%b-%Y')

			# Create a figure with one subplot
			fig = go.Figure()

			# Add NG_% bar trace
			fig.add_trace(go.Scatter(
				x=data_grafik['Date'],
				y=data_grafik['NG_%'],
				name='NG_%',
				mode='lines+markers',  # Combine line and markers
				marker_color='blue',
				line_color='blue',   # Set line color explicitly
				yaxis='y2'
			))

			# Add Insp(B/H) line trace (overlay on same y-axis)
			fig.add_trace(go.Bar(  # Use Scatter for line chart
				x=data_grafik2['Date'],
				y=data_grafik2['Insp(B/H)'],
				name='Insp(B/H)',
				marker_color='Yellow',
			))

			# Customize layout
			fig.update_layout(
				
			title='Grafik NG% & Qty Inspected by Month - Barrel 4',
			xaxis=dict(title='Month', type='category'),
			yaxis=dict(title='Qty Inspected (pcs)', titlefont=dict(color='yellow'), tickfont=dict(color='yellow')),
			yaxis2=dict(title='NG%', titlefont=dict(color='blue'), tickfont=dict(color='blue'), overlaying='y', side='right', anchor='x'),
				paper_bgcolor='rgba(0,0,0,0)',      # Warna background keseluruhan
				plot_bgcolor='rgba(0,0,0,0)',       # Warna background area plot
				legend=dict(
					yanchor="top",
					y=-0.2,  # Posisi vertikal di bawah sumbu X
					xanchor="center",
					x=0.5   # Posisi horizontal di tengah
				),
				legend_title_text='Metric'
			
			)
			# Display the plot
			st.plotly_chart(fig)

		with chart_kanan: #Grafik NG% & Qty Inspected by Month - Rack 1
			# Filter data for Line 'Rack 1'
			df_rack1 = df[df['Line'] == 'Rack 1']

			# Menggambar grafik batang
			data_grafik = pd.pivot_table(df_rack1, values='NG_%', index='Date', aggfunc='mean').reset_index()
			data_grafik['Date'] = pd.to_datetime(data_grafik['Date'], format='%b-%Y')
			data_grafik = data_grafik.sort_values(by='Date')
			data_grafik['Date'] = data_grafik['Date'].dt.strftime('%b-%Y')

			data_grafik2 = pd.pivot_table(df_rack1, values='Insp(B/H)', index='Date', aggfunc='sum').reset_index()
			data_grafik2['Date'] = pd.to_datetime(data_grafik2['Date'], format='%b-%Y')
			data_grafik2 = data_grafik2.sort_values(by='Date')
			data_grafik2['Date'] = data_grafik2['Date'].dt.strftime('%b-%Y')

			# Create a figure with one subplot
			fig = go.Figure()

			# Add NG_% bar trace
			fig.add_trace(go.Scatter(
				x=data_grafik['Date'],
				y=data_grafik['NG_%'],
				name='NG_%',
				mode='lines+markers',  # Combine line and markers
				marker_color='green',
				line_color='green',   # Set line color explicitly
				yaxis='y2'
			))

			# Add Insp(B/H) line trace (overlay on same y-axis)
			fig.add_trace(go.Bar(  # Use Scatter for line chart
				x=data_grafik2['Date'],
				y=data_grafik2['Insp(B/H)'],
				name='Insp(B/H)',
				marker_color='blue',
			))

			# Customize layout
			fig.update_layout(
				
			title='Grafik NG% & Qty Inspected by Month - Rack 1',
			xaxis=dict(title='Month', type='category'),
			yaxis=dict(title='Qty Inspected (pcs)', titlefont=dict(color='blue'), tickfont=dict(color='blue')),
			yaxis2=dict(title='NG%', titlefont=dict(color='green'), tickfont=dict(color='green'), overlaying='y', side='right', anchor='x'),
				paper_bgcolor='rgba(0,0,0,0)',      # Warna background keseluruhan
				plot_bgcolor='rgba(0,0,0,0)',       # Warna background area plot
				legend=dict(
					yanchor="top",
					y=-0.2,  # Posisi vertikal di bawah sumbu X
					xanchor="center",
					x=0.5   # Posisi horizontal di tengah
				),
				legend_title_text='Metric'
			
			)
			# Display the plot
			st.plotly_chart(fig)

		#grafik PIE ----------------------

		pie_kiri,pie_kanan=st.columns(2)

		with pie_kiri:
			Insp_by_Cust=(
					df[["Cust.ID","Insp(B/H)"]]
					.groupby(by="Cust.ID")
					.sum()
					.sort_values(by="Insp(B/H)",ascending=False)
					.reset_index()
			)
			
			# Create a pie chart
			fig = go.Figure(data=go.Pie(labels=Insp_by_Cust['Cust.ID'], values=Insp_by_Cust['Insp(B/H)'], marker=dict(colors=['green', 'yellow', 'red', 'blue'])))

			fig.update_layout(title='Porsion Qty Inspected(lot) by Customer',
							xaxis_title='Cust.ID',
							yaxis_title='Qty (lot)')

			st.plotly_chart(fig)

		with pie_kanan:
			Insp_by_Kategori=(
					df[["Kategori","Insp(B/H)"]]
					.groupby(by="Kategori")
					.sum()
					.sort_values(by="Insp(B/H)",ascending=False)
					.reset_index()
			)
			
			# Create a pie chart
			fig = go.Figure(data=go.Pie(labels=Insp_by_Kategori['Kategori'], values=Insp_by_Kategori['Insp(B/H)'], marker=dict(colors=['green', 'yellow', 'red', 'blue'])))

			fig.update_layout(title='Porsion Tot. Inspected(lot) by Kategori',
							xaxis_title='Kategori',
							yaxis_title='Qty (lot)')

			st.plotly_chart(fig)

		st.markdown("---")
		# ---------------------------------------

		# Membuat tabel pivot NG by Customer and LINE---------------

		# Pivot table creation for B4
		pt_customer_line = pd.pivot_table(df, values='NG_%', index='Cust.ID', columns='Line', aggfunc='mean', margins=True, margins_name='Total')
		st.write('NG (%) by Line & Customer')

		# Round the values to 2 decimal places
		pt_customer_line = pt_customer_line.round(2)
		pt_customer_line_transposed = pt_customer_line.transpose()
		st.write(pt_customer_line_transposed)

		dew1, dew2=st.columns(2)
		with dew1: #NG (%) for Barrel 4 by Customer
			# Check if 'Barrel 4' column exists in the dataframe
			if 'Barrel 4' in pt_customer_line.columns:
				# Extract 'Barrel 4' line and exclude 'Total' column
				barrel4_data = pt_customer_line['Barrel 4'].drop('Total').reset_index()

				# Filter out rows where 'Barrel 4' is zero 
				barrel4_data_filtered = barrel4_data[barrel4_data['Barrel 4'] > 0]

				# Sort the data by NG_% in descending order
				barrel4_data_sorted = barrel4_data_filtered.sort_values(by='Barrel 4', ascending=False)

				# Create the bar chart
				fig = px.bar(barrel4_data_sorted, x='Cust.ID', y='Barrel 4', title='NG (%) for Barrel 4 by Customer',
							labels={'Barrel 4': 'NG (%)', 'Cust.ID': 'Customer'},
							color='Cust.ID',  # Different color for each customer
							color_discrete_sequence=px.colors.qualitative.Plotly)

				# Customize the layout
				fig.update_layout(
					xaxis_title="Customer",
					yaxis_title="NG (%)",
					xaxis_tickangle=0
				)

				# Display the plot in Streamlit
				st.plotly_chart(fig)

		with dew2: #NG (%) for Rack 1 by Customer
		
			# Check if 'Barrel 4' column exists in the dataframe
			if 'Rack 1' in pt_customer_line.columns:
				# Extract 'Barrel 4' line and exclude 'Total' column
				R1_data = pt_customer_line['Rack 1'].drop('Total').reset_index()

				# Filter out rows where 'Barrel 4' is zero 
				R1_data_filtered = R1_data[R1_data['Rack 1'] > 0]

				# Sort the data by NG_% in descending order
				R1_data_sorted = R1_data_filtered.sort_values(by='Rack 1', ascending=False)

				# Create the bar chart
				fig = px.bar(R1_data_sorted, x='Cust.ID', y='Rack 1', title='NG (%) for Rack 1 by Customer',
							labels={'Rack 1': 'NG (%)', 'Cust.ID': 'Customer'},
							color='Cust.ID',  # Different color for each customer
							color_discrete_sequence=px.colors.qualitative.Plotly)

				# Customize the layout
				fig.update_layout(
					xaxis_title="Customer",
					yaxis_title="NG (%)",
					xaxis_tickangle=0
				)

				# Display the plot in Streamlit
				st.plotly_chart(fig)



		#--------- pivot Qty NG (lot) by Line dan Customer
		pt_customer_line2=pd.pivot_table(df,values='NG(B/H)',index='Cust.ID',columns='Line',aggfunc='sum',margins=True,margins_name='Total')
		# Bulatkan nilai-nilai ke angka bulat terdekat
		pt_customer_line2 = pt_customer_line2.map(format_with_comma)

		st.write('Qty NG (lot) by Line & Customer')
		pt_customer_line2_tranposed=pt_customer_line2.transpose()
		st.write(pt_customer_line2_tranposed)

		st.markdown("---")
		
		sikir,sinan=st.columns(2)
		#Grafik kolom Qty NG(lot) B4 by Cust.ID Yellow
		with sikir:
		
			df_byLine=df[df['Line']=='Barrel 4']	
			df_byLine=df_byLine[df_byLine['NG(B/H)']>0]			#menampilkan hanya yg ada nilainya 03Dec2024

			NG_by_custid=(
			df_byLine[["Cust.ID","NG(B/H)"]]
			.groupby(by="Cust.ID")
			.sum()
			.sort_values(by="NG(B/H)",ascending=False)
			.reset_index()
			)
			# st.write(NG_by_kategori)
			
			# Buat grafik batang interaktif
			fig = go.Figure(data=go.Bar(x=NG_by_custid['Cust.ID'], y=NG_by_custid['NG(B/H)'],
									marker_color='yellow'))  # Sesuaikan warna jika ingin

			fig.update_layout(title='Grafik Qty NG(lot) by Cust.ID - Barrel 4',
							xaxis_title='Cust.ID',
							yaxis_title='NG(B/H)')

			st.plotly_chart(fig)
		#Grafik NG(lot) by Cust.ID Blue Rack 1
		with sinan:
			df_byLineR1=df[df['Line']=='Rack 1']
			df_byLineR1=df_byLineR1[df_byLineR1['NG(B/H)']>0]

			NG_by_Cust=(
					df_byLineR1[["Cust.ID","NG(B/H)"]]
					.groupby(by="Cust.ID")
					.sum()
					.sort_values(by="NG(B/H)",ascending=False)
					.reset_index()
			)
			
			# Buat grafik batang interaktif
			fig = go.Figure(data=go.Bar(x=NG_by_Cust['Cust.ID'], y=NG_by_Cust['NG(B/H)'],
									marker_color='blue'))  # Sesuaikan warna jika ingin

			fig.update_layout(title="Grafik Qty NG(lot) by Cust.ID - Rack 1",
							xaxis_title='Cust.ID',
							yaxis_title='NG(B/H)')

			st.plotly_chart(fig)

		st.markdown("---")

		#--------- pivot Qty Inspected (lot) by Line dan Customer
		pt_customer_line2=pd.pivot_table(df,values='Insp(B/H)',index='Cust.ID',columns='Line',aggfunc='sum',margins=True,margins_name='Total')
		# Bulatkan nilai-nilai ke angka bulat terdekat
		pt_customer_line2 = pt_customer_line2.map(format_with_comma)

		st.write('Qty Inspected (lot) by Line & Customer')
		pt_customer_line2_tranposed=pt_customer_line2.transpose()
		st.write(pt_customer_line2_tranposed)

		st.markdown("---")
		# ---------------------------------------
		# Membuat tabel pivot NG by Kategori and LINE---------------

		pt_kategori_line=pd.pivot_table(df,values='NG_%',index='Kategori',columns='Line',aggfunc='mean',margins=True,margins_name='Total')
		pt_kategori_line2=pd.pivot_table(df,values='Insp(B/H)',index='Kategori',columns='Line',aggfunc='sum',margins=True,margins_name='Total')
		pt_kategori_line3=pd.pivot_table(df,values='Tot_NG',index='Kategori',columns='Line',aggfunc='sum',margins=True,margins_name='Total')

		#pt by kategori pcs 
		pt_kategori_line_NGpcs=pd.pivot_table(df,values='Qty(NG)',index='Kategori',columns='Line',aggfunc='sum',margins=True,margins_name='Total')
		pt_kategori_line_InspPcs=pd.pivot_table(df,values='QInspec',index='Kategori',columns='Line',aggfunc='sum',margins=True,margins_name='Total')

		pt_kategori_line_NGpcs_grafik=pd.pivot_table(df,values='Qty(NG)',index='Kategori',aggfunc='sum',margins=True,margins_name='Total')
		pt_kategori_line_InspPcs_grafik=pd.pivot_table(df,values='QInspec',index='Kategori',aggfunc='sum',margins=True,margins_name='Total')


		#Grafik NG by Line % & Lot	04NOv2024
		chart_kiri, chart_tengah,chart_kanan=st.columns(3)	
		
		with chart_kiri:	#Grafik batang Qty NG(%) by Line Grey
				NG_by_Line=(
						df[["Line","NG_%"]]
						.groupby(by="Line")
						.mean()
						.sort_values(by="NG_%",ascending=False)
						.reset_index()
				)
				
				# Buat grafik batang interaktif
				fig = go.Figure(data=go.Bar(x=NG_by_Line['Line'], y=NG_by_Line['NG_%'],
										marker_color='grey'))  # Sesuaikan warna jika ingin

				fig.update_layout(title='Rata-rata NG_% by Line',
								xaxis_title='Line',
								yaxis_title='NG_%')

				st.plotly_chart(fig)
			
		with chart_tengah:	#Grafik batang Qty NG(Lot) by Line Grey
			NGLot_by_Line=(
					df[["Line","NG(B/H)"]]
					.groupby(by="Line")
					.sum()
					.sort_values(by="NG(B/H)",ascending=False)
					.reset_index()
			)
			
			# Buat grafik batang interaktif
			fig = go.Figure(data=go.Bar(x=NGLot_by_Line['Line'], y=NGLot_by_Line['NG(B/H)'],
									marker_color='grey'))  # Sesuaikan warna jika ingin

			fig.update_layout(title='Qty NG (lot) by Line',
							xaxis_title='Line',
							yaxis_title='Qty NG (lot)')

			st.plotly_chart(fig)		
		
		with chart_kanan: #Grafik batang Qty Inspected Lot by Line Grey
				InspLot_by_Line=(
						df[["Line","Insp(B/H)"]]
						.groupby(by="Line")
						.sum()
						.sort_values(by="Insp(B/H)",ascending=False)
						.reset_index()
				)
				
				# Buat grafik batang interaktif
				fig = go.Figure(data=go.Bar(x=InspLot_by_Line['Line'], y=InspLot_by_Line['Insp(B/H)'],
										marker_color='grey'))  # Sesuaikan warna jika ingin

				fig.update_layout(title='Qty Inspected (lot) by Line',
								xaxis_title='Line',
								yaxis_title='Qty (lot)')

				st.plotly_chart(fig)

		# Terapkan format ke seluruh pivot table
		pt_kategori_line = pt_kategori_line.map(format_with_comma)	
		pt_kategori_line3 = pt_kategori_line3.map(format_with_comma)	

		#Grafik model double axis:kiri %NG kanan Qty Inspected - 27Nov2024 @home before PILKADA
		ibnu,zahra=st.columns([3,1])
		
		with ibnu:	#Grafik NG% by Line& Kategori
			# Hitung agregasi untuk setiap kategori
			NG_by_kategori = df.groupby('Kategori').agg({'NG_%': 'mean', 'Insp(B/H)': 'sum'}).reset_index()

			# Create a figure with one subplot
			fig = go.Figure()

			# Add Insp(B/H) bar trace
			fig.add_trace(go.Bar(
				x=NG_by_kategori['Kategori'],
				y=NG_by_kategori['Insp(B/H)'],
				name='Insp(B/H)',
				marker_color='grey',
				yaxis='y1',
				text=NG_by_kategori['Insp(B/H)'].apply(lambda x: f'{x:,.0f}'),
				textposition='outside'  # Position text outside the bars
			))

			# Add NG_% line trace
			fig.add_trace(go.Scatter(
				x=NG_by_kategori['Kategori'],
				y=NG_by_kategori['NG_%'],
				name='NG_%',
				mode='lines+markers+text',
				marker_color='red',
				line_color='red',
				yaxis='y2',
				text=NG_by_kategori['NG_%'].apply(lambda x: f'<span style="color:red;background-color:white;">{x:.2f}</span>'),
				textposition='top center',
				hoverinfo='text'
			))

			# Customize layout
			fig.update_layout(
				title='Grafik NG (%) Vs Insp (lot) per Kategori',
				xaxis=dict(title='Kategori'),
				yaxis=dict(title='Qty Inspected (lot)', titlefont=dict(color='grey'), tickfont=dict(color='grey')),
				yaxis2=dict(title='NG (%)', titlefont=dict(color='red'), tickfont=dict(color='red'), overlaying='y', side='right'),
				paper_bgcolor='rgba(0,0,0,0)',  # Warna background keseluruhan
				plot_bgcolor='rgba(0,0,0,0)',   # Warna background area plot
				legend=dict(
					yanchor="top",
					y=-0.2,  # Posisi vertikal di bawah sumbu X
					xanchor="center",
					x=0.5   # Posisi horizontal di tengah
				),
				legend_title_text='Metric'
			)

			# Display the plot
			st.plotly_chart(fig)
		
		with zahra:	#Tabel NG% by Line& Kategori
			st.write('NG (%) by Line & Kategori')
			st.write(pt_kategori_line)
		
		#-----------------
		st.markdown("---")
		#buat kolom	untuk grafik dan tabel BUSI
		colkir,colteng,colnan=st.columns(3)
		
		with colkir: #kolom kiri untuk tempat PETUNJUK SINGKAT

			st.markdown("""<h5 style="color:blue;margin-top:-10px;margin-bottom:0px;"> PETUNJUK SINGKAT </h5>""", unsafe_allow_html=True)
			st.markdown("---")
			st.markdown("""<h6 style="color:green;margin-top:-10px;margin-bottom:0px;"> TABEL </h6>""", unsafe_allow_html=True)
			st.markdown("""<p style="font-size:12px;margin-top:-10px;margin-bottom:0px;">Tampilan tabel terdiri dari beberapa kolom,ada yang menggunakan kolom index (adalah\
					  nomer urut yg diawali dengan angka nol) dan ada juga ada yang tidak menggunakan.\
					Jika ingin melihat menu lainnya terkait tindakan yang akan diperlakukan terhadap tabel tersebut, caranya \
			arahkan mouse ke tabel pada bagian atas kanan tabel. Akan ditemukan menu: Download, Search dan Full Screen.\
				Isi tabel tidak bisa diubah. Lebar kolom bisa diatur lebarnya dengan cara meletakkan cursor mouse di antara batas\
			antar tabel lalu geser kanan atau kiri. Bila ada tabel yang menampilkan banyak kolom yang tidak terlihat di bagian kanan tabel\
			untuk melihatnya, arahkan mouse ke bagian bawah tabel sampai muncul 'scroll-bar' lalu tahan dengan mouse dan geser kanan kiri.\
				Selain itu, jika ingin mensort data, klik saja bagian header kolom.</p>""", unsafe_allow_html=True)
			# st.write("Tampilan tabel terdiri dari beberapa kolom,ada yang menggunakan kolom index (adalah\
			# 		  nomer urut yg diawali dengan angka nol) dan ada juga ada yang tidak menggunakan.\
			# 		Jika ingin melihat menu lainnya terkait tindakan yang akan diperlakukan terhadap tabel tersebut, caranya \
			# arahkan mouse ke tabel pada bagian atas kanan tabel. Akan ditemukan menu: Download, Search dan Full Screen.\
			# 	Isi tabel tidak bisa diubah. Lebar kolom bisa diatur lebarnya dengan cara meletakkan cursor mouse di antara batas\
			# antar tabel lalu geser kanan atau kiri. Bila ada tabel yang menampilkan banyak kolom yang tidak terlihat di bagian kanan tabel\
			# untuk melihatnya, arahkan mouse ke bagian bawah tabel sampai muncul 'scroll-bar' lalu tahan dengan mouse dan geser kanan kiri.\
			# 	Selain itu, jika ingin mensort data, klik saja bagian header toko.")

			st.write("***")
			st.markdown("""<h6 style="color:green;margin-top:-10px;margin-bottom:0px;"> GRAFIK </h6>""", unsafe_allow_html=True)
			st.markdown("""<h6 style="font-size:12px;color:brown;margin-top:-10px;margin-bottom:0px;"> 
			   ✔️ Tidak bisa di-edit <br>
			   ✔️ Bisa di-download sebagai gambar .png <br>
			   ✔️ Bisa di Zoom-IN dan Zoom-OUT <br>
			   ✔️ Bisa di-pan / geser kanan kiri <br>
			   ✔️ Bisa di-auto scale </h6>""", unsafe_allow_html=True)


			# # Hitung agregasi untuk setiap kategori
			# NG_by_kategori_ng = df.groupby('Kategori').agg({'NG_%': 'mean'}).reset_index()
			# NG_by_kategori_insp = df.groupby('Kategori').agg({'Insp(B/H)': 'sum'}).reset_index()

			# # Create a figure with a 1x2 subplot grid (1 row, 2 columns)
			# fig = make_subplots(rows=1, cols=2)

			# # Add traces to the subplots
			# fig.add_trace(go.Bar(x=NG_by_kategori_ng['Kategori'], y=NG_by_kategori_ng['NG_%'], name='NG_%', marker_color='blue'), row=1, col=1)
			# fig.add_trace(go.Bar(x=NG_by_kategori_insp['Kategori'], y=NG_by_kategori_insp['Insp(B/H)'], name='Insp(B/H)', marker_color='orange'), row=1, col=2)

			# # Update layout for secondary y-axis (optional)
			# fig.update_layout(
			# 	title='Grafik NG (% ) Vs Insp (lot) per Kategori',
			# 	xaxis_title='Kategori',
			# 	yaxis=dict(title='Average NG (%)'),
			# 	yaxis2=dict(title='Qty Inspected (lot)', overlaying='y', side='right')  # If needed for overlay
			# )

			# # Display the plot
			# st.plotly_chart(fig)
			# st.write('NG (%) by Line & Kategori')
			# st.write(pt_kategori_line)

			# #grafik pcs hanya untuk busi
			# pt_kategori_line_NGpcs_grafikBUSI=pt_kategori_line_NGpcs_grafik.loc['BUSI']
			# pt_kategori_line_InspPcs_grafikBUSI=pt_kategori_line_InspPcs_grafik.loc['BUSI']

			# #gabung data
			# combined_data=pd.concat([pt_kategori_line_InspPcs_grafikBUSI,pt_kategori_line_NGpcs_grafikBUSI],ignore_index=True)
			# df_grup_grafik=pd.DataFrame(combined_data)
			# #nambah kolom satuan
			# grup=['Qty Inspected (pcs)','Qty NG (pcs)']
			# df_grup_grafik['Satuan']=grup

			# # Buat grafik batang dengan Plotly
			# fig = px.bar(df_grup_grafik, x='Satuan', y='BUSI', color='Satuan', barmode='group')
			# fig.update_layout(title='Grafik Qty Insp dan Qty NG untuk BUSI (pcs)',
			# 				xaxis_title='-',
			# 				yaxis_title='(pcs)')
			# st.plotly_chart(fig)
	
		with colteng:	#Tabel Data Qty NG (lot) by Line & Kategori
			st.write('Data Qty NG (lot) by Line & Kategori')
			st.write(pt_kategori_line3)
			st.write('Data Qty NG (pcs) by Line & Kategori')
			pt_kategori_line_NGpcs = pt_kategori_line_NGpcs.round(0)
			st.write(pt_kategori_line_NGpcs)
		
		with colnan: #Tabel Quantity Inspected (lot) by Line & Kategori
			st.write('Quantity Inspected (lot) by Line & Kategori')
			pt_kategori_line2 = pt_kategori_line2.map(format_with_comma)
			st.write(pt_kategori_line2)

			st.write('Quantity Inspected (pcs) by Line & Kategori')
			pt_kategori_line_InspPcs = pt_kategori_line_InspPcs.round(0)
			st.write(pt_kategori_line_InspPcs)

		st.markdown("---")
		#groupby dataframe	---------------


		#----------------- JUMLAH KOLOM TYPE NG ----------------
		# Daftar kolom Jenis NG yang ingin dijumlahkan
		new_columns = [
			'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
			'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
			'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet', 'Bintik',
			'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval', 'Terkikis/ Crack',
			'Dimensi/ Penyok', 
			# 'MTL/ SLipMelintir'
		]

		#LB4
		df_LB4=df[df['Line']=='Barrel 4']

		# # Menjumlahkan kolom-kolom yang diinginkan (lot)
		total_rowB4 = df_LB4[new_columns].sum().to_frame().T
		total_rowB4['index'] = 'Total_NG(lot)'
		total_rowB4.set_index('index', inplace=True)

		total_rowB4=total_rowB4.map(format_with_comma)
		st.write("Tabel Jenis NG (Lot) - Line Barrel 4")
		st.write(total_rowB4)

		#LR1
		df_LR1=df[df['Line']=='Rack 1']
		# # Menjumlahkan kolom-kolom yang diinginkan (pcs)
		total_row = df_LR1[new_columns].sum().to_frame().T
		total_row['index'] = 'Total_NG(lot)'
		total_row.set_index('index', inplace=True)

		total_row=total_row.map(format_with_comma)
		# total_row = total_row.applymap(format_with_comma)		#pengganti format diatas, meskipun unit nya lot krn actualnya ada yg kecil di bawah 1 lot
		st.write("Tabel Jenis NG (lot) - Line Rack 1")
		st.write(total_row)	

		#tampilkan grafik batangnya -- 14Nov2024
		barisB4, barisR1=st.columns(2)
		#baris kiri Grafik Vertical Bar B4 Blue		
		with barisB4: #Grafik Vertical Bar B4 Yellow
			# Convert the total_row to a DataFrame for plotting 
			total_row_df_B4 = total_rowB4.transpose().reset_index() 
			total_row_df_B4.columns = ['Defect Type', 'Total NG (lot)'] 
			# Convert 'Total NG (lot)' to numeric, forcing errors to NaN 
			total_row_df_B4['Total NG (lot)'] = pd.to_numeric(total_row_df_B4['Total NG (lot)'], errors='coerce')
			# Filter out rows where 'Total NG (lot)' is zero 
			total_row_df_B4_filtered = total_row_df_B4[total_row_df_B4['Total NG (lot)'] > 0 ] 
			#Sort values from largest to smallest 
			total_row_df_B4_sorted = total_row_df_B4_filtered.sort_values(by='Total NG (lot)', ascending=True)
			# Plot using plotly for interactivity 
			fig = px.bar(total_row_df_B4_sorted, y='Defect Type', x='Total NG (lot)', title='Defect Types - Line Barrel 4', labels={'Defect Type': 'Defect Type', 'Total NG (lot)': 'Total NG (lot)'}, color_discrete_sequence=['yellow']) 
			fig.update_layout( yaxis_title="Defect Type", xaxis_title="Total NG (lot)", yaxis_tickangle=0)
			st.plotly_chart(fig)
		
		with barisR1:	#baris kanan Grafik Vertical Bar R1 Blue
		
			# Convert the total_row to a DataFrame for plotting 
			total_row_df = total_row.transpose().reset_index() 
			total_row_df.columns = ['Defect Type', 'Total NG (lot)'] 
			# Convert 'Total NG (lot)' to numeric, forcing errors to NaN 
			total_row_df['Total NG (lot)'] = pd.to_numeric(total_row_df['Total NG (lot)'], errors='coerce')
			# Filter out rows where 'Total NG (lot)' is zero 
			total_row_df_filtered = total_row_df[total_row_df['Total NG (lot)'] > 0] 
			#Sort values from largest to smallest 
			total_row_df_sorted = total_row_df_filtered.sort_values(by='Total NG (lot)', ascending=True)
			# Plot using plotly for interactivity 
			fig = px.bar(total_row_df_sorted, y='Defect Type', x='Total NG (lot)', title='Defect Types - Line Rack 1', labels={'Defect Type': 'Defect Type', 'Total NG (lot)': 'Total NG (lot)'}, color_discrete_sequence=['blue']) 
			fig.update_layout( yaxis_title="Defect Type", xaxis_title="Total NG (lot)", yaxis_tickangle=0)
			st.plotly_chart(fig)

		st.markdown("---")
		#-------------------------------------------------------
		#kolom lagi untuk Tabel Qty OK NG (pcs) by PartName
		kolomkiri,kolomkanan=st.columns(2)
		#Qty (pcs) B4
		with kolomkiri:

			#filter df hanya yg tampil sesuai Line yg dipilih
			df_byLine=df[df['Line']=='Barrel 4']

			List_Qty_B4=(
			df_byLine[["PartName","Qty(NG)","QInspec"]]
			.groupby(by="PartName")
			.sum()
			.sort_values(by="Qty(NG)",ascending=False)
			.reset_index()
			)

			# Buat grafik batang dengan Plotly
			# fig = px.bar(NG_by_part, x='NG_%', y='PartName', color='NG_%',barmode="relative")
			# fig.update_layout(title='Grafik NG (%) by Part Name - LB4',
			# 				xaxis_title='NG_%',
			# 				yaxis_title='PartName')
			# st.plotly_chart(fig)

			List_Qty_B4 = List_Qty_B4.map(format_with_comma)
			st.write("Tabel Qty (pcs) by Part Name Line Barrel 4")
			st.write(List_Qty_B4)
			
			# # Buat grafik batang interaktif
			# fig = go.Figure(data=go.Bar(x=NG_by_part['PartName'], y=NG_by_part['NG_%'],
			# 						marker_color='grey'))  # Sesuaikan warna jika ingin

			# fig.update_layout(title='Rata-rata NG_% per Part - LB4',
			# 				xaxis_title='PartName',
			# 				yaxis_title='NG_%')

			# st.plotly_chart(fig)
		#Qty (pcs) R1
		with kolomkanan:

			df_byLine=df[df['Line']=='Rack 1']

			List_Qty_R1=(
			df_byLine[["PartName","Qty(NG)","QInspec"]]
			.groupby(by="PartName")
			.sum()
			.sort_values(by="Qty(NG)",ascending=False)
			.reset_index()
			)

			# Buat grafik batang dengan Plotly
			# fig = px.bar(NG_by_part, x='NG_%', y='PartName', color='NG_%',barmode="relative")
			# fig.update_layout(title='Grafik NG (%) by Part Name - LB4',
			# 				xaxis_title='NG_%',
			# 				yaxis_title='PartName')
			# st.plotly_chart(fig)

			List_Qty_R1 = List_Qty_R1.map(format_with_comma)
			st.write("Tabel Qty (pcs) by Part Name Line Rack 1")
			st.write(List_Qty_R1)

		#kolom lagi untuk grafik NG by Part Name B4 dan R1 only
		sikir2,sinan2=st.columns(2)
		
		with sikir2:	#sisi kiri Grafik Batang Vertikal by PartName B4

			df_byLine=df[df['Line']=='Barrel 4']

			NG_by_part=(
			df_byLine[["PartName","NG_%"]]
			.groupby(by="PartName")
			.mean()
			.sort_values(by="NG_%",ascending=False)
			.reset_index()
			)
			# Filter nilai yang lebih besar dari 0 
			NG_by_part = NG_by_part[NG_by_part['NG_%'] > 0.5]

			# Buat grafik batang dengan Plotly
			fig = px.bar(NG_by_part, x='NG_%', y='PartName', color='NG_%',barmode="relative")
			fig.update_layout(title='Grafik NG (%) by Part Name - LB4',
							xaxis_title='NG_%',
							yaxis_title='PartName',
							yaxis=dict(categoryorder='total ascending') 	 # Mengatur urutan sumbu y dari terbesar ke terkecil
				 )	
			st.plotly_chart(fig)

			NG_by_part = NG_by_part.map(format_with_comma)
			st.write(NG_by_part)
			
		with sinan2:	#sisi kanan Grafik Batang Vertikal by PartName R1
		
			#filter df hanya yg tampil sesuai Line yg dipilih
			df_byLine=df[df['Line']=='Rack 1']

			NGpersenR1_by_part=(
			df_byLine[["PartName","NG_%"]]
			.groupby(by="PartName")
			.mean()
			.sort_values(by="NG_%",ascending=False)
			.reset_index()
			)
			# Filter nilai yang lebih besar dari 0 
			NGpersenR1_by_part = NGpersenR1_by_part[NGpersenR1_by_part['NG_%'] > 2]

			# Buat grafik batang dengan Plotly
			fig = px.bar(NGpersenR1_by_part, x="NG_%", y='PartName', color="NG_%",barmode="group")
			fig.update_layout(title='Grafik NG (%) by Part Name - LR1',
							xaxis_title='NG (%)',
							yaxis_title='PartName',
							yaxis=dict(categoryorder='total ascending') # Mengatur urutan sumbu y dari terbesar ke terkecil
							)
			st.plotly_chart(fig)

			NGpersenR1_by_part = NGpersenR1_by_part.map(format_with_comma)
			st.write(NGpersenR1_by_part)

		#-------------------------------------------------------

		st.markdown("---")

		
		#--------------------------------------
		#      NG Plating Smallpart by M/C NO.
		#--------------------------------------
		#region
		df.columns = df.columns.str.strip()
		# Ensure the 'M/C No.' column is of string type
		df['M/C No.'] = df['M/C No.'].astype(str)
		# Apply filter to exclude rows where 'M/C No.' is null, empty, or '00'
		df_filtered = df[(df['M/C No.'].notnull()) & (df['M/C No.'] != '') & (df['M/C No.'] != '00')]
		# Filter out rows where 'Insp(B/H)' or 'NG_%' is 0
		df_filtered = df_filtered[(df_filtered['Insp(B/H)'] > 0) & (df_filtered['NG_%'] > 0)]
		pt_MesinNo = pd.pivot_table(df_filtered, 
							values=['NG_%', 'Insp(B/H)'], 
							index='M/C No.', 
							aggfunc={'NG_%': 'mean', 'Insp(B/H)': 'sum'}, 
							margins=True, 
							margins_name='Total')
		st.write('NG (%) by M/C No. Stamping')
		pt_MesinNo_transposed = pt_MesinNo.transpose() # Transpose the pivot table
		pt_MesinNo_transposed = pt_MesinNo_transposed.round(2)
		st.write(pt_MesinNo_transposed)
		# Plotting the graph
		pt_MesinNo = pt_MesinNo.reset_index()
		pt_MesinNo = pt_MesinNo[pt_MesinNo['M/C No.'] != 'Total']
		fig = go.Figure()
		# Add Insp(B/H) bar trace
		fig.add_trace(go.Bar(
			x=pt_MesinNo['M/C No.'],
			y=pt_MesinNo['Insp(B/H)'],
			name='Insp(B/H)',
			marker_color='green',
			text=pt_MesinNo['Insp(B/H)'].apply(lambda x: f'{x:,.0f}'),
			textposition='outside'
		))

		# Add NG_% line trace
		fig.add_trace(go.Scatter(
			x=pt_MesinNo['M/C No.'],
			y=pt_MesinNo['NG_%'],
			name='NG_%',
			mode='lines+markers+text',
			marker_color='red',
			line_color='red',
			yaxis='y2',
			text=pt_MesinNo['NG_%'].apply(lambda x: f'<span style="color:red;">{x:.2f}</span>'),
			textposition='top center',
			hoverinfo='text'
		))

		# Customize layout
		fig.update_layout(
			title='Grafik NG (%) Vs Insp (B/H) per M/C No.',
			xaxis=dict(title='M/C No.', tickmode='linear', type='category'),
			yaxis=dict(title='Qty Inspected (B/H)', titlefont=dict(color='green'), tickfont=dict(color='green')),
			yaxis2=dict(title='NG (%)', titlefont=dict(color='red'), tickfont=dict(color='red'), overlaying='y', side='right'),
			paper_bgcolor='rgba(0,0,0,0)',  # Warna background keseluruhan
			plot_bgcolor='rgba(0,0,0,0)',   # Warna background area plot
			legend=dict(
				yanchor="top",
				y=-0.2,  # Posisi vertikal di bawah sumbu X
				xanchor="center",
				x=0.5   # Posisi horizontal di tengah
			),
			legend_title_text='by e-WeYe'
		)
		st.plotly_chart(fig) # Display the plot
		#endregion
		#--------------------------------------

		st.markdown("---")
		

		st.markdown("""<h3 style="color:Brown">DEFINISI</h3>""", unsafe_allow_html=True)
		st.markdown("""<p style="margin-top:-10px;margin-bottom:0px;font-size:14px">Definisi satuan dalam aplikasi ini:<br><br>
		1. Satuan lot ada 2 definisi :<br><br>
			<tab> a. Line Barrel ( LB4 dan LNi ), definisi lot adalah satuan yang mewakili jumlah part dalam 1 box atau 1 barrel atau 1 Kanban. Jumlah part dalam 1 box atau 1 barrel atau satu Kanban berbeda-beda untuk setiap part tergantung standar loadingnya.<br><br>
			b. Line Rack, definisi lot adalah satuan yang mewakili jumlah part dari 1 batch proses atau 1 hanger proses. Setiap 1 hanger berisi jumlah part yang berbeda-beda tergantung dari standar loading setiap part.<br><br>
		2. Satuan pc/pcs adalah satuan yang mewakili satu atau beberapa jumlah part.<br><br>
		3. Prosentase (%) adalah hasil dari perhitungan pembagian antara jumlah total NG (lot) dibagi dengan jumlah total hasil inspeksi (lot) dikalikan 100% <br><br>
		<span style="color:Blue">e-WeYe</p>""", unsafe_allow_html=True)

		st.markdown("---")
		#menampilkan tabel berdasarkan filter - 19Nov2024
		#----------
		st.subheader("Tools Filtering Data")

		filter_L, filter_mid, filter_R=st.columns([1,1,3])

		with filter_L:
			# Mendapatkan unique values dari kolom 'Line'
			filter_line = df3['Line'].unique()

			# Membuat selectbox untuk memilih Line
			selected_Line = st.selectbox("Pilih Line:", filter_line)

			# Menampilkan tabel berdasarkan filter Line
			filtered_line_df = df3[df3['Line'] == selected_Line]

		with filter_mid:
			# Mendapatkan unique values dari kolom 'Kategori'
			filter_kategori = filtered_line_df['Kategori'].unique()

			# Membuat selectbox untuk memilih kategori
			selected_kategori = st.selectbox("Pilih Kategori:", filter_kategori)

			# Menampilkan tabel berdasarkan filter Kategori
			filtered_df = filtered_line_df[filtered_line_df['Kategori'] == selected_kategori]
		with filter_R:

			# Mendapatkan daftar semua kolom yang tersedia
			kolom_tersedia = df3.columns.tolist()

			# Menghapus kolom 'Kategori' dan 'Line' dari daftar kolom yang tersedia
			kolom_tersedia.remove('Kategori')
			kolom_tersedia.remove('Line')
			kolom_tersedia.remove('% NG')

			# Membuat multiselect untuk memilih kolom yang akan ditampilkan 
			default_columns = ['PartName', 'NG_%']
			kolom_tersedia_for_multiselect = [col for col in kolom_tersedia if col not in default_columns]
			selected_columns = st.multiselect("Pilih Kolom untuk Ditampilkan:", kolom_tersedia, default=default_columns)

		# Menentukan fungsi agregasi untuk setiap kolom 
		agg_dict = {col: 'sum' for col in selected_columns}
		if 'NG_%' in selected_columns:
			agg_dict['NG_%'] = 'mean'

		# Menampilkan alert jika belum ada kolom yang dipilih untuk groupby 
		if len(selected_columns) == 0: 
			st.warning("Menunggu kolom nilai dipilih")
		else:

			# Memastikan tidak ada nilai 'NaN' dan tidak ada duplikat pada kolom 'PartName' 
			# df3 = df3.dropna(subset=['PartName']).drop_duplicates(subset=['PartName'])

			# Menampilkan tabel berdasarkan filter kategori dan kolom yang dipilih
			filtered_df = filtered_df[selected_columns] # Tambahkan 'PartName' untuk keperluan groupby

			st.write("Data hasil filtering:")
			st.write(filtered_df)

			# Membuat groupby berdasarkan PartName dan kolom yang dipilih oleh user 
			grouped_df = filtered_df.groupby('PartName').agg(agg_dict)
			# grouped_df.reset_index()
			# grouped_df.drop('PartName',inplace=True)

			st.write("Data hasil grouping:") 
			st.write(grouped_df)


	else:
		st.write("File tidak ditemukan")
	return df



#MAIN module --------------------
def main():
#Main - module yg akan pertama dijalankan - improved @home 03-Nov2024 - dirubah lagi ke model uploaded pertama krn error

	#Nama file yang akan dihapus saat mulai
	files_to_delete = ["arsip_file.csv"]
	# Loop melalui setiap file dan hapus jika ada
	for file in files_to_delete:
		if os.path.exists(file):
			os.remove(file)

	# File uploader

	#Added 18Mar2025 to make this apps more user friendly and globally accessible
	st.info(f"Jika sumber file yang ingin dibersihkan berada di folder Google Drive, unduh/download lewat link berikut ini: [Link Folder](https://drive.google.com/drive/folders/1motad9bizxGZdiODetAo6K7_38dbXxxG?usp=sharing)  |  Download file Excel (.xls, .xlsx atau .csv) dari folder tersebut ke perangkat Anda, lalu unggah/upload file lewat menu Browse di bawah ini:")

	uploaded_files = st.file_uploader("Pilih file Excel (.xls, .xlsx, csv):",type=["xls", "xlsx", "csv"], accept_multiple_files=True)

	if uploaded_files:
		dfs = []
		for uploaded_file in uploaded_files:
			try:
				file_extension = uploaded_file.name.split('.')[-1].lower()
				if file_extension in ["xls", "xlsx"]:
					df_ori = pd.read_excel(uploaded_file)
					# st.success(f"File Excel {uploaded_file.name} berhasil diunggah!")
				elif file_extension == "csv":
					df_ori = pd.read_csv(uploaded_file)
					# st.success(f"File CSV {uploaded_file.name} berhasil diunggah!")
				else:
					st.error(f"Format file {uploaded_file.name} tidak didukung. Harap unggah file dengan ekstensi .xls, .xlsx, atau .csv")
					df_ori = None

				if dfs is not None:
					dfs.append(df_ori)

			except Exception as e:
				st.error(f"Terjadi kesalahan saat memproses file {uploaded_file.name}: {e}")

		if dfs:
			df = pd.concat(dfs, ignore_index=True)
			# st.subheader("Data yang Terunggah dan Digabungkan:")
			# st.dataframe(df)

	#yg tdk aktif ini single file yg diupload: dan sudah dihapus 18Mar2025 diganti kode di atas untuk multi file
	# if uploaded_file is not None:
	# 	# 	# Read the file
	# 	if uploaded_file.name.endswith('.xls'):
	# 		df = pd.read_excel(uploaded_file, engine='xlrd')
	# 	elif uploaded_file.name.endswith('.xlsx'):
	# 		df = pd.read_excel(uploaded_file, engine='openpyxl')
	# 	elif uploaded_file.name.endswith('.csv'):
	# 		df = pd.read_csv(uploaded_file)
	# 	else:
	# 		raise ValueError("File harus memiliki ekstensi .xls, .xlsx, atau .csv")

	
		#------- simpan arsip file #sistem simpan baru, dicoba ken simpan model di atas tsb tidak efektif
		# Dapatkan direktori tempat file Python ini berada, improved 13Nov2024
		current_dir = os.path.dirname(os.path.abspath(__file__))
		# Gabungkan dengan nama file
		file_path = os.path.join(current_dir, "file_arsip.csv")
		# Simpan file
		df.to_csv(file_path, index=False)
		# with open(file_path, 'w+') as f:
		# 	f.write()
		# st.success("File_arsip.csv berhasil disimpan!")
		
		st.success("File berhasil di-upload dan langsung diproses Cleaning.")

		df = pd.read_csv(file_path)

		df=data_tanggal(df)

		df=cleaning_process(df)

		show_footer()


# #Main - module yg akan pertama dijalankan - improved @home 03-Nov2024
# 		try:
# 			#arsip file yg lalu .csv

# 			# Dapatkan direktori tempat file Python ini berada, improved 13Nov2024
# 			current_dir = os.path.dirname(os.path.abspath(__file__))
# 			# Gabungkan dengan nama file
# 			file_path = os.path.join(current_dir, "file_arsip.csv")
# 			# arsip_file= "arsip_file.csv"
# 			df = pd.read_csv(file_path)

# 			df=data_tanggal(df)

# 			df=cleaning_process(df)

# 			show_footer()
# 		except FileNotFoundError:
# 			st.error("File arsip tidak ditemukan. Silakan unggah file baru.")	
# 		return
	else:
		st.error("Menunggu file diupload....")

if __name__ == "__main__":
	main()
	
	# #Nama file yang akan dihapus saat mulai
	# files_to_delete = ["arsip_file.csv"]
	# # Loop melalui setiap file dan hapus jika ada
	# for file in files_to_delete:
	# 	if os.path.exists(file):
	# 		os.remove(file)

	# # File uploader
	# uploaded_file = st.file_uploader("Pilih file Excel (.xls, .xlsx, csv):")
	# if uploaded_file is not None:
	# 	# 	# Read the file
	# 	if uploaded_file.name.endswith('.xls'):
	# 		df = pd.read_excel(uploaded_file, engine='xlrd')
	# 	elif uploaded_file.name.endswith('.xlsx'):
	# 		df = pd.read_excel(uploaded_file, engine='openpyxl')
	# 	elif uploaded_file.name.endswith('.csv'):
	# 		df = pd.read_csv(uploaded_file)
	# 	else:
	# 		raise ValueError("File harus memiliki ekstensi .xls, .xlsx, atau .csv")

		# # Get the absolute path for saving the file
		# save_path = os.path.join(os.path.dirname(__file__), 'arsip_file.csv')	
		# # Save a copy for archive
		# df.to_csv(save_path, index=False)
		# # Save a copy for archive
		# df.to_csv("arsip_file.csv", index=False)
		# simpan_file(uploaded_file)			#sistem simpan baru, dicoba ken simpan model di atas tsb tidak efektif

		# #------- simpan arsip file #sistem simpan baru, dicoba ken simpan model di atas tsb tidak efektif
		# # Dapatkan direktori tempat file Python ini berada, improved 13Nov2024
		# current_dir = os.path.dirname(os.path.abspath(__file__))
		# # Gabungkan dengan nama file
		# file_path = os.path.join(current_dir, "file_arsip.csv")
		# # Simpan file
		# df.to_csv(file_path, index=False)
		# # with open(file_path, 'w+') as f:
		# # 	f.write()
		# st.success("File_arsip.csv berhasil disimpan!")
		
		# st.success("File berhasil di-upload dan langsung diproses Cleaning.")		
	
		# # st.cache_resource.clear()

		# # Command to run check.py 
		# # subprocess.run(["python", "app2.py"]) 
		# # # Exit app.py 
		# # sys.exit()

		# main()


# ---- HIDE STREAMLIT STYLE ----
hide_st_style = """
            <style>
            #MainMenu {visibility: hidden;}
            footer {visibility: hidden;}
            header {visibility: hidden;}
            </style>
            """
st.markdown(hide_st_style, unsafe_allow_html=True)