import './style.css'
import { Chart } from 'chart.js/auto'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import * as XLSX from 'xlsx'
import { processExcelFile } from './utils/dataProcessor'

// State Management
const state = {
  isLoggedIn: false,
  currentTab: 'summary', // summary, trial, filter
  data: null,
  processedData: null,
  metrics: null,
  chartsData: null,
  summaryTables: null,
  trialMetrics: null, // Add trialMetrics to state
  fileMetadata: [],
  dateRange: { start: null, end: null },
  charts: {} // Store chart instances
}

// Register Chart.js plugins
Chart.register(ChartDataLabels)

// DOM Elements
const app = document.querySelector('#app')

// Login Component
const renderLogin = () => {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <!-- Background Blobs -->
      <div class="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div class="glass-panel p-8 max-w-md w-full space-y-8 relative z-10">
        <div class="text-center">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">KPD Data Cleaner</h1>
          <p class="text-slate-400">Please log in to access the application</p>
        </div>

        <form id="loginForm" class="space-y-6">
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium text-slate-300">Username</label>
            <input type="text" id="username" class="input-field" placeholder="Enter username" required>
          </div>
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-slate-300">Password</label>
            <input type="password" id="password" class="input-field" placeholder="Enter password" required>
          </div>
          <div id="loginError" class="text-red-400 text-sm text-center hidden">Invalid username or password</div>
          <button type="submit" class="btn-primary w-full py-3">Sign In</button>
        </form>
      </div>
    </div>
  `

  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault()
    const username = e.target.username.value
    const password = e.target.password.value

    if (username === 'kpd' && password === 'kpd888') {
      state.isLoggedIn = true
      renderDashboard()
    } else {
      document.getElementById('loginError').classList.remove('hidden')
    }
  })
}

// Dashboard Component
const renderDashboard = () => {
  app.innerHTML = `
    <div class="min-h-screen flex flex-col md:flex-row relative">
      <!-- Mobile Header & Burger -->
      <div class="md:hidden flex items-center justify-between p-4 glass-panel m-4 mb-0 sticky top-0 z-30">
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src="/logokpd.svg" alt="Logo KPD" class="w-full h-full object-cover" />
            </div>
            <span class="font-bold text-blue-400">PT. KARYAPRATAMA DUNIA</span>
        </div>
        <button id="burgerBtn" class="text-white p-2 hover:bg-white/10 rounded-lg transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </button>
      </div>

      <!-- Overlay -->
      <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 hidden transition-opacity duration-300 opacity-0"></div>

      <!-- Sidebar -->
      <aside id="sidebar" class="fixed md:static inset-y-0 left-0 z-50 w-64 glass-panel m-0 md:m-4 p-4 flex flex-col h-screen md:h-[calc(100vh-2rem)] transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out overflow-hidden">
        <div class="flex justify-between items-start mb-8 px-2" id="sidebarHeader">
            <div id="sidebarTitle">
                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">KPD Data Cleaner</h1>
                <p class="text-xs text-slate-500 mt-1">Cleaning Room Data from Autocon</p>
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0">
                <!-- Desktop Toggle Button (visible on md and up) -->
                <button id="desktopToggleSidebar" class="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all items-center justify-center">
                    <svg id="toggleIcon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <!-- Mobile Close Button (visible on mobile only) -->
                <button id="closeSidebarBtn" class="md:hidden text-slate-400 hover:text-white">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        </div>
        
        <nav class="space-y-2 flex-1" id="sidebarContent">
          <button class="w-full text-left px-4 py-3 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 font-medium transition-all mb-2" id="dashboardBtn">
            Dashboard
          </button>
          
          <!-- Navigation Tabs -->
          <div class="space-y-1 pl-2 border-l-2 border-slate-700 ml-2" id="sidebarTabs">
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-metrics">Metrics</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-charts">Charts</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-summary">Summary Tables</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-category-chart">Grafik Kategori</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-category-table">Tabel Kategori</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-pareto">Pareto Charts</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm" id="nav-rekap">Rekap Leader</button>
            
            <!-- Summary Trial Menu -->
            <div class="pt-2 mt-2 border-t border-slate-700/50">
                <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-sm font-medium text-yellow-500/80" id="nav-trial-menu">Summary Trial</button>
                <div class="pl-4 space-y-1 hidden" id="trial-submenus">
                    <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs" id="nav-trial-table">Tabel Data Trial</button>
                    <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs" id="nav-trial-rekap">Rekap Trial</button>
                    <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs" id="nav-trial-defect">Defect type Trial</button>
                    <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-xs" id="nav-trial-chart">Chart Trial</button>
                </div>
            </div>
          </div>
          
          <!-- File List Section -->
          <div class="mt-8 px-2" id="fileListSection">
            <h3 class="text-xs font-semibold text-yellow-500 uppercase tracking-wider mb-3">File yang diupload:</h3>
            <div class="space-y-2" id="fileListContainer">
                ${state.fileMetadata.length > 0 ? state.fileMetadata.map(file => `
                    <div class="text-xs text-yellow-200 truncate" title="${file.name}">
                        ${file.name}
                    </div>
                `).join('') : '<div class="text-xs text-slate-500">Belum ada file</div>'}
            </div>
          </div>
        </nav>

        <div class="mt-auto pt-4 border-t border-glass-border">
          <button id="downloadBtn" class="w-full flex items-center px-4 py-2 text-slate-400 hover:text-white transition-colors ${state.processedData ? '' : 'hidden'}">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            <span class="mr-2">Download Cleaned Data</span>
          </button>
          <button id="logoutBtn" class="w-full flex items-center px-4 py-2 text-slate-400 hover:text-white transition-colors">
            <span class="mr-2">Log Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-4 md:p-6 overflow-y-auto h-screen pt-4 md:pt-6">
        <!-- Header -->
        <header class="flex justify-between items-center mb-8 hidden md:flex">
          <div>
            <h2 class="text-2xl font-bold text-white">Quality Dashboard</h2>
            <div class="flex items-center space-x-4 mt-1">
                <p class="text-slate-400">Quality Performance of Plating Line</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
             <span class="text-sm font-bold text-blue-400">PT. KARYAPRATAMA DUNIA</span>
             <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden">
                <img src="/logokpd.svg" alt="Logo KPD" class="w-full h-full object-cover" />
             </div>
          </div>
        </header>

        <!-- Mobile Header Title (Only visible on mobile) -->
         <div class="mb-6 md:hidden">
            <h2 class="text-xl font-bold text-white">Quality Dashboard</h2>
            <p class="text-sm text-slate-400">Quality Performance of Plating Line</p>
         </div>

        <!-- Download Section -->
        <div id="downloadSection" class="mb-4 ${state.processedData ? 'hidden' : ''}">
          <div class="glass-panel p-4 border-l-4 border-yellow-500 flex items-start space-x-3">
             <div class="text-yellow-500 mt-1">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
             </div>
             <div>
                <p class="text-slate-300 text-sm">
                   Jika Anda belum mempunyai File, silahkan unduh di link Folder yang tersedia berikut ini: 
                   <a href="https://drive.google.com/drive/folders/1motad9bizxGZdiODetAo6K7_38dbXxxG?usp=sharing" target="_blank" class="text-yellow-400 hover:text-yellow-300 underline font-medium inline-flex items-center gap-1">
                      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                      Link Folder
                   </a> 
                   | Download/Unduh file Excel (.xls, .xlsx atau .csv) dari folder tersebut ke perangkat Anda, lalu unggah/upload file lewat menu Browse Files yang tersedia:
                </p>
             </div>
          </div>
        </div>

        <!-- Upload Section -->
        <div id="uploadSection" class="mb-8 ${state.processedData ? 'hidden' : ''}">
          <div class="glass-panel p-8 border-2 border-dashed border-slate-600 hover:border-blue-500 transition-colors cursor-pointer text-center group" id="dropZone">
            <input type="file" id="fileInput" class="hidden" accept=".xlsx, .xls" multiple>
            <div class="mb-4">
              <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-600/20 transition-colors">
                <svg class="w-8 h-8 text-slate-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
            </div>
            <h3 class="text-lg font-medium text-white mb-2">Upload Excel File</h3>
            <p class="text-slate-400 text-sm">Drag and drop or click to browse</p>
            <p class="text-slate-500 text-xs mt-2">Supported formats: .xlsx, .xls</p>
            <div id="loadingSpinner" class="hidden mt-4">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p class="text-blue-400 text-xs mt-2">Processing...</p>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboardContent" class="${state.processedData ? '' : 'hidden'} space-y-6">
          
          <!-- Success Modal (Hidden by default) -->
          <div id="successModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div class="bg-slate-800 border border-green-500/50 rounded-xl p-6 shadow-2xl transform transition-all scale-100 relative z-10 max-w-md w-full text-center">
                <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 class="text-xl font-bold text-white mb-2">Upload Berhasil!</h3>
                <p class="text-slate-300">File berhasil di-upload dan langsung diproses Cleaning.</p>
            </div>
          </div>
          
          <!-- Date Range Info -->
          <div class="text-white text-sm">
             Dari data original yang di-upload berisi data dari periode Tanggal: <span class="font-bold">${state.dateRange.start || '-'}</span> sampai Tanggal : <span class="font-bold">${state.dateRange.end || '-'}</span>
          </div>

          <!-- Metrics Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="metricsGrid">
            <!-- Metrics will be injected here -->
          </div>

          <!-- Charts Area -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6" id="chartsArea">
            <!-- Charts will be injected here -->
          </div>

          <!-- Summary Tables Area -->
          <div id="summaryTablesArea" class="mt-6">
            <!-- Tables will be injected here -->
          </div>
          
          <!-- Category Trend Chart Area (Moved here) -->
          <div id="categoryChartArea" class="mt-6">
            <!-- Chart will be dynamically injected here -->
          </div>
          
          <!-- Category Table Area -->
          <div id="categoryTableArea" class="mt-6">
            <!-- Table will be injected here -->
          </div>

          <!-- Pareto Chart Area -->
          <div id="paretoChartArea" class="mt-6">
             <!-- Pareto Charts will be injected here -->
          </div>
          
          <!-- Pareto Cust Chart Area -->
          <div id="paretoCustChartArea" class="mt-6">
             <!-- Pareto Cust Charts will be injected here -->
          </div>
          
          <!-- Pareto Part Chart Area -->
          <div id="paretoPartChartArea" class="mt-6">
             <!-- Pareto Part Charts will be injected here -->
          </div>
          
          <!-- M/C No Chart Area -->
          <div id="mcNoChartArea" class="mt-6">
             <!-- M/C No Chart and Table will be injected here -->
          </div>
          
          <!-- Housing Horn Area -->
          <div id="housingHornArea" class="mt-6">
            <!-- Housing Horn metrics and tables will be injected here -->
          </div>
          
          <!-- Rekap Area -->
          <div id="rekapArea" class="mt-6">
            <!-- Rekap table will be injected here -->
          </div>

          <!-- Trial Area -->
          <div id="trialArea" class="mt-6 hidden">
             <!-- Trial content will be injected here -->
          </div>
          

        </div>
      </main>
    </div>
  `

  // Event Listeners
  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.isLoggedIn = false
    state.data = null
    state.processedData = null
    renderLogin()
  })

  // Sidebar Toggle Logic
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebarOverlay')
  const burgerBtn = document.getElementById('burgerBtn')
  const closeSidebarBtn = document.getElementById('closeSidebarBtn')

  const toggleSidebar = () => {
      const isClosed = sidebar.classList.contains('-translate-x-full')
      if (isClosed) {
          sidebar.classList.remove('-translate-x-full')
          overlay.classList.remove('hidden')
          // Small delay to allow display:block to apply before opacity transition
          setTimeout(() => overlay.classList.remove('opacity-0'), 10)
      } else {
          sidebar.classList.add('-translate-x-full')
          overlay.classList.add('opacity-0')
          setTimeout(() => overlay.classList.add('hidden'), 300)
      }
  }

  burgerBtn?.addEventListener('click', toggleSidebar)
  closeSidebarBtn?.addEventListener('click', toggleSidebar)
  overlay?.addEventListener('click', toggleSidebar)

  // Desktop Sidebar Toggle
  const desktopToggleBtn = document.getElementById('desktopToggleSidebar')
  const sidebarContent = document.getElementById('sidebarContent')
  const sidebarTitle = document.getElementById('sidebarTitle')
  const toggleIcon = document.getElementById('toggleIcon')
  
  desktopToggleBtn?.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.contains('!w-16')
      
      if (isCollapsed) {
          // Expand sidebar
          sidebar.classList.remove('!w-16')
          sidebar.classList.add('!w-64')
          sidebarContent?.classList.remove('hidden')
          sidebarTitle?.classList.remove('hidden')
          // Change icon to left arrow (collapse)
          toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>'
      } else {
          // Collapse sidebar
          sidebar.classList.remove('!w-64')
          sidebar.classList.add('!w-16')
          sidebarContent?.classList.add('hidden')
          sidebarTitle?.classList.add('hidden')
          // Change icon to right arrow (expand)
          toggleIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>'
      }
  })

  // Navigation Scroll Logic
  const scrollToSection = (id) => {
      const element = document.getElementById(id)
      if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          // On mobile, close sidebar after click
          if (window.innerWidth < 768) toggleSidebar()
      }
  }

  document.getElementById('dashboardBtn')?.addEventListener('click', () => {
      document.querySelector('main').scrollTo({ top: 0, behavior: 'smooth' })
      if (window.innerWidth < 768) toggleSidebar()
  })

  document.getElementById('nav-metrics')?.addEventListener('click', () => scrollToSection('metricsGrid'))
  document.getElementById('nav-charts')?.addEventListener('click', () => scrollToSection('chartsArea'))
  document.getElementById('nav-summary')?.addEventListener('click', () => scrollToSection('summaryTablesArea'))
  document.getElementById('nav-category-chart')?.addEventListener('click', () => scrollToSection('categoryChartArea'))
  document.getElementById('nav-category-table')?.addEventListener('click', () => scrollToSection('categoryTableArea'))
  document.getElementById('nav-pareto')?.addEventListener('click', () => scrollToSection('paretoChartArea'))
  document.getElementById('nav-rekap')?.addEventListener('click', () => scrollToSection('rekapArea'))

  // Trial Menu Logic
  const trialMenuBtn = document.getElementById('nav-trial-menu')
  const trialSubmenus = document.getElementById('trial-submenus')
  
  trialMenuBtn?.addEventListener('click', () => {
      trialSubmenus.classList.toggle('hidden')
  })

  const showTrialSection = (sectionId) => {
      // Hide other sections if needed, or just scroll
      // For now, we just ensure trial area is visible and scroll
      const trialArea = document.getElementById('trialArea')
      if (trialArea) {
          trialArea.classList.remove('hidden')
          // Hide other main areas if we want a dedicated page feel, 
          // but user asked for "new page/section", so scrolling is fine if it's all in one dashboard.
          // However, to mimic a "new page", we might want to toggle visibility of other big sections.
          // Let's keep it simple first: Scroll to specific ID within trial area.
          
          const element = document.getElementById(sectionId)
          if (element) {
             element.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } else {
             trialArea.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
          
          if (window.innerWidth < 768) toggleSidebar()
      }
  }

  document.getElementById('nav-trial-table')?.addEventListener('click', () => showTrialSection('trialTableContainer'))
  document.getElementById('nav-trial-rekap')?.addEventListener('click', () => showTrialSection('trialRekapContainer'))
  document.getElementById('nav-trial-defect')?.addEventListener('click', () => showTrialSection('trialDefectChartContainer'))
  document.getElementById('nav-trial-chart')?.addEventListener('click', () => showTrialSection('trialChartContainer'))

  const dropZone = document.getElementById('dropZone')
  const fileInput = document.getElementById('fileInput')

  dropZone.addEventListener('click', () => fileInput.click())
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('border-blue-500', 'bg-blue-600/5')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-600/5')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('border-blue-500', 'bg-blue-600/5')
    const files = e.dataTransfer.files
    if (files.length) handleFileUpload(files)
  })

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileUpload(e.target.files)
  })

  document.getElementById('downloadBtn').addEventListener('click', downloadExcel)
}

const handleFileUpload = async (files) => {
  const loadingSpinner = document.getElementById('loadingSpinner')
  loadingSpinner.classList.remove('hidden')
  
  try {
    const result = await processExcelFile(files)
    
    if (!result.cleanedData || result.cleanedData.length === 0) {
        throw new Error("No valid data found in the Excel file. Please check column headers.")
    }

    state.processedData = result.cleanedData
    state.metrics = result.metrics
    state.chartsData = result.chartsData
    state.summaryTables = result.summaryTables
    state.trialMetrics = result.trialMetrics
    state.fileMetadata = result.fileMetadata
    state.dateRange = result.dateRange
    
    renderDashboard()
    renderMetrics()
    renderHousingHorn()
    renderCharts()
    renderSummaryTables()
    renderParetoCharts()
    renderParetoCustCharts()
    renderParetoPartCharts()
    renderMcNoChart()
    renderRekap()
    renderTrialView()
    
    // Show Success Modal
    const modal = document.getElementById('successModal')
    if (modal) {
        modal.classList.remove('hidden')
        setTimeout(() => {
            modal.classList.add('hidden')
        }, 3000)
    }
  } catch (error) {
    console.error("Error processing file:", error)
    alert(`Error processing file: ${error.message || "Unknown error"}`)
    loadingSpinner.classList.add('hidden')
  }
}

const renderMetrics = () => {
  const metricsGrid = document.getElementById('metricsGrid')
  const { totalInsp, totalOK, totalNG, ngPercent } = state.metrics
  
  const createMetricCard = (title, value, color) => `
    <div class="glass-panel p-6">
      <h3 class="text-slate-400 text-sm font-medium mb-2">${title}</h3>
      <p class="text-3xl font-bold ${color}">${value}</p>
    </div>
  `
  
  metricsGrid.innerHTML = `
    ${createMetricCard('Total Inspected (Lot)', totalInsp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'text-white')}
    ${createMetricCard('Total OK (Lot)', totalOK.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'text-green-400')}
    ${createMetricCard('Total NG (Lot)', totalNG.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'text-red-400')}
    ${createMetricCard('Total NG (%)', ngPercent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%', 'text-red-400')}
  `
}

const renderCharts = () => {
  const chartsArea = document.getElementById('chartsArea')
  chartsArea.innerHTML = `
    <div class="glass-panel p-6 col-span-1 lg:col-span-2">
      <h3 class="text-white font-medium mb-4">NG% & Qty Inspected by Month</h3>
      <div class="h-80"><canvas id="monthlyTrendChart"></canvas></div>
    </div>
    <div class="glass-panel p-6">
      <h3 class="text-white font-medium mb-4">Portion Qty Inspected by Customer</h3>
      <div class="h-64"><canvas id="customerPieChart"></canvas></div>
    </div>
    <div class="glass-panel p-6">
      <h3 class="text-white font-medium mb-4">Portion Qty Inspected by Line</h3>
      <div class="h-64"><canvas id="linePieChart"></canvas></div>
    </div>
  `

  // Destroy existing charts if any
  Object.values(state.charts).forEach(chart => chart.destroy())
  
  // Monthly Trend Chart
  const ctx1 = document.getElementById('monthlyTrendChart').getContext('2d')
  state.charts.monthly = new Chart(ctx1, {
    data: state.chartsData.monthlyTrend,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { labels: { color: '#94a3b8' } },
        datalabels: {
            anchor: 'end',
            align: 'top',
            color: '#fff',
            font: { weight: 'bold', size: 10 },
            formatter: (value) => {
                return typeof value === 'number' ? value.toFixed(2) : value;
            }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          ticks: { color: '#94a3b8' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#ef4444' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  })

  // Customer Pie Chart
  const ctx2 = document.getElementById('customerPieChart').getContext('2d')
  state.charts.customer = new Chart(ctx2, {
    type: 'pie',
    data: state.chartsData.customerPie,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8' } },
        datalabels: {
            color: '#fff',
            font: { weight: 'bold' },
            formatter: (value, ctx) => {
                let sum = 0;
                let dataArr = ctx.chart.data.datasets[0].data;
                dataArr.map(data => {
                    sum += data;
                });
                let percentage = (value * 100 / sum).toFixed(1) + "%";
                return percentage;
            }
        }
      }
    }
  })

  // Line Pie Chart
  const ctx3 = document.getElementById('linePieChart').getContext('2d')
  state.charts.line = new Chart(ctx3, {
    type: 'pie',
    data: state.chartsData.linePie,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { color: '#94a3b8' } },
        datalabels: {
            color: '#fff',
            font: { weight: 'bold' },
            formatter: (value, ctx) => {
                let sum = 0;
                let dataArr = ctx.chart.data.datasets[0].data;
                dataArr.map(data => {
                    sum += data;
                });
                let percentage = (value * 100 / sum).toFixed(1) + "%";
                return percentage;
            }
        }
      }
    }
  })

  // Category Trend Chart
  const categoryChartContainer = document.getElementById('categoryChartArea')
  if (categoryChartContainer) {
      categoryChartContainer.innerHTML = `
        <div class="glass-panel p-6">
            <h3 class="text-white font-medium mb-4">Grafik NG% & Qty Inspected by Kategori</h3>
            <div class="h-80"><canvas id="categoryTrendChart"></canvas></div>
        </div>
      `
      
      const ctx4 = document.getElementById('categoryTrendChart').getContext('2d')
      state.charts.category = new Chart(ctx4, {
      data: state.chartsData.categoryTrend,
      options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
              legend: { labels: { color: '#94a3b8' } },
              datalabels: {
                  anchor: 'end',
                  align: 'top',
                  color: (context) => {
                      return context.dataset.type === 'line' ? '#ef4444' : '#fff';
                  },
                  font: { weight: 'bold', size: 10 },
                  formatter: (value) => {
                      return typeof value === 'number' ? value.toFixed(2) : value;
                  }
              }
          },
          scales: {
              y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  title: {
                      display: true,
                      text: 'Qty Inspected (lot)',
                      color: '#0d9488'
                  },
                  grid: { color: 'rgba(255, 255, 255, 0.1)' },
                  ticks: { color: '#94a3b8' }
              },
              y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  title: {
                      display: true,
                      text: 'NG (%)',
                      color: '#ef4444'
                  },
                  grid: { drawOnChartArea: false },
                  ticks: { color: '#ef4444' }
              },
              x: {
                  title: {
                      display: true,
                      text: 'Kategori',
                      color: '#fff'
                  },
                  grid: { display: false },
                  ticks: { color: '#94a3b8' }
              }
          }
      }
  })
  }
}

const downloadExcel = () => {
  const ws = XLSX.utils.json_to_sheet(state.processedData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Cleaned Data")
  XLSX.writeFile(wb, "File_after_Cleaning.xlsx")
}

const createSummaryTableHTML = (title, tableData, metricKey, formatFn) => {
  const { rows, grandTotal } = tableData
  const headers = ['Date/Shift', 'Barrel 4', 'Nickel', 'Rack 1', 'Total']
  
  const tableRows = rows.map(row => {
      const b4 = row.lines['Barrel 4'][metricKey]
      const ni = row.lines['Nickel'][metricKey]
      const r1 = row.lines['Rack 1'][metricKey]
      const tot = row.total[metricKey]
      
      return `
          <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
              <td class="py-3 px-4 text-slate-300 font-medium">${row.name}</td>
              <td class="py-3 px-4 text-slate-400">${formatFn(b4)}</td>
              <td class="py-3 px-4 text-slate-400">${formatFn(ni)}</td>
              <td class="py-3 px-4 text-slate-400">${formatFn(r1)}</td>
              <td class="py-3 px-4 text-white font-bold">${formatFn(tot)}</td>
          </tr>
      `
  }).join('')
  
  const gtB4 = grandTotal.lines['Barrel 4'][metricKey]
  const gtNi = grandTotal.lines['Nickel'][metricKey]
  const gtR1 = grandTotal.lines['Rack 1'][metricKey]
  const gtTot = grandTotal.total[metricKey]

  const footerRow = `
      <tr class="bg-slate-700/30 font-bold">
          <td class="py-3 px-4 text-white">Total</td>
          <td class="py-3 px-4 text-white">${formatFn(gtB4)}</td>
          <td class="py-3 px-4 text-white">${formatFn(gtNi)}</td>
          <td class="py-3 px-4 text-white">${formatFn(gtR1)}</td>
          <td class="py-3 px-4 text-white">${formatFn(gtTot)}</td>
      </tr>
  `

  return `
      <div class="glass-panel p-0 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-glass-border bg-slate-800/50">
              <h3 class="text-white font-semibold text-sm">${title}</h3>
          </div>
          <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                  <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
                      <tr>
                          ${headers.map(h => `<th class="py-3 px-4 font-semibold">${h}</th>`).join('')}
                      </tr>
                  </thead>
                  <tbody>
                      ${tableRows}
                  </tbody>
                  <tfoot>
                      ${footerRow}
                  </tfoot>
              </table>
          </div>
      </div>
  `
}

const renderSummaryTables = () => {
  const container = document.getElementById('summaryTablesArea')
  if (!container || !state.summaryTables) return
  
  const { byMonth, byShift } = state.summaryTables
  
  const fmtPct = (val) => typeof val === 'number' ? val.toFixed(2) : val
  const fmtNum = (val) => typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val
  
  container.innerHTML = `
      <div class="grid grid-cols-1 gap-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              ${createSummaryTableHTML('Table NG (%) by Line & Month', byMonth, 'ngPercent', fmtPct)}
              ${createSummaryTableHTML('Table Qty NG (lot) by Line & Month', byMonth, 'ng', fmtNum)}
              ${createSummaryTableHTML('Table Qty Inspected (lot) by Line & Month', byMonth, 'insp', fmtNum)}
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              ${createSummaryTableHTML('NG (%) by Line & Shift', byShift, 'ngPercent', fmtPct)}
              ${createSummaryTableHTML('Qty NG(lot) by Line-Shift', byShift, 'ng', fmtNum)}
              ${createSummaryTableHTML('Qty Insp(lot) by Line-Shift', byShift, 'insp', fmtNum)}
          </div>
      </div>
  `

  // Render Category Table
  const categoryContainer = document.getElementById('categoryTableArea')
  if (categoryContainer && state.summaryTables.categoryTableArray) {
      const catData = state.summaryTables.categoryTableArray
      
      const catRows = catData.map(row => {
          const isTotal = row.category === 'Total'
          const rowClass = isTotal ? 'bg-slate-700/30 font-bold' : 'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors'
          const textClass = isTotal ? 'text-white' : 'text-slate-400'
          const nameClass = isTotal ? 'text-white' : 'text-slate-300 font-medium'
          
          return `
              <tr class="${rowClass}">
                  <td class="py-3 px-4 ${nameClass}">${row.category}</td>
                  <td class="py-3 px-4 ${textClass}">${row.qtyInspectedLot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="py-3 px-4 ${textClass}">${row.qtyNgLot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td class="py-3 px-4 ${textClass}">${row.ngPercent.toFixed(2)}</td>
              </tr>
          `
      }).join('')

      // Category Line Tables
      let categoryLineTablesHTML = ''
      if (state.summaryTables.categoryLineTables) {
          const { rows, grandTotal } = state.summaryTables.categoryLineTables
          
          const createCatLineTable = (title, metricKey, formatFn) => {
              const headers = ['Kategori', 'Barrel 4', 'Nickel', 'Rack 1', 'Total']
              
              const tableRows = rows.map(row => {
                  const b4 = row.lines['Barrel 4'][metricKey]
                  const ni = row.lines['Nickel'][metricKey]
                  const r1 = row.lines['Rack 1'][metricKey]
                  const tot = row.total[metricKey]
                  
                  return `
                      <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
  const lines = ['Barrel 4', 'Rack 1'] // Only these two as per request/image

  // Clear previous content
  container.innerHTML = ''

  // Create Grid Container
  const gridDiv = document.createElement('div')
  gridDiv.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6'
  container.appendChild(gridDiv)

  lines.forEach(line => {
      if (!paretoData[line] || paretoData[line].length === 0) return

      const data = paretoData[line]
      const labels = data.map(d => d.type)
      const counts = data.map(d => d.count)
      const cumulative = data.map(d => d.cumulativePct)

      // Create Chart Card
      const card = document.createElement('div')
      card.className = 'glass-panel p-6'
      
      const title = document.createElement('h3')
      title.className = 'text-white font-medium mb-4'
      title.textContent = 'Pareto Chart: Total NG (lot) per Defect Type - Line ' + line
      card.appendChild(title)

      const canvasContainer = document.createElement('div')
      canvasContainer.className = 'h-80'
      const canvas = document.createElement('canvas')
      canvas.id = 'paretoChart-' + line.replace(/\s+/g, '-')
      canvasContainer.appendChild(canvas)
      card.appendChild(canvasContainer)
      
      gridDiv.appendChild(card)

      // Render Chart
      const ctx = canvas.getContext('2d')
      
      // Colors based on line (matching app.py roughly)
      const barColorHex = line === 'Barrel 4' ? '#f1f5f9' : '#fda4af' 

      new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [
                  {
                      label: 'Total NG (lot)',
                      data: counts,
                      backgroundColor: barColorHex,
                      order: 2,
                      yAxisID: 'y',
                      datalabels: {
                          anchor: 'end',
                          align: 'top',
                          color: '#fff',
                          formatter: (val) => val.toFixed(2)
                      }
                  },
                  {
                      label: 'Cumulative %',
                      data: cumulative,
                      type: 'line',
                      borderColor: '#f59e0b', // Orange
                      backgroundColor: '#f59e0b',
                      borderWidth: 2,
                      pointRadius: 4,
                      yAxisID: 'y1',
                      order: 1,
                      datalabels: {
                          align: 'top',
                          color: '#f59e0b',
                          formatter: (val) => val.toFixed(1) + '%'
                      }
                  }
              ]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                  legend: {
                      labels: { color: '#94a3b8' }
                  },
                  tooltip: {
                      mode: 'index',
                      intersect: false
                  }
              },
              scales: {
                  y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: { display: true, text: 'Total NG (lot)', color: '#94a3b8' },
                      grid: { color: '#334155' },
                      ticks: { color: '#94a3b8' }
                  },
                  y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: 'Cumulative %', color: '#94a3b8' },
                      min: 0,
                      max: 110,
                      grid: { display: false },
                      ticks: { 
                          color: '#94a3b8',
                          callback: function(value) { return value + '%' }
                      }
                  },
                  x: {
                      grid: { display: false },
                      ticks: { color: '#94a3b8' }
                  }
              }
          }
      })
  })
}

