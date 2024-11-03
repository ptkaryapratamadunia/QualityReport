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

st.set_page_config(page_title="Quality Report", page_icon=":bar_chart:",layout="wide")



# Fungsi untuk mengubah gambar menjadi base64
def get_image_as_base64(image_path):
	with open(image_path, "rb") as img_file:
		return base64.b64encode(img_file.read()).decode()
		
# heading
kolkir,kolnan=st.columns((2,1))	#artinya kolom sebelahkiri lebih lebar 2x dari kanan

with kolkir:
	st.markdown("""<h2 style="color:green;margin-top:-10px;margin-bottom:0px;"> 🧹CLEANING DATA </h2>""", unsafe_allow_html=True)
	st.write("Tools Pengolahan Data")
	st.write("Beberapa data output dari aplikasi AUTOCON-KPD belum siap pakai,\
			 oleh karena itu perlu dilakukan proses cleaning, seperti mengkonversi data TEXT menjadi angka,\
			 konversi type NG ABCDSEFGIJKLMN menjadi definisi type NG, mengekstrasi data Nomer Jig\
		  	 menjadi Nomer Mesin SMallpart, menghapus kolom yang tidak perlu\
			 dan menambah kolom yang diperlukan,dll. Tanpa buang waktu sudah disediakan juga\
		  	 summary report berupa Table dan Grafik yang siap digunakan untuk analisa dan pengambilan keputusan.\
		  	 Disclaimer: Tools ini dapat dijalankan hanya jika sumber file nya adalah hasil ekspor dari program\
		     Autocon QC dan hanya diperuntukkan untuk internal KPD")
	
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
		link_url_looker='https://lookerstudio.google.com/reporting/e4a5c3f7-bf91-44e0-9ced-2b7a01eafa3d/page/FsgzD?s=qyZPms8Wytc'
		st.link_button('Summary Report',link_url_looker,icon='📊')
		# if st.button('Summary Web Report'):
		# 			webbrowser.open_new_tab('https://lookerstudio.google.com/reporting/e4a5c3f7-bf91-44e0-9ced-2b7a01eafa3d/page/FsgzD?s=qyZPms8Wytc') 
		st.markdown('</div>', unsafe_allow_html=True)
	
st.markdown("---")	#--------------------------batas akhir styling HEADER -----------------

#---START CLEANING ---------

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

#flexible read data:
def read_file(uploaded_file):		
	# Mendapatkan nama file
	file_name = uploaded_file.name

	# Memeriksa ekstensi file
	if file_name.endswith('.xls'):
		# Menggunakan engine 'xlrd' untuk file .xls
		df = pd.read_excel(uploaded_file, engine='xlrd')
	elif file_name.endswith('.xlsx'):
		# Menggunakan engine 'openpyxl' untuk file .xlsx
		df = pd.read_excel(uploaded_file, engine='openpyxl')
	elif file_name.endswith('.csv'):
		# Menggunakan pandas untuk membaca file .csv
		df = pd.read_csv(uploaded_file)
	else:
		raise ValueError("File harus memiliki ekstensi .xls, .xlsx, atau .csv")
	
	return df
	

def simpan_file(df,filename="arsip_file.csv"):
	df.to_csv(filename, index=False)

def data_tanggal(df):
	df['DocDate'] = pd.to_datetime(df['DocDate'])

	# Tanggal tertua
	tanggal_tertua = df['DocDate'].min()

	# Tanggal termuda
	tanggal_termuda = df['DocDate'].max()

	st.write(f"""
			Periode dari Tanggal: {tanggal_tertua}
			Sampai Tanggal : {tanggal_termuda}
			""")
	return df

