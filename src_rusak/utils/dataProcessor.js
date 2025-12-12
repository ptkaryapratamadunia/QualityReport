import * as XLSX from 'xlsx'

export const processExcelFile = async (files) => {
  const readSingleFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Try to find a sheet named 'Data', otherwise use the first one
          let sheetName = workbook.SheetNames.find(name => name.toLowerCase() === 'data')
          if (!sheetName) {
              sheetName = workbook.SheetNames[0]
          }
          
          console.log(`Processing sheet: ${sheetName} from file: ${file.name}`)
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          resolve(jsonData)
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error)
          reject(error)
        }
      }
      
      reader.onerror = (error) => reject(error)
      reader.readAsArrayBuffer(file)
    })
  }

  try {
    // Convert FileList to Array if necessary
    const fileList = files instanceof FileList ? Array.from(files) : (Array.isArray(files) ? files : [files])
    
    const allDataPromises = fileList.map(file => readSingleFile(file))
    const allDataArrays = await Promise.all(allDataPromises)
    
    // Flatten the array of arrays into a single array
    const combinedData = allDataArrays.flat()
    
    console.log(`Total rows before cleaning: ${combinedData.length}`)
    
    if (combinedData.length > 0) {
        console.log('Raw Data Sample (first row):', combinedData[0])
    }

    const { productionData, trialData } = cleanData(combinedData)
    
    if (productionData.length === 0 && trialData.length === 0) {
        console.warn("No data remained after cleaning. Check column mapping.")
    }

    // Calculate Date Range
    let dateRange = { start: null, end: null }
    if (productionData.length > 0) {
        const dates = productionData.map(row => row.DateObj).filter(d => d && !isNaN(d))
        if (dates.length > 0) {
            const minDate = new Date(Math.min.apply(null, dates))
            const maxDate = new Date(Math.max.apply(null, dates))
            const formatDate = (date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            dateRange = { start: formatDate(minDate), end: formatDate(maxDate) }
        }
    }

    // File Metadata
    const fileMetadata = fileList.map(f => ({
        name: f.name,
        size: (f.size / 1024).toFixed(1) + 'KB'
    }))

    const metrics = calculateMetrics(productionData)
    const chartsData = prepareChartsData(productionData)
    const summaryTables = prepareSummaryTables(productionData)
    const trialMetrics = prepareTrialData(trialData)
    
    return { cleanedData: productionData, trialData, metrics, chartsData, summaryTables, trialMetrics, fileMetadata, dateRange }
    
    return { cleanedData, metrics, chartsData, summaryTables, fileMetadata, dateRange }
  } catch (error) {
    console.error("Error in processExcelFile:", error)
    throw error
  }
}