const renderParetoCustCharts = () => {
  const container = document.getElementById('paretoCustChartArea')
  if (!container || !state.chartsData || !state.chartsData.paretoCustData) return

  const paretoCustData = state.chartsData.paretoCustData
  const lines = ['Barrel 4', 'Rack 1']

  // Clear previous content
  container.innerHTML = ''

  // Create Grid Container
  const gridDiv = document.createElement('div')
  gridDiv.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6'
  container.appendChild(gridDiv)

  lines.forEach(line => {
      if (!paretoCustData[line] || paretoCustData[line].length === 0) return

      const data = paretoCustData[line]
      const labels = data.map(d => d.type)
      const counts = data.map(d => d.count)
      const cumulative = data.map(d => d.cumulativePct)

      // Create Chart Card
      const card = document.createElement('div')
      card.className = 'glass-panel p-6'
      
      const title = document.createElement('h3')
      title.className = 'text-white font-medium mb-4'
      title.textContent = 'Pareto Chart: Qty NG (lot) per Cust.ID - ' + line
      card.appendChild(title)

      const canvasContainer = document.createElement('div')
      canvasContainer.className = 'h-80'
      const canvas = document.createElement('canvas')
      canvas.id = 'paretoCustChart-' + line.replace(/\s+/g, '-')
      canvasContainer.appendChild(canvas)
      card.appendChild(canvasContainer)
      
      gridDiv.appendChild(card)

      // Render Chart
      const ctx = canvas.getContext('2d')
      
      // Colors: Dark Blue for bars, Orange for line
      const barColorHex = '#1e3a8a' // blue-900 like

      new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [
                  {
                      label: 'Qty NG (Lot)',
                      data: counts,
                      backgroundColor: (ctx) => {
                          // Gradient for bars
                          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
                          gradient.addColorStop(0, '#6366f1'); // Indigo 500
                          gradient.addColorStop(1, '#1e1b4b'); // Indigo 950
                          return gradient;
                      },
                      order: 2,
                      yAxisID: 'y',
                      datalabels: {
                          anchor: 'end',
                          align: 'top',
                          color: '#fff',
                          formatter: (val) => val.toFixed(2)
                      }
                  },
                  {
                      label: 'Cumulative %',
                      data: cumulative,
                      type: 'line',
                      borderColor: '#f59e0b', // Orange
                      backgroundColor: '#f59e0b',
                      borderWidth: 2,
                      pointRadius: 4,
                      yAxisID: 'y1',
                      order: 1,
                      datalabels: {
                          align: 'top',
                          color: '#f59e0b',
                          formatter: (val) => val.toFixed(1) + '%'
                      }
                  }
              ]
          },
          options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                  legend: {
                      labels: { color: '#94a3b8' }
                  },
                  tooltip: {
                      mode: 'index',
                      intersect: false
                  }
              },
              scales: {
                  y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: { display: true, text: 'Qty NG (Lot)', color: '#94a3b8' },
                      grid: { color: '#334155' },
                      ticks: { color: '#94a3b8' }
                  },
                  y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: 'Cumulative %', color: '#94a3b8' },
                      min: 0,
                      max: 110,
                      grid: { display: false },
                      ticks: { 
                          color: '#94a3b8',
                          callback: function(value) { return value + '%' }
                      }
                  },
                  x: {
                      title: {
                          display: true,
                          text: 'Cust.ID',
                          color: '#fff'
                      },
                      grid: { display: false },
                      ticks: { color: '#94a3b8' }
                  }
              }
          }
      })
  })
}