def cleaning_process(df):
	#dataframe - script ini untuk filtering model tree
	with st.expander("Preview Original Data"):
		df2 = dataframe_explorer(df, case=False)
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

		#mengganti semua nilai pada kolom NG(B/H) dari kolom Tot_NG
		df['NG(B/H)'] = df['Tot_NG']

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
		# df.loc[(df['Line'] == 'Barrel 4') & (df['Cust.ID'] == 'HDI') & (df['Kategori'].isna()), 'Kategori'] = 'HDI'
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
		df['Shift'] = df['Shift'].astype(str)
		df['NoBarrelHanger']=df['NoBarrelHanger'].astype(str)
		
		# st.write('Preview Data setelah dirapihkan (cleaning):')
		#dataframe - script ini untuk filtering model tree
		with st.expander("Preview Data setelah dirapihkan (cleaning)"):
			df3 = dataframe_explorer(df, case=False)
			st.dataframe(df3, use_container_width=True)

		#------------- merapihkan kolom sama dengan target looker 21Oct2024
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
			pickle.dump(df, f)

		#------------------ view di 2 kolom
		# Membuat tabel pivot NG% by MONTH and LINE---------------
		df['Date']=pd.to_datetime(df['Date'])
		df['Date'] = df['Date'].dt.strftime("%b-%Y")

		pivot_df_bulan_line= pd.pivot_table(df, values='NG_%', index='Date',columns='Line', aggfunc='mean',margins=True,margins_name='Total')
		pivot_df_bulan_line_grafik= pd.pivot_table(df, values='NG_%', index='Date', aggfunc='mean')
		# Membuat tabel pivot Qty NG(Lot) by MONTH and LINE---------------
		pivot_df_bulan_line2= pd.pivot_table(df, values='Tot_NG', index='Date',columns='Line', aggfunc='sum',margins=True,margins_name='Total')
		# Membuat tabel pivot Qty Insp(Lot) by MONTH and LINE---------------
		pivot_df_bulan_line3= pd.pivot_table(df, values='Insp(B/H)', index='Date',columns='Line', aggfunc='sum',margins=True,margins_name='Total')
		pivot_df_bulan_line3_grafik= pd.pivot_table(df, values='Insp(B/H)', index='Date', aggfunc='sum')

		bariskiri,bt1,bt2,bt3,bariskanan=st.columns(5)

		with bariskiri:
			# Tampilkan tautan unduhan di Streamlit
			st.download_button(
				label="Download File Excel",
				data=output,
				help="Klik untuk mendownload file hasil Cleaning",
				file_name='File_after_Cleaning.xlsx',
				mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
			)
		with bt1:
		
			st.markdown("""<h6 style="color:blue;" > METRIC SUMMARY  ➡️ </h6>""", unsafe_allow_html=True)

		with bt2:
			container3=st.container(border=True)
			tot_Qty_lot=df['Insp(B/H)'].sum()
			container3.write(f"Total Inspected (lot)	:{tot_Qty_lot:.0f}")
			# bariskanan.metric("Total Inspected (lot)",f"{tot_Qty_lot:.0F}")

		with bt3:
			container=st.container(border=True)
			tot_NG_lot=df['Tot_NG'].sum()
			container.write(f"Tot. NG (lot)  :  {tot_NG_lot:.0f}")
			# bt2.metric("Total NG (lot):",f"{tot_NG_lot:.0f}")

		with bariskanan:
			container2=st.container(border=True)
			tot_NG_persen=df['NG_%'].mean()
			container2.write(f"Tot. NG (%)	: {tot_NG_persen:.2f}")
			# bt3.metric("Total NG (%)",f"{tot_NG_persen:.2f}")
		st.markdown("---")

		# df.to_csv('arsip_file.csv',index=False)
		# st.write("File after Cleaning juga telah disimpan dalam bentuk .xlsx dengan nama : 'File after Cleaning'")

		# -------------------------------------

			#Grafik area
		grafik_kiri,grafik_kanan=st.columns(2)

		with grafik_kiri:
			# Menggambar grafik batang
			data_grafik=pivot_df_bulan_line_grafik.reset_index()
			data_grafik=data_grafik.sort_index(ascending=True)
			data_grafik2=pivot_df_bulan_line3_grafik.reset_index()
			data_grafik2=data_grafik2.sort_index(ascending=True)
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
				marker_color='orange',
			))

			# Customize layout
			fig.update_layout(
				
			title='Grafik NG% & Qty Inspeted by Month',
			xaxis=dict(title='Month',type='category'),
			yaxis=dict(title='Qty Inspected (pcs)', titlefont=dict(color='green'), tickfont=dict(color='green')),
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
			
		with grafik_kanan:
			# Hitung agregasi untuk setiap kategori
			NG_by_kategori_ng = df.groupby('Kategori').agg({'NG_%': 'mean'}).reset_index()
			NG_by_kategori_insp = df.groupby('Kategori').agg({'Insp(B/H)': 'sum'}).reset_index()

			# Create a figure with a 1x2 subplot grid (1 row, 2 columns)
			fig = make_subplots(rows=1, cols=2)

			# Add traces to the subplots
			fig.add_trace(go.Bar(x=NG_by_kategori_ng['Kategori'], y=NG_by_kategori_ng['NG_%'], name='NG_%', marker_color='blue'), row=1, col=1)
			fig.add_trace(go.Bar(x=NG_by_kategori_insp['Kategori'], y=NG_by_kategori_insp['Insp(B/H)'], name='Insp(B/H)', marker_color='orange'), row=1, col=2)

			# Update layout for secondary y-axis (optional)
			fig.update_layout(
				title='Grafik Total Inspected (lot) Vs Average NG (% ) per Kategori',
				xaxis_title='Kategori',
				yaxis=dict(title='Average NG (%)'),
				yaxis2=dict(title='Qty Inspected (lot)', overlaying='y', side='right')  # If needed for overlay
			)

			# Display the plot
			st.plotly_chart(fig)

		st.markdown("---")

		st.subheader('Summary Data')
		kiri,tengah,kanan=st.columns(3)
		with kiri:
			st.write('Data NG (%) by Line & Month')
			pivot_df_bulan_line = pivot_df_bulan_line.round(2)
			st.write(pivot_df_bulan_line)
		with tengah:
			st.write('Data Qty NG (lot) by Line & Month')
			pivot_df_bulan_line2 = pivot_df_bulan_line2.round(0)
			st.write(pivot_df_bulan_line2)

		with kanan:
			st.write('Data Qty Inspected (lot) by Line & Month')
			pivot_df_bulan_line3 = pivot_df_bulan_line3.round(0)
			st.write(pivot_df_bulan_line3)
		# ---------------------------------------
		# Membuat tabel pivot NG by Customer and LINE---------------

		pt_customer_line=pd.pivot_table(df,values='NG_%',index='Cust.ID',columns='Line',aggfunc='mean',margins=True,margins_name='Total')
		st.write('Data NG (%) by Line & Customer')
		# Bulatkan nilai-nilai ke angka bulat terdekat
		pt_customer_line = pt_customer_line.round(2)
		pt_customer_line_transposed=pt_customer_line.transpose()
		st.write(pt_customer_line_transposed)

		#gambar grafik line	
		df_grafik=pd.DataFrame(pt_customer_line_transposed)

		# Memilih kolom yang ingin diplotkan (kecuali kolom 'Total')
		columns_to_plot = pt_customer_line_transposed.columns[:-1]  # Mengambil semua kolom kecuali yang terakhir
		chart_data = pd.DataFrame(pt_customer_line_transposed,index=['Line'], columns=columns_to_plot)
	
		#---------
		pt_customer_line2=pd.pivot_table(df,values='Insp(B/H)',index='Cust.ID',columns='Line',aggfunc='sum',margins=True,margins_name='Total')
		# Bulatkan nilai-nilai ke angka bulat terdekat
		pt_customer_line2 = pt_customer_line2.round(0)

		st.write('Data Quantity (lot) by Line & Customer')
		pt_customer_line2_tranposed=pt_customer_line2.transpose()
		st.write(pt_customer_line2_tranposed)

		# cl1,cl2=st.columns(2)
		# with cl1:
		# with cl2:
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


		# Fungsi untuk format angka dengan koma
		# def format_with_comma(value):
		# 	return "{:,.2f}".format(value)
		def format_with_comma(value):
			if isinstance(value, (int, float)):
				return "{:,.2f}".format(value)
			return value

		# Terapkan format ke seluruh pivot table
		pt_kategori_line = pt_kategori_line.applymap(format_with_comma)	
		pt_kategori_line3 = pt_kategori_line3.applymap(format_with_comma)	

		#buat kolom	
		colkir,colteng,colnan=st.columns(3)
		with colkir:
			st.write('Data NG (%) by Line & Kategori')
			st.write(pt_kategori_line)

			#grafik pcs hanya untuk busi
			pt_kategori_line_NGpcs_grafikBUSI=pt_kategori_line_NGpcs_grafik.loc['BUSI']
			pt_kategori_line_InspPcs_grafikBUSI=pt_kategori_line_InspPcs_grafik.loc['BUSI']

			#gabung data
			combined_data=pd.concat([pt_kategori_line_InspPcs_grafikBUSI,pt_kategori_line_NGpcs_grafikBUSI],ignore_index=True)
			df_grup_grafik=pd.DataFrame(combined_data)
			#nambah kolom satuan
			grup=['Qty Inspected (pcs)','Qty NG (pcs)']
			df_grup_grafik['Satuan']=grup

			# Buat grafik batang dengan Plotly
			fig = px.bar(df_grup_grafik, x='Satuan', y='BUSI', color='Satuan', barmode='group')
			fig.update_layout(title='Grafik Qty Insp dan Qty NG untuk BUSI (pcs)',
							xaxis_title='-',
							yaxis_title='(pcs)')
			st.plotly_chart(fig)

		with colteng:
			st.write('Data Qty NG (lot) by Line & Kategori')
			st.write(pt_kategori_line3)
			st.write('Data Qty NG (pcs) by Line & Kategori')
			pt_kategori_line_NGpcs = pt_kategori_line_NGpcs.round(0)
			st.write(pt_kategori_line_NGpcs)
		with colnan:
			st.write('Data Quantity Inspected (lot) by Line & Kategori')
			pt_kategori_line2 = pt_kategori_line2.round(0)
			st.write(pt_kategori_line2)

			st.write('Data Quantity Inspected (pcs) by Line & Kategori')
			pt_kategori_line_InspPcs = pt_kategori_line_InspPcs.round(0)
			st.write(pt_kategori_line_InspPcs)

		# # Mengonversi pivot tabel dari bentuk wide ke long untuk plotly
		# pivot_df_melted = pt_kategori_line.melt(id_vars=['Kategori'], var_name='Line', value_name='Average NG%')

		# # Menggambar grafik batang interaktif
		# fig = px.bar(pivot_df_melted, x='Kategori', y='Average NG%', color='Line', barmode='group', title='Average NG% per Line by Kategori')

		# # Menampilkan grafik di Streamlit
		# st.plotly_chart(fig)

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

		# total_row=total_row.round(0)
		total_row = total_row.applymap(format_with_comma)		#pengganti format diatas, meskipun unit nya lot krn actualnya ada yg kecil di bawah 1 lot
		st.write(total_row)

		# st.write(f"Total NG (lot) : {df['Tot_NG'].sum():.0f}")
		#-------------------------------------------------------

		# total_rowNG = (total_row/df['Tot_NG'].sum())*100
		# total_rowNG['index']='Total_NG%'
		# total_rowNG.set_index('index', inplace=True)
		# total_rowNG=total_rowNG.round(2)
		# st.write(total_rowNG)

		# st.write(f"Total NG (%) : {df['NG_%'].mean():0.2f}")

		# Membuat tabel pivot NG by M/C No ---------------
		# Filter DataFrame to exclude empty or '00' in 'M/C No.'
		
		# Ensure correct column names without leading/trailing spaces
		df.columns = df.columns.str.strip()

		# Ensure the 'M/C No.' column is of string type
		df['M/C No.'] = df['M/C No.'].astype(str)

		# Apply filter to exclude rows where 'M/C No.' is null, empty, or '00'
		df_filtered = df[(df['M/C No.'].notnull()) & (df['M/C No.'] != '') & (df['M/C No.'] != '00')]	
		pt_MesinNo = pd.pivot_table(df_filtered, 
                            values=['NG_%', 'Insp(B/H)'], 
                            index='M/C No.', 
                            aggfunc={'NG_%': 'mean', 'Insp(B/H)': 'sum'}, 
                            margins=True, 
                            margins_name='Total')
		# Transpose the pivot table
		st.write('Data NG (%) by Nomer Mesin Stamping')
		pt_MesinNo_transposed = pt_MesinNo.transpose()
		pt_MesinNo_transposed=pt_MesinNo_transposed.round(2)
		st.write(pt_MesinNo_transposed)

		#groupby dataframe	---------------

		sikir,sinan=st.columns(2)

		with sikir:
			NG_by_kategori=(
			df[["Kategori","NG_%"]]
			.groupby(by="Kategori")
			.mean()
			.sort_values(by="NG_%",ascending=False)
			.reset_index()
			)
			# st.write(NG_by_kategori)
			
			# Buat grafik batang interaktif
			fig = go.Figure(data=go.Bar(x=NG_by_kategori['Kategori'], y=NG_by_kategori['NG_%'],
									marker_color='yellow'))  # Sesuaikan warna jika ingin

			fig.update_layout(title='Rata-rata NG_% per Kategori',
							xaxis_title='Kategori',
							yaxis_title='NG_%')

			st.plotly_chart(fig)

		with sinan:
		
			NG_by_Cust=(
					df[["Cust.ID","NG_%"]]
					.groupby(by="Cust.ID")
					.mean()
					.sort_values(by="NG_%",ascending=False)
					.reset_index()
			)
			# st.write(NG_by_kategori)
			
			# Buat grafik batang interaktif
			fig = go.Figure(data=go.Bar(x=NG_by_Cust['Cust.ID'], y=NG_by_Cust['NG_%'],
									marker_color='blue'))  # Sesuaikan warna jika ingin

			fig.update_layout(title='Rata-rata NG_% by Customer',
							xaxis_title='Cust.ID',
							yaxis_title='NG_%')

			st.plotly_chart(fig)
		
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

		# #kolom lagi
		# sikir2,sinan2=st.columns(2)

		# with sikir2:

		# 		# list_line=df['Line'].unique()
		# 		# pilihan_line = st.selectbox(
		# 		# "Pilih Line :",
		# 		# list_line,
		# 		# index=None,
		# 		# placeholder="Pilih Line di sini...",
		# 		# )
		# 	# NG_by_part=(
		# 	# df[["PartName","NG_%"]]
		# 	# .groupby(by="Kategori")
		# 	# .mean()
		# 	# .sort_values(by="NG_%",ascending=False)
		# 	# .reset_index()
		# 	# )
		# 	# # st.write(NG_by_kategori)
			
		# 	# # Buat grafik batang interaktif
		# 	# fig = go.Figure(data=go.Bar(x=NG_by_kategori['Kategori'], y=NG_by_kategori['NG_%'],
		# 	# 						marker_color='yellow'))  # Sesuaikan warna jika ingin

		# 	# fig.update_layout(title='Rata-rata NG_% per Kategori',
		# 	# 				xaxis_title='Kategori',
		# 	# 				yaxis_title='NG_%')

		# 	# st.plotly_chart(fig)

		# with sinan2:
		
		# 	# NG_by_Cust=(
		# 	# 		df[["Cust.ID","NG_%"]]
		# 	# 		.groupby(by="Cust.ID")
		# 	# 		.mean()
		# 	# 		.sort_values(by="NG_%",ascending=False)
		# 	# 		.reset_index()
		# 	# )
		# 	# # st.write(NG_by_kategori)
			
		# 	# # Buat grafik batang interaktif
		# 	# fig = go.Figure(data=go.Bar(x=NG_by_Cust['Cust.ID'], y=NG_by_Cust['NG_%'],
		# 	# 						marker_color='blue'))  # Sesuaikan warna jika ingin

		# 	# fig.update_layout(title='Rata-rata NG_% by Customer',
		# 	# 				xaxis_title='Cust.ID',
		# 	# 				yaxis_title='NG_%')

		# 	# st.plotly_chart(fig)
		# #--------------------------------------




	else:
		st.write("File tidak ditemukan")

	return df



#MAIN module --------------------
def main():
#Main - module yg akan pertama dijalankan - improved @home 03-Nov2024
		try:
			#arsip file yg lalu .csv
			arsip_file= "arsip_file.csv"
			df = pd.read_csv(arsip_file)

			df=data_tanggal(df)

			df=cleaning_process(df)

			show_footer()

		except FileNotFoundError:
			st.error("File arsip tidak ditemukan. Silakan unggah file baru.")
			
		return


if __name__ == "__main__":
	main()
	
	#Nama file yang akan dihapus saat mulai
	files_to_delete = ["arsip_file.csv"]
	# Loop melalui setiap file dan hapus jika ada
	for file in files_to_delete:
		if os.path.exists(file):
			os.remove(file)

# File uploader
	uploaded_file = st.file_uploader("Pilih file Excel (.xls, .xlsx, csv):")

	if uploaded_file is not None:

		# Read the file
		if uploaded_file.name.endswith('.xls'):
			df = pd.read_excel(uploaded_file, engine='xlrd')
		elif uploaded_file.name.endswith('.xlsx'):
			df = pd.read_excel(uploaded_file, engine='openpyxl')
		elif uploaded_file.name.endswith('.csv'):
			df = pd.read_csv(uploaded_file)
		else:
			raise ValueError("File harus memiliki ekstensi .xls, .xlsx, atau .csv")
		
		# Save a copy for archive
		df.to_csv("arsip_file.csv", index=False)

		st.write("File berhasil di-upload dan langsung diproses Cleaning.")
							
		main()

	else:
		st.write("Menunggu file diupload....")


# ---- HIDE STREAMLIT STYLE ----
hide_st_style = """
            <style>
            #MainMenu {visibility: hidden;}
            footer {visibility: hidden;}
            header {visibility: hidden;}
            </style>
            """
st.markdown(hide_st_style, unsafe_allow_html=True)