const cleanData = (data) => {
  // 1. Rename Columns Mapping
  const columnMap = {
    // Format 1 (app.py)
    'tanggal': 'Date',
    'ng (lot)': 'NG(Lot)',
    'insp (lot)': 'Insp(Lot)',
    'ok (lot)': 'OK(Lot)',
    'ng (%)': 'NG_%',
    'kategori produk': 'Kategori',
    'nama customer': 'Cust.ID',
    'nama part': 'Part.ID',
    'shift': 'Shift',
    'line': 'Line',
    'keterangan': 'Keterangan',
    
    // Format 2 (20 StockProduction.xls)
    'docdate': 'Date',
    'insp(b/h)': 'Insp(B/H)',
    'ng(b/h)': 'NG(B/H)',
    'ok(b/h)': 'OK(B/H)',
    '% ng': 'NG_%',
    'itemcode': 'Part.ID',
    'description': 'PartName',
    'docno': 'DocNo',
    'nojig': 'NoJig',
    'nocard': 'NoCard',
    'std load': 'Std Load',
    'nobarrelhanger': 'NoBH_NoLotMTL',
    'nobak': 'NoBak',
    'ok(pcs)': 'OK(pcs)',
    'qty(ng)': 'Qty(NG)',
    'qinspec': 'QInspec',

    // NG Columns Mapping (A-Y)
    'a': 'Warna',
    'b': 'Buram',
    'c': 'Berbayang',
    'd': 'Kotor',
    'e': 'Tdk Terplating',
    'f': 'Rontok/ Blister',
    'g': 'Tipis/ EE No Plating',
    'h': 'Flek Kuning',
    'i': 'Terbakar',
    'j': 'Watermark',
    'k': 'Jig Mark/ Renggang',
    'l': 'Lecet/ Scratch',
    'm': 'Seret',
    'n': 'Flek Hitam',
    'o': 'Flek Tangan',
    'p': 'Belang/ Dempet',
    'q': 'Bintik',
    'r': 'Kilap',
    's': 'Tebal',
    't': 'Flek Putih',
    'u': 'Spark',
    'v': 'Kotor H/ Oval',
    'w': 'Terkikis/ Crack',
    'x': 'Dimensi/ Penyok',
    'y': 'MTL/ SLipMelintir'
  }

  // Helper to find matching key
  const findKey = (rowKey) => {
      const normalized = rowKey.toLowerCase().trim().replace(/\s+/g, ' ')
      if (columnMap[normalized]) return columnMap[normalized]
      
      const ngColumns = [
        'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
        'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
        'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
        'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
        'Terkikis/ Crack', 'Dimensi/ Penyok', 'MTL/ SLipMelintir'
      ]
      
      const foundNg = ngColumns.find(col => col.toLowerCase() === normalized)
      if (foundNg) return foundNg

      return rowKey
  }

  let processed = data.map(row => {
    const newRow = {}
    Object.keys(row).forEach(key => {
      const newKey = findKey(key)
      newRow[newKey] = row[key]
    })
    return newRow
  })

  // 2. Filter NaNs
  processed = processed.filter(row => row['Date'] !== undefined && row['Date'] !== null)

  // 3. Fill NaNs & Type Conversion & Calculations
  const ngColumns = [
    'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
    'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
    'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
    'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
    'Terkikis/ Crack', 'Dimensi/ Penyok', 'MTL/ SLipMelintir'
  ]

  processed = processed.map(row => {
    row['Insp(B/H)'] = Number(row['Insp(B/H)']) || 0
    row['NG(B/H)'] = Number(row['NG(B/H)']) || 0
    row['OK(B/H)'] = Number(row['OK(B/H)']) || 0
    row['Std Load'] = Number(row['Std Load']) || 0

    // Ensure these are numbers for export
    row['OK(pcs)'] = Number(row['OK(pcs)']) || 0
    row['Qty(NG)'] = Number(row['Qty(NG)']) || 0
    row['QInspec'] = Number(row['QInspec']) || 0

    // Process NG Columns (PCS to LOT conversion)
    let totNG = 0
    let totNGPcs = 0
    ngColumns.forEach(col => {
        let val = Number(row[col]) || 0
        
        // 1. Create (pcs) column
        row[col + '(pcs)'] = val
        
        // 2. Convert to Lot (divide by Std Load)
        if (row['Std Load'] > 0) {
            val = val / row['Std Load']
        } else {
            val = 0
        }
        row[col] = val
        
        // 3. Sum to Tot_NG
        // Exclude 'MTL/ SLipMelintir' from Tot_NG as per app.py
        if (col !== 'MTL/ SLipMelintir') {
            totNG += val
            totNGPcs += row[col + '(pcs)']
        }
    })
    row['Tot_NG'] = totNG

    // Calculate NG_%
    if (row['Insp(B/H)'] > 0) {
        row['NG_%'] = (totNG / row['Insp(B/H)']) * 100
    } else {
        row['NG_%'] = 0
    }

    // Update NG(B/H) and Qty(NG) to match the calculated sum (excluding MTL)
    row['NG(B/H)'] = totNG
    row['Qty(NG)'] = totNGPcs

    // Kategori Logic
    let kategori = String(row['Kategori'] || '').trim().toUpperCase()
    const allowedValues = ['SAGA', 'SMP', 'OTH', 'RACK 1', 'GARMET NI', 'OTH NI', 'HDI', 'GARMET']
    
    if (!allowedValues.includes(kategori)) {
        kategori = 'kosong'
    }

    const line = String(row['Line'] || '')
    const custID = String(row['Cust.ID'] || '')
    const noCard = String(row['NoCard'] || '')
    const partID = String(row['Part.ID'] || '')

    let effectiveCustID = custID
    if (!effectiveCustID && partID) {
         const parts = partID.split(' ')
         if (parts.length > 0) effectiveCustID = parts[0]
    }
    row['Cust.ID'] = effectiveCustID

    const isTrial = noCard.toUpperCase().includes('TRIAL')

    if (line === 'Barrel 4' && effectiveCustID !== 'DNIAF') {
        kategori = 'OTH'
    }

    if (line === 'Barrel 4' && effectiveCustID === 'HDI' && (kategori === 'OTH' || kategori === 'kosong') && !isTrial) {
        kategori = 'HDI'
    }

    if (line === 'Barrel 4' && effectiveCustID === 'GARMET' && (kategori === 'OTH' || kategori === 'kosong') && !isTrial) {
        kategori = 'GARMET'
    }

    if (line === 'Barrel 4' && kategori === 'kosong' && !isTrial) {
        kategori = 'SAGA'
    }

    if (line === 'Rack 1' && kategori === 'kosong' && !isTrial) {
        kategori = 'RACK 1'
    }

    if (line === 'Nickel' && kategori === 'kosong' && !isTrial) {
        if (effectiveCustID.includes('DNIAF')) {
            kategori = 'GARMET NI'
        } else {
            kategori = 'OTH NI'
        }
    }

    const daftarSMP = [
        'DNIAF GAS RIN Q/K', 'DNIAF WAS U20/22', 'DNIAF GAS RIN X02', 'DNIAF GAS RING X',
        'DNIAF WAS XU 0480', 'DNIAF RIN U/X 0112', 'DNIAF WAS Q/K', 'DNIAF GAS RIN U 0270',
        'DNIAF RIN Q/K', 'DNIAF RIN XU/D16D 0190'
    ]
    if (line === 'Barrel 4' && daftarSMP.includes(partID)) {
        kategori = 'SMP'
    }

    row['Kategori'] = kategori

    // M/C No. Logic
    let mcNo = ''
    const noJig = String(row['NoJig'] || '')
    if (noJig.length === 17) {
        mcNo = noJig.substring(9, 11)
    }
    
    const partIdMcNoMap = {
        'DNIAF WAS U20/22': '10', 'DNIAF GAS RIN X02': '09', 'DNIAF GAS RING X': '09',
        'DNIAF WAS XU 0480': '10', 'DNIAF WAS Q/K': '05', 'DNIAF GAS RIN U 0270': '03',
        'DNIAF RIN Q/K': '07', 'DNIAF RIN XU/D16D 0190': '14'
    }
    if (partIdMcNoMap[partID]) {
        mcNo = partIdMcNoMap[partID]
    }
    row['M/C No.'] = mcNo

    // Lot Calculations
    if (['Barrel 4', 'Nickel'].includes(line)) {
        row['Insp(Lot)'] = row['Insp(B/H)'] / 2
        row['OK(Lot)'] = row['OK(B/H)'] / 2
        row['NG(Lot)'] = row['NG(B/H)'] / 2
    } else if (line === 'Rack 1') {
        row['Insp(Lot)'] = row['Insp(B/H)']
        row['OK(Lot)'] = row['OK(B/H)']
        row['NG(Lot)'] = row['NG(B/H)']
    } else {
        row['Insp(Lot)'] = 0
        row['OK(Lot)'] = 0
        row['NG(Lot)'] = 0
    }

    // Shift
    row['Shift'] = 'Shift ' + String(row['Shift'] || '')

    // Whitespace stripping
    row['Part.ID'] = partID.trim()
    row['PartName'] = String(row['PartName'] || '').trim()

    // Date Parsing
    try {
        if (typeof row['Date'] === 'number') {
            const date = XLSX.SSF.parse_date_code(row['Date'])
            row['DateObj'] = new Date(date.y, date.m - 1, date.d)
        } else {
            const date = new Date(row['Date'])
            if (!isNaN(date)) {
                row['DateObj'] = date
            } else {
                row['DateObj'] = new Date()
            }
        }
    } catch (e) {
        row['DateObj'] = new Date()
    }

    // MonthYear
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    if (row['DateObj'] && !isNaN(row['DateObj'])) {
        row['MonthYear'] = `${monthNames[row['DateObj'].getMonth()]}-${row['DateObj'].getFullYear()}`
    } else {
        row['MonthYear'] = 'Unknown'
    }

    // Remove unwanted columns for export
    delete row['CheckList']
    delete row['Cheklist']
    delete row['DocNo']

    return row
  })

  // Split into Production and Trial
  const productionData = []
  const trialData = []

  processed.forEach(row => {
      const noCard = String(row['NoCard'] || '').toUpperCase()
      if (noCard.includes('TRIAL')) {
          trialData.push(row)
      } else {
          productionData.push(row)
      }
  })

  return { productionData, trialData }
}