const renderParetoPartCharts = () => {
  const container = document.getElementById('paretoPartChartArea')
  if (!container || !state.chartsData || !state.chartsData.paretoPartData) return

  const paretoPartData = state.chartsData.paretoPartData
  const lines = ['Barrel 4', 'Rack 1'] // Both lines as requested

  // Clear previous content
  container.innerHTML = ''

  // Create Grid Container (Single column for vertical stacking)
  const gridDiv = document.createElement('div')
  gridDiv.className = 'grid grid-cols-1 gap-6'
  container.appendChild(gridDiv)

  lines.forEach(line => {
      if (!paretoPartData[line] || paretoPartData[line].length === 0) return

      const data = paretoPartData[line]
      // Limit to top 30 to avoid overcrowding if too many parts
      const topData = data.slice(0, 30)
      
      const labels = topData.map(d => d.type)
      const counts = topData.map(d => d.count)
      const cumulative = topData.map(d => d.cumulativePct)

      // Create Chart Card
      const card = document.createElement('div')
      card.className = 'glass-panel p-6'
      
      const title = document.createElement('h3')
      title.className = 'text-white font-medium mb-4'
      // Update title based on line
      const lineLabel = line === 'Barrel 4' ? 'LB4' : 'LR1'
      title.textContent = 'Pareto Chart: NG (%) per Part Name - ' + lineLabel
      card.appendChild(title)

      const canvasContainer = document.createElement('div')
      canvasContainer.className = 'h-96' // Taller for better visibility of x-axis labels
      const canvas = document.createElement('canvas')
      canvas.id = 'paretoPartChart-' + line.replace(/\s+/g, '-')
      canvasContainer.appendChild(canvas)
      card.appendChild(canvasContainer)
      
      gridDiv.appendChild(card)

      // Render Chart
      const ctx = canvas.getContext('2d')
      
      // Different colors for different lines
      const barColor = line === 'Barrel 4' ? '#5eead4' : '#c084fc' // Teal for B4, Purple for R1
      
      new Chart(ctx, {
          type: 'bar',
          data: {
              labels: labels,
              datasets: [
                  {
                      label: 'NG (%)',
                      data: counts,
                      backgroundColor: barColor,
                      order: 2,
                      yAxisID: 'y',
                      datalabels: {
                          anchor: 'end',
                          align: 'top',
                          color: '#fff',
                          font: { size: 10 },
                          formatter: (val) => val.toFixed(2)
                      }
                  },
                  {
                      label: 'Cumulative %',
                      data: cumulative,
                      type: 'line',
                      borderColor: '#f59e0b', // Orange
                      backgroundColor: '#f59e0b',
                      borderWidth: 2,
                      pointRadius: 4,
                      yAxisID: 'y1',
                          display: true,
                          text: 'PartName',
                          color: '#fff'
                      },
                      grid: { display: false },
                      ticks: { 
                          color: '#94a3b8',
                          maxRotation: 45,
                          minRotation: 45
                      }
                  }
              }
          }
      })
  })
}

