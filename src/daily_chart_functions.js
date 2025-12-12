// === DAILY CHART FILTERING FUNCTIONS ===

// Function to setup event listeners for daily chart filter
export const setupDailyChartListeners = (state, filteringState, Chart) => {
    const dailyLineSelect = document.getElementById('dailyLineSelect')
    const dailyDefectSelect = document.getElementById('dailyDefectSelect')
    
    if (dailyLineSelect) {
        dailyLineSelect.addEventListener('change', (e) => {
            filteringState.selectedLine = e.target.value
            processDailyData(state, filteringState)
            renderDailyChart(filteringState, Chart)
            
            // Reset defect filter when line changes
            if (dailyDefectSelect) {
                dailyDefectSelect.value = ''
                filteringState.selectedDefectType = null
                hideDefectCharts()
            }
        })
        
        // Initial load
        filteringState.selectedLine = dailyLineSelect.value
        processDailyData(state, filteringState)
        renderDailyChart(filteringState, Chart)
    }
    
    if (dailyDefectSelect) {
        dailyDefectSelect.addEventListener('change', (e) => {
            const defectType = e.target.value
            filteringState.selectedDefectType = defectType || null
            
            if (defectType) {
                processDefectDailyData(state, filteringState, defectType)
                renderDefectDailyChart(filteringState, Chart, defectType)
            } else {
                hideDefectCharts()
            }
        })
    }
}

// Function to process daily data based on selected line
export const processDailyData = (state, filteringState) => {
    if (!state.processedData) return
    
    const selectedLine = filteringState.selectedLine
    
    // Filter data for selected line and exclude trial data
    const lineData = state.processedData.filter(row => 
        row['Line'] === selectedLine && !row.isTrial
    )
    
    // Group by date
    const dailyGroups = {}
    
    lineData.forEach(row => {
        const dateObj = row['DateObj']
        if (!dateObj || isNaN(dateObj)) return
        
        // Format date as DD-MMM-YY
        const day = String(dateObj.getDate()).padStart(2, '0')
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const month = monthNames[dateObj.getMonth()]
        const year = String(dateObj.getFullYear()).slice(-2)
        const dateKey = `${day}-${month}-${year}`
        
        if (!dailyGroups[dateKey]) {
            dailyGroups[dateKey] = {
                date: dateKey,
                dateObj: dateObj,
                inspLot: 0,
                ngLot: 0,
                sumNGPercent: 0,
                count: 0
            }
        }
        
        dailyGroups[dateKey].inspLot += Number(row['Insp(Lot)']) || 0
        dailyGroups[dateKey].ngLot += Number(row['NG(Lot)']) || 0
        
        if (row['NG_%'] !== undefined && row['NG_%'] !== null) {
            dailyGroups[dateKey].sumNGPercent += Number(row['NG_%'])
            dailyGroups[dateKey].count += 1
        }
    })
    
    // Convert to array and sort by date
    const dailyArray = Object.values(dailyGroups).sort((a, b) => a.dateObj - b.dateObj)
    
    // Calculate average NG%
    dailyArray.forEach(day => {
        day.ngPercent = day.count > 0 ? (day.sumNGPercent / day.count) : 0
    })
    
    filteringState.dailyData = dailyArray
}