const prepareTrialData = (data) => {
    // 1. Main Table Data
    const tableData = data.map(row => ({
        partName: row['PartName'],
        custId: row['Cust.ID'],
        line: row['Line'],
        keterangan: row['NoCard'], // Using NoCard as Keterangan based on screenshot context
        ngPercent: row['NG_%'],
        qtyInsp: row['QInspec'] || (row['Insp(B/H)'] * (row['Std Load'] || 1)), // Fallback if QInspec missing
        qtyNg: row['Qty(NG)'],
        qtyOk: row['OK(pcs)']
    }))

    // 2. NG By Part Table & Charts Data
    const ngColumns = [
        'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
        'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
        'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
        'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
        'Terkikis/ Crack', 'Dimensi/ Penyok'
    ]

    const ngByPart = {}
    const ngTypeTotals = {}
    
    // Initialize NG Type Totals
    ngColumns.forEach(col => ngTypeTotals[col] = 0)

    data.forEach(row => {
        const partName = row['PartName'] || 'Unknown'
        if (!ngByPart[partName]) {
            ngByPart[partName] = { partName }
            ngColumns.forEach(col => ngByPart[partName][col] = 0)
        }

        ngColumns.forEach(col => {
            const val = Number(row[col + '(pcs)']) || 0
            ngByPart[partName][col] += val
            ngTypeTotals[col] += val
        })
    })

    const ngByPartTable = Object.values(ngByPart)

    // 3. NG Type Chart Data (Horizontal Bar)
    const sortedNgTypes = Object.entries(ngTypeTotals)
        .sort(([,a], [,b]) => b - a)
        .filter(([,val]) => val > 0) // Only show non-zero

    const ngTypeChart = {
        labels: sortedNgTypes.map(([key]) => key),
        datasets: [{
            label: 'Total Qty NG (pcs)',
            data: sortedNgTypes.map(([,val]) => val),
            backgroundColor: '#ef4444',
            borderColor: '#b91c1c',
            borderWidth: 1
        }]
    }

    // 4. OK vs NG Chart Data (Stacked Bar per PartName)
    // Aggregate by PartName first
    const partAgg = {}
    data.forEach(row => {
        const partName = row['PartName'] || 'Unknown'
        if (!partAgg[partName]) {
            partAgg[partName] = { ok: 0, ng: 0 }
        }
        partAgg[partName].ok += (Number(row['OK(pcs)']) || 0)
        partAgg[partName].ng += (Number(row['Qty(NG)']) || 0)
    })

    const sortedParts = Object.keys(partAgg).sort((a, b) => partAgg[b].ng - partAgg[a].ng)

    const partPerformanceChart = {
        labels: sortedParts,
        datasets: [
            {
                label: 'Qty NG (pcs)',
                data: sortedParts.map(p => partAgg[p].ng),
                backgroundColor: '#ef4444',
            },
            {
                label: 'Qty OK (pcs)',
                data: sortedParts.map(p => partAgg[p].ok),
                backgroundColor: '#22c55e',
            }
        ]
    }

    return {
        tableData,
        ngByPartTable,
        ngTypeChart,
        partPerformanceChart
    }
}