const renderMcNoChart = () => {
  const container = document.getElementById('mcNoChartArea')
  if (!container || !state.chartsData || !state.chartsData.mcNoData) return

  const mcNoData = state.chartsData.mcNoData

  // Clear previous content
  container.innerHTML = ''

  // Create main container
  const mainDiv = document.createElement('div')
  mainDiv.className = 'glass-panel p-6'
  
  // Title
  const title = document.createElement('h3')
  title.className = 'text-white font-medium mb-1'
  title.textContent = 'Performa Produk Stamping | Qty Inspected/Lot vs (NG %) per M/C No.'
  mainDiv.appendChild(title)

  // Subtitle showing period (if available)
  if (state.dateRange && state.dateRange.start && state.dateRange.end) {
      const subtitle = document.createElement('p')
      subtitle.className = 'text-slate-400 text-sm mb-4'
      subtitle.textContent = 'Periode dari Tanggal: ' + state.dateRange.start + ' sampai Tanggal: ' + state.dateRange.end
      mainDiv.appendChild(subtitle)
  }

  // Chart container
  const canvasContainer = document.createElement('div')
  canvasContainer.className = 'h-96 mb-6'
  const canvas = document.createElement('canvas')
  canvas.id = 'mcNoChart'
  canvasContainer.appendChild(canvas)
  mainDiv.appendChild(canvasContainer)

  // Table container
  const tableTitle = document.createElement('h4')
  tableTitle.className = 'text-white font-medium text-sm mb-3'
  tableTitle.textContent = 'Tabel NG (%) by M/C No. Stamping'
  mainDiv.appendChild(tableTitle)

  const tableContainer = document.createElement('div')
  tableContainer.className = 'overflow-x-auto'
  
  // Calculate totals
  const totalInspLot = mcNoData.tableData.reduce((sum, row) => sum + row.inspLot, 0)
  const avgNgPercent = mcNoData.tableData.length > 0 
      ? mcNoData.tableData.reduce((sum, row) => sum + row.ngPercent, 0) / mcNoData.tableData.length 
      : 0

  const tableHTML = `
      <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
              <tr>
                  ${mcNoData.labels.map(mc => `<th class="py-3 px-4 font-semibold text-center">${mc}</th>`).join('')}
                  <th class="py-3 px-4 font-semibold text-center">Total</th>
              </tr>
          </thead>
          <tbody>
              <tr class="border-b border-slate-700/50">
                  ${mcNoData.tableData.map(row => 
                      `<td class="py-3 px-4 text-slate-400 text-center">${row.inspLot.toFixed(2)}</td>`
                  ).join('')}
                  <td class="py-3 px-4 text-white font-bold text-center">${totalInspLot.toFixed(2)}</td>
              </tr>
              <tr class="border-b border-slate-700/50">
                  ${mcNoData.tableData.map(row => 
                      `<td class="py-3 px-4 text-slate-400 text-center">${row.ngPercent.toFixed(2)}</td>`
                  ).join('')}
                  <td class="py-3 px-4 text-white font-bold text-center">${avgNgPercent.toFixed(2)}</td>
              </tr>
          </tbody>
      </table>
  `
  
  tableContainer.innerHTML = tableHTML
  mainDiv.appendChild(tableContainer)
  
  container.appendChild(mainDiv)

  // Render Chart
  const ctx = canvas.getContext('2d')
  
  // Different colors for each bar
  const barColors = [
      '#6366f1',
      '#ef4444',
      '#10b981',
      '#a855f7',
      '#f59e0b',
      '#06b6d4',
      '#ec4899',
      '#8b5cf6',
      '#14b8a6',
      '#f97316'
  ]

  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: mcNoData.labels,
          datasets: [
              {
                  label: 'Inspected/Lot',
                  data: mcNoData.inspLot,
                  backgroundColor: mcNoData.labels.map((_, i) => barColors[i % barColors.length]),
                  order: 2,
                  yAxisID: 'y',
                  datalabels: {
                      anchor: 'end',
                      align: 'top',
                      color: '#fff',
                      font: { size: 10, weight: 'bold' },
                      formatter: (val) => val.toFixed(2)
                  }
              },
              {
                  label: 'NG_%',
                  data: mcNoData.ngPercent,
                  type: 'line',
                  borderColor: '#ef4444', // Red
                  backgroundColor: '#ef4444',
                  borderWidth: 3,
                  pointRadius: 6,
                  pointBackgroundColor: '#ef4444',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  yAxisID: 'y1',
                  order: 1,
                  datalabels: {
                      align: 'top',
                      offset: 10,
                      color: '#ef4444',
                      font: { size: 10, weight: 'bold' },
                      formatter: (val) => val.toFixed(2)
                  }
              }
          ]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
              legend: {
                  labels: { color: '#94a3b8' }
              },
              tooltip: {
                  mode: 'index',
                  intersect: false
              }
          },
          scales: {
              y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  title: { display: true, text: 'Qty Inspected/Lot', color: '#94a3b8' },
                  grid: { color: '#334155' },
                  ticks: { color: '#94a3b8' }
              },
              y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  title: { display: true, text: 'NG (%)', color: '#ef4444' },
                  grid: { display: false },
                  ticks: { 
                      color: '#ef4444'
                  }
              },
              x: {
                  title: {
                      display: true,
                      text: 'M/C No.',
                      color: '#fff'
                  },
                  grid: { display: false },
                  ticks: { color: '#94a3b8' }
              }
          }
      }
  })
}