// Function to render daily chart
export const renderDailyChart = (filteringState, Chart) => {
    const canvas = document.getElementById('dailyChart')
    const titleElement = document.getElementById('dailyChartTitle')
    const tableBody = document.getElementById('dailyDataTableBody')
    
    if (!canvas || filteringState.dailyData.length === 0) return
    
    // Update title
    if (titleElement) {
        titleElement.textContent = `Rata-rata NG (%) Harian & Total Inspected (Lot) - ${filteringState.selectedLine}`
    }
    
    // Update table
    if (tableBody) {
        tableBody.innerHTML = filteringState.dailyData.map(day => `
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td class="py-2 px-3 text-slate-300">${day.date}</td>
                <td class="py-2 px-3 text-slate-400 text-right">${day.inspLot.toFixed(2)}</td>
                <td class="py-2 px-3 text-slate-400 text-right">${day.ngPercent.toFixed(4)}</td>
            </tr>
        `).join('')
    }
    
    // Destroy existing chart
    if (window.dailyChartInstance) {
        window.dailyChartInstance.destroy()
    }
    
    // Prepare data
    const labels = filteringState.dailyData.map(d => d.date)
    const inspData = filteringState.dailyData.map(d => d.inspLot)
    const ngData = filteringState.dailyData.map(d => d.ngPercent)
    
    // Calculate max for proper scaling
    const maxInsp = Math.max(...inspData)
    const maxNG = Math.max(...ngData)
    
    // Create chart
    const ctx = canvas.getContext('2d')
    window.dailyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Inspected (Lot)',
                    data: inspData,
                    backgroundColor: '#0d9488',
                    borderColor: '#0d9488',
                    borderWidth: 1,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: 'NG (%)',
                    data: ngData,
                    type: 'line',
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    yAxisID: 'y1',
                    order: 1,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        padding: 10
                    }
                },
                title: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    suggestedMax: maxInsp * 1.1,
                    title: {
                        display: true,
                        text: 'Total Inspected (Lot)',
                        color: '#0d9488',
                        font: { size: 11, weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    min: 0,
                    suggestedMax: maxNG * 1.1,
                    title: {
                        display: true,
                        text: 'NG (%)',
                        color: '#ef4444',
                        font: { size: 11, weight: 'bold' }
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#ef4444',
                        font: { size: 10 },
                        callback: function(value) {
                            return value.toFixed(2) + '%'
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tanggal',
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    })
}

// Function to process defect daily data
export const processDefectDailyData = (state, filteringState, defectType) => {
    if (!state.processedData) return
    
    const selectedLine = filteringState.selectedLine
    
    // Filter data for selected line and exclude trial data
    const lineData = state.processedData.filter(row => 
        row['Line'] === selectedLine && !row.isTrial
    )
    
    // Group by date
    const dailyGroups = {}
    
    lineData.forEach(row => {
        const dateObj = row['DateObj']
        if (!dateObj || isNaN(dateObj)) return
        
        // Format date as DD-MMM-YY
        const day = String(dateObj.getDate()).padStart(2, '0')
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const month = monthNames[dateObj.getMonth()]
        const year = String(dateObj.getFullYear()).slice(-2)
        const dateKey = `${day}-${month}-${year}`
        
        if (!dailyGroups[dateKey]) {
            dailyGroups[dateKey] = {
                date: dateKey,
                dateObj: dateObj,
                defectLot: 0,
                inspLot: 0,
                sumNGPercent: 0,
                count: 0
            }
        }
        
        // Get defect value (already in Lot from cleanData)
        const defectValue = Number(row[defectType]) || 0
        dailyGroups[dateKey].defectLot += defectValue
        dailyGroups[dateKey].inspLot += Number(row['Insp(Lot)']) || 0
    })
    
    // Convert to array and sort by date
    const dailyArray = Object.values(dailyGroups).sort((a, b) => a.dateObj - b.dateObj)
    
    // Calculate NG% for this defect
    dailyArray.forEach(day => {
        day.ngPercent = day.inspLot > 0 ? (day.defectLot / day.inspLot) * 100 : 0
    })
    
    filteringState.dailyDefectData = dailyArray
}

// Function to render defect daily chart
export const renderDefectDailyChart = (filteringState, Chart, defectType) => {
    const canvas = document.getElementById('defectDailyChart')
    const container = document.getElementById('defectDailyChartContainer')
    const titleElement = document.getElementById('defectDailyChartTitle')
    const tableContainer = document.getElementById('defectDailyTableContainer')
    const tableTitle = document.getElementById('defectTableTitle')
    const tableBody = document.getElementById('defectDailyDataTableBody')
    
    if (!canvas || filteringState.dailyDefectData.length === 0) return
    
    // Show containers
    if (container) container.classList.remove('hidden')
    if (tableContainer) tableContainer.classList.remove('hidden')
    
    // Update titles
    if (titleElement) {
        titleElement.textContent = `Qty NG (Lot) - ${defectType} (%) Harian - ${filteringState.selectedLine}`
    }
    if (tableTitle) {
        tableTitle.textContent = defectType
    }
    
    // Update table
    if (tableBody) {
        tableBody.innerHTML = filteringState.dailyDefectData.map(day => `
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td class="py-2 px-3 text-slate-300">${day.date}</td>
                <td class="py-2 px-3 text-slate-400 text-right">${day.defectLot.toFixed(4)}</td>
                <td class="py-2 px-3 text-slate-400 text-right">${day.ngPercent.toFixed(4)}</td>
            </tr>
        `).join('')
    }
    
    // Destroy existing chart
    if (window.defectDailyChartInstance) {
        window.defectDailyChartInstance.destroy()
    }
    
    // Prepare data
    const labels = filteringState.dailyDefectData.map(d => d.date)
    const defectData = filteringState.dailyDefectData.map(d => d.defectLot)
    const ngData = filteringState.dailyDefectData.map(d => d.ngPercent)
    
    // Calculate max for proper scaling
    const maxDefect = Math.max(...defectData)
    const maxNG = Math.max(...ngData)
    
    // Create chart
    const ctx = canvas.getContext('2d')
    window.defectDailyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `Qty ${defectType} (Lot)`,
                    data: defectData,
                    backgroundColor: '#d97706',
                    borderColor: '#d97706',
                    borderWidth: 1,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    label: `${defectType} (%)`,
                    data: ngData,
                    type: 'line',
                    borderColor: '#ef4444',
                    backgroundColor: '#ef4444',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1,
                    yAxisID: 'y1',
                    order: 1,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        padding: 10
                    }
                },
                title: {
                    display: false
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    suggestedMax: maxDefect * 1.1,
                    title: {
                        display: true,
                        text: `Qty ${defectType} (Lot)`,
                        color: '#d97706',
                        font: { size: 11, weight: 'bold' }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 10 }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    min: 0,
                    suggestedMax: maxNG * 1.1,
                    title: {
                        display: true,
                        text: `${defectType} (%)`,
                        color: '#ef4444',
                        font: { size: 11, weight: 'bold' }
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: '#ef4444',
                        font: { size: 10 },
                        callback: function(value) {
                            return value.toFixed(2) + '%'
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Tanggal',
                        color: '#94a3b8',
                        font: { size: 11 }
                    },
                    grid: { display: false },
                    ticks: {
                        color: '#94a3b8',
                        font: { size: 9 },
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    })
}

// Function to hide defect charts
export const hideDefectCharts = () => {
    const container = document.getElementById('defectDailyChartContainer')
    const tableContainer = document.getElementById('defectDailyTableContainer')
    
    if (container) container.classList.add('hidden')
    if (tableContainer) tableContainer.classList.add('hidden')
    
    // Destroy chart
    if (window.defectDailyChartInstance) {
        window.defectDailyChartInstance.destroy()
        window.defectDailyChartInstance = null
    }
}