const calculateMetrics = (data) => {
  const totalInsp = data.reduce((sum, row) => sum + (Number(row['Insp(Lot)']) || 0), 0)
  const totalNG = data.reduce((sum, row) => sum + (Number(row['NG(Lot)']) || 0), 0)
  const totalOK = totalInsp - totalNG
  
  const validRows = data.filter(row => row['NG_%'] !== undefined && row['NG_%'] !== null)
  const sumNGPercent = validRows.reduce((sum, row) => sum + (Number(row['NG_%']) || 0), 0)
  const ngPercent = validRows.length > 0 ? (sumNGPercent / validRows.length) : 0

  return {
    totalInsp,
    totalNG,
    totalOK,
    ngPercent
  }
}

const prepareChartsData = (data) => {
  // 1. Monthly Trend
  const monthlyData = {}
  data.forEach(row => {
    const key = row['MonthYear']
    if (key === 'Unknown') return

    if (!monthlyData[key]) {
      monthlyData[key] = { insp: 0, ng: 0, sumNGPercent: 0, count: 0, date: row['DateObj'] }
    }
    monthlyData[key].insp += row['Insp(Lot)']
    monthlyData[key].ng += row['NG(Lot)']
    
    if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
        monthlyData[key].sumNGPercent += Number(row['NG_%'])
        monthlyData[key].count += 1
    }
  })

  const sortedMonths = Object.keys(monthlyData).sort((a, b) => monthlyData[a].date - monthlyData[b].date)
  
  const monthlyTrend = {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Insp(Lot)',
        data: sortedMonths.map(m => monthlyData[m].insp),
        type: 'bar',
        yAxisID: 'y',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        order: 2
      },
      {
        label: 'NG_%',
        // Calculate mean of NG_% to match app.py logic
        data: sortedMonths.map(m => monthlyData[m].count > 0 ? (monthlyData[m].sumNGPercent / monthlyData[m].count) : 0),
        type: 'line',
        yAxisID: 'y1',
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderWidth: 2,
        tension: 0.1,
        order: 1
      }
    ]
  }

  // 2. Customer Pie
  const customerData = {}
  data.forEach(row => {
    const key = row['Cust.ID']
    if (!customerData[key]) customerData[key] = 0
    customerData[key] += row['Insp(Lot)']
  })

  const customerPie = {
    labels: Object.keys(customerData),
    datasets: [{
      data: Object.values(customerData),
      backgroundColor: [
        '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6366F1',
        '#EF4444', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#D946EF'
      ]
    }]
  }

  // 3. Line Pie
  const lineData = {}
  data.forEach(row => {
    const key = row['Line']
    if (!lineData[key]) lineData[key] = 0
    lineData[key] += row['Insp(Lot)']
  })

  const linePie = {
    labels: Object.keys(lineData),
    datasets: [{
      data: Object.values(lineData),
      backgroundColor: [
        '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#6366F1',
        '#EF4444', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#D946EF'
      ]
    }]
  }

  // 4. Category Trend (NG% & Qty Inspected by Kategori)
  const categoryData = {}
  data.forEach(row => {
      const key = row['Kategori']
      if (!key || key === 'kosong') return

      if (!categoryData[key]) {
          categoryData[key] = { insp: 0, ng: 0, sumNGPercent: 0, count: 0 }
      }
      categoryData[key].insp += row['Insp(Lot)']
      categoryData[key].ng += row['NG(Lot)']
      
      if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
          categoryData[key].sumNGPercent += Number(row['NG_%'])
          categoryData[key].count += 1
      }
  })

  const sortedCategories = Object.keys(categoryData).sort()
  
  const categoryTrend = {
      labels: sortedCategories,
      datasets: [
          {
              label: 'Insp(Lot)',
              data: sortedCategories.map(c => categoryData[c].insp),
              type: 'bar',
              yAxisID: 'y',
              backgroundColor: '#0d9488', // Teal-600
              borderColor: '#0f766e',
              borderWidth: 1,
              order: 2,
              barPercentage: 0.7,
              categoryPercentage: 0.8
          },
          {
              label: 'NG_%',
              data: sortedCategories.map(c => categoryData[c].count > 0 ? (categoryData[c].sumNGPercent / categoryData[c].count) : 0),
              type: 'line',
              yAxisID: 'y1',
              borderColor: '#ef4444', // Red-500
              backgroundColor: '#ef4444',
              borderWidth: 2,
              pointBackgroundColor: '#ef4444',
              pointBorderColor: '#fff',
              pointRadius: 4,
              tension: 0, // Straight lines
              order: 1
          }
      ]
  }

  // 5. Pareto Data (NG per Defect Type by Line)
  const ngColumns = [
    'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
    'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
    'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
    'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
    'Terkikis/ Crack', 'Dimensi/ Penyok'
  ]

  const paretoAgg = {
      'Barrel 4': {},
      'Nickel': {},
      'Rack 1': {}
  }

  // Initialize counts
  Object.keys(paretoAgg).forEach(line => {
      ngColumns.forEach(col => {
          paretoAgg[line][col] = 0
      })
  })

  data.forEach(row => {
      const line = row['Line']
      if (paretoAgg[line]) {
          ngColumns.forEach(col => {
              // Use the already calculated Lot value from cleanData
              paretoAgg[line][col] += (Number(row[col]) || 0)
          })
      }
  })

  const paretoData = {}
  Object.keys(paretoAgg).forEach(line => {
      // Convert to array and sort
      const sortedDefects = ngColumns.map(col => ({
          type: col,
          count: paretoAgg[line][col]
      })).sort((a, b) => b.count - a.count)

      // Filter out zero counts to keep chart clean
      const activeDefects = sortedDefects.filter(d => d.count > 0)

      // Calculate Cumulative
      const totalNG = activeDefects.reduce((sum, d) => sum + d.count, 0)
      let runningSum = 0
      
      const processed = activeDefects.map(d => {
          runningSum += d.count
          return {
              ...d,
              cumulativePct: totalNG > 0 ? (runningSum / totalNG) * 100 : 0
          }
      })

      paretoData[line] = processed
  })

  // 6. Pareto Data (NG Lot per Cust.ID by Line)
  const paretoCustAgg = {
      'Barrel 4': {},
      'Rack 1': {}
  }

  data.forEach(row => {
      const line = row['Line']
      const custId = row['Cust.ID']
      const ngLot = Number(row['NG(Lot)']) || 0

      if (paretoCustAgg[line] && custId && ngLot > 0) {
          if (!paretoCustAgg[line][custId]) {
              paretoCustAgg[line][custId] = 0
          }
          paretoCustAgg[line][custId] += ngLot
      }
  })

  const paretoCustData = {}
  Object.keys(paretoCustAgg).forEach(line => {
      const custCounts = paretoCustAgg[line]
      const sortedCusts = Object.keys(custCounts).map(cust => ({
          type: cust,
          count: custCounts[cust]
      })).sort((a, b) => b.count - a.count)

      // Calculate Cumulative
      const totalNG = sortedCusts.reduce((sum, d) => sum + d.count, 0)
      let runningSum = 0
      
      const processed = sortedCusts.map(d => {
          runningSum += d.count
          return {
              ...d,
              cumulativePct: totalNG > 0 ? (runningSum / totalNG) * 100 : 0
          }
      })

      paretoCustData[line] = processed
  })

  // 7. Pareto Data (NG % per Part Name by Line)
  const paretoPartAgg = {
      'Barrel 4': {},
      'Rack 1': {}
  }

  data.forEach(row => {
      const line = row['Line']
      const partName = row['PartName'] || row['Part.ID'] || 'Unknown'
      const ngPercent = Number(row['NG_%']) || 0

      if (paretoPartAgg[line] && partName !== 'Unknown') {
          if (!paretoPartAgg[line][partName]) {
              paretoPartAgg[line][partName] = { sum: 0, count: 0 }
          }
          paretoPartAgg[line][partName].sum += ngPercent
          paretoPartAgg[line][partName].count += 1
      }
  })

  const paretoPartData = {}
  Object.keys(paretoPartAgg).forEach(line => {
      const partCounts = paretoPartAgg[line]
      const sortedParts = Object.keys(partCounts).map(part => ({
          type: part,
          count: partCounts[part].count > 0 ? partCounts[part].sum / partCounts[part].count : 0
      })).sort((a, b) => b.count - a.count)

      // Calculate Cumulative
      const totalNG = sortedParts.reduce((sum, d) => sum + d.count, 0)
      let runningSum = 0
      
      const processed = sortedParts.map(d => {
          runningSum += d.count
          return {
              ...d,
              cumulativePct: totalNG > 0 ? (runningSum / totalNG) * 100 : 0
          }
      })

      paretoPartData[line] = processed
  })

  // 8. M/C No Data (Qty Inspected/Lot vs NG % per M/C No)
  const mcNoAgg = {}

  data.forEach(row => {
      // Use the existing M/C No. column that was already processed
      const mcNo = String(row['M/C No.'] || '').trim()
      if (!mcNo) return

      if (!mcNoAgg[mcNo]) {
          mcNoAgg[mcNo] = {
              inspLot: 0,
              sumNGPercent: 0,
              count: 0
          }
      }

      mcNoAgg[mcNo].inspLot += Number(row['Insp(Lot)']) || 0
      
      if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
          mcNoAgg[mcNo].sumNGPercent += Number(row['NG_%'])
          mcNoAgg[mcNo].count += 1
      }
  })

  // Sort by M/C No (numeric where possible, then alphabetic)
  const sortedMcNos = Object.keys(mcNoAgg).sort((a, b) => {
      const numA = parseInt(a)
      const numB = parseInt(b)
      
      // If both are numbers, sort numerically
      if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
      }
      // Otherwise sort alphabetically
      return a.localeCompare(b)
  })
  
  const mcNoData = {
      labels: sortedMcNos,
      inspLot: sortedMcNos.map(mc => mcNoAgg[mc].inspLot),
      ngPercent: sortedMcNos.map(mc => 
          mcNoAgg[mc].count > 0 ? mcNoAgg[mc].sumNGPercent / mcNoAgg[mc].count : 0
      ),
      tableData: sortedMcNos.map(mc => ({
          mcNo: mc,
          inspLot: mcNoAgg[mc].inspLot,
          ngPercent: mcNoAgg[mc].count > 0 ? mcNoAgg[mc].sumNGPercent / mcNoAgg[mc].count : 0
      }))
  }

  // 9. Housing Horn Data (HDI, PartName contains 'HOUSING HORN', Barrel 4)
  // First, let's log some sample data to see what we're working with
  console.log('Total data rows for Housing Horn filter:', data.length)
  if (data.length > 0) {
      const sampleRows = data.slice(0, 3).map(r => ({
          custId: r['Cust.ID'],
          partName: r['PartName'],
          line: r['Line']
      }))
      console.log('Sample rows:', sampleRows)
  }
  
  const housingHornFiltered = data.filter(row => {
      const custId = String(row['Cust.ID'] || '').trim().toUpperCase()
      const partName = String(row['PartName'] || '').trim().toUpperCase()
      const line = String(row['Line'] || '').trim()
      
      // More flexible matching
      const isHDI = custId === 'HDI' || custId.includes('HDI')
      const isHousingHorn = partName.includes('HOUSING') || partName.includes('HM') || partName.includes('HK')
      const isBarrel4 = line === 'Barrel 4' || line.toUpperCase().includes('BARREL') && line.includes('4')
      
      const matches = isHDI && isHousingHorn && isBarrel4
      
      if (matches) {
          console.log('Found Housing Horn match:', { custId, partName, line })
      }
      
      return matches
  })
  
  console.log('Housing Horn filtered data count:', housingHornFiltered.length)
  if (housingHornFiltered.length > 0) {
      console.log('Sample filtered row:', housingHornFiltered[0])
  }

  // Aggregate by PartName
  const partAgg = {}
  let totalOkPcs = 0
  let totalNgPcs = 0
  let totalInspPcs = 0
  let totalOkLot = 0
  let totalNgLot = 0
  let totalInspLot = 0

  housingHornFiltered.forEach(row => {
      const partName = row['PartName']
      
      if (!partAgg[partName]) {
          partAgg[partName] = {
              okPcs: 0,
              ngPcs: 0,
              ngmPcs: 0, // MTL/SlipMelintir
              totInspPcs: 0,
              okLot: 0,
              ngLot: 0,
              ngmLot: 0,
              totInspLot: 0
          }
      }

      const okPcs = Number(row['OK(pcs)']) || 0
      const ngPcs = Number(row['Qty(NG)']) || 0
      const ngmPcs = Number(row['MTL/ SLipMelintir(pcs)']) || 0
      const qInspec = Number(row['QInspec']) || 0

      const okLot = Number(row['OK(Lot)']) || 0
      const ngLot = Number(row['NG(Lot)']) || 0
      const ngmLot = Number(row['MTL/ SLipMelintir']) || 0
      const inspLot = Number(row['Insp(Lot)']) || 0

      partAgg[partName].okPcs += okPcs
      partAgg[partName].ngPcs += ngPcs
      partAgg[partName].ngmPcs += ngmPcs
      partAgg[partName].totInspPcs += qInspec

      partAgg[partName].okLot += okLot
      partAgg[partName].ngLot += ngLot
      partAgg[partName].ngmLot += ngmLot
      partAgg[partName].totInspLot += inspLot

      totalOkPcs += okPcs
      totalNgPcs += ngPcs
      totalInspPcs += qInspec
      totalOkLot += okLot
      totalNgLot += ngLot
      totalInspLot += inspLot
  })

  const housingHornData = {
      metrics: {
          okPcs: totalOkPcs,
          ngPcs: totalNgPcs,
          inspPcs: totalInspPcs,
          okLot: totalOkLot,
          ngLot: totalNgLot,
          inspLot: totalInspLot,
          ngPercent: totalInspLot > 0 ? (totalNgLot / totalInspLot) * 100 : 0
      },
      tableDataPcs: Object.keys(partAgg).sort().map(part => ({
          partName: part,
          okPcs: partAgg[part].okPcs,
          ngPcs: partAgg[part].ngPcs,
          ngmPcs: partAgg[part].ngmPcs,
          totInspPcs: partAgg[part].totInspPcs,
          ngPercent: partAgg[part].totInspPcs > 0 ? (partAgg[part].ngPcs / partAgg[part].totInspPcs) * 100 : 0
      })),
      tableDataLot: Object.keys(partAgg).sort().map(part => ({
          partName: part,
          okLot: partAgg[part].okLot,
          ngLot: partAgg[part].ngLot,
          ngmLot: partAgg[part].ngmLot,
          totInspLot: partAgg[part].totInspLot,
          ngPercent: partAgg[part].totInspLot > 0 ? (partAgg[part].ngLot / partAgg[part].totInspLot) * 100 : 0
      }))
  }
  
  console.log('Housing Horn data created:', housingHornData)

  // 10. Rekap Data for Leader (Top defects by Line and Category)
  console.log('Preparing rekap data...')
  
  const rekapCategories = [
      { key: 'b4_all', label: 'B4 - All Parts', filter: (r) => r['Line'] === 'Barrel 4' },
      { key: 'b4_hdi', label: 'B4 - HDI Parts (All Type)', filter: (r) => r['Line'] === 'Barrel 4' && String(r['Cust.ID'] || '').toUpperCase().includes('HDI') },
      { 
          key: 'b4_ring', 
          label: 'B4 - RING Parts', 
          filter: (r) => {
              // Filter for specific RING part numbers (as per app.py)
              if (r['Line'] !== 'Barrel 4') return false
              
              const partName = String(r['PartName'] || '').toUpperCase()
              
              // Check if PartName contains any of these specific part numbers
              return partName.includes('JK067662-0190') || 
                     partName.includes('JK067662-0160') || 
                     partName.includes('JK067662-0112')
          }
      },
      { key: 'r1_all', label: 'R1 - All Parts', filter: (r) => r['Line'] === 'Rack 1' }
  ]
  
  console.log('Rekap categories defined:', rekapCategories.length)

  const rekapData = rekapCategories.map(cat => {
      const filteredData = data.filter(cat.filter)
      
      console.log(`${cat.label}: filtered ${filteredData.length} rows`)
      if (cat.key === 'b4_ring' && filteredData.length > 0) {
          console.log('Sample RING part:', {
              partName: filteredData[0]['PartName'],
              partId: filteredData[0]['Part.ID'],
              mtl: filteredData[0]['MTL/ SLipMelintir']
          })
      }
      
      const defectTotals = {}
      let totalInsp = 0
      
      // For B4 RING Parts ONLY, create special column list that includes MTL
      // For all others, exclude MTL as before
      let columnsToUse
      if (cat.key === 'b4_ring') {
          // Special array for RING Parts - includes MTL/SLipMelintir
          columnsToUse = [
              'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
              'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
              'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
              'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
              'Terkikis/ Crack', 'Dimensi/ Penyok', 'MTL/ SLipMelintir'
          ]
          console.log('Using special columns for b4_ring with MTL included')
      } else {
          // For other categories, use standard ngColumns (without MTL)
          columnsToUse = ngColumns
      }
      
      filteredData.forEach(row => {
          totalInsp += Number(row['Insp(B/H)']) || 0
          
          columnsToUse.forEach(col => {
              const val = Number(row[col]) || 0
              
              // For RING Parts, include MTL/SLipMelintir even if val is 0
              // For other defects, only include if val > 0
              const shouldInclude = (cat.key === 'b4_ring' && col === 'MTL/ SLipMelintir') || val > 0
              
              if (cat.key === 'b4_ring' && col === 'MTL/ SLipMelintir') {
                  console.log(`b4_ring MTL check: col="${col}", val=${val}, shouldInclude=${shouldInclude}`)
              }
              
              if (shouldInclude) {
                  if (!defectTotals[col]) defectTotals[col] = 0
                  defectTotals[col] += val
                  
                  if (cat.key === 'b4_ring') {
                      console.log(`b4_ring added defect: ${col} = ${val}, total now = ${defectTotals[col]}`)
                  }
              }
          })
      })
      
      if (cat.key === 'b4_ring') {
          console.log('b4_ring defectTotals:', defectTotals)
      }
      
      // Sort by total and get top defects
      const sortedDefects = Object.keys(defectTotals)
          .map(defect => ({
              name: defect,
              total: defectTotals[defect]
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8) // Top 8 defects
      
      const totalNG = sortedDefects.reduce((sum, d) => sum + d.total, 0)
      const ngPercent = totalInsp > 0 ? (totalNG / totalInsp) * 100 : 0
      
      console.log(`${cat.label}: totalInsp=${totalInsp.toFixed(2)}, totalNG=${totalNG.toFixed(2)}, ngPercent=${ngPercent.toFixed(2)}%`)
      
      return {
          key: cat.key,
          label: cat.label,
          defects: sortedDefects,
          totalInsp: totalInsp,
          totalNG: totalNG,
          ngPercent: ngPercent
      }
  })

  return {
      monthlyTrend,
      customerPie,
      linePie,
      categoryTrend,
      paretoData,
      paretoCustData,
      paretoPartData,
      mcNoData,
      housingHornData,
      rekapData
  }
}

const prepareSummaryTables = (data) => {
    const lines = ['Barrel 4', 'Nickel', 'Rack 1']
    
    // Helper for aggregation
    const aggregate = (groupByField) => {
        const groups = {}
        // Global accumulators for Grand Total
        const globalStats = {
            'Barrel 4': { insp: 0, ng: 0, sumNGPercent: 0, count: 0 },
            'Nickel': { insp: 0, ng: 0, sumNGPercent: 0, count: 0 },
            'Rack 1': { insp: 0, ng: 0, sumNGPercent: 0, count: 0 },
            'total': { insp: 0, ng: 0, sumNGPercent: 0, count: 0 }
        }

        data.forEach(row => {
            const key = row[groupByField]
            if (!key || key === 'Unknown') return
            
            if (!groups[key]) groups[key] = {}
            
            const line = row['Line']
            if (!groups[key][line]) {
                groups[key][line] = { insp: 0, ng: 0, sumNGPercent: 0, count: 0 }
            }
            
            groups[key][line].insp += row['Insp(Lot)']
            groups[key][line].ng += row['NG(Lot)']
            
            if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
                groups[key][line].sumNGPercent += Number(row['NG_%'])
                groups[key][line].count += 1
            }

            // Accumulate Global Stats
            if (lines.includes(line)) {
                 globalStats[line].insp += row['Insp(Lot)']
                 globalStats[line].ng += row['NG(Lot)']
                 if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
                     globalStats[line].sumNGPercent += Number(row['NG_%'])
                     globalStats[line].count += 1
                     
                     // For the Grand Total's Total Column
                     globalStats['total'].sumNGPercent += Number(row['NG_%'])
                     globalStats['total'].count += 1
                 }
                 globalStats['total'].insp += row['Insp(Lot)']
                 globalStats['total'].ng += row['NG(Lot)']
            }
        })
        
        // Calculate Totals and Format for Rows
        const result = Object.keys(groups).map(key => {
            const rowData = { name: key, lines: {} }
            let totalInsp = 0
            let totalNG = 0
            let totalSumNGPercent = 0
            let totalCount = 0
            
            lines.forEach(line => {
                const stats = groups[key][line] || { insp: 0, ng: 0, sumNGPercent: 0, count: 0 }
                rowData.lines[line] = {
                    insp: stats.insp,
                    ng: stats.ng,
                    ngPercent: stats.count > 0 ? (stats.sumNGPercent / stats.count) : 0
                }
                totalInsp += stats.insp
                totalNG += stats.ng
                totalSumNGPercent += stats.sumNGPercent
                totalCount += stats.count
            })
            
            rowData.total = {
                insp: totalInsp,
                ng: totalNG,
                ngPercent: totalCount > 0 ? (totalSumNGPercent / totalCount) : 0
            }
            
            // Add sorting helper
            if (groupByField === 'MonthYear') {
                 const [month, year] = key.split('-')
                 const monthIdx = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(month)
                 rowData.sortValue = new Date(year, monthIdx).getTime()
            } else {
                rowData.sortValue = key
            }
            
            return rowData
        })
        
        const sortedRows = result.sort((a, b) => a.sortValue - b.sortValue)

        // Calculate Grand Total Object
        const grandTotal = { lines: {}, total: {} }
        lines.forEach(line => {
             const stats = globalStats[line]
             grandTotal.lines[line] = {
                 insp: stats.insp,
                 ng: stats.ng,
                 ngPercent: stats.count > 0 ? (stats.sumNGPercent / stats.count) : 0
             }
        })
        grandTotal.total = {
             insp: globalStats['total'].insp,
             ng: globalStats['total'].ng,
             ngPercent: globalStats['total'].count > 0 ? (globalStats['total'].sumNGPercent / globalStats['total'].count) : 0
        }

        return { rows: sortedRows, grandTotal }
    }

    // 4. Category Table Data (Qty Inspected, Qty NG in both pcs and lot, NG %)
    const categoryTableData = {}
    
    data.forEach(row => {
        const category = row['Kategori'] || 'Unknown'
        if (!categoryTableData[category]) {
            categoryTableData[category] = {
                category: category,
                qtyInspectedPcs: 0,
                qtyNgPcs: 0,
                qtyInspectedLot: 0,
                qtyNgLot: 0
            }
        }
        categoryTableData[category].qtyInspectedPcs += row['QInspec']
        categoryTableData[category].qtyNgPcs += row['Qty(NG)']
        categoryTableData[category].qtyInspectedLot += row['Insp(Lot)']
        categoryTableData[category].qtyNgLot += row['NG(Lot)']
    })

    const categoryTableArray = Object.values(categoryTableData).map(item => ({
        ...item,
        ngPercent: item.qtyInspectedLot > 0 ? (item.qtyNgLot / item.qtyInspectedLot) * 100 : 0
    }))

    // Sort by Qty Inspected Lot descending
    categoryTableArray.sort((a, b) => b.qtyInspectedLot - a.qtyInspectedLot)

    // Calculate Total
    const totalCategory = categoryTableArray.reduce((acc, curr) => {
        acc.qtyInspectedPcs += curr.qtyInspectedPcs
        acc.qtyNgPcs += curr.qtyNgPcs
        acc.qtyInspectedLot += curr.qtyInspectedLot
        acc.qtyNgLot += curr.qtyNgLot
        return acc
    }, { category: 'Total', qtyInspectedPcs: 0, qtyNgPcs: 0, qtyInspectedLot: 0, qtyNgLot: 0 })

    totalCategory.ngPercent = totalCategory.qtyInspectedLot > 0 ? (totalCategory.qtyNgLot / totalCategory.qtyInspectedLot) * 100 : 0
    
    categoryTableArray.push(totalCategory)
    
    // 5. Category by Line Tables (4 Tables)
    const categoryLineData = {}
    const linesList = ['Barrel 4', 'Nickel', 'Rack 1']

    data.forEach(row => {
        const category = row['Kategori'] || 'Unknown'
        const line = row['Line']
        
        if (!categoryLineData[category]) {
            categoryLineData[category] = {
                category: category,
                lines: {
                    'Barrel 4': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 },
                    'Nickel': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 },
                    'Rack 1': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 }
                }
            }
        }
        
        if (linesList.includes(line)) {
            categoryLineData[category].lines[line].inspPcs += row['QInspec']
            categoryLineData[category].lines[line].ngPcs += row['Qty(NG)']
            categoryLineData[category].lines[line].ngLot += row['NG(Lot)']
            categoryLineData[category].lines[line].inspLot += row['Insp(Lot)']
        }
    })

    const categoryLineArray = Object.values(categoryLineData).map(item => {
        const rowTotal = { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 }
        linesList.forEach(line => {
            rowTotal.inspPcs += item.lines[line].inspPcs
            rowTotal.ngPcs += item.lines[line].ngPcs
            rowTotal.ngLot += item.lines[line].ngLot
            rowTotal.inspLot += item.lines[line].inspLot
        })
        return { ...item, total: rowTotal }
    })

    // Sort by Total Inspected Pcs descending
    categoryLineArray.sort((a, b) => b.total.inspPcs - a.total.inspPcs)

    // Grand Total for Category Line Tables
    const categoryLineGrandTotal = {
        lines: {
            'Barrel 4': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 },
            'Nickel': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 },
            'Rack 1': { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 }
        },
        total: { inspPcs: 0, ngPcs: 0, ngLot: 0, inspLot: 0 }
    }

    categoryLineArray.forEach(item => {
        linesList.forEach(line => {
            categoryLineGrandTotal.lines[line].inspPcs += item.lines[line].inspPcs
            categoryLineGrandTotal.lines[line].ngPcs += item.lines[line].ngPcs
            categoryLineGrandTotal.lines[line].ngLot += item.lines[line].ngLot
            categoryLineGrandTotal.lines[line].inspLot += item.lines[line].inspLot
        })
        categoryLineGrandTotal.total.inspPcs += item.total.inspPcs
        categoryLineGrandTotal.total.ngPcs += item.total.ngPcs
        categoryLineGrandTotal.total.ngLot += item.total.ngLot
        categoryLineGrandTotal.total.inspLot += item.total.inspLot
    })

    return {
        byMonth: aggregate('MonthYear'),
        byShift: aggregate('Shift'),
        categoryTableArray,
        categoryLineTables: {
            rows: categoryLineArray,
            grandTotal: categoryLineGrandTotal
        }
    }
}