const renderHousingHorn = () => {
  console.log('renderHousingHorn called')
  const container = document.getElementById('housingHornArea')
  console.log('Housing Horn container:', container)
  console.log('state.chartsData:', state.chartsData)
  
  if (!container) {
      console.log('No housingHornArea container found')
      return
  }
  
  if (!state.chartsData) {
      console.log('No chartsData in state')
      return
  }
  
  if (!state.chartsData.housingHornData) {
      console.log('No housingHornData in chartsData')
      return
  }

  const hhData = state.chartsData.housingHornData
  console.log('Housing Horn Data:', hhData)

  // Check if there's any data
  if (hhData.tableDataPcs.length === 0) {
      console.log('No Housing Horn data found (empty tableDataPcs)')
      container.innerHTML = ''
      return
  }

  // Clear previous content
  container.innerHTML = ''

  // Create main container
  const mainDiv = document.createElement('div')
  mainDiv.className = 'glass-panel p-6'
  
  // Title
  const title = document.createElement('h3')
  title.className = 'text-white font-semibold text-lg mb-1'
  title.textContent = 'Metrics for Housing Horn - PT.HDI - Barrel 4'
  mainDiv.appendChild(title)

  // Subtitle showing period
  if (state.dateRange && state.dateRange.start && state.dateRange.end) {
      const subtitle = document.createElement('p')
      subtitle.className = 'text-slate-400 text-sm mb-4'
      subtitle.textContent = `Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}`
      mainDiv.appendChild(subtitle)
  }

  // Metrics Grid
  const metricsGrid = document.createElement('div')
  metricsGrid.className = 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6'
  
  const metrics = [
      { label: 'OK (pcs)', value: hhData.metrics.okPcs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) },
      { label: 'NG (pcs)', value: hhData.metrics.ngPcs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) },
      { label: 'Insp (pcs)', value: hhData.metrics.inspPcs.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) },
      { label: 'OK (lot)', value: hhData.metrics.okLot.toFixed(2) },
      { label: 'NG (lot)', value: hhData.metrics.ngLot.toFixed(2) },
      { label: 'Insp (lot)', value: hhData.metrics.inspLot.toFixed(2) },
      { label: 'NG (%)', value: hhData.metrics.ngPercent.toFixed(2) }
  ]

  metrics.forEach(m => {
      const card = document.createElement('div')
      card.className = 'bg-slate-800/50 rounded-lg p-4 border border-slate-700/50'
      card.innerHTML = `
          <div class="text-slate-400 text-xs mb-1">${m.label}</div>
          <div class="text-white text-2xl font-bold">${m.value}</div>
      `
      metricsGrid.appendChild(card)
  })
  
  mainDiv.appendChild(metricsGrid)

  // Collapsible Table (LOT)
  const collapsibleLot = document.createElement('details')
  collapsibleLot.className = 'mb-4'
  
  const summaryLot = document.createElement('summary')
  summaryLot.className = 'cursor-pointer bg-slate-800/30 p-4 rounded-lg hover:bg-slate-800/50 transition-colors flex justify-between items-center'
  summaryLot.innerHTML = `
      <span class="text-white font-medium">Klik untuk melihat details Data Housing Horn (lot) - PT. HDI - Barrel 4</span>
      <svg class="w-5 h-5 text-slate-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
  `
  collapsibleLot.appendChild(summaryLot)

  const tableLotContainer = document.createElement('div')
  tableLotContainer.className = 'mt-4 overflow-x-auto'
  
  const tableLotHTML = `
      <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
              <tr>
                  <th class="py-3 px-4">PartName</th>
                  <th class="py-3 px-4 text-right">OK (lot)</th>
                  <th class="py-3 px-4 text-right">NG (lot)</th>
                  <th class="py-3 px-4 text-right">NGM (lot)</th>
                  <th class="py-3 px-4 text-right">Tot.Insp (lot)</th>
                  <th class="py-3 px-4 text-right">NG (%)</th>
              </tr>
          </thead>
          <tbody>
              ${hhData.tableDataLot.map((row, idx) => `
                  <tr class="border-b border-slate-700/50">
                      <td class="py-3 px-4 text-slate-300">${row.partName}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.okLot.toFixed(2)}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngLot.toFixed(2)}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngmLot.toFixed(2)}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.totInspLot.toFixed(2)}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngPercent.toFixed(2)}</td>
                  </tr>
              `).join('')}
              <tr class="bg-slate-700/30 font-bold">
                  <td class="py-3 px-4 text-white">TOTAL</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.okLot.toFixed(2)}</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.ngLot.toFixed(2)}</td>
                  <td class="py-3 px-4 text-white text-right">0</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.inspLot.toFixed(2)}</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.ngPercent.toFixed(2)}</td>
              </tr>
          </tbody>
      </table>
  `
  tableLotContainer.innerHTML = tableLotHTML
  collapsibleLot.appendChild(tableLotContainer)
  mainDiv.appendChild(collapsibleLot)

  // Collapsible Table (PCS) - default open
  const collapsiblePcs = document.createElement('details')
  collapsiblePcs.className = 'mb-4'
  collapsiblePcs.setAttribute('open', '')
  
  const summaryPcs = document.createElement('summary')
  summaryPcs.className = 'cursor-pointer bg-slate-800/30 p-4 rounded-lg hover:bg-slate-800/50 transition-colors flex justify-between items-center'
  summaryPcs.innerHTML = `
      <span class="text-white font-medium">Klik untuk melihat details Data Housing Horn (pcs) - PT. HDI - Barrel 4</span>
      <svg class="w-5 h-5 text-slate-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
  `
  collapsiblePcs.appendChild(summaryPcs)

  const tablePcsContainer = document.createElement('div')
  tablePcsContainer.className = 'mt-4 overflow-x-auto'
  
  const tablePcsHTML = `
      <table class="w-full text-sm text-left">
          <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
              <tr>
                  <th class="py-3 px-4">PartName</th>
                  <th class="py-3 px-4 text-right">OK (pcs)</th>
                  <th class="py-3 px-4 text-right">NG (pcs)</th>
                  <th class="py-3 px-4 text-right">NGM (pcs)</th>
                  <th class="py-3 px-4 text-right">Tot.Insp (pcs)</th>
                  <th class="py-3 px-4 text-right">NG (%)</th>
              </tr>
          </thead>
          <tbody>
              ${hhData.tableDataPcs.map((row, idx) => `
                  <tr class="border-b border-slate-700/50">
                      <td class="py-3 px-4 text-slate-300">${row.partName}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.okPcs.toLocaleString()}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngPcs.toLocaleString()}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngmPcs.toLocaleString()}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.totInspPcs.toLocaleString()}</td>
                      <td class="py-3 px-4 text-slate-400 text-right">${row.ngPercent.toFixed(2)}</td>
                  </tr>
              `).join('')}
              <tr class="bg-slate-700/30 font-bold">
                  <td class="py-3 px-4 text-white">TOTAL</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.okPcs.toLocaleString()}</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.ngPcs.toLocaleString()}</td>
                  <td class="py-3 px-4 text-white text-right">0</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.inspPcs.toLocaleString()}</td>
                  <td class="py-3 px-4 text-white text-right">${hhData.metrics.ngPercent.toFixed(2)}</td>
              </tr>
          </tbody>
      </table>
  `
  tablePcsContainer.innerHTML = tablePcsHTML
  collapsiblePcs.appendChild(tablePcsContainer)
  mainDiv.appendChild(collapsiblePcs)

  container.appendChild(mainDiv)
}

const renderRekap = () => {
  const container = document.getElementById('rekapArea')
  if (!container || !state.chartsData || !state.chartsData.rekapData) {
      if (container) container.innerHTML = ''
      return
  }

  const rekapData = state.chartsData.rekapData

  // Clear previous content
  container.innerHTML = ''

  // Create main container
  const mainDiv = document.createElement('div')
  mainDiv.className = 'glass-panel p-6'
  
  // Title
  const title = document.createElement('h3')
  title.className = 'text-white font-semibold text-lg mb-1 text-center'
  title.textContent = 'Lembar Panduan untuk LEADER input ke Grafik Harian'
  mainDiv.appendChild(title)

  // Subtitle
  if (state.dateRange && state.dateRange.start && state.dateRange.end) {
      const subtitle = document.createElement('p')
      subtitle.className = 'text-slate-400 text-sm mb-6 text-center'
      subtitle.textContent = `Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}`
      mainDiv.appendChild(subtitle)
  }

  // Grid for 4 columns
  const gridDiv = document.createElement('div')
  gridDiv.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
  
  rekapData.forEach(category => {
      const catDiv = document.createElement('div')
      catDiv.className = 'bg-slate-800/30 rounded-lg p-4 border border-slate-700/50'
      
      // Category Title
      const catTitle = document.createElement('h4')
      catTitle.className = 'text-white font-semibold text-sm mb-4 text-center'
      catTitle.textContent = category.label
      catDiv.appendChild(catTitle)
      
      // Defects Table
      const tableHTML = `
          <table class="w-full text-xs">
              <thead class="text-slate-400">
                  <tr>
                      <th class="py-2 px-2 text-left"></th>
                      <th class="py-2 px-2 text-left">Jenis NG</th>
                      <th class="py-2 px-2 text-right">Total_NG(B/H)</th>
                  </tr>
              </thead>
              <tbody>
                  ${category.defects.map((defect, idx) => `
                      <tr class="border-b border-slate-700/30">
                          <td class="py-2 px-2 text-slate-400">${idx}</td>
                          <td class="py-2 px-2 text-slate-300">${defect.name}</td>
                          <td class="py-2 px-2 text-slate-300 text-right">${defect.total.toFixed(2)}</td>
                      </tr>
                  `).join('')}
                  <tr class="bg-slate-700/30 font-bold">
                      <td class="py-2 px-2 text-white" colspan="2">TOTAL</td>
                      <td class="py-2 px-2 text-white text-right">${category.totalNG.toFixed(2)}</td>
                  </tr>
              </tbody>
          </table>
      `
      
      catDiv.innerHTML += tableHTML
      
      // Summary metrics
      const summaryDiv = document.createElement('div')
      summaryDiv.className = 'mt-4 space-y-1'
      summaryDiv.innerHTML = `
          <div class="text-center">
              <span class="text-orange-400 font-bold">Total Insp(B/H): ${category.totalInsp.toFixed(0)}</span>
          </div>
          <div class="text-center">
              <span class="text-orange-400 font-bold">Total NG%: ${category.ngPercent.toFixed(2)} %</span>
          </div>
      `
      catDiv.appendChild(summaryDiv)
      
      gridDiv.appendChild(catDiv)
  })
  
  mainDiv.appendChild(gridDiv)
  container.appendChild(mainDiv)
}

const renderTrialView = () => {
    const trialArea = document.getElementById('trialArea')
    if (!trialArea || !state.trialMetrics) return

    const { tableData, ngByPartTable, ngTypeChart, partPerformanceChart } = state.trialMetrics

    // Helper for formatting
    const fmtNum = (n) => n.toLocaleString('en-US')
    const fmtPct = (n) => n.toFixed(2) + '%'

    // 1. Main Trial Table HTML
    const mainTableRows = tableData.map(row => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
            <td class="py-3 px-4 text-slate-300">${row.partName}</td>
            <td class="py-3 px-4 text-slate-400">${row.custId || '-'}</td>
            <td class="py-3 px-4 text-slate-400">${row.line || '-'}</td>
            <td class="py-3 px-4 text-slate-400">${row.keterangan || '-'}</td>
            <td class="py-3 px-4 text-red-400 font-medium">${fmtPct(row.ngPercent)}</td>
            <td class="py-3 px-4 text-slate-400">${fmtNum(row.qtyInsp)}</td>
            <td class="py-3 px-4 text-slate-400">${fmtNum(row.qtyNg)}</td>
            <td class="py-3 px-4 text-green-400">${fmtNum(row.qtyOk)}</td>
        </tr>
    `).join('')

    const mainTableHTML = `
        <div id="trialTableContainer" class="glass-panel p-0 overflow-hidden flex flex-col mb-8">
            <div class="p-4 border-b border-glass-border bg-slate-800/50">
                <h3 class="text-white font-semibold text-lg">Tabel Data Trial</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left">
                    <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
                        <tr>
                            <th class="py-3 px-4 font-semibold">Part Name</th>
                            <th class="py-3 px-4 font-semibold">Cust. ID</th>
                            <th class="py-3 px-4 font-semibold">Line</th>
                            <th class="py-3 px-4 font-semibold">Keterangan</th>
                            <th class="py-3 px-4 font-semibold">NG (%)</th>
                            <th class="py-3 px-4 font-semibold">Qty Inspected (pcs)</th>
                            <th class="py-3 px-4 font-semibold">Qty NG (pcs)</th>
                            <th class="py-3 px-4 font-semibold">Qty OK (pcs)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${mainTableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `

    // 2. Rekap Trial Table HTML (NG by Part)
    const ngColumns = [
        'Warna', 'Buram', 'Berbayang', 'Kotor', 'Tdk Terplating', 'Rontok/ Blister',
        'Tipis/ EE No Plating', 'Flek Kuning', 'Terbakar', 'Watermark', 'Jig Mark/ Renggang',
        'Lecet/ Scratch', 'Seret', 'Flek Hitam', 'Flek Tangan', 'Belang/ Dempet',
        'Bintik', 'Kilap', 'Tebal', 'Flek Putih', 'Spark', 'Kotor H/ Oval',
        'Terkikis/ Crack', 'Dimensi/ Penyok'
    ]

    const rekapTableRows = ngByPartTable.map(row => `
        <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
            <td class="py-3 px-4 text-slate-300 font-medium sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10 border-r border-slate-700/50">${row.partName}</td>
            ${ngColumns.map(col => `<td class="py-3 px-4 text-slate-400 text-center">${row[col] > 0 ? row[col] : '-'}</td>`).join('')}
        </tr>
    `).join('')

    const rekapTableHTML = `
        <div id="trialRekapContainer" class="glass-panel p-0 overflow-hidden flex flex-col mb-8">
            <div class="p-4 border-b border-glass-border bg-slate-800/50">
                <h3 class="text-white font-semibold text-lg">Rekap Data Jenis NG (TRIAL) per Part Name</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left whitespace-nowrap">
                    <thead class="text-xs text-slate-400 uppercase bg-slate-800/30">
                        <tr>
                            <th class="py-3 px-4 font-semibold sticky left-0 bg-slate-900/90 backdrop-blur-sm z-10 border-r border-slate-700/50">Part Name</th>
                            ${ngColumns.map(col => `<th class="py-3 px-4 font-semibold text-center">${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rekapTableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `

    // 3. Charts HTML
    const chartsHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div id="trialDefectChartContainer" class="glass-panel p-6">
                <h3 class="text-white font-medium mb-4">Grafik Jenis NG (TRIAL) - Total Qty NG (pcs)</h3>
                <div class="h-96"><canvas id="trialNgTypeChart"></canvas></div>
            </div>
            <div id="trialChartContainer" class="glass-panel p-6">
                <h3 class="text-white font-medium mb-4">Grafik Qty OK &amp; Qty NG (pcs) per PartName</h3>
                <div class="h-96"><canvas id="trialPartChart"></canvas></div>
            </div>
        </div>
    `

    // Inject HTML
    trialArea.innerHTML = mainTableHTML + rekapTableHTML + chartsHTML
    trialArea.classList.remove('hidden')

    // Render Charts
    // Destroy existing charts if any
    if (state.charts.trialNgType) state.charts.trialNgType.destroy()
    if (state.charts.trialPart) state.charts.trialPart.destroy()

    const ctx1 = document.getElementById('trialNgTypeChart').getContext('2d')
    state.charts.trialNgType = new Chart(ctx1, {
        type: 'bar',
        indexAxis: 'y',
        data: ngTypeChart,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    color: '#fff',
                    formatter: (val) => val > 0 ? val : ''
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            }
        }
    })

    const ctx2 = document.getElementById('trialPartChart').getContext('2d')
    state.charts.trialPart = new Chart(ctx2, {
        type: 'bar',
        data: partPerformanceChart,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { color: '#94a3b8' } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { labels: { color: '#94a3b8' } },
                datalabels: {
                    color: '#fff',
                    formatter: (val) => val > 0 ? val : ''
                }
            }
        }
    })
}

// Initial Render
renderLogin()
