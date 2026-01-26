import "./style.css";
import { Chart } from "chart.js/auto";
import ChartDataLabels from "chartjs-plugin-datalabels";
import * as XLSX from "xlsx";
import { processExcelFile } from "./utils/dataProcessor";

// State Management
const state = {
	isLoggedIn: false,
	currentTab: "summary", // summary, trial, filter
	data: null,
	processedData: null,
	metrics: null,
	chartsData: null,
	summaryTables: null,
	fileMetadata: [],
	dateRange: { start: null, end: null },
	charts: {}, // Store chart instances
	trialData: null,
	selectedLine: "All Line", // Line filter for charts
};

// Register Chart.js plugins
Chart.register(ChartDataLabels);

// DOM Elements
const app = document.querySelector("#app");

// Helper to get week number
const getWeekNumber = (d) => {
	d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
	return weekNo;
};

// Login Component
const renderLogin = () => {
	app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <!-- Background Blobs -->
      <div class="absolute top-0 left-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div class="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div class="absolute -bottom-8 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div class="glass-panel p-8 max-w-md w-full space-y-8 relative z-10">
	  <img src="logokpd.svg" alt="LogoKPD" class="w-12 mx-auto mb-4" />
        <div class="text-center">
          <h1 class="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">QUALITY DASHBOARD</h1>
          <p class="text-slate-500 dark:text-slate-400 text-xs md:text-base">Quality Performance of Plating Line</p>
        </div>

        <form id="loginForm" class="space-y-6">
          <div class="space-y-2">
            <label for="username" class="text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
            <input type="text" id="username" class="input-field" placeholder="Enter username" required>
          </div>
          <div class="space-y-2">
            <label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input type="password" id="password" class="input-field" placeholder="Enter password" required>
          </div>
          <div id="loginError" class="text-red-500 dark:text-red-400 text-sm text-center hidden">Invalid username or password</div>
          <button type="submit" class="btn-primary w-full py-3">Sign In</button>
          <br>
          <br>
          <p class="text-center text-xs text-slate-400 dark:text-slate-500 mt-1">&copy;2025 e-WeYe | All rights reserved</p>
        </form>
      </div>
    </div>
  `;

	document.getElementById("loginForm").addEventListener("submit", async (e) => {
		e.preventDefault();
		const username = e.target.username.value;
		const password = e.target.password.value;
		const submitBtn = e.target.querySelector('button[type="submit"]');
		const errorDiv = document.getElementById("loginError");
		const originalBtnText = submitBtn.innerText;

		// UI Loading State
		submitBtn.disabled = true;
		submitBtn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>Sign In...';
		errorDiv.classList.add("hidden");

		try {
			// Mencoba login ke backend PHP
			// Pastikan file 'login.php' sudah di-upload ke folder yang sama dengan index.html di hosting
			const response = await fetch('login.php', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password }),
			});

			const contentType = response.headers.get("content-type");
			if (!contentType || !contentType.includes("application/json")) {
				// Jika response bukan JSON (misal 404 html atau text file content dari vite serve)
				throw new Error("Server response is not JSON. Are you running PHP?");
			}

			const result = await response.json();

			if (result.success) {
				state.isLoggedIn = true;
				// Optional: Simpan user data ke state
				state.currentUser = result.user;
				renderDashboard();
			} else {
				errorDiv.textContent = result.message || "Invalid username or password";
				errorDiv.classList.remove("hidden");
			}
		} catch (error) {
			// Handle Development Mode (Vite doesn't run PHP)
			if (
				(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
				(error.message.includes("not JSON") || error.message.includes("Unexpected token"))
			) {
				console.warn("Dev Mode: PHP backend not detected. Using Local Fallback.");

				// Fallback Login Logic
				if (username === "kpd" && password === "888kpd") {
					state.isLoggedIn = true;
					state.currentUser = { username: "kpd", role: "Developer" }; // Mock User
					renderDashboard();
					return;
				} else {
					errorDiv.innerHTML = `
						<span class='block font-bold'>Dev Mode Active</span>
						PHP file cannot run in Vite.<br>
						Use dev credentials: <b>kpd</b> / <b>888kpd</b><br>
						<span class='text-xs'>To test DB, deploy to server.</span>
					`;
					errorDiv.classList.remove("hidden");
				}
				return; // Stop execution here for dev fallback
			}

			// Real Error Handling
			console.error("Login Error:", error);
			errorDiv.textContent = "Connection Error. Please check your network or server configuration.";
			errorDiv.classList.remove("hidden");
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerHTML = originalBtnText; // Restore button text
		}
	});
};

// Dashboard Component
const renderDashboard = () => {
	app.innerHTML = `
    <div class="min-h-screen flex flex-col md:flex-row relative">
      <!-- Mobile Header & Burger -->
      <div class="md:hidden flex items-center justify-between p-4 glass-panel m-4 mb-0 sticky top-0 z-30">
        <div class="flex items-center space-x-2">
            <div class="w-8 h-8 flex items-center justify-center overflow-hidden">
                <img src="logokpd.svg" alt="Logo KPD" class="w-12" />
            </div>
            <span class="text-xs font-bold text-blue-400">PT. KARYAPRATAMA DUNIA</span>
            <!-- Mobile Theme Toggle -->
            <button class="themeToggleBtn p-1.5 rounded-lg text-slate-400 hover:text-blue-500 transition-all flex items-center justify-center">
                <svg class="themeSunIcon w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <svg class="themeMoonIcon w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
            </button>
        </div>
        <button id="burgerBtn" class="text-slate-800 dark:text-white p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
        </button>
      </div>

      <!-- Overlay -->
      <div id="sidebarOverlay" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 hidden transition-opacity duration-300 opacity-0"></div>

      <!-- Sidebar -->
      <aside id="sidebar" class="fixed md:static inset-y-0 left-0 z-50 w-64 glass-panel m-0 md:m-4 p-4 flex flex-col h-[100dvh] md:h-[calc(100vh-2rem)] transform -translate-x-full md:translate-x-0 transition-all duration-300 ease-in-out overflow-hidden">
        <div class="flex justify-between items-start mb-8 px-2" id="sidebarHeader">
            <div id="sidebarTitle">
			<div class="pb-4 border-b border-glass-border">
                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">Data Cleaner <span class="text-italic text-yellow-300">Pro</span></h1>
                <p class="text-xs text-slate-500 mt-1">Clean & Clear Your Data! <span class="text-xs text-slate-500 mt-1">Ver: 8.73</span></p>
			</div>
            </div>
            <div class="flex items-center space-x-2 flex-shrink-0" id="sidebarToggleGroup">
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
        
        <nav class="space-y-2 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent pr-2" id="sidebarContent">
        <button class="w-full flex justify-between items-center px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-medium transition-all mb-2 group ${
					state.processedData ? "" : "hidden"
				}" id="dashboardBtn">
            <span>Dashboard</span>
            <svg id="dashboardChevron" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <!-- Navigation Tabs -->
          <div class="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2 hidden" id="sidebarTabs">
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-metrics">Metrics</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-charts">Charts</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-summary">Summary Tables</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-category-chart">Grafik Kategori</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-category-table">Tabel Kategori</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-pareto">Pareto Charts</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-performa-stamping">Performa Stamping</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-rekap-horn">Rekap HORN-HDI</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-rekap">Rekap Leader</button>
          </div>
          
          <!-- Info Trial Menu -->
          <button class="w-full flex justify-between items-center px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-medium transition-all mb-2 mt-4 group ${
						state.processedData ? "" : "hidden"
					}" id="infoTrialBtn">
            <span>Info Trial</span>
            <svg id="infoTrialChevron" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <!-- Info Trial Tabs -->
          <div class="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2 hidden" id="infoTrialTabs">
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-rekap-trial">Rekap Trial</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-defect-type">Defect Type</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-chart-trial">Chart Trial</button>
          </div>
          
          <!-- Filtering Menu -->
          <button class="w-full flex justify-between items-center px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 font-medium transition-all mb-2 mt-4 group ${
						state.processedData ? "" : "hidden"
					}" id="filteringBtn">
            <span>Filtering</span>
            <svg id="filteringChevron" class="w-4 h-4 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          <!-- Filtering Tabs -->
          <div class="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-2 hidden" id="filteringTabs">
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-filter-partname">By PartName</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-filter-multi">Multi Filter</button>
            <button class="w-full text-left px-4 py-2 rounded-r-lg text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm" id="nav-filter-daily">For Periodical Chart</button>
          </div>
          
          <!-- Link Folder Section (in Sidebar) -->
          <div class="mt-4 px-2 ${
						state.processedData ? "hidden" : ""
					}" id="sidebarLinkSection">
            <div class="glass-panel p-3 border-l-2 border-yellow-500">
              <div class="flex items-start space-x-2">
                <div class="text-yellow-500 mt-0.5 flex-shrink-0">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                    Jika Anda belum mempunyai File, silahkan unduh di 
                    <a href="https://drive.google.com/drive/folders/1motad9bizxGZdiODetAo6K7_38dbXxxG?usp=sharing" target="_blank" class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 dark:hover:text-yellow-300 underline font-medium inline-flex items-center gap-1">
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/></svg>
                      Link Folder
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Upload Section (in Sidebar) -->
          <div class="mt-3 px-2 ${
						state.processedData ? "hidden" : ""
					}" id="sidebarUploadSection">
            <div class="glass-panel p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-500 transition-colors cursor-pointer text-center group" id="sidebarDropZone">
              <input type="file" id="sidebarFileInput" class="hidden" accept=".xlsx, .xls" multiple>
              <div class="mb-2">
                <div class="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto group-hover:bg-blue-600/20 transition-colors">
                  <svg class="w-5 h-5 text-slate-400 group-hover:text-blue-500 dark:group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                </div>
              </div>
              <h3 class="text-xs font-medium text-slate-800 dark:text-white mb-1">Upload Excel File</h3>
              <p class="text-slate-500 dark:text-slate-400 text-xs">Drag and drop or click</p>
              <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">Format: .xlsx, .xls</p>
              <div id="sidebarLoadingSpinner" class="hidden mt-2">
                <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                <p class="text-blue-500 dark:text-blue-400 text-xs mt-1">Processing...</p>
              </div>
            </div>
          </div>
          
          <!-- File List Section -->
          <div class="mt-4 px-2" id="fileListSection">
				<h3 class="text-xs font-semibold text-yellow-600 dark:text-yellow-500 tracking-wider mt-5">-------</h3>
            <h3 class="text-xs font-semibold text-yellow-600 dark:text-yellow-500 tracking-wider mb-3">File yang diupload:</h3>
            <div class="space-y-2" id="fileListContainer">
                ${
									state.fileMetadata.length > 0
										? state.fileMetadata
												.map(
													(file) => `
                    <div class="text-xs text-yellow-700 dark:text-yellow-200 truncate" title="${file.name}">
                        ${file.name}
                    </div>
                `
												)
												.join("")
										: '<div class="text-xs text-slate-400 dark:text-slate-500">Belum ada file</div>'
								}
            </div>
          </div>
        </nav>

        <div class="mt-auto px-2 pb-2" id="sidebarFooter">
          <div class="pt-4 border-t border-glass-border">
            ${
							state.processedData
								? `
            <button id="sidebarDownloadBtn" class="w-full flex items-center justify-center px-4 py-2 mb-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-lg shadow-green-900/20 group">
                <svg class="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                <span class="font-medium text-xs">Download Cleaned Data</span>
            </button>
            `
								: ""
						}
            
                <div class="mb-2 px-4 text-xs font-semibold text-blue-600 dark:text-blue-300 text-center">
                    [ ${state.currentUser?.username || 'User'} ]
                </div>
                <button id="logoutBtn" class="w-full flex items-center px-4 py-2 text-slate-500 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                <span class="mr-2">Log Out</span>
                </button>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">&copy;2025 e-WeYe | All rights reserved</p>
                
                <!-- Mobile Only Footer Image -->
                <div class="md:hidden flex justify-center w-full mt-4 mb-4">
                     <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-400 p-0.5 box-content"> 
                       <img src="photoku.png" alt="Imam W." class="w-full h-full object-cover rounded-full" />
                    </div>
                </div>
          </div>
        </div>

        <!-- Collapsed Sidebar Footer (Image) -->
        <div id="sidebarCollapsedFooter" class="hidden mt-auto mb-6 flex justify-center w-full">
            <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-slate-400 p-0.5 box-content"> 
               <img src="photoku.png" alt="Imam W." class="w-full h-full object-cover rounded-full" />
            </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-4 md:p-6 overflow-y-auto h-screen pt-4 md:pt-6">
        <!-- Header -->
        <header class="flex justify-between items-center mb-8 hidden md:flex">
          <div>
            <h2 class="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">Quality Dashboard</h2>
            <div class="flex items-center space-x-4 mt-1">
                <p class="text-slate-500 dark:text-slate-400 text-xl">Quality Performance of Plating Line</p>
            </div>
          </div>
          <div class="flex items-center space-x-3">
             <!-- Desktop Theme Toggle -->
             <button class="themeToggleBtn p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center">
                <svg class="themeSunIcon w-6 h-6 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                <svg class="themeMoonIcon w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
                </svg>
             </button>
             <span class="text-sm font-bold text-blue-600 dark:text-blue-400">PT. KARYAPRATAMA DUNIA</span>
             <div class="w-10 h-10 flex items-center justify-center overflow-hidden">
                <img src="logokpd.svg" alt="Logo KPD" class="w-12" />
             </div>
          </div>
        </header>

        <!-- Mobile Header Title (Only visible on mobile) -->
         <div class="mb-6 md:hidden">
            <h2 class="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">Quality Dashboard</h2>
            <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 text-center">Quality Performance of Plating Line</p>
         </div>

        <!-- Waiting Message -->
        <div id="waitingMessage" class="mb-8 ${
					state.processedData ? "hidden" : ""
				}">
          <div class="glass-panel p-8 text-center">
            <div class="text-slate-500 dark:text-slate-400 text-lg">
              <svg class="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <p class="font-medium">Menunggu File diunggah...</p>
            </div>
          </div>
        </div>

        <!-- Dashboard Content -->
        <div id="dashboardContent" class="${
					state.processedData ? "" : "hidden"
				} space-y-6">
          
          <!-- Success Modal (Hidden by default) -->
          <div id="successModal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div class="bg-white dark:bg-slate-800 border border-green-500/50 rounded-xl p-6 shadow-2xl transform transition-all scale-100 relative z-10 max-w-md w-full text-center">
                <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Upload Berhasil!</h3>
                <p class="text-slate-600 dark:text-slate-300">Tunggu...</p>
                <p class="text-slate-600 dark:text-slate-300">File sedang diproses Cleaning...</p>
            </div>
          </div>
          
          <!-- Date Range Info -->
          <div class="text-slate-800 dark:text-white text-sm">
             Dari data original yang di-upload berisi data dari periode Tanggal: <span class="font-bold text-blue-600 dark:text-blue-400">${
								state.dateRange.start || "-"
							}</span> sampai Tanggal : <span class="font-bold text-blue-600 dark:text-blue-400">${
		state.dateRange.end || "-"
	}</span>
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
          
          <!-- Line Monthly Charts Area (Qty Inspected vs NG Ratio by Line) -->
          <div id="lineMonthlyChartsArea" class="mt-6">
            <!-- Charts will be dynamically injected here -->
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
          
          <!-- Download Section -->
           <div class="flex justify-end mt-8">
            <!-- Charts will be injected here -->
          </div>

          <!-- Summary Tables Area -->
          <div id="summaryTablesArea" class="mt-6">
            <!-- Tables will be injected here -->
          </div>
          
          <!-- Category Trend Chart Area -->
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
          
        </div>

        <!-- Info Trial Content -->
        <div id="infoTrialContent" class="hidden space-y-6">
           <!-- Content will be dynamically generated by renderInfoTrial -->
        </div>

        <!-- Filtering Content -->
        <div id="filteringContent" class="hidden space-y-6">
           <!-- Content will be dynamically generated by renderFiltering -->
        </div>
      </main>
    </div>
  `;

	// Event Listeners
	document.getElementById("logoutBtn").addEventListener("click", () => {
		state.isLoggedIn = false;
		state.data = null;
		state.processedData = null;
		renderLogin();
	});

	// Sidebar Toggle Logic
	const sidebar = document.getElementById("sidebar");
	const overlay = document.getElementById("sidebarOverlay");
	const burgerBtn = document.getElementById("burgerBtn");
	const closeSidebarBtn = document.getElementById("closeSidebarBtn");

	const toggleSidebar = () => {
		const isClosed = sidebar.classList.contains("-translate-x-full");
		if (isClosed) {
			sidebar.classList.remove("-translate-x-full");
			overlay.classList.remove("hidden");
			// Small delay to allow display:block to apply before opacity transition
			setTimeout(() => overlay.classList.remove("opacity-0"), 10);
		} else {
			sidebar.classList.add("-translate-x-full");
			overlay.classList.add("opacity-0");
			setTimeout(() => overlay.classList.add("hidden"), 300);
		}
	};

	burgerBtn?.addEventListener("click", toggleSidebar);
	closeSidebarBtn?.addEventListener("click", toggleSidebar);
	overlay?.addEventListener("click", toggleSidebar);

	// Desktop Sidebar Toggle
	const desktopToggleBtn = document.getElementById("desktopToggleSidebar");
	const sidebarContent = document.getElementById("sidebarContent");
	const sidebarTitle = document.getElementById("sidebarTitle");
	const sidebarFooter = document.getElementById("sidebarFooter");
	const toggleIcon = document.getElementById("toggleIcon");
	const sidebarHeader = document.getElementById("sidebarHeader");
	const sidebarToggleGroup = document.getElementById("sidebarToggleGroup");
	const sidebarCollapsedFooter = document.getElementById("sidebarCollapsedFooter");

	desktopToggleBtn?.addEventListener("click", () => {
		const isCollapsed = sidebar.classList.contains("!w-16");

		if (isCollapsed) {
			// Expand sidebar
			sidebar.classList.remove("!w-16", "items-center"); // Remove items-center if added
			sidebar.classList.add("!w-64");
			// Restore padding
			sidebar.classList.replace("p-2", "p-4");

			sidebarContent?.classList.remove("hidden");
			sidebarTitle?.classList.remove("hidden");
			sidebarFooter?.classList.remove("hidden");
			sidebarCollapsedFooter?.classList.add("hidden");

			// Restore Header Layout - ensure we revert to original row layout
			sidebarHeader?.classList.remove("flex-col", "justify-center", "mb-4");
			sidebarHeader?.classList.add("justify-between", "mb-8");

			// Restore Toggle Group Layout
			sidebarToggleGroup?.classList.remove("flex-col", "space-y-6");
			sidebarToggleGroup?.classList.add("space-x-2");

			// Change icon to left arrow (collapse)
			toggleIcon.innerHTML =
				'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>';
		} else {
			// Collapse sidebar
			sidebar.classList.remove("!w-64");
			sidebar.classList.add("!w-16", "items-center"); // Add items-center to center content in narrow sidebar
			// Reduce padding to give more space
			sidebar.classList.replace("p-4", "p-2");

			sidebarContent?.classList.add("hidden");
			sidebarTitle?.classList.add("hidden");
			sidebarFooter?.classList.add("hidden");
			sidebarCollapsedFooter?.classList.remove("hidden");

			// Modify Header Layout for vertical stacking
			sidebarHeader?.classList.remove("justify-between", "mb-8");
			sidebarHeader?.classList.add("flex-col", "justify-center", "mb-4");

			// Modify Toggle Group for vertical stacking
			sidebarToggleGroup?.classList.remove("space-x-2");
			sidebarToggleGroup?.classList.add("flex-col", "space-y-6");

			// Change icon to right arrow (expand)
			toggleIcon.innerHTML =
				'<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>';
		}
	});

	// Navigation Logic
	const switchView = (viewName) => {
		const dashboardContent = document.getElementById("dashboardContent");
		const infoTrialContent = document.getElementById("infoTrialContent");
		const filteringContent = document.getElementById("filteringContent");

		if (viewName === "dashboard") {
			dashboardContent?.classList.remove("hidden");
			infoTrialContent?.classList.add("hidden");
			filteringContent?.classList.add("hidden");
		} else if (viewName === "info-trial") {
			dashboardContent?.classList.add("hidden");
			infoTrialContent?.classList.remove("hidden");
			filteringContent?.classList.add("hidden");
		} else if (viewName === "filtering") {
			dashboardContent?.classList.add("hidden");
			infoTrialContent?.classList.add("hidden");
			filteringContent?.classList.remove("hidden");
		}
	};

	const scrollToSection = (id, view = "dashboard") => {
		switchView(view);
		// Small delay to allow display:block to apply
		setTimeout(() => {
			const element = document.getElementById(id);
			if (element) {
				element.scrollIntoView({ behavior: "smooth", block: "start" });
				// On mobile, close sidebar after click
				if (window.innerWidth < 768) toggleSidebar();
			}
		}, 50);
	};

	document.getElementById("dashboardBtn")?.addEventListener("click", () => {
		const sidebarTabs = document.getElementById("sidebarTabs");
		const dashboardChevron = document.getElementById("dashboardChevron");

		sidebarTabs?.classList.toggle("hidden");
		dashboardChevron?.classList.toggle("rotate-180");

		// Also switch to dashboard view if clicked
		switchView("dashboard");
	});

	document.getElementById("infoTrialBtn")?.addEventListener("click", () => {
		const infoTrialTabs = document.getElementById("infoTrialTabs");
		const infoTrialChevron = document.getElementById("infoTrialChevron");

		infoTrialTabs?.classList.toggle("hidden");
		infoTrialChevron?.classList.toggle("rotate-180");

		// Switch to info trial view and scroll to top
		switchView("info-trial");
		// Small delay to allow view switch, then scroll to top
		setTimeout(() => {
			const infoTrialContent = document.getElementById("infoTrialContent");
			if (infoTrialContent) {
				infoTrialContent.scrollIntoView({ behavior: "smooth", block: "start" });
			}
			// On mobile, close sidebar after click
			if (window.innerWidth < 768) toggleSidebar();
		}, 100);
	});

	document.getElementById("filteringBtn")?.addEventListener("click", () => {
		const filteringTabs = document.getElementById("filteringTabs");
		const filteringChevron = document.getElementById("filteringChevron");

		filteringTabs?.classList.toggle("hidden");
		filteringChevron?.classList.toggle("rotate-180");

		// Switch to filtering view if clicked
		switchView("filtering");
	});

	// Dashboard Sub-menus
	document
		.getElementById("nav-metrics")
		?.addEventListener("click", () =>
			scrollToSection("metricsGrid", "dashboard")
		);
	document
		.getElementById("nav-charts")
		?.addEventListener("click", () =>
			scrollToSection("chartsArea", "dashboard")
		);
	document
		.getElementById("nav-summary")
		?.addEventListener("click", () =>
			scrollToSection("summaryTablesArea", "dashboard")
		);
	document
		.getElementById("nav-category-chart")
		?.addEventListener("click", () =>
			scrollToSection("categoryChartArea", "dashboard")
		);
	document
		.getElementById("nav-category-table")
		?.addEventListener("click", () =>
			scrollToSection("categoryTableArea", "dashboard")
		);
	document
		.getElementById("nav-pareto")
		?.addEventListener("click", () =>
			scrollToSection("paretoChartArea", "dashboard")
		);
	document
		.getElementById("nav-performa-stamping")
		?.addEventListener("click", () =>
			scrollToSection("mcNoChartArea", "dashboard")
		);
	document
		.getElementById("nav-rekap-horn")
		?.addEventListener("click", () =>
			scrollToSection("housingHornArea", "dashboard")
		);
	document
		.getElementById("nav-rekap")
		?.addEventListener("click", () =>
			scrollToSection("rekapArea", "dashboard")
		);

	// Info Trial Sub-menus
	document
		.getElementById("nav-rekap-trial")
		?.addEventListener("click", () =>
			scrollToSection("trialRekapSection", "info-trial")
		);
	document
		.getElementById("nav-defect-type")
		?.addEventListener("click", () =>
			scrollToSection("trialDefectRekapSection", "info-trial")
		);
	document
		.getElementById("nav-chart-trial")
		?.addEventListener("click", () =>
			scrollToSection("trialChartsSection", "info-trial")
		);

	// Filtering Sub-menus
	document
		.getElementById("nav-filter-partname")
		?.addEventListener("click", () => {
			switchView("filtering");
			// Small delay to ensure the view has switched before clicking the tab
			setTimeout(() => {
				const filterTab1 = document.getElementById("filterTab1");
				filterTab1?.click(); // Activate PartName tab
				// On mobile, close sidebar after click
				if (window.innerWidth < 768) toggleSidebar();
			}, 100);
		});
	document.getElementById("nav-filter-multi")?.addEventListener("click", () => {
		switchView("filtering");
		// Small delay to ensure the view has switched before clicking the tab
		setTimeout(() => {
			const filterTab2 = document.getElementById("filterTab2");
			filterTab2?.click(); // Activate Multi Filter tab
			// On mobile, close sidebar after click
			if (window.innerWidth < 768) toggleSidebar();
		}, 100);
	});
	document.getElementById("nav-filter-daily")?.addEventListener("click", () => {
		switchView("filtering");
		// Small delay to ensure the view has switched before clicking the tab
		setTimeout(() => {
			const filterTab3 = document.getElementById("filterTab3");
			filterTab3?.click(); // Activate Daily Chart tab
			// On mobile, close sidebar after click
			if (window.innerWidth < 768) toggleSidebar();
		}, 100);
	});

	// Sidebar Upload Section Event Listeners
	const sidebarDropZone = document.getElementById("sidebarDropZone");
	const sidebarFileInput = document.getElementById("sidebarFileInput");

	sidebarDropZone?.addEventListener("click", () => sidebarFileInput.click());

	sidebarDropZone?.addEventListener("dragover", (e) => {
		e.preventDefault();
		sidebarDropZone.classList.add("border-blue-500", "bg-blue-600/5");
	});

	sidebarDropZone?.addEventListener("dragleave", () => {
		sidebarDropZone.classList.remove("border-blue-500", "bg-blue-600/5");
	});

	sidebarDropZone?.addEventListener("drop", (e) => {
		e.preventDefault();
		sidebarDropZone.classList.remove("border-blue-500", "bg-blue-600/5");
		const files = e.dataTransfer.files;
		if (files.length) handleFileUpload(files);
	});

	sidebarFileInput?.addEventListener("change", (e) => {
		if (e.target.files.length) handleFileUpload(e.target.files);
	});

	document
		.getElementById("sidebarDownloadBtn")
		?.addEventListener("click", () => downloadCleanedData("csv"));

	// Theme Toggle Logic
	const themeToggleBtns = document.querySelectorAll(".themeToggleBtn");
	const themeSunIcons = document.querySelectorAll(".themeSunIcon");
	const themeMoonIcons = document.querySelectorAll(".themeMoonIcon");

	// Check initial theme
	const savedTheme = localStorage.getItem("theme");
	const isDark =
		savedTheme === "dark" ||
		(!savedTheme && document.documentElement.classList.contains("dark"));

	const updateThemeUI = (dark) => {
		if (dark) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
			themeSunIcons.forEach(icon => icon.classList.remove("hidden"));
			themeMoonIcons.forEach(icon => icon.classList.add("hidden"));
			// Chart colors global override
			Chart.defaults.color = "#94a3b8"; // Slate 400
			Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)";
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
			themeSunIcons.forEach(icon => icon.classList.add("hidden"));
			themeMoonIcons.forEach(icon => icon.classList.remove("hidden"));
			// Chart colors global override for light mode
			Chart.defaults.color = "#475569"; // Slate 600
			Chart.defaults.borderColor = "rgba(0, 0, 0, 0.1)";
		}

		const textColor = dark ? "#94a3b8" : "#475569";
		const gridColor = dark ? "#334155" : "rgba(0, 0, 0, 0.1)";
		const titleColor = dark ? "#ffffff" : "#1e293b";

		// Update charts if they exist
		Object.values(state.charts).forEach((chart) => {
			if (chart) {
				// Update all axes
				if (chart.options.scales) {
					Object.keys(chart.options.scales).forEach((scaleId) => {
						const scale = chart.options.scales[scaleId];
						if (scale.ticks) scale.ticks.color = textColor;
						if (scale.grid) scale.grid.color = gridColor;
						// Update axis title color specifically
						if (scale.title) {
							if (scaleId === "y1") {
								scale.title.color = "#ef4444"; // Always Red for Ratio
							} else if (scaleId === "y") {
								scale.title.color = "#0d9488"; // Always Teal for Quantity
							} else {
								scale.title.color = textColor;
							}
						}
					});
				}

				// Update Chart Title plugin
				if (chart.options.plugins && chart.options.plugins.title) {
					chart.options.plugins.title.color = titleColor;
				}

				// Update Legend
				if (
					chart.options.plugins.legend &&
					chart.options.plugins.legend.labels
				) {
					chart.options.plugins.legend.labels.color = textColor;
				}

				// Update Datalabels
				if (chart.options.plugins.datalabels) {
					// Check if color is a function (e.g. for mixed charts)
					if (typeof chart.options.plugins.datalabels.color !== "function") {
						chart.options.plugins.datalabels.color = dark ? "#ffffff" : "#1e293b";
					}
				}

				chart.update("none");
			}
		});
	};

	// Initialize
	updateThemeUI(isDark);

	themeToggleBtns.forEach(btn => {
		btn.addEventListener("click", () => {
			const isCurrentlyDark = document.documentElement.classList.contains("dark");
			updateThemeUI(!isCurrentlyDark);
		});
	});
};

const handleFileUpload = async (files) => {
	const loadingSpinner = document.getElementById("sidebarLoadingSpinner");
	loadingSpinner?.classList.remove("hidden");

	try {
		const result = await processExcelFile(files);

		if (!result.cleanedData || result.cleanedData.length === 0) {
			throw new Error(
				"No valid data found in the Excel file. Please check column headers."
			);
		}

		state.processedData = result.cleanedData;
		state.metrics = result.metrics;
		state.chartsData = result.chartsData;
		state.summaryTables = result.summaryTables;
		state.fileMetadata = result.fileMetadata;
		state.dateRange = result.dateRange;
		state.trialData = result.trialData;

		renderDashboard();
		renderMetrics();
		renderHousingHorn();
		renderCharts();
		renderSummaryTables();
		renderLineMonthlyCharts();
		renderParetoCharts();
		renderParetoCustCharts();
		renderParetoPartCharts();
		renderMcNoChart();
		renderRekap();
		renderInfoTrial();
		renderFiltering();

		// Show Success Modal
		const modal = document.getElementById("successModal");
		if (modal) {
			modal.classList.remove("hidden");
			setTimeout(() => {
				modal.classList.add("hidden");
			}, 3000);
		}
	} catch (error) {
		console.error("Error processing file:", error);
		alert(`Error processing file: ${error.message || "Unknown error"}`);
		loadingSpinner?.classList.add("hidden");
	}
};

const renderMetrics = () => {
	const metricsGrid = document.getElementById("metricsGrid");
	const { totalInsp, totalOK, totalNG, ngPercent } = state.metrics;

	const createMetricCard = (title, value, color) => `
    <div class="glass-panel p-6">
      <h3 class="text-slate-500 dark:text-slate-400 text-sm font-medium mb-2">${title}</h3>
      <p class="text-3xl font-bold ${color}">${value}</p>
    </div>
  `;

	metricsGrid.innerHTML = `
    ${createMetricCard(
			"Total Inspected (Lot)",
			totalInsp.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}),
			"text-slate-800 dark:text-white"
		)}
    ${createMetricCard(
			"Total OK (Lot)",
			totalOK.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}),
			"text-green-600 dark:text-green-400"
		)}
    ${createMetricCard(
			"Total NG (Lot)",
			totalNG.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}),
			"text-red-600 dark:text-red-400"
		)}
    ${createMetricCard(
			"Total NG (%)",
			ngPercent.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + "%",
			"text-red-600 dark:text-red-400"
		)}
  `;
};

const renderCharts = () => {
	const chartsArea = document.getElementById("chartsArea");
	chartsArea.innerHTML = `
    <div class="glass-panel p-6 col-span-1 lg:col-span-2">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-slate-800 dark:text-white font-medium">NG% & Qty Inspected by Month</h3>
        <div class="flex items-center space-x-2">
          <label class="text-slate-600 dark:text-slate-300 text-sm">Filter by Line:</label>
          <select id="lineFilter" class="bg-white dark:bg-slate-700 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:outline-none text-sm">
            <option value="All Line" ${
							state.selectedLine === "All Line" ? "selected" : ""
						}>All Line</option>
            <option value="Barrel 4" ${
							state.selectedLine === "Barrel 4" ? "selected" : ""
						}>Barrel 4</option>
            <option value="Rack 1" ${
							state.selectedLine === "Rack 1" ? "selected" : ""
						}>Rack 1</option>
            <option value="Nickel" ${
							state.selectedLine === "Nickel" ? "selected" : ""
						}>Nickel</option>
          </select>
        </div>
      </div>
      <div class="h-80"><canvas id="monthlyTrendChart"></canvas></div>
    </div>
    <div class="glass-panel p-6">
      <h3 class="text-slate-800 dark:text-white font-medium mb-4">Portion Qty Inspected by Customer</h3>
      <div class="h-64"><canvas id="customerPieChart"></canvas></div>
    </div>
    <div class="glass-panel p-6">
      <h3 class="text-slate-800 dark:text-white font-medium mb-4">Portion Qty Inspected by Line</h3>
      <div class="h-64"><canvas id="linePieChart"></canvas></div>
    </div>
  `;

	// Destroy existing charts if any
	Object.values(state.charts).forEach((chart) => chart.destroy());

	// Monthly Trend Chart
	const ctx1 = document.getElementById("monthlyTrendChart").getContext("2d");
	state.charts.monthly = new Chart(ctx1, {
		data: state.chartsData.monthlyTrend,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: { mode: "index", intersect: false },
			plugins: {
				legend: {
					labels: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
				datalabels: {
					anchor: "end",
					align: "top",
					color: document.documentElement.classList.contains("dark")
						? "#fff"
						: "#1e293b",
					font: { weight: "bold", size: 10 },
					formatter: (value) => {
						return typeof value === "number" ? value.toFixed(2) : value;
					},
				},
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					grid: {
						color: document.documentElement.classList.contains("dark")
							? "#334155"
							: "rgba(0, 0, 0, 0.1)",
					},
					ticks: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					grid: { drawOnChartArea: false },
					ticks: { color: "#ef4444" },
				},
				x: {
					grid: { display: false },
					ticks: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
			},
		},
	});

	// Customer Pie Chart
	const ctx2 = document.getElementById("customerPieChart").getContext("2d");
	state.charts.customer = new Chart(ctx2, {
		type: "pie",
		data: state.chartsData.customerPie,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "right",
					labels: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
				datalabels: {
					color: document.documentElement.classList.contains("dark")
						? "#fff"
						: "#1e293b",
					font: { weight: "bold" },
					formatter: (value, ctx) => {
						let sum = 0;
						let dataArr = ctx.chart.data.datasets[0].data;
						dataArr.map((data) => {
							sum += data;
						});
						let percentage = ((value * 100) / sum).toFixed(1) + "%";
						return percentage;
					},
				},
			},
		},
	});

	// Line Pie Chart
	const ctx3 = document.getElementById("linePieChart").getContext("2d");
	state.charts.line = new Chart(ctx3, {
		type: "pie",
		data: state.chartsData.linePie,
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					position: "right",
					labels: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
				datalabels: {
					color: document.documentElement.classList.contains("dark")
						? "#fff"
						: "#1e293b",
					font: { weight: "bold" },
					formatter: (value, ctx) => {
						let sum = 0;
						let dataArr = ctx.chart.data.datasets[0].data;
						dataArr.map((data) => {
							sum += data;
						});
						let percentage = ((value * 100) / sum).toFixed(1) + "%";
						return percentage;
					},
				},
			},
		},
	});

	// Category Trend Chart
	const categoryChartContainer = document.getElementById("categoryChartArea");
	if (categoryChartContainer) {
		categoryChartContainer.innerHTML = `
        <div class="glass-panel p-6">
            <h3 class="text-slate-800 dark:text-white font-medium mb-4">Grafik NG% & Qty Inspected by Kategori</h3>
            <div class="h-80"><canvas id="categoryTrendChart"></canvas></div>
        </div>
      `;

		const ctx4 = document.getElementById("categoryTrendChart").getContext("2d");
		state.charts.category = new Chart(ctx4, {
			data: state.chartsData.categoryTrend,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: "index", intersect: false },
				plugins: {
					legend: {
						labels: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					datalabels: {
						anchor: "end",
						align: "top",
						color: (context) => {
							const isDark =
								document.documentElement.classList.contains("dark");
							return context.dataset.type === "line"
								? "#ef4444"
								: isDark
								? "#fff"
								: "#1e293b";
						},
						font: { weight: "bold", size: 10 },
						formatter: (value) => {
							return typeof value === "number" ? value.toFixed(2) : value;
						},
					},
				},
				scales: {
					y: {
						type: "linear",
						display: true,
						position: "left",
						title: {
							display: true,
							text: "Qty Inspected (lot)",
							color: "#0d9488",
						},
						grid: {
							color: document.documentElement.classList.contains("dark")
								? "rgba(255, 255, 255, 0.1)"
								: "rgba(0, 0, 0, 0.1)",
						},
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					y1: {
						type: "linear",
						display: true,
						position: "right",
						title: {
							display: true,
							text: "NG (%)",
							color: "#ef4444",
						},
						grid: { drawOnChartArea: false },
						ticks: { color: "#ef4444" },
					},
					x: {
						title: {
							display: true,
							text: "Kategori",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
						},
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
				},
			},
		});
	}

	// Add event listener for line filter
	const lineFilterSelect = document.getElementById("lineFilter");
	if (lineFilterSelect) {
		lineFilterSelect.addEventListener("change", (e) => {
			state.selectedLine = e.target.value;
			updateChartsWithLineFilter();
		});
	}
};

const updateChartsWithLineFilter = () => {
	// Filter data based on selected line
	let filteredData = state.processedData.filter((r) => !r.isTrial && r.Kategori !== 'kosong');

	if (state.selectedLine !== "All Line") {
		filteredData = filteredData.filter((r) => r["Line"] === state.selectedLine);
	}

	// 1. Update Monthly Trend Chart
	const monthlyData = {};
	filteredData.forEach((row) => {
		const key = row["MonthYear"];
		if (key === "Unknown") return;

		if (!monthlyData[key]) {
			monthlyData[key] = {
				insp: 0,
				ng: 0,
				sumNGPercent: 0,
				count: 0,
				date: row["DateObj"],
			};
		}
		monthlyData[key].insp += row["Insp(Lot)"];
		monthlyData[key].ng += row["NG(Lot)"];

		if (row["NG_%"] !== undefined && row["NG_%"] !== null) {
			monthlyData[key].sumNGPercent += Number(row["NG_%"]);
			monthlyData[key].count += 1;
		}
	});

	const sortedMonths = Object.keys(monthlyData).sort(
		(a, b) => monthlyData[a].date - monthlyData[b].date
	);

	// Update monthly chart data
	state.charts.monthly.data.labels = sortedMonths;
	state.charts.monthly.data.datasets[0].data = sortedMonths.map(
		(m) => monthlyData[m].insp
	);
	state.charts.monthly.data.datasets[1].data = sortedMonths.map((m) =>
		monthlyData[m].count > 0
			? monthlyData[m].sumNGPercent / monthlyData[m].count
			: 0
	);
	state.charts.monthly.update();

	// 2. Update Customer Pie Chart
	const customerData = {};
	filteredData.forEach((row) => {
		const key = row["Cust.ID"];
		if (!customerData[key]) customerData[key] = 0;
		customerData[key] += row["Insp(Lot)"];
	});

	state.charts.customer.data.labels = Object.keys(customerData);
	state.charts.customer.data.datasets[0].data = Object.values(customerData);
	state.charts.customer.update();

	// 3. Update Line Pie Chart
	const lineData = {};
	filteredData.forEach((row) => {
		const key = row["Line"];
		if (!lineData[key]) lineData[key] = 0;
		lineData[key] += row["Insp(Lot)"];
	});

	state.charts.line.data.labels = Object.keys(lineData);
	state.charts.line.data.datasets[0].data = Object.values(lineData);
	state.charts.line.update();
};

const downloadCleanedData = (type = "xlsx") => {
	if (!state.processedData || state.processedData.length === 0) {
		alert("No data available to download");
		return;
	}

	const exportColumns = [
		"Line", "Date", "Shift", "NoJig", "M/C No.", "NoCard", "Std Load",
		"NoBarrelHanger", "NoBak", "Cust.ID", "Part.ID", "PartName",
		"OK(pcs)", "Qty(NG)", "QInspec", "Insp(B/H)", "OK(B/H)", "NG(B/H)",
		"% NG", "NG_%", "Warna", "Buram", "Berbayang", "Kotor", "Tdk Terplating",
		"Rontok/ Blister", "Tipis/ EE No Plating", "Flek Kuning", "Terbakar",
		"Watermark", "Jig Mark/ Renggang", "Lecet/ Scratch", "Seret", "Flek Hitam",
		"Flek Tangan", "Belang/ Dempet", "Bintik", "Kilap", "Tebal", "Flek Putih",
		"Spark", "Kotor H/ Oval", "Terkikis/ Crack", "Dimensi/ Penyok",
		"MTL/ SLipMelintir", "Kategori",
	];

	const nonTrialData = state.processedData.filter(row => !row.isTrial);

	if (nonTrialData.length === 0) {
		alert("No non-trial data available to download");
		return;
	}

	const formatDateExtended = (date) => {
		if (!date || isNaN(new Date(date).getTime())) return "";
		const d = new Date(date);
		const pad = (n) => n.toString().padStart(2, "0");
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
			d.getHours()
		)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	};

	const mappedData = nonTrialData.map((row) => {
		const newRow = {};
		exportColumns.forEach((header) => {
			if (header === "NoBarrelHanger") {
				newRow[header] = String(row["NoBH_NoLotMTL"] || "");
			} else if (header === "% NG") {
				newRow[header] = row["NG_%"] || 0;
			} else if (header === "Date") {
				newRow[header] = formatDateExtended(row["DateObj"] || row["Date"]);
			} else if (["M/C No.", "NoCard", "NoBak"].includes(header)) {
				newRow[header] = row[header] !== undefined ? String(row[header]) : "";
			} else {
				newRow[header] = row[header] !== undefined ? row[header] : "";
			}
		});
		return newRow;
	});

	const ws = XLSX.utils.json_to_sheet(mappedData, { header: exportColumns });

	// Force types and formats for specific columns
	const range = XLSX.utils.decode_range(ws["!ref"]);
	for (let R = range.s.r + 1; R <= range.e.r; ++R) {
		exportColumns.forEach((header, C) => {
			const address = XLSX.utils.encode_cell({ r: R, c: C });
			if (!ws[address]) return;

			if (["M/C No.", "NoCard", "NoBarrelHanger", "NoBak", "Date"].includes(header)) {
				ws[address].t = "s"; // Force as String
			}
		});
	}

	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, "Cleaned Data");

	const timestamp = new Date().toISOString().split("T")[0];
	// Export as XLSX to ensure Excel respects types and formatting
	XLSX.writeFile(wb, `File_after_Cleaning_CleanerPro_${timestamp}.xlsx`);
};

const createSummaryTableHTML = (title, tableData, metricKey, formatFn) => {
	const { rows, grandTotal } = tableData;
	const headers = ["Date/Shift", "B4", "Ni", "R1", "Total"];

	const tableRows = rows
		.map((row) => {
			const b4 = row.lines["Barrel 4"][metricKey];
			const ni = row.lines["Nickel"][metricKey];
			const r1 = row.lines["Rack 1"][metricKey];
			const tot = row.total[metricKey];

			return `
          <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
              <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">${
								row.name
							}</td>
              <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
								b4
							)}</td>
              <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
								ni
							)}</td>
              <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
								r1
							)}</td>
              <td class="py-3 px-4 text-xs text-slate-900 dark:text-white font-bold">${formatFn(
								tot
							)}</td>
          </tr>
      `;
		})
		.join("");

	const gtB4 = grandTotal.lines["Barrel 4"][metricKey];
	const gtNi = grandTotal.lines["Nickel"][metricKey];
	const gtR1 = grandTotal.lines["Rack 1"][metricKey];
	const gtTot = grandTotal.total[metricKey];

	const footerRow = `
      <tr class="bg-blue-50 dark:bg-slate-700/30 font-bold">
          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">Total</td>
          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
						gtB4
					)}</td>
          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
						gtNi
					)}</td>
          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
						gtR1
					)}</td>
          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
						gtTot
					)}</td>
      </tr>
  `;

	return `
      <div class="glass-panel p-0 overflow-hidden flex flex-col">
          <div class="p-4 border-b border-glass-border bg-blue-100 dark:bg-slate-800/50">
              <h3 class="text-slate-800 dark:text-white font-semibold text-sm">${title}</h3>
          </div>
          <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                  <thead class="text-xs text-slate-600 dark:text-slate-400 uppercase bg-slate-200 dark:bg-slate-800/30">
                      <tr>
                          ${headers
														.map(
															(h) =>
																`<th class="py-3 px-4 font-semibold">${h}</th>`
														)
														.join("")}
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
  `;
};

const renderLineMonthlyCharts = () => {
	const container = document.getElementById("lineMonthlyChartsArea");
	if (!container || !state.summaryTables || !state.summaryTables.byMonth)
		return;

	const { rows } = state.summaryTables.byMonth;

	// Prepare data for each line
	const labels = rows.map((row) => row.name); // Month-Year labels
	const lines = ["Barrel 4", "Rack 1", "Nickel"];

	// Create title section with description
	const titleHTML = `
    <div class="mb-6">
      <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Grafik Qty Inspected (lot) Vs NG Ratio (%) by Month-Year</h2>
      <p class="text-slate-600 dark:text-slate-400 text-sm">Comparison of Quantity Inspected and NG Ratio for each production line</p>
    </div>
  `;

	// Create grid container
	const gridHTML = `
    ${titleHTML}
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      ${lines
				.map(
					(line) => `
        <div class="glass-panel p-6">
          <h3 class="text-slate-900 dark:text-white font-medium mb-4 text-center">Line ${line}</h3>
          <div class="h-80">
            <canvas id="lineMonthlyChart-${line.replace(/\s+/g, "-")}"></canvas>
          </div>
        </div>
      `
				)
				.join("")}
    </div>
  `;

	container.innerHTML = gridHTML;

	// Render each chart
	lines.forEach((line) => {
		const canvasId = `lineMonthlyChart-${line.replace(/\s+/g, "-")}`;
		const ctx = document.getElementById(canvasId)?.getContext("2d");
		if (!ctx) return;

		// Extract data for this line
		const qtyInspected = rows.map((row) => row.lines[line]?.insp || 0);
		const ngRatio = rows.map((row) => row.lines[line]?.ngPercent || 0);

		// Calculate max values for proper axis alignment
		const maxQty = Math.max(...qtyInspected);
		const maxNG = Math.max(...ngRatio);

		// Calculate suggested max to align 0 on both axes
		// Add 10% padding for visual comfort
		const suggestedMaxQty = maxQty * 1.1;
		const suggestedMaxNG = maxNG * 1.1;

		// Create chart
		const chartKey = `lineMonthly_${line.replace(/\s+/g, "_")}`;

		// Destroy existing chart if any
		if (state.charts[chartKey]) {
			state.charts[chartKey].destroy();
		}

		state.charts[chartKey] = new Chart(ctx, {
			type: "bar",
			data: {
				labels: labels,
				datasets: [
					{
						label: "Qty Inspected (lot)",
						data: qtyInspected,
						backgroundColor: "#0d9488", // Teal
						borderColor: "#0d9488",
						borderWidth: 1,
						yAxisID: "y",
						order: 2,
						barThickness: 30,
						datalabels: {
							anchor: "end",
							align: "top",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#07090eff",
							font: { weight: "bold", size: 9 },
							formatter: (value) => value.toFixed(2),
						},
					},
					{
						label: "NG Ratio (%)",
						data: ngRatio,
						type: "line",
						borderColor: "#ef4444", // Red
						backgroundColor: "#ef4444",
						borderWidth: 2,
						pointRadius: (context) => {
							// Make points larger for very small values to ensure visibility
							const value = context.parsed?.y || 0;
							if (value > 0 && value < 0.1) {
								return 6; // Larger point for very small values
							}
							return 4; // Normal size
						},
						pointHoverRadius: 6,
						pointBackgroundColor: (context) => {
							// Different color for very small values
							const value = context.parsed?.y || 0;
							if (value > 0 && value < 0.1) {
								return "#fbbf24"; // Yellow for very small values
							}
							return "#ef4444"; // Red for normal values
						},
						pointBorderColor: "#fff",
						pointBorderWidth: 2,
						pointStyle: (context) => {
							// Use triangle for very small values to make them stand out
							const value = context.parsed?.y || 0;
							if (value > 0 && value < 0.1) {
								return "triangle";
							}
							return "circle";
						},
						yAxisID: "y1",
						order: 1,
						tension: 0.4,
						spanGaps: false,
						datalabels: {
							align: (context) => {
								const value = context.dataset.data[context.dataIndex];
								// Position label higher for very small values
								return value > 0 && value < 0.1 ? "end" : "top";
							},
							offset: (context) => {
								const value = context.dataset.data[context.dataIndex];
								// Add more offset for very small values
								return value > 0 && value < 0.1 ? 10 : 5;
							},
							color: (context) => {
								const value = context.dataset.data[context.dataIndex];
								// Yellow text for very small values
								return value > 0 && value < 0.1 ? "#fbbf24" : "#ef4444";
							},
							font: { weight: "bold", size: 9 },
							formatter: (value) => value.toFixed(2),
						},
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: {
					mode: "index",
					intersect: false,
				},
				plugins: {
					legend: {
						position: "bottom",
						labels: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							font: { size: 11 },
							padding: 10,
						},
					},
					title: {
						display: true,
						text: `Qty Inps (lot) Vs NG (%) - Line ${line}`,
						color: document.documentElement.classList.contains("dark")
							? "#ffffff"
							: "#1e293b",
						font: { size: 13, weight: "bold" },
					},
					tooltip: {
						mode: "index",
						intersect: false,
						callbacks: {
							label: function (context) {
								let label = context.dataset.label || "";
								if (label) {
									label += ": ";
								}
								if (context.parsed.y !== null) {
									label += context.parsed.y.toFixed(2);
									if (context.dataset.yAxisID === "y1") {
										label += "%";
									}
								}
								return label;
							},
						},
					},
				},
				scales: {
					y: {
						type: "linear",
						display: true,
						position: "left",
						beginAtZero: true,
						suggestedMax: suggestedMaxQty,
						title: {
							display: true,
							text: "Qty Inspected (lot)",
							color: "#0d9488",
							font: { size: 11, weight: "bold" },
						},
						grid: {
							color: document.documentElement.classList.contains("dark")
								? "#334155"
								: "rgba(0, 0, 0, 0.1)",
							drawOnChartArea: true,
						},
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							font: { size: 10 },
						},
					},
					y1: {
						type: "linear",
						display: true,
						position: "right",
						beginAtZero: true,
						min: 0,
						suggestedMax: suggestedMaxNG,
						title: {
							display: true,
							text: "NG (%)",
							color: "#ef4444",
							font: { size: 11, weight: "bold" },
						},
						grid: {
							drawOnChartArea: false,
						},
						ticks: {
							color: "#ef4444",
							font: { size: 10 },
							callback: function (value) {
								return value.toFixed(1) + "%";
							},
						},
						afterBuildTicks: function (axis) {
							// Ensure ticks include 0
							if (!axis.ticks.some((tick) => tick.value === 0)) {
								axis.ticks.unshift({ value: 0 });
							}
						},
					},
					x: {
						title: {
							display: true,
							text: "Month-Year",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							font: { size: 11 },
						},
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							font: { size: 10 },
							maxRotation: 45,
							minRotation: 0,
						},
					},
				},
			},
		});
	});
};

const renderSummaryTables = () => {
	const container = document.getElementById("summaryTablesArea");
	if (!container || !state.summaryTables) return;

	const { byMonth, byShift } = state.summaryTables;

	const fmtPct = (val) => (typeof val === "number" ? val.toFixed(2) : val);
	const fmtNum = (val) =>
		typeof val === "number"
			? val.toLocaleString("en-US", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
			  })
			: val;

	container.innerHTML = `
      <div class="grid grid-cols-1 gap-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              ${createSummaryTableHTML(
								"Table NG (%) by Line & Month",
								byMonth,
								"ngPercent",
								fmtPct
							)}
              ${createSummaryTableHTML(
								"Table Qty NG (lot) by Line & Month",
								byMonth,
								"ng",
								fmtNum
							)}
              ${createSummaryTableHTML(
								"Table Qty Inspected (lot) by Line & Month",
								byMonth,
								"insp",
								fmtNum
							)}
          </div>
          
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
              ${createSummaryTableHTML(
								"NG (%) by Line & Shift",
								byShift,
								"ngPercent",
								fmtPct
							)}
              ${createSummaryTableHTML(
								"Qty NG(lot) by Line-Shift",
								byShift,
								"ng",
								fmtNum
							)}
              ${createSummaryTableHTML(
								"Qty Insp(lot) by Line-Shift",
								byShift,
								"insp",
								fmtNum
							)}
          </div>
      </div>
  `;

	// Render Category Table
	const categoryContainer = document.getElementById("categoryTableArea");
	if (categoryContainer && state.summaryTables.categoryTableArray) {
		const catData = state.summaryTables.categoryTableArray;

		const catRows = catData
			.map((row) => {
				const isTotal = row.category === "Total";
				const rowClass = isTotal
					? "bg-blue-100 dark:bg-slate-700/30 font-bold"
					: "border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors";
				const textClass = isTotal
					? "text-slate-900 dark:text-white"
					: "text-slate-600 dark:text-slate-400";
				const nameClass = isTotal
					? "text-slate-900 dark:text-white"
					: "text-slate-700 dark:text-slate-300 font-medium";

				return `
              <tr class="${rowClass}">
                  <td class="py-3 px-4 ${nameClass}">${row.category}</td>
				  <td class="text-red-600 dark:text-red-500 font-semibold py-3 px-4">${row.ngPercent.toFixed(
					2
				)}</td>
                  <td class="py-3 px-4 ${textClass}">${row.qtyInspectedPcs.toLocaleString(
					"en-US",
					{ minimumFractionDigits: 0, maximumFractionDigits: 0 }
				)}</td>
                  <td class="text-red-600 dark:text-red-500 font-semibold py-3 px-4">${row.qtyNgPcs.toLocaleString(
					"en-US",
					{ minimumFractionDigits: 0, maximumFractionDigits: 0 }
				)}</td>
                  <td class="py-3 px-4 ${textClass}">${row.qtyInspectedLot.toLocaleString(
					"en-US",
					{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
				)}</td>
                  <td class="text-red-600 dark:text-red-500 font-semibold py-3 px-4">${row.qtyNgLot.toLocaleString(
					"en-US",
					{ minimumFractionDigits: 2, maximumFractionDigits: 2 }
				)}</td>
                  
              </tr>
          `;
			})
			.join("");

		// Category Line Tables
		let categoryLineTablesHTML = "";
		if (state.summaryTables.categoryLineTables) {
			const { rows, grandTotal } = state.summaryTables.categoryLineTables;

			const createCatLineTable = (title, metricKey, formatFn) => {
				const headers = ["Kategori", "B4", "Ni", "R1", "Total"];

				const tableRows = rows
					.map((row) => {
						const b4 = row.lines["Barrel 4"][metricKey];
						const ni = row.lines["Nickel"][metricKey];
						const r1 = row.lines["Rack 1"][metricKey];
						const tot = row.total[metricKey];

						return `
                      <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td class="py-3 px-4 text-xs text-slate-700 dark:text-white font-bold">${
														row.category
													}</td>
                          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
														b4
													)}</td>
                          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
														ni
													)}</td>
                          <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${formatFn(
														r1
													)}</td>
                          <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
														tot
													)}</td>
                      </tr>
                  `;
					})
					.join("");

				const gtB4 = grandTotal.lines["Barrel 4"][metricKey];
				const gtNi = grandTotal.lines["Nickel"][metricKey];
				const gtR1 = grandTotal.lines["Rack 1"][metricKey];
				const gtTot = grandTotal.total[metricKey];

				const footerRow = `
                  <tr class="bg-blue-50 dark:bg-slate-700/30 font-bold">
                      <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">Total</td>
                      <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
												gtB4
											)}</td>
                      <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
												gtNi
											)}</td>
                      <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
												gtR1
											)}</td>
                      <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${formatFn(
												gtTot
											)}</td>
                  </tr>
              `;

				return `
                  <div class="glass-panel p-0 overflow-hidden flex flex-col">
                      <div class="p-4 border-b border-glass-border bg-blue-100 dark:bg-slate-800/50 flex justify-between items-center">
                          <h3 class="text-slate-800 dark:text-white font-semibold text-sm">${title}</h3>
                           <button id="export-btn-${metricKey}" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                ⬇️ <span class="ml-1 hidden sm:inline">CSV</span>
                            </button>
                      </div>
                      <div class="overflow-x-auto">
                          <table class="w-full text-sm text-left">
                              <thead class="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold bg-slate-200 dark:bg-slate-800/30">
                                  <tr>
                                      ${headers
																				.map(
																					(h) =>
																						`<th class="py-3 px-4 font-semibold">${h}</th>`
																				)
																				.join("")}
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
              `;
			};

			categoryLineTablesHTML = `
              <!-- PCS Tables (Orange Border) -->
              <div class="border-2 border-orange-500/50 rounded-lg p-4 mt-6">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      ${createCatLineTable(
												"Tabel Qty Inspected (pcs)",
												"inspPcs",
												(v) =>
													v.toLocaleString("en-US", {
														minimumFractionDigits: 0,
														maximumFractionDigits: 0,
													})
											)}
                      ${createCatLineTable("Tabel Qty NG (pcs)", "ngPcs", (v) =>
												v.toLocaleString("en-US", {
													minimumFractionDigits: 0,
													maximumFractionDigits: 0,
												})
											)}
                  </div>
              </div>
              
              <!-- LOT Tables (Green Border) -->
              <div class="border-2 border-green-500/50 rounded-lg p-4 mt-6">
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      ${createCatLineTable("Tabel Qty NG (lot)", "ngLot", (v) =>
												v.toLocaleString("en-US", {
													minimumFractionDigits: 2,
													maximumFractionDigits: 2,
												})
											)}
                      ${createCatLineTable(
												"Tabel Qty Inspected (lot)",
												"inspLot",
												(v) =>
													v.toLocaleString("en-US", {
														minimumFractionDigits: 2,
														maximumFractionDigits: 2,
													})
											)}
                  </div>
              </div>
          `;
		}

		categoryContainer.innerHTML = `
          <div class="glass-panel p-0 overflow-hidden flex flex-col mb-6">
              <div class="p-4 border-b border-glass-border bg-blue-100 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 class="text-blue-900 dark:text-white font-semibold text-sm">Tabel by Kategori</h3>
                   <button id="exportCategoryTableBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                        ⬇️ <span class="ml-1 hidden sm:inline">CSV</span>
                    </button>
              </div>
              <div class="overflow-x-auto">
                  <table class="w-full text-sm text-left">
                      <thead class="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase bg-slate-200 dark:bg-slate-800/30">
                          <tr>
                              <th class="py-3 px-4">Kategori</th>
                              <th class="py-3 px-4 text-red-600 dark:text-red-500">NG (%)</th>
                              <th class="py-3 px-4">Qty Inspected (pcs)</th>
                              <th class="py-3 px-4 text-red-600 dark:text-red-500">QTY NG (pcs)</th>
                              <th class="py-3 px-4">Qty Inspected (lot)</th>
                              <th class="py-3 px-4 text-red-600 dark:text-red-500">Qty NG (lot)</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${catRows}
                      </tbody>
                  </table>
              </div>
          </div>
          ${categoryLineTablesHTML}
      `;

		// Add Event Listeners for Export Buttons
		setTimeout(() => {
			const catBtn = document.getElementById("exportCategoryTableBtn");
			if (catBtn) {
				catBtn.addEventListener("click", () => {
					exportCategoryTableToCSV(state.summaryTables.categoryTableArray);
				});
			}

			// Listeners for Category Line Tables
			const lineTableMetrics = [
				{ key: "inspPcs", title: "Tabel Qty Inspected (pcs)" },
				{ key: "ngPcs", title: "Tabel Qty NG (pcs)" },
				{ key: "ngLot", title: "Tabel Qty NG (lot)" },
				{ key: "inspLot", title: "Tabel Qty Inspected (lot)" }
			];

			lineTableMetrics.forEach(metric => {
				const btn = document.getElementById(`export-btn-${metric.key}`);
				if (btn) {
					btn.addEventListener("click", () => {
						 exportCategoryLineTableToCSV(state.summaryTables.categoryLineTables, metric.key, metric.title);
					});
				}
			});
		}, 0);

	}
};

const renderParetoCharts = () => {
	const container = document.getElementById("paretoChartArea");
	if (!container || !state.chartsData || !state.chartsData.paretoData) return;

	const paretoData = state.chartsData.paretoData;
	const lines = ["Barrel 4", "Rack 1"]; // Only these two as per request/image

	// Clear previous content
	container.innerHTML = "";

	// Create Grid Container
	const gridDiv = document.createElement("div");
	gridDiv.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";
	container.appendChild(gridDiv);

	lines.forEach((line) => {
		if (!paretoData[line] || paretoData[line].length === 0) return;

		const data = paretoData[line];
		const labels = data.map((d) => d.type);
		const counts = data.map((d) => d.count);
		const cumulative = data.map((d) => d.cumulativePct);

		// Create Chart Card
		const card = document.createElement("div");
		card.className = "glass-panel p-6";

		const title = document.createElement("h3");
		title.className = "text-slate-800 dark:text-white font-medium mb-4";
		title.textContent = `Pareto Chart: Total NG (lot) per Defect Type - Line ${line}`;
		card.appendChild(title);

		const canvasContainer = document.createElement("div");
		canvasContainer.className = "h-80";
		const canvas = document.createElement("canvas");
		canvas.id = `paretoChart-${line.replace(/\s+/g, "-")}`;
		canvasContainer.appendChild(canvas);
		card.appendChild(canvasContainer);

		gridDiv.appendChild(card);

		// Render Chart
		const ctx = canvas.getContext("2d");

		// Colors based on line (matching app.py roughly)
		const barColorHex = line === "Barrel 4" ? "#637cceff" : "#fda4af";

		new Chart(ctx, {
			type: "bar",
			data: {
				labels: labels,
				datasets: [
					{
						label: "Total NG (lot)",
						data: counts,
						backgroundColor: barColorHex,
						order: 2,
						yAxisID: "y",
						datalabels: {
							anchor: "end",
							align: "top",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
							formatter: (val) => val.toFixed(2),
						},
					},
					{
						label: "Cumulative %",
						data: cumulative,
						type: "line",
						borderColor: "#f59e0b", // Orange
						backgroundColor: "#f59e0b",
						borderWidth: 2,
						pointRadius: 4,
						yAxisID: "y1",
						order: 1,
						datalabels: {
							align: "top",
							color: "#f59e0b",
							formatter: (val) => val.toFixed(1) + "%",
						},
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: document.documentElement.classList.contains("dark")
								? "#ffffffff"
								: "#475569",
						},
					},
					tooltip: {
						mode: "index",
						intersect: false,
					},
				},
				scales: {
					y: {
						type: "linear",
						display: true,
						position: "left",
						title: {
							display: true,
							text: "Total NG (lot)",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						grid: {
							color: document.documentElement.classList.contains("dark")
								? "#334155"
								: "rgba(0,0,0,0.1)",
						},
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					y1: {
						type: "linear",
						display: true,
						position: "right",
						title: {
							display: true,
							text: "Cumulative %",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						min: 0,
						max: 110,
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							callback: function (value) {
								return value + "%";
							},
						},
					},
					x: {
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
				},
			},
		});
	});
};

const renderParetoCustCharts = () => {
	const container = document.getElementById("paretoCustChartArea");
	if (!container || !state.chartsData || !state.chartsData.paretoCustData)
		return;

	const paretoCustData = state.chartsData.paretoCustData;
	const lines = ["Barrel 4", "Rack 1"];

	// Clear previous content
	container.innerHTML = "";

	// Create Grid Container
	const gridDiv = document.createElement("div");
	gridDiv.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";
	container.appendChild(gridDiv);

	lines.forEach((line) => {
		if (!paretoCustData[line] || paretoCustData[line].length === 0) return;

		const data = paretoCustData[line];
		const labels = data.map((d) => d.type);
		const counts = data.map((d) => d.count);
		const cumulative = data.map((d) => d.cumulativePct);

		// Create Chart Card
		const card = document.createElement("div");
		card.className = "glass-panel p-6";

		const title = document.createElement("h3");
		title.className = "text-slate-800 dark:text-white font-medium mb-4";
		title.textContent = `Pareto Chart: Qty NG (lot) per Cust.ID - ${line}`;
		card.appendChild(title);

		const canvasContainer = document.createElement("div");
		canvasContainer.className = "h-80";
		const canvas = document.createElement("canvas");
		canvas.id = `paretoCustChart-${line.replace(/\s+/g, "-")}`;
		canvasContainer.appendChild(canvas);
		card.appendChild(canvasContainer);

		gridDiv.appendChild(card);

		// Render Chart
		const ctx = canvas.getContext("2d");

		// Colors: Dark Blue for bars, Orange for line
		const barColorHex = "#1e3a8a"; // blue-900 like

		new Chart(ctx, {
			type: "bar",
			data: {
				labels: labels,
				datasets: [
					{
						label: "Qty NG (Lot)",
						data: counts,
						backgroundColor: (ctx) => {
							// Gradient for bars
							const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
							gradient.addColorStop(0, "#6366f1"); // Indigo 500
							gradient.addColorStop(1, "#1e1b4b"); // Indigo 950
							return gradient;
						},
						order: 2,
						yAxisID: "y",
						datalabels: {
							anchor: "end",
							align: "top",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
							formatter: (val) => val.toFixed(2),
						},
					},
					{
						label: "Cumulative %",
						data: cumulative,
						type: "line",
						borderColor: "#f59e0b", // Orange
						backgroundColor: "#f59e0b",
						borderWidth: 2,
						pointRadius: 4,
						yAxisID: "y1",
						order: 1,
						datalabels: {
							align: "top",
							color: "#f59e0b",
							formatter: (val) => val.toFixed(1) + "%",
						},
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					tooltip: {
						mode: "index",
						intersect: false,
					},
				},
				scales: {
					y: {
						type: "linear",
						display: true,
						position: "left",
						title: {
							display: true,
							text: "Qty NG (Lot)",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						grid: {
							color: document.documentElement.classList.contains("dark")
								? "#334155"
								: "rgba(0,0,0,0.1)",
						},
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					y1: {
						type: "linear",
						display: true,
						position: "right",
						title: {
							display: true,
							text: "Cumulative %",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						min: 0,
						max: 110,
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							callback: function (value) {
								return value + "%";
							},
						},
					},
					x: {
						title: {
							display: true,
							text: "Cust.ID",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
						},
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
				},
			},
		});
	});
};

const renderParetoPartCharts = () => {
	const container = document.getElementById("paretoPartChartArea");
	if (!container || !state.chartsData || !state.chartsData.paretoPartData)
		return;

	const paretoPartData = state.chartsData.paretoPartData;
	const lines = ["Barrel 4", "Rack 1"]; // Both lines as requested

	// Clear previous content
	container.innerHTML = "";

	// Create Grid Container (Single column for vertical stacking)
	const gridDiv = document.createElement("div");
	gridDiv.className = "grid grid-cols-1 gap-6";
	container.appendChild(gridDiv);

	lines.forEach((line) => {
		if (!paretoPartData[line] || paretoPartData[line].length === 0) return;

		const data = paretoPartData[line];
		// Limit to top 30 to avoid overcrowding if too many parts
		const topData = data.slice(0, 30);

		const labels = topData.map((d) => d.type);
		const counts = topData.map((d) => d.count);
		const cumulative = topData.map((d) => d.cumulativePct);

		// Create Chart Card
		const card = document.createElement("div");
		card.className = "glass-panel p-6";

		const title = document.createElement("h3");
		title.className = "text-slate-800 dark:text-white font-medium mb-4";
		// Update title based on line
		const lineLabel = line === "Barrel 4" ? "LB4" : "LR1";
		title.textContent = `Pareto Chart: NG (%) per Part Name - ${lineLabel}`;
		card.appendChild(title);

		const canvasContainer = document.createElement("div");
		canvasContainer.className = "h-96"; // Taller for better visibility of x-axis labels
		const canvas = document.createElement("canvas");
		canvas.id = `paretoPartChart-${line.replace(/\s+/g, "-")}`;
		canvasContainer.appendChild(canvas);
		card.appendChild(canvasContainer);

		gridDiv.appendChild(card);

		// Render Chart
		const ctx = canvas.getContext("2d");

		// Different colors for different lines
		const barColor = line === "Barrel 4" ? "#5eead4" : "#c084fc"; // Teal for B4, Purple for R1

		new Chart(ctx, {
			type: "bar",
			data: {
				labels: labels,
				datasets: [
					{
						label: "NG (%)",
						data: counts,
						backgroundColor: barColor,
						order: 2,
						yAxisID: "y",
						datalabels: {
							anchor: "end",
							align: "top",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
							font: { size: 10 },
							formatter: (val) => val.toFixed(2),
						},
					},
					{
						label: "Cumulative %",
						data: cumulative,
						type: "line",
						borderColor: "#f59e0b", // Orange
						backgroundColor: "#f59e0b",
						borderWidth: 2,
						pointRadius: 4,
						yAxisID: "y1",
						order: 1,
						datalabels: {
							align: "top",
							color: "#f59e0b",
							font: { size: 10 },
							formatter: (val) => val.toFixed(1) + "%",
						},
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						labels: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					tooltip: {
						mode: "index",
						intersect: false,
					},
				},
				scales: {
					y: {
						type: "linear",
						display: true,
						position: "left",
						title: {
							display: true,
							text: "NG (%)",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						grid: {
							color: document.documentElement.classList.contains("dark")
								? "#334155"
								: "rgba(0,0,0,0.1)",
						},
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
					},
					y1: {
						type: "linear",
						display: true,
						position: "right",
						title: {
							display: true,
							text: "Cumulative %",
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
						},
						min: 0,
						max: 110,
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							callback: function (value) {
								return value + "%";
							},
						},
					},
					x: {
						title: {
							display: true,
							text: "PartName",
							color: document.documentElement.classList.contains("dark")
								? "#fff"
								: "#1e293b",
						},
						grid: { display: false },
						ticks: {
							color: document.documentElement.classList.contains("dark")
								? "#94a3b8"
								: "#475569",
							maxRotation: 45,
							minRotation: 45,
						},
					},
				},
			},
		});
	});
};

const renderMcNoChart = () => {
	const container = document.getElementById("mcNoChartArea");
	if (!container || !state.chartsData || !state.chartsData.mcNoData) return;

	const mcNoData = state.chartsData.mcNoData;

	// Clear previous content
	container.innerHTML = "";

	// Create main container
	const mainDiv = document.createElement("div");
	mainDiv.className = "glass-panel p-6";

	// Title
	const title = document.createElement("h3");
	title.className = "text-slate-800 dark:text-white font-medium mb-1";
	title.textContent =
		"Performa Produk Stamping | Qty Inspected/Lot vs (NG %) per M/C No.";
	mainDiv.appendChild(title);

	// Subtitle showing period (if available)
	if (state.dateRange && state.dateRange.start && state.dateRange.end) {
		const subtitle = document.createElement("p");
		subtitle.className = "text-slate-600 dark:text-slate-400 text-sm mb-4";
		subtitle.textContent = `Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}`;
		mainDiv.appendChild(subtitle);
	}

	// Chart container
	const canvasContainer = document.createElement("div");
	canvasContainer.className = "h-96 mb-6";
	const canvas = document.createElement("canvas");
	canvas.id = "mcNoChart";
	canvasContainer.appendChild(canvas);
	mainDiv.appendChild(canvasContainer);

	// Table container
	const tableTitle = document.createElement("h4");
	tableTitle.className =
		"text-slate-800 dark:text-white font-medium text-sm mb-3";
	tableTitle.textContent = "Tabel NG (%) by M/C No. Stamping";
	mainDiv.appendChild(tableTitle);

	const tableContainer = document.createElement("div");
	tableContainer.className = "overflow-x-auto";

	// Calculate totals
	const totalInspLot = mcNoData.tableData.reduce(
		(sum, row) => sum + row.inspLot,
		0
	);
	const avgNgPercent =
		mcNoData.tableData.length > 0
			? mcNoData.tableData.reduce((sum, row) => sum + row.ngPercent, 0) /
			  mcNoData.tableData.length
			: 0;

    const tableHTML = `
      <table class="w-full text-sm text-left">
          <thead class="text-sm text-slate-600 dark:text-slate-400 font-bold uppercase bg-slate-200 dark:bg-slate-800/30">
              <tr>
                  <th class="py-3 px-4 font-semibold">M/C No.</th>
                  ${mcNoData.labels
										.map(
											(mc) =>
												`<th class="py-3 px-4 font-semibold text-center">${mc}</th>`
										)
										.join("")}
                  <th class="py-3 px-4 font-semibold text-center">TOTAL</th>
              </tr>
          </thead>
          <tbody>
              <tr class="border-b border-slate-200 dark:border-slate-700/50">
                  <td class="py-3 px-4 text-slate-700 dark:text-white font-medium whitespace-nowrap">Qty Inspected (Lot)</td>
                  ${mcNoData.tableData
										.map(
											(row) =>
												`<td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-center">${row.inspLot.toFixed(
													2
												)}</td>`
										)
										.join("")}
                  <td class="py-3 px-4 text-slate-800 dark:text-white font-bold text-center">${totalInspLot.toFixed(
										2
									)}</td>
              </tr>
              <tr class="border-b border-slate-200 dark:border-slate-700/50">
                  <td class="py-3 px-4 text-slate-700 dark:text-white font-medium whitespace-nowrap">NG (%)</td>
                  ${mcNoData.tableData
										.map(
											(row) =>
												`<td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-center">${row.ngPercent.toFixed(
													2
												)}</td>`
										)
										.join("")}
                  <td class="py-3 px-4 text-slate-800 dark:text-white font-bold text-center">${avgNgPercent.toFixed(
										2
									)}</td>
              </tr>
          </tbody>
      </table>
  `;

	tableContainer.innerHTML = tableHTML;
	mainDiv.appendChild(tableContainer);

	container.appendChild(mainDiv);

	// Render Chart
	const ctx = canvas.getContext("2d");

	// Different colors for each bar
	const barColors = [
		"#6366f1", // Indigo
		"#ef4444", // Red
		"#10b981", // Green
		"#a855f7", // Purple
		"#f59e0b", // Orange
		"#06b6d4", // Cyan
		"#ec4899", // Pink
		"#8b5cf6", // Violet
		"#14b8a6", // Teal
		"#f97316", // Orange-600
	];

	new Chart(ctx, {
		type: "bar",
		data: {
			labels: mcNoData.labels,
			datasets: [
				{
					label: "Inspected/Lot",
					data: mcNoData.inspLot,
					backgroundColor: mcNoData.labels.map(
						(_, i) => barColors[i % barColors.length]
					),
					order: 2,
					yAxisID: "y",
					datalabels: {
						anchor: "end",
						align: "top",
						color: document.documentElement.classList.contains("dark")
							? "#fff"
							: "#1e293b",
						font: { size: 10, weight: "bold" },
						formatter: (val) => val.toFixed(2),
					},
				},
				{
					label: "NG_%",
					data: mcNoData.ngPercent,
					type: "line",
					borderColor: "#ef4444", // Red
					backgroundColor: "#ef4444",
					borderWidth: 3,
					pointRadius: 6,
					pointBackgroundColor: "#ef4444",
					pointBorderColor: "#fff",
					pointBorderWidth: 2,
					yAxisID: "y1",
					order: 1,
					datalabels: {
						align: "top",
						offset: 10,
						color: "#ef4444",
						font: { size: 10, weight: "bold" },
						formatter: (val) => val.toFixed(2),
					},
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: {
				legend: {
					labels: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#334155", // slate-700 for light mode
					},
				},
				tooltip: {
					mode: "index",
					intersect: false,
				},
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					title: {
						display: true,
						text: "Qty Inspected/Lot",
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#334155", // slate-700 for light mode
					},
					grid: {
						color: document.documentElement.classList.contains("dark")
							? "#334155"
							: "rgba(0,0,0,0.1)",
					},
					ticks: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					title: { display: true, text: "NG (%)", color: "#ef4444" },
					grid: { display: false },
					ticks: {
						color: "#ef4444",
					},
				},
				x: {
					title: {
						display: true,
						text: "M/C No.",
						color: document.documentElement.classList.contains("dark")
							? "#fff"
							: "#1e293b",
					},
					grid: { display: false },
					ticks: {
						color: document.documentElement.classList.contains("dark")
							? "#94a3b8"
							: "#475569",
					},
				},
			},
		},
	});
};

const renderHousingHorn = () => {
	console.log("renderHousingHorn called");
	const container = document.getElementById("housingHornArea");

	if (!container) return;

	if (!state.chartsData || !state.chartsData.housingHornData) {
		console.log("No housingHornData in chartsData");
		return;
	}

	const hhData = state.chartsData.housingHornData;

	// Check if there's any data
	if (hhData.tableDataPcs.length === 0) {
		container.innerHTML = "";
		return;
	}

	// Clear previous content
	container.innerHTML = "";

	// Create main container
	const mainDiv = document.createElement("div");
	mainDiv.className = "glass-panel p-6";

	// Title
	const title = document.createElement("h3");
	title.className = "text-slate-800 dark:text-white font-semibold text-lg mb-1";
	title.textContent = "Metrics for Housing Horn - PT.HDI - Barrel 4";
	mainDiv.appendChild(title);

	// Subtitle showing period
	if (state.dateRange && state.dateRange.start && state.dateRange.end) {
		const subtitle = document.createElement("p");
		subtitle.className = "text-slate-500 dark:text-slate-400 text-sm mb-4";
		subtitle.textContent = `Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}`;
		mainDiv.appendChild(subtitle);
	}

	// Metrics Grid
	const metricsGrid = document.createElement("div");
	metricsGrid.className =
		"grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6";

	const metrics = [
		{
			label: "OK (pcs)",
			value: hhData.metrics.okPcs.toLocaleString("en-US", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}),
		},
		{
			label: "NG (pcs)",
			value: hhData.metrics.ngPcs.toLocaleString("en-US", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}),
		},
		{
			label: "Insp (pcs)",
			value: hhData.metrics.inspPcs.toLocaleString("en-US", {
				minimumFractionDigits: 0,
				maximumFractionDigits: 0,
			}),
		},
		{ label: "OK (lot)", value: hhData.metrics.okLot.toFixed(2) },
		{ label: "NG (lot)", value: hhData.metrics.ngLot.toFixed(2) },
		{ label: "Insp (lot)", value: hhData.metrics.inspLot.toFixed(2) },
		{ label: "NG (%)", value: hhData.metrics.ngPercent.toFixed(2) },
	];

	metrics.forEach((m) => {
		const card = document.createElement("div");
		card.className =
			"bg-white dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700/50";
		card.innerHTML = `
          <div class="text-slate-500 dark:text-slate-400 text-xs mb-1">${m.label}</div>
          <div class="text-slate-900 dark:text-white text-2xl font-bold">${m.value}</div>
      `;
		metricsGrid.appendChild(card);
	});

	mainDiv.appendChild(metricsGrid);

	// --- Helper to create Collapsible Table ---
	const createCollapsibleTable = (title, tableData, type, open = false) => {
		const details = document.createElement("details");
		details.className = "mb-4 glass-panel overflow-hidden border border-slate-200 dark:border-slate-700";
		if (open) details.open = true;

		// Summary Header
		const summary = document.createElement("summary");
		summary.className =
			"cursor-pointer p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center";
		summary.innerHTML = `
            <span class="text-slate-800 dark:text-white font-medium">${title}</span>
            <svg class="w-5 h-5 text-slate-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
        `;
		details.appendChild(summary);

		// Content Container
		const contentDiv = document.createElement("div");
		contentDiv.className =
			"p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700";

		// Controls (Export Button)
		const controlsDiv = document.createElement("div");
		controlsDiv.className = "flex justify-end items-center mb-4";

		const exportBtn = document.createElement("button");
		exportBtn.className =
			"bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center shadow-sm transition-colors";
		exportBtn.title = "Export to CSV";
		exportBtn.innerHTML = `
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            CSV
        `;
		exportBtn.addEventListener("click", () =>
			exportHousingHornToCSV(hhData, type)
		);
		controlsDiv.appendChild(exportBtn);
		contentDiv.appendChild(controlsDiv);

		// Table Wrapper
		const tableWrapper = document.createElement("div");
		tableWrapper.className = "overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700";

		// Table HTML
		const isPcs = type === "pcs";
		const suffix = isPcs ? "(pcs)" : "(lot)";
		const okKey = isPcs ? "okPcs" : "okLot";
		const ngKey = isPcs ? "ngPcs" : "ngLot";
		const ngmKey = isPcs ? "ngmPcs" : "ngmLot";
		const inspKey = isPcs ? "totInspPcs" : "totInspLot";
		const metricOk = isPcs ? hhData.metrics.okPcs : hhData.metrics.okLot;
		const metricNg = isPcs ? hhData.metrics.ngPcs : hhData.metrics.ngLot;
		const metricInsp = isPcs ? hhData.metrics.inspPcs : hhData.metrics.inspLot;

		const formatVal = (val) =>
			isPcs ? val.toLocaleString() : val.toFixed(2);

		tableWrapper.innerHTML = `
            <table class="w-full text-sm text-left">
                <thead class="text-sm text-slate-700 dark:text-slate-400 font-bold uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                    <tr>
                        <th class="py-3 px-4">PartName</th>
                        <th class="py-3 px-4 text-red-600 dark:text-red-500 text-right">NG (%)</th>
                        <th class="py-3 px-4 text-right">OK ${suffix}</th>
                        <th class="py-3 px-4 text-red-600 dark:text-red-500 text-right">NG ${suffix}</th>
                        <th class="py-3 px-4 text-right">NGM ${suffix}</th>
                        <th class="py-3 px-4 text-right">Tot.Insp ${suffix}</th>
                    </tr>
                </thead>
                <tbody class="text-slate-700 dark:text-slate-300">
                    ${tableData
											.map(
												(row) => `
                        <tr class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <td class="py-3 px-4">${row.partName}</td>
                            <td class="py-3 px-4 text-red-600 dark:text-red-500 text-right">${row.ngPercent.toFixed(
															2
														)}</td>
                            <td class="py-3 px-4 text-right">${formatVal(
															row[okKey]
														)}</td>
                            <td class="py-3 px-4 text-red-600 dark:text-red-500 text-right">${formatVal(
															row[ngKey]
														)}</td>
                            <td class="py-3 px-4 text-right">${formatVal(
															row[ngmKey]
														)}</td>
                            <td class="py-3 px-4 text-right">${formatVal(
															row[inspKey]
														)}</td>
                        </tr>
                    `
											)
											.join("")}
                    <tr class="bg-slate-100 dark:bg-slate-700/30 font-bold border-t-2 border-slate-200 dark:border-slate-600">
                        <td class="py-3 px-4 text-slate-900 dark:text-white">TOTAL</td>
                        <td class="py-3 px-4 text-red-600 dark:text-red-500 text-right">${hhData.metrics.ngPercent.toFixed(
													2
												)}</td>
                        <td class="py-3 px-4 text-slate-900 dark:text-white text-right">${formatVal(
													metricOk
												)}</td>
                        <td class="py-3 px-4 text-red-600 dark:text-red-500 text-right">${formatVal(
													metricNg
												)}</td>
                        <td class="py-3 px-4 text-slate-900 dark:text-white text-right">0</td>
                        <td class="py-3 px-4 text-slate-900 dark:text-white text-right">${formatVal(
													metricInsp
												)}</td>
                    </tr>
                </tbody>
            </table>
        `;

		contentDiv.appendChild(tableWrapper);
		details.appendChild(contentDiv);
		return details;
	};

	// Create Tables
	const collapsibleLot = createCollapsibleTable(
		"Details Data Housing Horn (lot) - PT. HDI - Barrel 4",
		hhData.tableDataLot,
		"lot"
	);
	mainDiv.appendChild(collapsibleLot);

	const collapsiblePcs = createCollapsibleTable(
		"Details Data Housing Horn (pcs) - PT. HDI - Barrel 4",
		hhData.tableDataPcs,
		"pcs",
		true // Open by default
	);
	mainDiv.appendChild(collapsiblePcs);

	container.appendChild(mainDiv);
};

const renderRekap = () => {
	const container = document.getElementById("rekapArea");
	if (!container || !state.chartsData || !state.chartsData.rekapData) {
		if (container) container.innerHTML = "";
		return;
	}

	const rekapData = state.chartsData.rekapData;

	// Clear previous content
	container.innerHTML = "";

	// Create main container
	const mainDiv = document.createElement("div");
	mainDiv.className = "glass-panel p-6";

	// Title
	const title = document.createElement("h3");
	title.className =
		"text-slate-800 dark:text-white font-semibold text-lg mb-1 text-center";
	title.textContent = "Lembar Panduan untuk LEADER input ke Grafik Harian";
	mainDiv.appendChild(title);

	// Subtitle
	if (state.dateRange && state.dateRange.start && state.dateRange.end) {
		const subtitle = document.createElement("p");
		subtitle.className =
			"text-slate-500 dark:text-slate-400 text-sm mb-6 text-center";
		subtitle.textContent = `Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}`;
		mainDiv.appendChild(subtitle);
	}

	// Grid for 4 columns
	const gridDiv = document.createElement("div");
	gridDiv.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";

	rekapData.forEach((category) => {
		const catDiv = document.createElement("div");
		catDiv.className =
			"bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700/50";

		// Category Title
		const catTitle = document.createElement("h4");
		catTitle.className =
			"text-slate-800 dark:text-white font-semibold text-sm mb-4 text-center";
		catTitle.textContent = category.label;
		catDiv.appendChild(catTitle);

		// Defects Table
		const tableHTML = `
          <table class="w-full text-xs">
              <thead class="bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400">
                  <tr>
                      <th class="py-2 px-2 text-left"></th>
                      <th class="py-2 px-2 text-left">Jenis NG</th>
                      <th class="py-2 px-2 text-right">Total_NG(B/H)</th>
                  </tr>
              </thead>
              <tbody>
                  ${category.defects
										.map(
											(defect, idx) => `
                      <tr class="border-b border-slate-200 dark:border-slate-700/30">
                          <td class="py-2 px-2 text-slate-500 dark:text-slate-400">${idx}</td>
                          <td class="py-2 px-2 text-slate-700 dark:text-slate-300">${
														defect.name
													}</td>
                          <td class="py-2 px-2 text-slate-700 dark:text-slate-300 text-right">${defect.total.toFixed(2)}</td>
                      </tr>
                  `
										)
										.join("")}
                  <tr class="bg-slate-100 dark:bg-slate-700/30 font-bold">
                      <td class="py-2 px-2 text-slate-800 dark:text-white" colspan="2">TOTAL</td>
                      <td class="py-2 px-2 text-slate-800 dark:text-white text-right">${category.totalNG.toFixed(
												2
											)}</td>
                  </tr>
              </tbody>
          </table>
      `;

		catDiv.innerHTML += tableHTML;

		// Summary metrics
		const summaryDiv = document.createElement("div");
		summaryDiv.className = "mt-4 space-y-1";
		summaryDiv.innerHTML = `
          <div class="text-center">
              <span class="text-orange-600 dark:text-orange-400 font-bold">Total Insp(B/H): ${category.totalInsp.toFixed(
								0
							)}</span>
          </div>
          <div class="text-center">
              <span class="text-orange-600 dark:text-orange-400 font-bold">Total NG%: ${category.ngPercent.toFixed(
								2
							)} %</span>
          </div>
      `;
		catDiv.appendChild(summaryDiv);

		gridDiv.appendChild(catDiv);
	});

	mainDiv.appendChild(gridDiv);
	container.appendChild(mainDiv);
};

const renderInfoTrial = () => {
	if (!state.trialData) return;

	const {
		fullData,
		rekap,
		rekapTotals,
		defectRekap,
		defectRekapTotals,
		defectRekapColumns,
		charts,
	} = state.trialData;

	// Create main title and period
	const mainContent = document.getElementById("infoTrialContent");
	if (!mainContent) return;

	// Clear existing content first
	mainContent.innerHTML = "";

	// 1. Title Section
	const titleSection = document.createElement("div");
	titleSection.className = "mb-6";
	titleSection.innerHTML = `
        <h2 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">Summary Trial</h2>
        ${
					state.dateRange && state.dateRange.start && state.dateRange.end
						? `
            <p class="text-slate-600 dark:text-slate-400">Periode dari Tanggal: ${state.dateRange.start} sampai Tanggal: ${state.dateRange.end}</p>
        `
						: ""
				}
    `;
	mainContent.appendChild(titleSection);

	// 2. Collapsible Full Data TRIAL Table (ALL COLUMNS)
	const detailsCollapsible = document.createElement("details");
	detailsCollapsible.className = "mb-6 glass-panel overflow-hidden";

	const formatDate = (dateVal) => {
		if (!dateVal) return "";
		try {
			if (typeof dateVal === "string") return dateVal;
			const d = new Date(dateVal);
			return d.toISOString().split("T")[0];
		} catch {
			return String(dateVal);
		}
	};

	detailsCollapsible.innerHTML = `
        <summary class="cursor-pointer p-4 hover:bg-blue-100 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center group">
            <span class="text-slate-800 dark:text-white font-medium">Data TRIAL</span>
            <div class="flex items-center gap-3">
                <button id="exportFullTrialBtn" title="Export Data TRIAL to Excel" class="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-all shadow-sm flex items-center justify-center group/btn">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                    </svg>
                </button>
                <svg class="w-5 h-5 text-slate-500 dark:text-slate-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
        </summary>
        <div class="p-0">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left">
                    <thead class="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-200 dark:bg-slate-800/30 sticky top-0">
                        <tr>
                            <th class="py-2 px-2 font-semibold text-center" style="min-width: 40px">#</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 80px">Line</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 100px">Date</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 70px">Shift</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 100px">Cust.ID</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 150px">Part.ID</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 200px">PartName</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 100px">Kategori</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 120px">No.Jig</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 100px">NoCard</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 80px">Std Load</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 120px">NoB/H_NoLotMTL</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 80px">NoBak</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 150px">Keterangan</th>
                            <th class="py-2 px-2 font-semibold" style="min-width: 70px">M/C No.</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">Insp(B/H)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">NG(B/H)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">OK(B/H)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 80px">NG_%</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 100px">OK(pcs)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 100px">Qty(NG)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 100px">QInspec</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">Insp(Lot)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">OK(Lot)</th>
                            <th class="py-2 px-2 font-semibold text-right" style="min-width: 90px">NG(Lot)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fullData
													.map(
														(row, idx) => `
                            <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-center">${
																	idx + 1
																}</td>
                                <td class="py-2 px-2 text-slate-700 dark:text-slate-300">${
																	row.line || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${formatDate(
																	row.date
																)}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.shift || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.custId || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.partId || ""
																}</td>
                                <td class="py-2 px-2 text-slate-700 dark:text-slate-300 font-medium">${
																	row.partName || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.kategori || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.noJig || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.noCard || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-right">${
																	row.stdLoad || 0
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.noBH || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.noBak || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.keterangan || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400">${
																	row.mcNo || ""
																}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-right">${row.inspBH.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-red-600 dark:text-red-400 text-right">${row.ngBH.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-green-600 dark:text-green-400 text-right">${row.okBH.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-right">${row.ngPercent.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-green-600 dark:text-green-400 text-right">${row.okPcs.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-red-600 dark:text-red-400 text-right font-bold">${row.qtyNG.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-right">${row.qInspec.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-slate-600 dark:text-slate-400 text-right">${row.inspLot.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-green-600 dark:text-green-400 text-right">${row.okLot.toFixed(
																	2
																)}</td>
                                <td class="py-2 px-2 text-red-600 dark:text-red-400 text-right">${row.ngLot.toFixed(
																	2
																)}</td>
                            </tr>
                        `
													)
													.join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
	mainContent.appendChild(detailsCollapsible);

	// 3. Rekap Data Trial (by unique PartName)
	const rekapSection = document.createElement("div");
	rekapSection.id = "trialRekapSection";
	rekapSection.className = "mb-6 glass-panel p-0 overflow-hidden";
	rekapSection.innerHTML = `
        <div class="p-4 border-b border-glass-border bg-blue-100 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 class="text-slate-800 dark:text-white font-semibold">Rekap Data Trial</h3>
            <button id="exportRekapTrialBtn" class="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors" title="Export Rekap Data TRIAL to CSV">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-200 dark:bg-slate-800/30">
                    <tr>
                        <th class="py-3 px-4 font-semibold text-center">#</th>
                        <th class="py-3 px-4 font-semibold">PartName</th>
                        <th class="py-3 px-4 font-semibold">Cust.ID</th>
                        <th class="py-3 px-4 font-semibold">Line</th>
                        <th class="py-3 px-4 font-semibold">Keterangan</th>
                        <th class="py-3 px-4 font-semibold text-right text-red-600 dark:text-red-400 font-bold">NG (%)</th>
                        <th class="py-3 px-4 font-semibold text-right">Qty Inspected (pcs)</th>
                        <th class="py-3 px-4 font-semibold text-right">Inspected (Lot)</th>
                        <th class="py-3 px-4 font-semibold text-right text-red-600 dark:text-red-400 font-bold">Qty NG (pcs)</th>
                        <th class="py-3 px-4 font-semibold text-right text-red-600 dark:text-red-400 font-bold">NG (Lot)</th>
                        <th class="py-3 px-4 font-semibold text-right text-green-600 dark:text-green-400 font-bold">Qty OK (pcs)</th>
                        <th class="py-3 px-4 font-semibold text-right text-green-600 dark:text-green-400 font-bold">OK (Lot)</th>
                    </tr>
                </thead>
                <tbody>
                    ${rekap
											.map(
												(row, idx) => `
                        <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 text-center">${
															idx + 1
														}</td>
                            <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium">${
															row.partName
														}</td>
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${
															row.custId
														}</td>
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${
															row.line
														}</td>
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">${
															row.keterangan
														}</td>
                            <td class="py-3 px-4 text-xs text-red-600 dark:text-red-400 text-right font-bold">${row.ngPercent.toFixed(
															2
														)}</td>
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 text-right">${row.inspPcs.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 text-right">${row.inspLot.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                            <td class="py-3 px-4 text-xs text-red-600 dark:text-red-400 text-right font-bold">${row.ngPcs.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                            <td class="py-3 px-4 text-xs text-red-600 dark:text-red-400 text-right font-bold">${row.ngLot.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                            <td class="py-3 px-4 text-xs text-green-600 dark:text-green-400 text-right">${row.okPcs.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                            <td class="py-3 px-4 text-xs text-green-600 dark:text-green-400 text-right">${row.okLot.toLocaleString(
															"en-US",
															{ minimumFractionDigits: 2 }
														)}</td>
                        </tr>
                    `
											)
											.join("")}
                    <tr class="bg-blue-100 dark:bg-slate-700/30 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white text-center">${
													rekap.length + 1
												}</td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${
													rekapTotals.partName
												}</td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${
													rekapTotals.custId
												}</td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white"></td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white"></td>
                        <td class="py-3 px-4 text-xs text-red-900 dark:text-red-400 text-right">${rekapTotals.ngPercent.toFixed(
													2
												)}</td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white text-right">${rekapTotals.inspPcs.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white text-right">${rekapTotals.inspLot.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                        <td class="py-3 px-4 text-xs text-red-900 dark:text-red-400 text-right">${rekapTotals.ngPcs.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                        <td class="py-3 px-4 text-xs text-red-900 dark:text-red-400 text-right font-bold">${rekapTotals.ngLot.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                        <td class="py-3 px-4 text-xs text-green-900 dark:text-green-400 text-right">${rekapTotals.okPcs.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                        <td class="py-3 px-4 text-xs text-green-900 dark:text-green-400 text-right font-bold">${rekapTotals.okLot.toLocaleString(
													"en-US",
													{ minimumFractionDigits: 2 }
												)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
	mainContent.appendChild(rekapSection);

	// 4. Rekap Data Jenis NG (TRIAL) per Part Name (ONLY non-zero columns)
	const defectRekapSection = document.createElement("div");
	defectRekapSection.id = "trialDefectRekapSection";
	defectRekapSection.className = "mb-6 glass-panel p-0 overflow-hidden";
	defectRekapSection.innerHTML = `
        <div class="p-4 border-b border-glass-border bg-blue-100 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 class="text-slate-800 dark:text-white font-semibold">Rekap Data Jenis NG (TRIAL) per Part Name</h3>
            <button id="exportDefectRekapTrialBtn" class="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors" title="Export to CSV">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                
            </button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-left">
                <thead class="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-200 dark:bg-slate-800/30">
                    <tr>
                        <th class="py-3 px-4 text-xs font-semibold">PartName</th>
                        ${defectRekapColumns
													.map(
														(col) =>
															`<th class="py-3 px-4 text-xs font-semibold">${col}(pcs)</th>`
													)
													.join("")}
                        <th class="py-3 px-4 text-xs font-semibold">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${defectRekap
											.map(
												(row) => `
                        <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                            <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">${
															row.partName
														}</td>
                            ${defectRekapColumns
															.map(
																(col) =>
																	`<td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 text-right">${
																		row[col] || 0
																	}</td>`
															)
															.join("")}
                            <td class="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 text-right font-bold">${
															row.total
														}</td>
                        </tr>
                    `
											)
											.join("")}
                    <tr class="bg-blue-100 dark:bg-slate-700/30 font-bold border-t-2 border-slate-300 dark:border-slate-600">
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white">${
													defectRekapTotals.partName
												}</td>
                        ${defectRekapColumns
													.map(
														(col) =>
															`<td class="py-3 px-4 text-xs text-slate-900 dark:text-white text-right">${
																defectRekapTotals[col] || 0
															}</td>`
													)
													.join("")}
                        <td class="py-3 px-4 text-xs text-slate-900 dark:text-white text-right">${
													defectRekapTotals.total
												}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;
	mainContent.appendChild(defectRekapSection);

	// 5. Charts Section (2 horizontal bar charts side by side)
	const chartsSection = document.createElement("div");
	chartsSection.id = "trialChartsSection";
	chartsSection.className = "grid grid-cols-1 lg:grid-cols-2 gap-6";

	// Left Chart - Defect Types
	const leftChartDiv = document.createElement("div");
	leftChartDiv.className = "glass-panel p-6";
	leftChartDiv.innerHTML = `
        <h3 class="text-slate-800 dark:text-white font-medium mb-4">Grafik Jenis NG (TRIAL) - Total Qty NG (pcs) per Jenis NG</h3>
        <div class="h-96">
            <canvas id="trialDefectChart"></canvas>
        </div>
    `;
	chartsSection.appendChild(leftChartDiv);

	// Right Chart - Part Name OK vs NG
	const rightChartDiv = document.createElement("div");
	rightChartDiv.className = "glass-panel p-6";
	rightChartDiv.innerHTML = `
        <h3 class="text-slate-800 dark:text-white font-medium mb-4">Grafik Qty OK & Qty NG (pcs) per PartName</h3>
        <div class="h-96">
            <canvas id="trialPartChart"></canvas>
        </div>
    `;
	chartsSection.appendChild(rightChartDiv);

	mainContent.appendChild(chartsSection);

	// 6. Render Charts
	setTimeout(() => {
		const isDark = document.documentElement.classList.contains("dark");
		const textColor = isDark ? "#94a3b8" : "#475569";
		const labelColor = isDark ? "#fff" : "#1e293b";
		const gridColor = isDark
			? "rgba(255, 255, 255, 0.1)"
			: "rgba(0, 0, 0, 0.1)";

		// Export functionality for Full Data TRIAL
		document
			.getElementById("exportFullTrialBtn")
			?.addEventListener("click", (e) => {
				e.preventDefault();
				e.stopPropagation();

				// Prepare data
				const exportData = fullData.map((row, index) => ({
					No: index + 1,
					Line: row.line || "",
					Date: formatDate(row.date),
					Shift: row.shift || "",
					"Cust.ID": row.custId || "",
					"Part.ID": row.partId || "",
					PartName: row.partName || "",
					Kategori: row.kategori || "",
					"No.Jig": row.noJig || "",
					NoCard: row.noCard || "",
					"Std Load": row.stdLoad || 0,
					"NoB/H": row.noBH || "",
					NoBak: row.noBak || "",
					Keterangan: row.keterangan || "",
					"M/C No.": row.mcNo || "",
					"Insp(B/H)": row.inspBH,
					"NG(B/H)": row.ngBH,
					"OK(B/H)": row.okBH,
					"NG_%": row.ngPercent,
					"OK(pcs)": row.okPcs,
					"Qty(NG)": row.qtyNG,
					QInspec: row.qInspec,
					"Insp(Lot)": row.inspLot,
					"OK(Lot)": row.okLot,
					"NG(Lot)": row.ngLot,
				}));

				const ws = XLSX.utils.json_to_sheet(exportData);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Data TRIAL");

				const timestamp = new Date().toISOString().split("T")[0];
				XLSX.writeFile(wb, `Full_Data_TRIAL_${timestamp}.xlsx`);
			});

		// Defect Chart (Horizontal Bar)
		const ctx1 = document.getElementById("trialDefectChart");
		if (ctx1) {
			if (state.charts.trialDefect) state.charts.trialDefect.destroy();

			state.charts.trialDefect = new Chart(ctx1.getContext("2d"), {
				type: "bar",
				data: charts.defects,
				options: {
					indexAxis: "y",
					responsive: true,
					maintainAspectRatio: false,
					plugins: {
						legend: { display: false },
						datalabels: {
							anchor: "end",
							align: "end",
							color: textColor,
							font: { weight: "bold", size: 10 },
							formatter: (value) => (value > 0 ? value : ""),
						},
					},
					scales: {
						x: {
							grid: { color: gridColor },
							ticks: { color: labelColor },
						},
						y: {
							grid: { display: false },
							ticks: { color: textColor, font: { size: 9 } },
						},
					},
				},
			});
		}

		// Part Chart (Horizontal Stacked Bar)
		const ctx2 = document.getElementById("trialPartChart");
		if (ctx2) {
			if (state.charts.trialPart) state.charts.trialPart.destroy();

			state.charts.trialPart = new Chart(ctx2.getContext("2d"), {
				type: "bar",
				data: charts.parts,
				options: {
					indexAxis: "y",
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						x: {
							stacked: true,
							grid: { color: gridColor },
							ticks: { color: labelColor },
						},
						y: {
							stacked: true,
							grid: { display: false },
							ticks: { color: textColor, font: { size: 10 } },
						},
					},
					plugins: {
						legend: {
							labels: { color: labelColor },
							position: "top",
						},
						datalabels: {
							color: "#74cfdfff", // Keep white primarily for contrast on colored bars
							font: { weight: "bold", size: 10 },
							formatter: (value) => (value > 0 ? value : ""),
						},
					},
				},
			});
		}
	}, 100);

	// Export functionality for Rekap Data Trial
	setTimeout(() => {
		document
			.getElementById("exportRekapTrialBtn")
			?.addEventListener("click", () => {
				// Prepare data in correct format for Excel export
				const exportData = rekap.map((row, index) => ({
					No: index + 1,
					PartName: row.partName,
					"Cust.ID": row.custId,
					Line: row.line,
					Keterangan: row.keterangan,
					"NG (%)": row.ngPercent,
					"Qty Inspected (pcs)": row.inspPcs,
					"Inspected (Lot)": row.inspLot,
					"Qty NG (pcs)": row.ngPcs,
					"NG (Lot)": row.ngLot,
					"Qty OK (pcs)": row.okPcs,
					"OK (Lot)": row.okLot,
				}));

				// Add total row
				exportData.push({
					No: rekap.length + 1,
					PartName: rekapTotals.partName,
					"Cust.ID": rekapTotals.custId,
					Line: "",
					Keterangan: "",
					"NG (%)": rekapTotals.ngPercent,
					"Qty Inspected (pcs)": rekapTotals.inspPcs,
					"Inspected (Lot)": rekapTotals.inspLot,
					"Qty NG (pcs)": rekapTotals.ngPcs,
					"NG (Lot)": rekapTotals.ngLot,
					"Qty OK (pcs)": rekapTotals.okPcs,
					"OK (Lot)": rekapTotals.okLot,
				});

				// Create worksheet and workbook
				const ws = XLSX.utils.json_to_sheet(exportData);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Rekap Data Trial");

				// Generate filename with timestamp
				const timestamp = new Date().toISOString().split("T")[0];
				XLSX.writeFile(wb, `Rekap_Data_Trial_${timestamp}.xlsx`);
			});

		// Export functionality for Rekap Data Jenis NG
		document
			.getElementById("exportDefectRekapTrialBtn")
			?.addEventListener("click", () => {
				// Prepare data with dynamic columns
				const exportData = defectRekap.map((row) => {
					const rowData = {
						PartName: row.partName,
					};

					// Add defect columns
					defectRekapColumns.forEach((col) => {
						rowData[`${col}(pcs)`] = row[col] || 0;
					});

					rowData["TOTAL"] = row.total;

					return rowData;
				});

				// Add total row
				const totalRow = {
					PartName: defectRekapTotals.partName,
				};
				defectRekapColumns.forEach((col) => {
					totalRow[`${col}(pcs)`] = defectRekapTotals[col] || 0;
				});
				totalRow["TOTAL"] = defectRekapTotals.total;

				exportData.push(totalRow);

				// Create worksheet and workbook
				const ws = XLSX.utils.json_to_sheet(exportData);
				const wb = XLSX.utils.book_new();
				XLSX.utils.book_append_sheet(wb, ws, "Rekap Jenis NG Trial");

				// Generate filename with timestamp
				const timestamp = new Date().toISOString().split("T")[0];
				XLSX.writeFile(wb, `Rekap_Jenis_NG_Trial_${timestamp}.xlsx`);
			});
	}, 150);
};

// === FILTERING FUNCTIONS ===

const setupFilteringEventListeners = (uniquePartNames) => {
	// Tab switching
	const filterTab1 = document.getElementById("filterTab1");
	const filterTab2 = document.getElementById("filterTab2");
	const filterTab3 = document.getElementById("filterTab3");

	const filterByPartNameContent = document.getElementById(
		"filterByPartNameContent"
	);
	const multiFilterContent = document.getElementById("multiFilterContent");
	const filterLineContent = document.getElementById("filterLineContent");

	const switchFilterTab = (tabNum) => {
		// Remove active classes
		[filterTab1, filterTab2, filterTab3].forEach((tab) => {
			tab?.classList.remove(
				"bg-blue-600",
				"border-b-2",
				"border-blue-600",
				"text-white"
			);
			tab?.classList.add("text-slate-400");
		});

		// Hide all content
		filterByPartNameContent?.classList.add("hidden");
		multiFilterContent?.classList.add("hidden");
		filterLineContent?.classList.add("hidden");

		// Show selected tab
		if (tabNum === 1) {
			filterTab1?.classList.add(
				"bg-blue-600",
				"border-b-2",
				"border-blue-600",
				"text-white"
			);
			filterTab1?.classList.remove("text-slate-400");
			filterByPartNameContent?.classList.remove("hidden");
			// Refresh data to match trial toggle state
			if (filteringState.selectedPartNames.length > 0) applyPartNameFilter();
		} else if (tabNum === 2) {
			filterTab2?.classList.add(
				"bg-blue-600",
				"border-b-2",
				"border-blue-600",
				"text-white"
			);
			filterTab2?.classList.remove("text-slate-400");
			multiFilterContent?.classList.remove("hidden");
			// Initialize multi filter UI when tab is clicked
			setTimeout(() => {
				initMultiFilterUI();
				// Also refresh if there are existing results
				const resultsContainer = document.getElementById("multiFilterResultsContainer");
				if (resultsContainer && !resultsContainer.classList.contains("hidden")) {
					applyMultiFilter();
				}
			}, 50);
		} else if (tabNum === 3) {
			filterTab3?.classList.add(
				"bg-blue-600",
				"border-b-2",
				"border-blue-600",
				"text-white"
			);
			filterTab3?.classList.remove("text-slate-400");
			filterLineContent?.classList.remove("hidden");
			// Tab 3 data is handled by setupDailyChartListeners and its internal state
			processDailyData();
			renderDailyChart();
		}
	};

	// Trial Checkbox Listener
	const trialCheckbox = document.getElementById("includeTrialFilterCheckbox");
	if (trialCheckbox) {
		trialCheckbox.addEventListener("change", (e) => {
			const isChecked = e.target.checked;
			filteringState.includeTrialData = isChecked;
			
			// Detect the active tab by checking which content div is currently visible
			const isTab1Active = !document.getElementById("filterByPartNameContent").classList.contains("hidden");
			const isTab2Active = !document.getElementById("multiFilterContent").classList.contains("hidden");
			const isTab3Active = !document.getElementById("filterLineContent").classList.contains("hidden");

			if (isTab1Active) {
				// Refresh Tab 1: Filter by PartName
				applyPartNameFilter();
			} else if (isTab2Active) {
				// Refresh Tab 2: Multi Filter - only if results are currently shown
				const resultsContainer = document.getElementById("multiFilterResultsContainer");
				if (resultsContainer && !resultsContainer.classList.contains("hidden")) {
					applyMultiFilter();
				}
			} else if (isTab3Active) {
				// Refresh Tab 3: Periodical Chart
				processDailyData();
				renderDailyChart();
				
				if (filteringState.selectedDefectType) {
					processDefectDailyData(filteringState.selectedDefectType);
					renderDefectDailyChart(filteringState.selectedDefectType);
					
					// Also refresh the part-level details if they exist
					if (typeof processDefectPartData === "function" && typeof renderDefectPartTables === "function") {
						processDefectPartData();
						renderDefectPartTables();
					}
				}
			}
		});
	}

	filterTab1?.addEventListener("click", () => switchFilterTab(1));
	filterTab2?.addEventListener("click", () => switchFilterTab(2));
	filterTab3?.addEventListener("click", () => switchFilterTab(3));

	// PartName multi-select functionality
	const searchInput = document.getElementById("partNameSearchInput");
	const dropdown = document.getElementById("partNameDropdown");
	const tagsContainer = document.getElementById("partNameTagsContainer");
	const applyBtn = document.getElementById("applyPartNameFilterBtn");
	const clearBtn = document.getElementById("clearPartNameFilterBtn");

	// Show/hide dropdown on focus AND click
	searchInput?.addEventListener("focus", () => {
		dropdown?.classList.remove("hidden");
	});

	searchInput?.addEventListener("click", () => {
		dropdown?.classList.remove("hidden");
	});

	// Filter dropdown options based on search
	searchInput?.addEventListener("input", (e) => {
		const searchTerm = e.target.value.toLowerCase();
		const options = dropdown?.querySelectorAll(".partname-option");

		options?.forEach((option) => {
			const partName = option.getAttribute("data-partname").toLowerCase();
			if (partName.includes(searchTerm)) {
				option.classList.remove("hidden");
			} else {
				option.classList.add("hidden");
			}
		});
	});

	// Handle option click
	dropdown?.addEventListener("click", (e) => {
		const option = e.target.closest(".partname-option");
		if (option) {
			const partName = option.getAttribute("data-partname");

			// Add to selected if not already selected
			if (!filteringState.selectedPartNames.includes(partName)) {
				filteringState.selectedPartNames.push(partName);
				renderPartNameTags();
				updateFilterButtons();
			}

			// Clear search and hide dropdown
			searchInput.value = "";
			dropdown.classList.add("hidden");

			// Reset dropdown options visibility
			dropdown.querySelectorAll(".partname-option").forEach((opt) => {
				opt.classList.remove("hidden");
			});
		}
	});

	// Hide dropdown when clicking outside
	document.addEventListener("click", (e) => {
		if (!searchInput?.contains(e.target) && !dropdown?.contains(e.target)) {
			dropdown?.classList.add("hidden");
		}
	});

	const renderPartNameTags = () => {
		if (!tagsContainer) return;

		tagsContainer.innerHTML = filteringState.selectedPartNames
			.map(
				(partName) => `
            <div class="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded">
                <span>${
									partName.length > 20
										? partName.substring(0, 20) + "..."
										: partName
								}</span>
                <button class="remove-tag hover:bg-red-700 rounded-full p-0.5" data-partname="${partName}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `
			)
			.join("");

		// Add remove tag event listeners
		tagsContainer.querySelectorAll(".remove-tag").forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const partName = e.currentTarget.getAttribute("data-partname");
				filteringState.selectedPartNames =
					filteringState.selectedPartNames.filter((p) => p !== partName);
				renderPartNameTags();
				updateFilterButtons();
			});
		});
	};

	const updateFilterButtons = () => {
		const hasSelection = filteringState.selectedPartNames.length > 0;
		applyBtn.disabled = !hasSelection;
		clearBtn.disabled = !hasSelection;
	};

	// Apply filter
	applyBtn?.addEventListener("click", () => {
		applyPartNameFilter();
	});

	// Clear filter
	clearBtn?.addEventListener("click", () => {
		filteringState.selectedPartNames = [];
		filteringState.filteredData = [];
		filteringState.partNamePeriodicalData = [];
		if (state.charts.partNamePeriodicalChart) {
			state.charts.partNamePeriodicalChart.destroy();
			state.charts.partNamePeriodicalChart = null;
		}
		renderPartNameTags();
		updateFilterButtons();
		document.getElementById("filterResultsContainer")?.classList.add("hidden");
	});

	// Export CSV
	const exportPartNamePreviewBtn = document.getElementById(
		"exportPartNamePreviewBtn"
	);
	exportPartNamePreviewBtn?.addEventListener("click", () => {
		if (filteringState.filteredData.length === 0) return;

		// Use XLSX to export to CSV
		const ws = XLSX.utils.json_to_sheet(filteringState.filteredData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "FilteredData");
		XLSX.writeFile(wb, "Filtered_Data_By_PartName.csv");
	});

	// Multi Filter Event Listeners
	const applyMultiFilterBtn = document.getElementById("applyMultiFilterBtn");
	const clearMultiFilterBtn = document.getElementById("clearMultiFilterBtn");

	if (applyMultiFilterBtn) {
		applyMultiFilterBtn.addEventListener("click", applyMultiFilter);
	}

	if (clearMultiFilterBtn) {
		clearMultiFilterBtn.addEventListener("click", clearMultiFilter);
	}

	// Export Multi Preview
	const multiPreviewDetails = document.getElementById("multiPreviewDetails");
	const exportMultiPreviewBtn = document.getElementById("exportMultiPreviewBtn");
	
	if (multiPreviewDetails && exportMultiPreviewBtn) {
		multiPreviewDetails.addEventListener("toggle", function() {
			const wrapper = this.querySelector(".export-btn-wrapper");
			if (wrapper) {
				if (this.open) wrapper.classList.remove("hidden");
				else wrapper.classList.add("hidden");
			}
		});
		
		exportMultiPreviewBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			exportMultiPreviewDataToCSV();
		});
	}

	// Export Multi Grouped
	const multiGroupedDetails = document.getElementById("multiGroupedDetails");
	const exportMultiGroupedBtn = document.getElementById("exportMultiGroupedBtn");
	
	if (multiGroupedDetails && exportMultiGroupedBtn) {
		multiGroupedDetails.addEventListener("toggle", function() {
			const wrapper = this.querySelector(".export-btn-wrapper");
			if (wrapper) {
				if (this.open) wrapper.classList.remove("hidden");
				else wrapper.classList.add("hidden");
			}
		});
		
		exportMultiGroupedBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			exportMultiGroupedDataToCSV();
		});
	}

	// PartName Periodical Chart Timeframe listener
	const partNameTimeframeSelect = document.getElementById("partNameTimeframeSelect");
	if (partNameTimeframeSelect) {
		partNameTimeframeSelect.addEventListener("change", (e) => {
			filteringState.partNameSelectedTimeframe = e.target.value;
			processPartNamePeriodicalData();
			renderPartNamePeriodicalChart();
		});
	}

	// Multi Filter Periodical Chart Timeframe listener
	const multiFilterTimeframeSelect = document.getElementById("multiFilterTimeframeSelect");
	if (multiFilterTimeframeSelect) {
		multiFilterTimeframeSelect.addEventListener("change", (e) => {
			filteringState.multiFilterSelectedTimeframe = e.target.value;
			processMultiFilterPeriodicalData();
			renderMultiFilterPeriodicalChart();
		});
	}
};

const processPartNamePeriodicalData = () => {
	if (filteringState.selectedPartNames.length === 0 || !state.processedData) return;

	const timeframe = filteringState.partNameSelectedTimeframe || "Monthly";

	// Group by timeframe
	const groups = {};

	filteringState.filteredData.forEach((row) => {
		const dateObj = row["DateObj"];
		if (!dateObj || isNaN(dateObj)) return;

		let groupKey;
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		if (timeframe === "Weekly") {
			const dayOfWeek = dateObj.getDay(); 
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(dateObj);
			monday.setDate(dateObj.getDate() + diff);
			
			const d = String(monday.getDate()).padStart(2, "0");
			const m = monthNames[monday.getMonth()];
			const y = String(monday.getFullYear()).slice(-2);
			groupKey = `W${getWeekNumber(monday)} (${d}-${m}-${y})`;
		} else if (timeframe === "Monthly") {
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${m}-${y}`;
		} else if (timeframe === "Yearly") {
			groupKey = String(dateObj.getFullYear());
		} else {
			// Daily
			const d = String(dateObj.getDate()).padStart(2, "0");
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${d}-${m}-${y}`;
		}

		if (!groups[groupKey]) {
			groups[groupKey] = {
				date: groupKey,
				dateObj: new Date(dateObj),
				inspLot: 0,
				ngLot: 0,
				sumNGPercent: 0,
				count: 0,
			};
			
			if (timeframe === "Weekly") {
				const dayOfWeek = dateObj.getDay();
				const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
				groups[groupKey].dateObj.setDate(dateObj.getDate() + diff);
			} else if (timeframe === "Monthly") {
				groups[groupKey].dateObj.setDate(1);
			} else if (timeframe === "Yearly") {
				groups[groupKey].dateObj.setMonth(0, 1);
			}
		}

		groups[groupKey].inspLot += Number(row["Insp(Lot)"]) || 0;
		groups[groupKey].ngLot += Number(row["NG(Lot)"]) || 0;

		if (row["NG_%"] !== undefined && row["NG_%"] !== null) {
			groups[groupKey].sumNGPercent += Number(row["NG_%"]);
			groups[groupKey].count += 1;
		}
	});

	const dailyArray = Object.values(groups).sort(
		(a, b) => a.dateObj - b.dateObj
	);

	dailyArray.forEach((group) => {
		group.ngPercent = group.count > 0 ? group.sumNGPercent / group.count : 0;
	});

	filteringState.partNamePeriodicalData = dailyArray;
};

const renderPartNamePeriodicalChart = () => {
	const canvas = document.getElementById("partNamePeriodicalChart");
	const titleElement = document.getElementById("partNamePeriodicalChartTitle");

	if (!canvas) return;
	
	if (filteringState.partNamePeriodicalData.length === 0) {
		if (state.charts.partNamePeriodicalChart) {
			state.charts.partNamePeriodicalChart.destroy();
			state.charts.partNamePeriodicalChart = null;
		}
		return;
	}

	const timeframe = filteringState.partNameSelectedTimeframe || "Monthly";
	const timeframeLabel = timeframe === "Daily" ? "Harian" : 
						 timeframe === "Weekly" ? "Mingguan" :
						 timeframe === "Monthly" ? "Bulanan" : "Tahunan";

	// Update title
	if (titleElement) {
		const partsText = filteringState.selectedPartNames.length > 2 
			? `${filteringState.selectedPartNames.length} parts selected`
			: filteringState.selectedPartNames.join(", ");
		titleElement.textContent = `Rata-rata NG (%) ${timeframeLabel} & Total Inspected (Lot) - ${partsText}`;
	}

	// Destroy existing chart
	if (state.charts.partNamePeriodicalChart) {
		state.charts.partNamePeriodicalChart.destroy();
	}

	// Prepare data
	const labels = filteringState.partNamePeriodicalData.map((d) => d.date);
	const inspData = filteringState.partNamePeriodicalData.map((d) => d.inspLot);
	const ngData = filteringState.partNamePeriodicalData.map((d) => d.ngPercent);

	const maxInsp = Math.max(...inspData, 0);
	const maxNG = Math.max(...ngData, 0);

	const isDark = document.documentElement.classList.contains("dark");
	const gridColor = isDark ? "#334155" : "rgba(0, 0, 0, 0.1)";
	const tickColor = isDark ? "#94a3b8" : "#475569";
	const titleColor = isDark ? "#ffffff" : "#1e293b";

	const ctx = canvas.getContext("2d");
	state.charts.partNamePeriodicalChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					label: "Total Inspected (Lot)",
					data: inspData,
					backgroundColor: "#364474ff",
					borderColor: "#364474ff",
					borderWidth: 1,
					yAxisID: "y",
					order: 2,
				},
				{
					label: "NG (%)",
					data: ngData,
					type: "line",
					borderColor: "#ef4444",
					backgroundColor: "#ef4444",
					borderWidth: 2,
					pointRadius: 4,
					pointBackgroundColor: "#ef4444",
					pointBorderColor: "#fff",
					pointBorderWidth: 1,
					yAxisID: "y1",
					order: 1,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						color: tickColor,
						font: { size: 11 },
						padding: 10,
					},
				},
				title: { display: false },
				datalabels: { display: false },
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					beginAtZero: true,
					suggestedMax: maxInsp * 1.1,
					title: {
						display: true,
						text: "Total Inspected (Lot)",
						color: "#ecb34aff",
						font: { size: 11, weight: "bold" },
					},
					grid: { color: gridColor },
					ticks: {
						color: tickColor,
						font: { size: 10 },
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					beginAtZero: true,
					min: 0,
					suggestedMax: maxNG * 1.1,
					title: {
						display: true,
						text: "NG (%)",
						color: "#ef4444",
						font: { size: 11, weight: "bold" },
					},
					grid: { drawOnChartArea: false },
					ticks: {
						color: "#ef4444",
						font: { size: 10 },
						callback: function (value) {
							return value.toFixed(2) + "%";
						},
					},
				},
				x: {
					title: {
						display: true,
						text: timeframe === "Daily" ? "Tanggal" : 
							  timeframe === "Weekly" ? "Minggu" :
							  timeframe === "Monthly" ? "Bulan" : "Tahun",
						color: titleColor,
						font: { size: 11 },
					},
					grid: { display: false },
					ticks: {
						color: tickColor,
						font: { size: 9 },
						maxRotation: 45,
						minRotation: 45,
					},
				},
			},
		},
	});
};

const processMultiFilterPeriodicalData = () => {
	if (filteringState.multiFilteredData.length === 0) return;

	const timeframe = filteringState.multiFilterSelectedTimeframe || "Daily";

	// Group by timeframe
	const groups = {};

	filteringState.multiFilteredData.forEach((row) => {
		const dateObj = row["DateObj"];
		if (!dateObj || isNaN(dateObj)) return;

		let groupKey;
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		if (timeframe === "Weekly") {
			const dayOfWeek = dateObj.getDay(); 
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(dateObj);
			monday.setDate(dateObj.getDate() + diff);
			
			const d = String(monday.getDate()).padStart(2, "0");
			const m = monthNames[monday.getMonth()];
			const y = String(monday.getFullYear()).slice(-2);
			groupKey = `W${getWeekNumber(monday)} (${d}-${m}-${y})`;
		} else if (timeframe === "Monthly") {
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${m}-${y}`;
		} else if (timeframe === "Yearly") {
			groupKey = String(dateObj.getFullYear());
		} else {
			// Daily
			const d = String(dateObj.getDate()).padStart(2, "0");
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${d}-${m}-${y}`;
		}

		if (!groups[groupKey]) {
			groups[groupKey] = {
				date: groupKey,
				dateObj: new Date(dateObj),
				inspLot: 0,
				ngLot: 0,
				sumNGPercent: 0,
				count: 0,
			};
			
			if (timeframe === "Weekly") {
				const dayOfWeek = dateObj.getDay();
				const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
				groups[groupKey].dateObj.setDate(dateObj.getDate() + diff);
			} else if (timeframe === "Monthly") {
				groups[groupKey].dateObj.setDate(1);
			} else if (timeframe === "Yearly") {
				groups[groupKey].dateObj.setMonth(0, 1);
			}
		}

		groups[groupKey].inspLot += Number(row["Insp(Lot)"]) || 0;
		groups[groupKey].ngLot += Number(row["NG(Lot)"]) || 0;

		if (row["NG_%"] !== undefined && row["NG_%"] !== null) {
			groups[groupKey].sumNGPercent += Number(row["NG_%"]);
			groups[groupKey].count += 1;
		}
	});

	const periodicalArray = Object.values(groups).sort(
		(a, b) => a.dateObj - b.dateObj
	);

	periodicalArray.forEach((group) => {
		group.ngPercent = group.count > 0 ? group.sumNGPercent / group.count : 0;
	});

	filteringState.multiFilterPeriodicalData = periodicalArray;
};

const renderMultiFilterPeriodicalChart = () => {
	const canvas = document.getElementById("multiFilterPeriodicalChart");
	const titleElement = document.getElementById("multiFilterPeriodicalChartTitle");

	if (!canvas) return;
	
	if (filteringState.multiFilterPeriodicalData.length === 0) {
		if (state.charts.multiFilterPeriodicalChart) {
			state.charts.multiFilterPeriodicalChart.destroy();
			state.charts.multiFilterPeriodicalChart = null;
		}
		return;
	}

	const timeframe = filteringState.multiFilterSelectedTimeframe || "Daily";
	const timeframeLabel = timeframe === "Daily" ? "Harian" : 
						 timeframe === "Weekly" ? "Mingguan" :
						 timeframe === "Monthly" ? "Bulanan" : "Tahunan";

	// Update title
	if (titleElement) {
		titleElement.textContent = `Rata-rata NG (%) ${timeframeLabel} & Total Inspected (Lot) - Multi Filtered Results`;
	}

	// Destroy existing chart
	if (state.charts.multiFilterPeriodicalChart) {
		state.charts.multiFilterPeriodicalChart.destroy();
	}

	// Prepare data
	const labels = filteringState.multiFilterPeriodicalData.map((d) => d.date);
	const inspData = filteringState.multiFilterPeriodicalData.map((d) => d.inspLot);
	const ngData = filteringState.multiFilterPeriodicalData.map((d) => d.ngPercent);

	const maxInsp = Math.max(...inspData, 0);
	const maxNG = Math.max(...ngData, 0);

	const isDark = document.documentElement.classList.contains("dark");
	const gridColor = isDark ? "#334155" : "rgba(0, 0, 0, 0.1)";
	const tickColor = isDark ? "#94a3b8" : "#475569";
	const titleColor = isDark ? "#ffffff" : "#1e293b";

	const ctx = canvas.getContext("2d");
	state.charts.multiFilterPeriodicalChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					label: "Total Inspected (Lot)",
					data: inspData,
					backgroundColor: "#364474ff",
					borderColor: "#364474ff",
					borderWidth: 1,
					yAxisID: "y",
					order: 2,
				},
				{
					label: "NG (%)",
					data: ngData,
					type: "line",
					borderColor: "#ef4444",
					backgroundColor: "#ef4444",
					borderWidth: 2,
					pointRadius: 4,
					pointBackgroundColor: "#ef4444",
					pointBorderColor: "#fff",
					pointBorderWidth: 1,
					yAxisID: "y1",
					order: 1,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						color: tickColor,
						font: { size: 11 },
						padding: 10,
					},
				},
				title: { display: false },
				datalabels: { display: false },
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					beginAtZero: true,
					suggestedMax: maxInsp * 1.1,
					title: {
						display: true,
						text: "Total Inspected (Lot)",
						color: "#364474ff",
						font: { size: 11, weight: "bold" },
					},
					grid: { color: gridColor },
					ticks: {
						color: tickColor,
						font: { size: 10 },
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					beginAtZero: true,
					min: 0,
					suggestedMax: maxNG * 1.1,
					title: {
						display: true,
						text: "NG (%)",
						color: "#ef4444",
						font: { size: 11, weight: "bold" },
					},
					grid: { drawOnChartArea: false },
					ticks: {
						color: "#ef4444",
						font: { size: 10 },
						callback: function (value) {
							return value.toFixed(2) + "%";
						},
					},
				},
				x: {
					title: {
						display: true,
						text: timeframe === "Daily" ? "Tanggal" : 
							  timeframe === "Weekly" ? "Minggu" :
							  timeframe === "Monthly" ? "Bulan" : "Tahun",
						color: titleColor,
						font: { size: 11 },
					},
					grid: { display: false },
					ticks: {
						color: tickColor,
						font: { size: 9 },
						maxRotation: 45,
						minRotation: 45,
					},
				},
			},
		},
	});
};

const applyPartNameFilter = () => {
	if (filteringState.selectedPartNames.length === 0 || !state.processedData) {
		const resultsContainer = document.getElementById("filterResultsContainer");
		resultsContainer?.classList.add("hidden");
		filteringState.filteredData = [];
		return;
	}

	// Filter data
	filteringState.filteredData = state.processedData.filter((row) => {
		const partMatch = filteringState.selectedPartNames.includes(row.partName);
		const trialMatch = filteringState.includeTrialData || !row.isTrial;
		return partMatch && trialMatch;
	});

	// Show results
	const resultsContainer = document.getElementById("filterResultsContainer");
	resultsContainer?.classList.remove("hidden");

	// Update preview text
	const previewText = document.getElementById("filterPreviewText");
	if (previewText) {
		previewText.textContent = `Found ${
			filteringState.filteredData.length
		} records for: ${filteringState.selectedPartNames.join(", ")}`;
	}

	// Render tables
	renderFullPreviewTable();
	processPartNamePeriodicalData();
	renderPartNamePeriodicalChart();
	renderDefectByPartNameTable();
	renderParetoDefectChart();
	renderSummaryByPartNameTable();
};

const renderParetoDefectChart = () => {
	const canvas = document.getElementById("paretoDefectChart");
	if (!canvas) return;

	if (filteringState.filteredData.length === 0) {
		if (window.paretoDefectChartInstance) {
			window.paretoDefectChartInstance.destroy();
			window.paretoDefectChartInstance = null;
		}
		return;
	}

	// Get all defect columns
	const allDefectColumns = [
		"Warna",
		"Buram",
		"Berbayang",
		"Kotor",
		"Tdk Terplating",
		"Rontok/ Blister",
		"Tipis/ EE No Plating",
		"Flek Kuning",
		"Terbakar",
		"Watermark",
		"Jig Mark/ Renggang",
		"Lecet/ Scratch",
		"Seret",
		"Flek Hitam",
		"Flek Tangan",
		"Belang/ Dempet",
		"Bintik",
		"Kilap",
		"Tebal",
		"Flek Putih",
		"Spark",
		"Kotor H/ Oval",
		"Terkikis/ Crack",
		"Dimensi/ Penyok",
		"MTL/ SLipMelintir",
	];

	// Calculate totals for each defect type (excluding MTL for total calculation)
	const defectTotals = {};
	filteringState.filteredData.forEach((row) => {
		allDefectColumns.forEach((defectName) => {
			const colName = defectName + "(pcs)";
			const value = Number(row[colName]) || 0;

			if (!defectTotals[defectName]) {
				defectTotals[defectName] = 0;
			}
			defectTotals[defectName] += value;
		});
	});

	// Filter and sort defects with values > 0, excluding MTL from cumulative
	const defectsArray = allDefectColumns
		.filter((defect) => defectTotals[defect] > 0)
		.map((defect) => ({
			name: defect,
			value: defectTotals[defect],
			includedInTotal: defect !== "MTL/ SLipMelintir",
		}))
		.sort((a, b) => b.value - a.value);

	if (defectsArray.length === 0) return;

	// Calculate total (excluding MTL)
	const totalNG = defectsArray
		.filter((d) => d.includedInTotal)
		.reduce((sum, d) => sum + d.value, 0);

	// Calculate cumulative percentages
	let cumulative = 0;
	const labels = [];
	const values = [];
	const cumulativePercents = [];

	defectsArray.forEach((defect) => {
		labels.push(defect.name + "(pcs)");
		values.push(defect.value);

		if (defect.includedInTotal) {
			cumulative += defect.value;
			cumulativePercents.push(((cumulative / totalNG) * 100).toFixed(1));
		} else {
			// For MTL, show previous cumulative
			cumulativePercents.push(
				cumulativePercents[cumulativePercents.length - 1] || 0
			);
		}
	});

	// Destroy existing chart if it exists
	if (window.paretoDefectChartInstance) {
		window.paretoDefectChartInstance.destroy();
	}

	// Create chart
	const ctx = canvas.getContext("2d");
	window.paretoDefectChartInstance = new Chart(ctx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					type: "bar",
					label: "Qty NG (pcs)",
					data: values,
					backgroundColor: "rgba(59, 130, 246, 0.8)",
					borderColor: "rgba(59, 130, 246, 1)",
					borderWidth: 1,
					yAxisID: "y",
					order: 2,
				},
				{
					type: "line",
					label: "Cumulative %",
					data: cumulativePercents,
					borderColor: "rgba(251, 191, 36, 1)",
					backgroundColor: "rgba(251, 191, 36, 0.2)",
					borderWidth: 2,
					pointRadius: 5,
					pointHoverRadius: 7,
					pointBackgroundColor: "rgba(251, 191, 36, 1)",
					yAxisID: "y1",
					order: 1,
					tension: 0.3,
					borderDash: [5, 5],
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				title: {
					display: false,
				},
				legend: {
					display: true,
					position: "bottom",
					labels: {
						color: "#94a3b8",
						font: { size: 12 },
						padding: 15,
						usePointStyle: true,
					},
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							let label = context.dataset.label || "";
							if (label) {
								label += ": ";
							}
							if (context.parsed.y !== null) {
								if (context.dataset.yAxisID === "y1") {
									label += context.parsed.y + "%";
								} else {
									label += context.parsed.y.toLocaleString();
								}
							}
							return label;
						},
					},
				},
				datalabels: {
					display: function (context) {
						// Show values on bars
						return context.dataset.type === "bar";
					},
					color: "#fff",
					anchor: "end",
					align: "top",
					offset: 4,
					font: { size: 10, weight: "bold" },
					formatter: (value) => (value > 0 ? value : ""),
				},
			},
			scales: {
				x: {
					grid: { color: "rgba(148, 163, 184, 0.1)" },
					ticks: {
						color: "#94a3b8",
						font: { size: 11 },
						maxRotation: 45,
						minRotation: 45,
					},
				},
				y: {
					type: "linear",
					position: "left",
					title: {
						display: true,
						text: "Qty NG (pcs)",
						color: "#94a3b8",
						font: { size: 12 },
					},
					grid: { color: "rgba(148, 163, 184, 0.1)" },
					ticks: {
						color: "#94a3b8",
						font: { size: 11 },
					},
				},
				y1: {
					type: "linear",
					position: "right",
					min: 0,
					max: 100,
					title: {
						display: true,
						text: "Cumulative %",
						color: "#94a3b8",
						font: { size: 12 },
					},
					grid: { drawOnChartArea: false },
					ticks: {
						color: "#94a3b8",
						font: { size: 11 },
						callback: function (value) {
							return value + "%";
						},
					},
				},
			},
		},
		plugins: [ChartDataLabels],
	});
};

const renderFullPreviewTable = () => {
	const headerRow = document.getElementById("fullPreviewTableHeader");
	const tbody = document.getElementById("fullPreviewTableBody");

	if (!headerRow || !tbody) return;

	if (filteringState.filteredData.length === 0) {
		headerRow.innerHTML = "";
		tbody.innerHTML = "";
		return;
	}

	// Get all column names from first row
	const allColumns =
		filteringState.filteredData.length > 0
			? Object.keys(filteringState.filteredData[0])
			: [];

	// Define column order (matching app.py)
	const columnOrder = [
		"Line",
		"Date",
		"Shift",
		"NoJig",
		"NoCard",
		"Std Load",
		"NoBH_NoLoMTL",
		"NoBak",
		"Part.ID",
		"PartName",
		"OK(pcs)",
		"QInspec",
		"Insp(B/H)",
		"OK(B/H)",
		"NG(B/H)",
		"% NG",
		"NG_%",
		"Warna",
		"Buram",
		"Berbayang",
		"Kotor",
		"Tdk Terplating",
		"Rontok/ Blister",
		"Tipis/ EE No Plating",
		"Flek Kuning",
		"Terbakar",
		"Watermark",
		"Jig Mark/ Renggang",
		"Lecet/ Scratch",
		"Seret",
		"Flek Hitam",
		"Flek Tangan",
		"Belang/ Dempet",
		"Bintik",
		"Kilap",
		"Tebal",
		"Flek Putih",
		"Spark",
		"Kotor H/ Oval",
		"Terkikis/ Crack",
		"Dimensi/ Penyok",
		"MTL/ SLipMelintir",
		"Kategori",
	];

	// Filter columns that actually exist in data and sort by columnOrder
	const displayColumns = columnOrder.filter((col) => allColumns.includes(col));
	// Add any remaining columns not in columnOrder
	const remainingColumns = allColumns.filter(
		(col) => !columnOrder.includes(col)
	);
	const finalColumns = [...displayColumns, ...remainingColumns];

	// Build header
	let headerHTML =
		'<th class="py-3 px-4 font-semibold text-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600">#</th>';
	finalColumns.forEach((col) => {
		headerHTML += `<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 whitespace-nowrap">${col}</th>`;
	});
	headerRow.innerHTML = headerHTML;

	// Build rows (limit to first 100 rows for performance)
	let rowHTML = "";
	const displayRows = filteringState.filteredData.slice(0, 100);

	displayRows.forEach((row, idx) => {
		rowHTML += `<tr class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white text-center border border-slate-200 dark:border-slate-700">${
			idx + 1
		}</td>`;

		finalColumns.forEach((col) => {
			const value = row[col] !== undefined && row[col] !== null ? row[col] : "";
			const displayValue = typeof value === "number" ? value.toFixed(2) : value;
			rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700/50 whitespace-nowrap">${displayValue}</td>`;
		});

		rowHTML += `</tr>`;
	});

	// Add info if more rows exist
	if (filteringState.filteredData.length > 100) {
		rowHTML += `<tr class="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-600"><td colspan="${
			finalColumns.length + 1
		}" class="py-3 px-4 text-slate-500 dark:text-slate-400 italic">Menampilkan 100 dari ${
			filteringState.filteredData.length
		} records</td></tr>`;
	}

	tbody.innerHTML = rowHTML;
};

const renderDefectByPartNameTable = () => {
	const headerRow = document.getElementById("defectTableHeader");
	const tbody = document.getElementById("defectTableBody");

	if (!headerRow || !tbody) return;

	if (filteringState.filteredData.length === 0) {
		headerRow.innerHTML = "";
		tbody.innerHTML = "";
		return;
	}

	// Get all defect columns (columns ending with (pcs))
	const allDefectColumns = [
		"Warna",
		"Buram",
		"Berbayang",
		"Kotor",
		"Tdk Terplating",
		"Rontok/ Blister",
		"Tipis/ EE No Plating",
		"Flek Kuning",
		"Terbakar",
		"Watermark",
		"Jig Mark/ Renggang",
		"Lecet/ Scratch",
		"Seret",
		"Flek Hitam",
		"Flek Tangan",
		"Belang/ Dempet",
		"Bintik",
		"Kilap",
		"Tebal",
		"Flek Putih",
		"Spark",
		"Kotor H/ Oval",
		"Terkikis/ Crack",
		"Dimensi/ Penyok",
		"MTL/ SLipMelintir",
	];

	// Group by PartName and calculate sums for ALL defect types
	const partNameGroups = {};
	const defectTotals = {};

	filteringState.filteredData.forEach((row) => {
		const partName = row.partName;
		if (!partNameGroups[partName]) {
			partNameGroups[partName] = {};
		}

		// Sum up all defect columns
		allDefectColumns.forEach((defectName) => {
			const colName = defectName + "(pcs)";
			const value = Number(row[colName]) || 0;

			if (!partNameGroups[partName][defectName]) {
				partNameGroups[partName][defectName] = 0;
			}
			partNameGroups[partName][defectName] += value;

			if (!defectTotals[defectName]) {
				defectTotals[defectName] = 0;
			}
			defectTotals[defectName] += value;
		});
	});

	// Filter to only show defect columns with values > 0
	const activeDefects = allDefectColumns.filter(
		(defect) => defectTotals[defect] > 0
	);

	// Build header - PartName first, then defects, then Total NG
	let headerHTML = '<th class="py-3 px-4 font-semibold text-center">#</th>';
	headerHTML += '<th class="py-3 px-4 font-semibold text-center">PartName</th>';
	activeDefects.forEach((defect) => {
		headerHTML += `<th class="py-3 px-4 font-semibold text-center">${defect}(pcs)</th>`;
	});
	headerHTML += '<th class="py-3 px-4 font-semibold text-center">Total NG</th>';

	headerRow.innerHTML = headerHTML;

	// Build table rows
	let rowHTML = "";
	let rowIndex = 0;
	let grandTotalNG = 0;
	const columnTotals = {};

	Object.keys(partNameGroups).forEach((partName, idx) => {
		const data = partNameGroups[partName];
		let rowTotalNG = 0;

		// Calculate row total (excluding MTL/SLipMelintir)
		allDefectColumns.forEach((defect) => {
			if (defect !== "MTL/ SLipMelintir") {
				rowTotalNG += data[defect] || 0;
			}
		});

		grandTotalNG += rowTotalNG;

		rowHTML += `<tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">`;
		rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white text-center">${idx}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white">${partName}</td>`;

		activeDefects.forEach((defect) => {
			const value = data[defect] || 0;
			rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white text-center">${value}</td>`;

			if (!columnTotals[defect]) {
				columnTotals[defect] = 0;
			}
			columnTotals[defect] += value;
		});

		rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white font-bold text-center">${rowTotalNG}</td>`;
		rowHTML += `</tr>`;
	});

	// Add TOTAL row
	rowHTML += `<tr class="bg-slate-700/30 font-bold border-t-2 border-slate-600">`;
	rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white text-center">${
		Object.keys(partNameGroups).length
	}</td>`;
	rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white">TOTAL</td>`;

	activeDefects.forEach((defect) => {
		rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white text-center">${
			columnTotals[defect] || 0
		}</td>`;
	});

	rowHTML += `<td class="py-3 px-4 text-slate-600 dark:text-white font-bold text-center">${grandTotalNG}</td>`;
	rowHTML += `</tr>`;

	tbody.innerHTML = rowHTML;
};

const renderSummaryByPartNameTable = () => {
	const tbody = document.getElementById("summaryTableBody");
	if (!tbody) return;

	if (filteringState.filteredData.length === 0) {
		tbody.innerHTML = "";
		return;
	}

	// Group by PartName and calculate summary
	const partNameSummary = {};
	filteringState.filteredData.forEach((row) => {
		const partName = row.partName;
		if (!partNameSummary[partName]) {
			partNameSummary[partName] = {
				custId: row["Cust.ID"] || "", // Store first Cust.ID for this PartName
				qInspec: 0,
				okPcs: 0,
				qtyNg: 0,
				mtlCount: 0,
				count: 0,
				sumNgPercent: 0,
			};
		}

		// Use correct field names from data
		partNameSummary[partName].qInspec +=
			Number(row.QInspec) || Number(row.qInspec) || 0;
		partNameSummary[partName].okPcs +=
			Number(row["OK(pcs)"]) || Number(row.okPcs) || 0;
		partNameSummary[partName].qtyNg +=
			Number(row["Qty(NG)"]) || Number(row.qtyNg) || 0;
		partNameSummary[partName].mtlCount +=
			Number(row["MTL/ SLipMelintir(pcs)"]) || 0;
		partNameSummary[partName].count += 1;
		partNameSummary[partName].sumNgPercent +=
			Number(row["NG_%"]) || Number(row.ngPercent) || 0;
	});

	// Build table rows
	let totals = {
		qInspec: 0,
		okPcs: 0,
		qtyNg: 0,
		mtlCount: 0,
		sumNgPercent: 0,
		count: 0,
	};

	tbody.innerHTML =
		Object.keys(partNameSummary)
			.map((partName, idx) => {
				const data = partNameSummary[partName];
				const avgNgPercent =
					data.count > 0 ? data.sumNgPercent / data.count : 0;

				totals.qInspec += data.qInspec;
				totals.okPcs += data.okPcs;
				totals.qtyNg += data.qtyNg;
				totals.mtlCount += data.mtlCount;
				totals.sumNgPercent += data.sumNgPercent;
				totals.count += data.count;

				return `
            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td class="py-3 px-4 text-slate-600 dark:text-white text-center">${idx}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-white">${
									data.custId
								}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-white">${partName}</td>
                <td class="py-3 px-4 text-red-600 dark:text-red-600 text-right">${avgNgPercent.toFixed(
									4
								)}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-white text-right">${data.qInspec.toLocaleString()}</td>
                <td class="py-3 px-4 text-green-400 text-right">${data.okPcs.toLocaleString()}</td>
                <td class="py-3 px-4 text-red-600 text-right font-bold">${data.qtyNg.toLocaleString()}</td>
                <td class="py-3 px-4 text-slate-600 dark:text-white text-right">${
									data.mtlCount
								}</td>
            </tr>
        `;
			})
			.join("") +
		`
        <tr class="bg-slate-700/30 font-bold border-t-2 border-slate-600">
            <td class="py-3 px-4 text-slate-600 dark:text-white text-center">${
							Object.keys(partNameSummary).length
						}</td>
            <td class="py-3 px-4 text-slate-600 dark:text-white">-</td>
            <td class="py-3 px-4 text-slate-600 dark:text-white">TOTAL</td>
            <td class="py-3 px-4 text-red-600 dark:text-red-600 text-right">${(totals.count >
						0	
							? totals.sumNgPercent / totals.count
							: 0
						).toFixed(4)}</td>
            <td class="py-3 px-4 text-slate-600 dark:text-white text-right">${totals.qInspec.toLocaleString()}</td>
            <td class="py-3 px-4 text-slate-600 dark:text-white text-right">${totals.okPcs.toLocaleString()}</td>
            <td class="py-3 px-4 text-red-600 dark:text-red-600 text-right">${totals.qtyNg.toLocaleString()}</td>
            <td class="py-3 px-4 text-slate-600 dark:text-white text-right">${
							totals.mtlCount
						}</td>
        </tr>
    `;
};

// === MULTI FILTERING FUNCTIONS ===
const initMultiFilterUI = () => {
	if (!state.processedData) return;

	// Get unique values
	const lines = [...new Set(state.processedData.map((r) => r.Line))]
		.filter((v) => v)
		.sort();
	const allCustomers = [
		...new Set(state.processedData.map((r) => r["Cust.ID"])),
	]
		.filter((v) => v)
		.sort();
	const allColumns =
		state.processedData.length > 0 ? Object.keys(state.processedData[0]) : [];

	// Set default dates
	const dates = state.processedData
		.map((r) => r.DateObj)
		.filter((v) => v && !isNaN(v))
		.sort((a, b) => a - b);

	const formatDateToYYYYMMDD = (date) => {
		if (!date || isNaN(date)) return "";
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	};

	if (dates.length > 0) {
		const minDate = dates[0];
		const maxDate = dates[dates.length - 1];
		
		const startDateInput = document.getElementById("multiFilterStartDate");
		const endDateInput = document.getElementById("multiFilterEndDate");
		
		if (startDateInput) startDateInput.value = formatDateToYYYYMMDD(minDate);
		if (endDateInput) endDateInput.value = formatDateToYYYYMMDD(maxDate);
		
		filteringState.multiFilterStartDate = minDate;
		filteringState.multiFilterEndDate = maxDate;
	}

	// Function to update customer list based on selected lines
	const updateCustomerList = () => {
		const selectedLines = Array.from(
			document.querySelectorAll(".multiLineCheckbox:checked")
		).map((cb) => cb.value);

		let customersToShow = allCustomers;

		// If any line is selected, filter customers by those lines
		if (selectedLines.length > 0) {
			const filteredData = state.processedData.filter((r) =>
				selectedLines.includes(r.Line)
			);
			customersToShow = [...new Set(filteredData.map((r) => r["Cust.ID"]))]
				.filter((v) => v)
				.sort();
		}

		const customerContainer = document.getElementById("multiCustomerContainer");
		if (customerContainer) {
			// Save currently selected customers that are still valid
			const currentlySelected = Array.from(
				document.querySelectorAll(".multiCustomerCheckbox:checked")
			)
				.map((cb) => cb.value)
				.filter((cust) => customersToShow.includes(cust));

			customerContainer.innerHTML = customersToShow
				.map(
					(cust) => `
				<label class="flex items-center gap-2 cursor-pointer">
					<input type="checkbox" value="${cust}" class="multiCustomerCheckbox w-4 h-4" ${
						currentlySelected.includes(cust) ? "checked" : ""
					} />
					<span class="text-slate-600 dark:text-white text-sm">${cust}</span>
				</label>
			`
				)
				.join("");

			// Add Select All for Customers logic if it exists (re-rendered)
			// Need to verify if we need to add the select all checkbox here or if it was added statically initially.
			// Since customer list is dynamic, "Select All" should probably be dynamic or reset too.
			// Ideally we prepend "Select All" to the innerHTML every time we update.
			const selectAllHtml = `
				<div class="mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
					<label class="flex items-center gap-2 cursor-pointer font-semibold">
						<input type="checkbox" id="selectAllCustomers" class="w-4 h-4" />
						<span class="text-slate-800 dark:text-white text-sm">Pilih Semua</span>
					</label>
				</div>
			`;
			customerContainer.innerHTML = selectAllHtml + customerContainer.innerHTML;

			// Add event listener for Select All Customers
			const selectAllCb = document.getElementById("selectAllCustomers");
			const checkboxes = document.querySelectorAll(".multiCustomerCheckbox");
			
			if (selectAllCb) {
				selectAllCb.addEventListener("change", (e) => {
					checkboxes.forEach(cb => cb.checked = e.target.checked);
					updateExcludeList(); // Trigger PartName update
				});

				// Update Select All state when individual checkboxes change
				checkboxes.forEach(cb => {
					cb.addEventListener("change", () => {
						const allChecked = Array.from(checkboxes).every(c => c.checked);
						const someChecked = Array.from(checkboxes).some(c => c.checked);
						selectAllCb.checked = allChecked;
						selectAllCb.indeterminate = someChecked && !allChecked;
						updateExcludeList(); // Trigger PartName update
					});
				});
			}
			updateExcludeList(); // Initial trigger for PartNames
		}
	};

	// Function to update Exclude PartName list based on selected Lines and Customers
	const updateExcludeList = () => {
		const excludeContainer = document.getElementById("multiExcludeContainer");
		const excludeSearch = document.getElementById("multiExcludeSearch");
		if (!excludeContainer) return;

		const searchTerm = excludeSearch ? excludeSearch.value.toLowerCase() : "";
		const selectedLines = Array.from(document.querySelectorAll(".multiLineCheckbox:checked")).map(cb => cb.value);
		const selectedCustomers = Array.from(document.querySelectorAll(".multiCustomerCheckbox:checked")).map(cb => cb.value);

		let filteredData = state.processedData;
		// Filter by Line first (context)
		if (selectedLines.length > 0) {
			filteredData = filteredData.filter(r => selectedLines.includes(r.Line));
		}
		// Then filter by Customer if any selected
		if (selectedCustomers.length > 0) {
			filteredData = filteredData.filter(r => selectedCustomers.includes(r["Cust.ID"]));
		}

		const partNamesToShow = [...new Set(filteredData.map(r => r.partName || r.PartName))]
			.filter(v => v)
			.filter(pn => pn.toLowerCase().includes(searchTerm))
			.sort();

		excludeContainer.innerHTML = partNamesToShow
			.map(pn => `
				<label class="flex items-center gap-2 cursor-pointer partname-exclude-item">
					<input type="checkbox" value="${pn}" class="multiExcludeCheckbox w-4 h-4" ${filteringState.multiFilterExcludedPartNames.includes(pn) ? "checked" : ""} />
					<span class="text-slate-600 dark:text-white text-sm truncate" title="${pn}">${pn}</span>
				</label>
			`).join("");

		if (partNamesToShow.length === 0) {
			excludeContainer.innerHTML = '<div class="text-xs text-slate-500 italic p-2">Tidak ada PartName</div>';
		}

		// Add change listeners to checkboxes to update state immediately
		excludeContainer.querySelectorAll(".multiExcludeCheckbox").forEach(cb => {
			cb.addEventListener("change", () => {
				if (cb.checked) {
					if (!filteringState.multiFilterExcludedPartNames.includes(cb.value)) {
						filteringState.multiFilterExcludedPartNames.push(cb.value);
					}
				} else {
					filteringState.multiFilterExcludedPartNames = filteringState.multiFilterExcludedPartNames.filter(v => v !== cb.value);
				}
			});
		});
	};

	// Populate Line checkboxes
	const lineContainer = document.getElementById("multiLineContainer");
	if (lineContainer) {
		const selectAllHtml = `
			<div class="mb-2 pb-2 border-b border-slate-200 dark:border-slate-600">
				<label class="flex items-center gap-2 cursor-pointer font-semibold">
					<input type="checkbox" id="selectAllLines" class="w-4 h-4" />
					<span class="text-slate-800 dark:text-white text-sm">Pilih Semua</span>
				</label>
			</div>
		`;
		
		const checkboxesHtml = lines
			.map(
				(line) => `
            <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" value="${line}" class="multiLineCheckbox w-4 h-4" />
                <span class="text-slate-600 dark:text-white text-sm">${line}</span>
            </label>
        `
			)
			.join("");

		lineContainer.innerHTML = selectAllHtml + checkboxesHtml;

		// Add event listeners to line checkboxes
		const checkboxes = document.querySelectorAll(".multiLineCheckbox");
		const selectAllCb = document.getElementById("selectAllLines");

		checkboxes.forEach((checkbox) => {
			checkbox.addEventListener("change", () => {
				updateCustomerList();
				// Update Select All state
				const allChecked = Array.from(checkboxes).every(c => c.checked);
				const someChecked = Array.from(checkboxes).some(c => c.checked);
				if (selectAllCb) {
					selectAllCb.checked = allChecked;
					selectAllCb.indeterminate = someChecked && !allChecked;
				}
			});
		});

		// Add event listener for Select All Lines
		if (selectAllCb) {
			selectAllCb.addEventListener("change", (e) => {
				checkboxes.forEach(cb => cb.checked = e.target.checked);
				updateCustomerList();
			});
		}
	}

	// Initial populate of customer checkboxes
	const customerContainer = document.getElementById("multiCustomerContainer");
	if (customerContainer) {
	}
	updateCustomerList();

	// Populate Column checkboxes (exclude PartName & NG_% - they're mandatory)
	const columnContainer = document.getElementById("multiColumnContainer");
	if (columnContainer) {
		const excludedCols = ["PartName", "NG_%"];
		const selectableCols = allColumns.filter(
			(col) => !excludedCols.includes(col)
		);

		columnContainer.innerHTML = `
            <div class="mb-2 pb-2 border-b border-slate-600">
                <span class="text-slate-300 text-xs font-bold">Wajib Ditampilkan:</span>
                <div class="mt-1">
                    ${excludedCols
											.map(
												(col) => `
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" value="${col}" checked disabled class="w-4 h-4" />
                            <span class="text-slate-600 dark:text-white text-sm">${col}</span>
                        </label>
                    `
											)
											.join("")}
                </div>
            </div>
            <div>
                <div class="flex items-center justify-between mb-1">
                    <span class="text-slate-600 dark:text-white text-xs font-bold">Pilihan Tambahan:</span>
                    <label class="flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" id="selectAllColumns" class="w-3 h-3" />
                        <span class="text-slate-500 dark:text-slate-400 text-xs">Pilih Semua</span>
                    </label>
                </div>
                <div class="mt-1">
                    ${selectableCols
											.map(
												(col) => `
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" value="${col}" class="multiColumnCheckbox w-4 h-4" />
                            <span class="text-slate-600 dark:text-white text-sm">${col}</span>
                        </label>
                    `
											)
											.join("")}
                </div>
            </div>
        `;

		// Add event listeners for Columns
		const checkboxes = document.querySelectorAll(".multiColumnCheckbox");
		const selectAllCb = document.getElementById("selectAllColumns");

		if (selectAllCb) {
			selectAllCb.addEventListener("change", (e) => {
				checkboxes.forEach(cb => cb.checked = e.target.checked);
			});

			checkboxes.forEach(cb => {
				cb.addEventListener("change", () => {
					const allChecked = Array.from(checkboxes).every(c => c.checked);
					const someChecked = Array.from(checkboxes).some(c => c.checked);
					selectAllCb.checked = allChecked;
					selectAllCb.indeterminate = someChecked && !allChecked;
				});
			});
		}
	}

	// Add search listener for Exclude list
	const excludeSearch = document.getElementById("multiExcludeSearch");
	if (excludeSearch) {
		excludeSearch.addEventListener("input", () => {
			updateExcludeList();
		});
	}
};

const applyMultiFilter = () => {
	if (!state.processedData) return;

	// Get selected values
	const selectedLines = Array.from(
		document.querySelectorAll(".multiLineCheckbox:checked")
	).map((cb) => cb.value);
	const selectedCustomers = Array.from(
		document.querySelectorAll(".multiCustomerCheckbox:checked")
	).map((cb) => cb.value);
	const selectedColumns = [
		"PartName",
		"NG_%",
		...Array.from(
			document.querySelectorAll(".multiColumnCheckbox:checked")
		).map((cb) => cb.value),
	];

	const startDateVal = document.getElementById("multiFilterStartDate").value;
	const endDateVal = document.getElementById("multiFilterEndDate").value;

	const formatDateToYYYYMMDD = (date) => {
		if (!date || isNaN(date)) return "";
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const d = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	};

	// Update state
	filteringState.multiFilterLines = selectedLines;
	filteringState.multiFilterCustomers = selectedCustomers;
	filteringState.multiFilterColumns = selectedColumns;
	filteringState.multiFilterStartDate = startDateVal ? new Date(startDateVal) : null;
	filteringState.multiFilterEndDate = endDateVal ? new Date(endDateVal) : null;

	// Filter data
	filteringState.multiFilteredData = state.processedData.filter((row) => {
		const rowDateStr = formatDateToYYYYMMDD(row.DateObj);
		const lineMatch =
			selectedLines.length === 0 || selectedLines.includes(row.Line);
		const custMatch =
			selectedCustomers.length === 0 ||
			selectedCustomers.includes(row["Cust.ID"]);
		const dateMatch =
			(!startDateVal || rowDateStr >= startDateVal) && (!endDateVal || rowDateStr <= endDateVal);
		const trialMatch = filteringState.includeTrialData || !row.isTrial;
		
		// Exclude PartName logic
		const partName = row.partName || row.PartName;
		const isExcluded = filteringState.multiFilterExcludedPartNames.includes(partName);

		return lineMatch && custMatch && dateMatch && trialMatch && !isExcluded;
	});

	// Sort by NG_% Descending
	filteringState.multiFilteredData.sort((a, b) => {
		const valA = parseFloat(a["NG_%"]) || 0;
		const valB = parseFloat(b["NG_%"]) || 0;
		return valB - valA;
	});

	// Group by PartName and calculate aggregates
	const grouped = {};
	const allDefectBaseNames = [
		"Warna", "Buram", "Berbayang", "Kotor", "Tdk Terplating",
		"Rontok/ Blister", "Tipis/ EE No Plating", "Flek Kuning", "Terbakar",
		"Watermark", "Jig Mark/ Renggang", "Lecet/ Scratch", "Seret",
		"Flek Hitam", "Flek Tangan", "Belang/ Dempet", "Bintik", "Kilap",
		"Tebal", "Flek Putih", "Spark", "Kotor H/ Oval", "Terkikis/ Crack",
		"Dimensi/ Penyok", "MTL/ SLipMelintir"
	];

	filteringState.multiFilteredData.forEach((row) => {
		const partName = row.PartName || row.partName;
		if (!grouped[partName]) {
			grouped[partName] = {
				PartName: partName,
				"NG_%_Sum": 0,
				"QInspec": 0,
				"OK(pcs)": 0,
				"Qty(NG)": 0,
				count: 0,
				defects: {} // To store defect sums
			};
			allDefectBaseNames.forEach(d => grouped[partName].defects[d] = 0);
		}
		
		const group = grouped[partName];
		group.count += 1;
		group["NG_%_Sum"] += parseFloat(row["NG_%"]) || 0;
		group["QInspec"] += parseFloat(row["QInspec"]) || 0;
		group["OK(pcs)"] += parseFloat(row["OK(pcs)"]) || 0;
		group["Qty(NG)"] += parseFloat(row["Qty(NG)"]) || 0;

		allDefectBaseNames.forEach(d => {
			const val = parseFloat(row[d + "(pcs)"]) || 0;
			group.defects[d] += val;
		});
	});

	filteringState.multiGroupedData = Object.values(grouped).map(group => {
		const row = {
			PartName: group.PartName,
			"NG_%": group.count > 0 ? (group["NG_%_Sum"] / group.count).toFixed(2) : 0,
			"QInspec": group["QInspec"],
			"OK(pcs)": group["OK(pcs)"],
			"Qty(NG)": group["Qty(NG)"],
			count: group.count
		};
		//Flatten defects into the row
		allDefectBaseNames.forEach(d => row[d] = group.defects[d]);
		return row;
	});

	// Sort Grouped Data by NG_% Descending
	filteringState.multiGroupedData.sort((a, b) => {
		const valA = parseFloat(a["NG_%"]) || 0;
		const valB = parseFloat(b["NG_%"]) || 0;
		return valB - valA;
	});

	// Show results
	document
		.getElementById("multiFilterResultsContainer")
		.classList.remove("hidden");

	// Render tables
	renderMultiPreviewTable();
	processMultiFilterPeriodicalData();
	renderMultiFilterPeriodicalChart();
	renderMultiGroupedTable();
};

const renderMultiPreviewTable = () => {
	const headerRow = document.getElementById("multiPreviewTableHeader");
	const tbody = document.getElementById("multiPreviewTableBody");

	if (!headerRow || !tbody || filteringState.multiFilteredData.length === 0)
		return;

	const displayColumns = filteringState.multiFilterColumns;

	// Build header
	let headerHTML =
		'<th class="py-3 px-4 font-semibold text-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600">#</th>';
	displayColumns.forEach((col) => {
		headerHTML += `<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 whitespace-nowrap">${col}</th>`;
	});
	headerRow.innerHTML = headerHTML;

	// Build rows (limit to 50 for performance)
	let rowHTML = "";
	const displayRows = filteringState.multiFilteredData.slice(0, 50);

	displayRows.forEach((row, idx) => {
		rowHTML += `<tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white text-center border border-slate-200 dark:border-slate-700">${
			idx + 1
		}</td>`;

		displayColumns.forEach((col) => {
			const value = row[col] !== undefined && row[col] !== null ? row[col] : "";
			const displayValue = typeof value === "number" ? value.toFixed(2) : value;
			rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700/30 whitespace-nowrap">${displayValue}</td>`;
		});

		rowHTML += `</tr>`;
	});

	if (filteringState.multiFilteredData.length > 50) {
		rowHTML += `<tr class="bg-slate-50 dark:bg-slate-800/50 border-t-2 border-slate-200 dark:border-slate-600"><td colspan="${
			displayColumns.length + 1
		}" class="py-3 px-4 text-slate-500 dark:text-slate-400 italic">Menampilkan 50 dari ${
			filteringState.multiFilteredData.length
		} records</td></tr>`;
	}

	tbody.innerHTML = rowHTML;
};

const renderMultiGroupedTable = () => {
	const headerRow = document.getElementById("multiGroupedTableHeader");
	const tbody = document.getElementById("multiGroupedTableBody");

	if (!headerRow || !tbody) return;

	// Determine which defect columns to show (sum > 0 across displayed rows)
	// OR per the request: "bernilai >0 satuan (pcs) sesuai dengan partname yang ditampilkan"
	// This implies we filter columns based on the filtered dataset.
	const allDefectBaseNames = [
		"Warna", "Buram", "Berbayang", "Kotor", "Tdk Terplating",
		"Rontok/ Blister", "Tipis/ EE No Plating", "Flek Kuning", "Terbakar",
		"Watermark", "Jig Mark/ Renggang", "Lecet/ Scratch", "Seret",
		"Flek Hitam", "Flek Tangan", "Belang/ Dempet", "Bintik", "Kilap",
		"Tebal", "Flek Putih", "Spark", "Kotor H/ Oval", "Terkikis/ Crack",
		"Dimensi/ Penyok", "MTL/ SLipMelintir"
	];

	// Find columns that have at least one > 0 value in the grouped data
	const activeDefects = allDefectBaseNames.filter(defect => {
		return filteringState.multiGroupedData.some(row => row[defect] > 0);
	});

	filteringState.activeMultiGroupDefects = activeDefects; // Save for export

	// Build header
	let headerHTML =
		'<th class="py-3 px-4 font-semibold text-center bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 whitespace-nowrap">#</th>';
	headerHTML +=
		'<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 whitespace-nowrap">PartName</th>';
	headerHTML +=
		'<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">NG_%</th>';
	headerHTML +=
		'<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">QInspec</th>';
	headerHTML +=
		'<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">OK(pcs)</th>';
	headerHTML +=
		'<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">Qty(NG)</th>';
	
	activeDefects.forEach(defect => {
		headerHTML += `<th class="py-3 px-4 font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${defect}(pcs)</th>`;
	});

	headerRow.innerHTML = headerHTML;

	// Build rows
	let rowHTML = "";
	filteringState.multiGroupedData.forEach((row, idx) => {
		rowHTML += `<tr class="border-b border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white text-center border border-slate-300 dark:border-slate-600 whitespace-nowrap">${idx + 1}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 whitespace-nowrap">${row.PartName}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${row["NG_%"]}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${row["QInspec"].toLocaleString()}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${row["OK(pcs)"].toLocaleString()}</td>`;
		rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${row["Qty(NG)"].toLocaleString()}</td>`;
		
		activeDefects.forEach(defect => {
			rowHTML += `<td class="py-3 px-4 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 text-right whitespace-nowrap">${row[defect].toLocaleString()}</td>`;
		});

		rowHTML += `</tr>`;
	});

	tbody.innerHTML = rowHTML;
};

const clearMultiFilter = () => {
	filteringState.multiFilterLines = [];
	filteringState.multiFilterCustomers = [];
	filteringState.multiFilterColumns = ["PartName", "NG_%"];
	filteringState.multiFilterExcludedPartNames = [];
	filteringState.multiFilteredData = [];
	filteringState.multiGroupedData = [];
	filteringState.multiFilterPeriodicalData = [];
	if (state.charts.multiFilterPeriodicalChart) {
		state.charts.multiFilterPeriodicalChart.destroy();
		state.charts.multiFilterPeriodicalChart = null;
	}

	document
		.getElementById("multiFilterResultsContainer")
		.classList.add("hidden");
	document
		.querySelectorAll(
			".multiLineCheckbox, .multiCustomerCheckbox, .multiColumnCheckbox, .multiExcludeCheckbox"
		)
		.forEach((cb) => (cb.checked = false));
};

// === END MULTI FILTERING FUNCTIONS ===

// Filtering State
const filteringState = {
	includeTrialData: true, // Default as per user request
	selectedPartNames: [],
	filteredData: [],
	// Daily Chart Filter State
	selectedLine: "Barrel 4",
	selectedDefectType: null,
	selectedTimeframe: "Daily", // Default timeframe
	selectedPartNamesForDefect: [], // Part names for defect filter
	dailyData: [],
	dailyDefectData: [],
	dailyDefectPartData: [], // Detailed data by PartName
	// PartName Periodical Chart State
	partNameSelectedTimeframe: "Monthly", // Default to Monthly as per user image
	partNamePeriodicalData: [],
	// Multi Filter State
	multiFilterSelectedTimeframe: "Daily", // Default to Daily as per user request
	multiFilterPeriodicalData: [],
	multiFilterLines: [],
	multiFilterCustomers: [],
	multiFilterExcludedPartNames: [],
	multiFilterColumns: ["PartName", "NG_%"], // Default columns (PartName & NG_% are mandatory)
	multiFilterStartDate: null,
	multiFilterEndDate: null,
	multiFilteredData: [],
	multiGroupedData: [],
};

const renderFiltering = () => {
	const container = document.getElementById("filteringContent");
	if (!container) return;

	// Get unique part names from processed data (empty array if no data yet)
	const uniquePartNames = state.processedData
		? [...new Set(state.processedData.map((row) => row.partName))]
				.filter((p) => p)
				.sort()
		: [];

	container.innerHTML = `
        <div class="mb-6">
            <h2 class="text-2xl font-bold text-blue dark:text-white mb-2">Filtering Data</h2>
            <p class="text-slate-400">Periode dari Tanggal: ${
							state.dateRange?.start || ""
						} sampai Tanggal: ${state.dateRange?.end || ""}</p>
        </div>

        <!-- Trial Data Inclusion Toggle -->
        <div class="mb-6 flex items-center gap-2">
            <input type="checkbox" id="includeTrialFilterCheckbox" class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 cursor-pointer" ${filteringState.includeTrialData ? 'checked' : ''}>
            <label for="includeTrialFilterCheckbox" class="text-slate-800 dark:text-slate-300 text-sm font-medium cursor-pointer">
                Data yang akan dilakukan Filtering include Part Trial
            </label>
        </div>
        
        <!-- Tab Navigation -->
        <div class="flex gap-2 mb-6 border-b border-slate-700">
            <button class="px-4 py-2 text-white bg-blue-600 border-b-2 border-blue-600 font-medium" id="filterTab1">
                Filter by PartName
            </button>
            <button class="px-4 py-2 text-slate-400 hover:text-white transition-colors" id="filterTab2">
                Multi Filtering Data
            </button>
            <button class="px-4 py-2 text-slate-400 hover:text-white transition-colors" id="filterTab3">
                Filtering Data for Periodical Chart  
            </button>
        </div>
        
        <!-- Filter by PartName Content -->
        <div id="filterByPartNameContent">
            ${
							!state.processedData
								? `
                <div class="glass-panel p-6 mb-6">
                    <p class="text-yellow-500 text-center">
                        <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        Silakan upload file Excel terlebih dahulu untuk menggunakan fitur filtering.
                    </p>
                </div>
            `
								: `
                <div class="glass-panel p-6 mb-6 relative z-20">
                    <label class="block text-slate-900 dark:text-white font-medium mb-3">Pilih PartName:</label>
                    
                    <!-- Multi-select dropdown -->
                    <div class="relative mb-4">
                        <div id="partNameTagsContainer" class="flex flex-wrap gap-2 mb-3">
                            <!-- Selected tags will appear here -->
                        </div>
                        
                        <div class="relative">
                            <input 
                                type="text" 
                                id="partNameSearchInput" 
                                class="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                placeholder="ketik Nama Part di sini untuk mencari..."
                            />
                            <svg class="absolute right-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                        
                        <!-- Dropdown list -->
                        <div id="partNameDropdown" class="hidden absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded max-h-60 overflow-y-auto shadow-2xl">
                            ${
															uniquePartNames.length > 0
																? uniquePartNames
																		.map(
																			(partName) => `
                                <div class="px-4 py-2 hover:bg-slate-700 cursor-pointer text-white text-sm partname-option" data-partname="${partName}">
                                    ${partName}
                                </div>
                            `
																		)
																		.join("")
																: '<div class="px-4 py-2 text-slate-500 text-sm">No part names available</div>'
														}
                        </div>
                    </div>
                    
                    <button id="applyPartNameFilterBtn" class="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Apply Filter
                    </button>
                    
                    <button id="clearPartNameFilterBtn" class="ml-3 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                        Clear Filter
                    </button>
                </div>
                
                <!-- Results Container -->
                <div id="filterResultsContainer" class="hidden">
                    <!-- Collapsible Preview -->
                    <details class="mb-6 glass-panel overflow-hidden" open>
                        <summary class="cursor-pointer p-4 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center">
                            <span class="text-slate-800 dark:text-white font-medium">Preview Data hasil Filtering by PartName</span>
                            <svg class="w-5 h-5 text-slate-400 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                            </svg>
                        </summary>
                        <div class="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                             <div class="flex justify-between items-center mb-4">
                                <p id="filterPreviewText" class="text-slate-600 dark:text-slate-300 text-sm font-medium"></p>
                                <button id="exportPartNamePreviewBtn" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex items-center shadow-sm transition-colors" title="Export to CSV">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    CSV
                                </button>
                             </div>
                            <!-- Full Data Preview Table -->
                            <div class="mt-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table class="w-full text-sm text-left">
                                    <thead class="text-xs text-slate-700 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                                        <tr id="fullPreviewTableHeader">
                                            <!-- Headers will be dynamically generated -->
                                        </tr>
                                    </thead>
                                    <tbody id="fullPreviewTableBody" class="text-slate-700 dark:text-slate-300">
                                        <!-- Rows will be dynamically generated -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </details>
                    
                    <!-- PartName Periodical Chart Container -->
                    <div class="mb-6 glass-panel p-6 relative">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-slate-800 dark:text-white font-medium" id="partNamePeriodicalChartTitle">Rata-rata NG (%) & Total Inspected (Lot) per PartName</h3>
                            <div class="flex items-center gap-2">
                                <label class="text-xs text-slate-500 dark:text-slate-400 font-medium">Timeframe:</label>
                                <select id="partNameTimeframeSelect" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs px-2 py-1 text-slate-700 dark:text-white focus:outline-none focus:border-blue-500">
                                    <option value="Daily">Daily</option>
                                    <option value="Weekly">Weekly</option>
                                    <option value="Monthly" selected>Monthly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </div>
                        </div>
                        <div class="h-96">
                            <canvas id="partNamePeriodicalChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Table 1: NG by Jenis NG & PartName -->
                    <div class="mb-6 glass-panel p-0 overflow-hidden">
                        <div class="p-4 border-b border-glass-border bg-slate-800/50">
                            <h3 class="text-slate-800 dark:text-white font-semibold">Tabel NG (PCS) by Jenis NG & PartName</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left">
                                <thead class="text-xs text-slate-800 dark:text-slate-400 uppercase bg-slate-800/30">
                                    <tr id="defectTableHeader">
                                        <!-- Headers will be dynamically generated -->
                                    </tr>
                                </thead>
                                <tbody id="defectTableBody">
                                    <!-- Rows will be dynamically generated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <!-- Pareto Chart: Jenis NG -->
                    <div class="mb-6 glass-panel p-6">
                        <h3 class="text-slate-800 dark:text-white font-semibold mb-4">Pareto Charts per Jenis NG</h3>
                        <div class="relative" style="height: 400px;">
                            <canvas id="paretoDefectChart"></canvas>
                        </div>
                    </div>
                    
                    <!-- Table 2: Summary PartName -->
                    <div class="glass-panel p-0 overflow-hidden">
                        <div class="p-4 border-b border-glass-border bg-slate-800/50">
                            <h3 class="text-slate-800 dark:text-white font-semibold">Tabel Summary PartName vs NG (%), Qty Inspected (PCS), Qty NG (PCS), Qty OK (PCS)</h3>
                        </div>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm text-left">
                                <thead class="text-xs text-slate-800 dark:text-slate-400 uppercase bg-slate-800/30">
                                    <tr class="text-xs text-slate-800 dark:text-slate-400">
                                        <th class="py-3 px-4 font-semibold text-center">#</th>
                                        <th class="py-3 px-4 font-semibold">Cust.ID</th>
                                        <th class="py-3 px-4 font-semibold">PartName</th>
                                        <th class="py-3 px-4 font-semibold text-right text-red-500">NG_%</th>
                                        <th class="py-3 px-4 font-semibold text-right">QInspec</th>
                                        <th class="py-3 px-4 font-semibold text-right">OK(pcs)</th>
                                        <th class="py-3 px-4 font-semibold text-right text-red-500">Qty(NG)</th>
                                        <th class="py-3 px-4 font-semibold text-right">MTL/St.IjinMelintir(pcs)</th>
                                    </tr>
                                </thead>
                                <tbody id="summaryTableBody">
                                    <!-- Rows will be dynamically generated -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `
						}
        </div>
        
        <!-- Multi Filtering Data Content -->
        <div id="multiFilterContent" class="hidden">
            ${
							!state.processedData
								? `
                    <div class="glass-panel p-6 mb-6">
                        <p class="text-yellow-500 text-center">
                            <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                            Silakan upload file Excel terlebih dahulu untuk menggunakan fitur Multi Filtering.
                        </p>
                    </div>
                    `
								: `
                    <!-- Header Info -->
                    <div class="glass-panel p-6 mb-6 border-l-4 border-blue-500">
                        <h3 class="text-slate-900 dark:text-white font-semibold text-lg mb-2">Multi Filtering Data</h3>
                        <p class="text-slate-400 text-sm">Filter data berdasarkan berbagai kriteria dan pilih kolom yang ingin ditampilkan</p>
                    </div>
                    
                    <!-- Date Range Filter -->
                    <div class="glass-panel p-6 mb-6">
                        <label class="block text-slate-900 dark:text-white font-medium mb-3">Periode dari Tanggal:</label>
                        <div class="flex gap-3">
                            <input type="date" id="multiFilterStartDate" class="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500">
                            <span class="text-slate-400 py-2">sampai</span>
                            <input type="date" id="multiFilterEndDate" class="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500">
                        </div>
                    </div>
                    
                    <!-- Filters Row: Line, Customer, Exclude PartName, Columns -->
                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                        <!-- Line Filter -->
                        <div class="glass-panel p-4">
                            <label class="block text-slate-900 dark:text-white font-medium text-sm mb-2">Pilih Line:</label>
                            <div id="multiLineContainer" class="space-y-2 max-h-48 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                        
                        <!-- Customer Filter -->
                        <div class="glass-panel p-4">
                            <label class="block text-slate-900 dark:text-white font-medium text-sm mb-2">Pilih Customer:</label>
                            <div id="multiCustomerContainer" class="space-y-2 max-h-48 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>

                        <!-- Exclude PartName Filter -->
                        <div class="glass-panel p-4">
                            <label class="block text-slate-900 dark:text-white font-medium text-sm mb-2">Exclude PartName:</label>
                            <input type="text" id="multiExcludeSearch" placeholder="Cari PartName..." class="w-full mb-2 px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-xs focus:outline-none focus:border-blue-500">
                            <div id="multiExcludeContainer" class="space-y-2 max-h-40 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                            <p class="text-slate-500 text-[10px] mt-2 italic text-center leading-tight">Biarkan kolom ini kosong jika tidak ada pengecualian</p>
                        </div>
                        
                        <!-- Column Selector -->
                        <div class="glass-panel p-4">
                            <label class="block text-slate-900 dark:text-white font-medium text-sm mb-2">Pilih Kolom untuk Ditampilkan:</label>
                            <div id="multiColumnContainer" class="space-y-2 max-h-48 overflow-y-auto">
                                <!-- Will be populated dynamically -->
                            </div>
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex gap-3 mb-6">
                        <button id="applyMultiFilterBtn" class="btn-primary px-6 py-2">
                            Apply Filter
                        </button>
                        <button id="clearMultiFilterBtn" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors">
                            Clear Filter
                        </button>
                    </div>
                    
                    <!-- Results -->
                    <div id="multiFilterResultsContainer" class="hidden space-y-6">
                        <!-- Preview Filtering Results -->
                        <details class="glass-panel overflow-hidden mb-6" open id="multiPreviewDetails">
                            <summary class="cursor-pointer p-4 hover:bg-slate-800/50 transition-colors flex justify-between items-center group">
                                <span class="text-slate-800 dark:text-white font-medium">Preview Data hasil Filtering</span>
                                <div class="flex items-center gap-3">
                                     <div class="export-btn-wrapper">
                                         <button id="exportMultiPreviewBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                            ⬇️ <span class="ml-1">CSV</span>
                                        </button>
                                    </div>
                                    <svg class="w-5 h-5 text-slate-400 transform transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                    </svg>
                                </div>
                            </summary>
                            <div class="p-4 bg-slate-50 dark:bg-slate-800/30 overflow-x-auto">
                                <table class="w-full text-sm text-left border border-slate-200 dark:border-slate-700">
                                    <thead class="text-xs text-slate-700 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/50 sticky top-0">
                                        <tr id="multiPreviewTableHeader">
                                            <!-- Headers will be dynamically generated -->
                                        </tr>
                                    </thead>
                                    <tbody id="multiPreviewTableBody" class="text-slate-600 dark:text-slate-300">
                                        <!-- Rows will be dynamically generated -->
                                    </tbody>
                                </table>
                            </div>
                        </details>
                        
                        <!-- Multi Filter Periodical Chart Container -->
                        <div class="mb-6 glass-panel p-6 relative">
                            <div class="flex justify-between items-center mb-4">
                                <h3 class="text-slate-800 dark:text-white font-medium" id="multiFilterPeriodicalChartTitle">Rata-rata NG (%) & Total Inspected (Lot) - Periodical Analysis</h3>
                                <div class="flex items-center gap-2">
                                    <label class="text-xs text-slate-500 dark:text-slate-400 font-medium">Timeframe:</label>
                                    <select id="multiFilterTimeframeSelect" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs px-2 py-1 text-slate-700 dark:text-white focus:outline-none focus:border-blue-500">
                                        <option value="Daily" selected>Daily</option>
                                        <option value="Weekly">Weekly</option>
                                        <option value="Monthly">Monthly</option>
                                        <option value="Yearly">Yearly</option>
                                    </select>
                                </div>
                            </div>
                            <div class="h-96">
                                <canvas id="multiFilterPeriodicalChart"></canvas>
                            </div>
                        </div>
                        

                        <!-- Grouped Results -->
                        <div class="glass-panel p-6">
                             <details class="overflow-hidden mb-6" open id="multiGroupedDetails">
                                <summary class="cursor-pointer p-4 hover:bg-slate-800/50 transition-colors flex justify-between items-center group">
                                     <h3 class="text-slate-800 dark:text-white font-semibold mb-0 inline-block">Rekap Data hasil Filtering:</h3>
                                     <div class="flex items-center gap-3">
                                         <div class="export-btn-wrapper">
                                             <button id="exportMultiGroupedBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                                ⬇️ <span class="ml-1">CSV</span>
                                            </button>
                                        </div>
                                        <svg class="w-5 h-5 text-slate-400 transform transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                        </svg>
                                    </div>
                                </summary>
                                <div class="overflow-x-auto mt-4">
                                    <table class="w-full text-sm text-left border-collapse">
                                        <thead class="text-xs text-slate-700 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-800/30">
                                            <tr id="multiGroupedTableHeader">
                                                <!-- Headers will be dynamically generated -->
                                            </tr>
                                        </thead>
                                        <tbody id="multiGroupedTableBody" class="text-slate-600 dark:text-slate-300">
                                            <!-- Rows will be dynamically generated -->
                                        </tbody>
                                    </table>
                                </div>
                            </details>
                        </div>
                    </div>
                    `
						}
        </div>
        
        <!-- Filter Line for Daily Chart Content -->
        <div id="filterLineContent" class="hidden">
            ${
							!state.processedData
								? `
                <div class="glass-panel p-6 mb-6">
                    <p class="text-yellow-500 text-center">
                        <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                        Silakan upload file Excel terlebih dahulu untuk menggunakan fitur filtering.
                    </p>
                </div>
            `
								: `
                <div class="glass-panel p-6 mb-6 border-l-4 border-blue-500">
                    <h3 class="text-slate-900 dark:text-white font-semibold text-lg mb-2">Filtering Data berdasarkan Line, Jenis NG dan PartName</h3>
                    <p class="text-slate-400 text-sm">Filtering data secara bertingkat berdasarkan Line, Jenis NG dan PartName untuk analisis lebih detail</p>
                </div>
                
                <!-- Line Selection -->
                <div class="glass-panel p-6 mb-6">
                    <label class="block text-slate-900 dark:text-white font-medium mb-3">Pilih Line yang ingin ditampilkan:</label>
                    <select id="dailyLineSelect" class="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500">
                        <option value="Barrel 4">Barrel 4</option>
                        <option value="Rack 1">Rack 1</option>
                        <option value="Nickel">Nickel</option>
                    </select>
                </div>
                
                <!-- Toggle for Daily Data Table -->
                <details class="mb-6 glass-panel" id="dailyDataDetails">
                    <summary class="cursor-pointer p-4 hover:bg-slate-700/30 transition-colors flex justify-between items-center group">
                        <span class="text-slate-900 dark:text-white font-medium flex items-center gap-2">
                            📋 Klik untuk melihat Tabel Data Harian
                        </span>
                        <div class="hidden export-btn-wrapper">
                             <button id="exportDailyDataBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                ⬇️ <span class="ml-1">CSV</span>
                            </button>
                        </div>
                    </summary>
                    <div class="p-4 border-t border-slate-700">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-xs text-slate-800 dark:text-slate-400 uppercase bg-slate-800/30">
                                    <tr>
                                        <th class="py-2 px-3 font-semibold">Tanggal</th>
                                        <th class="py-2 px-3 font-semibold text-right">Total Inspected (Lot)</th>
                                        <th class="py-2 px-3 font-semibold text-right">QTY NG (Lot)</th>
                                        <th class="py-2 px-3 font-semibold text-right">NG (%)</th>
                                    </tr>
                                </thead>
                                <tbody id="dailyDataTableBody">
                                    <!-- Will be populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>
                
                <!-- Daily Chart Container -->
                <div class="glass-panel p-6 mb-6 relative" id="dailyChartContainer">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-slate-800 dark:text-white font-medium" id="dailyChartTitle">Rata-rata NG (%) Harian & Total Inspected (Lot) - Barrel 4</h3>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-slate-500 dark:text-slate-400 font-medium">Timeframe:</label>
                            <select id="timeframeSelect" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs px-2 py-1 text-slate-700 dark:text-white focus:outline-none focus:border-blue-500">
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                            </select>
                        </div>
                    </div>
                    <div class="h-96">
                        <canvas id="dailyChart"></canvas>
                    </div>
                </div>
                
                <!-- Defect Type Filter Section -->
                <div class="glass-panel p-6 mb-6 border-l-4 border-amber-500">
                    <h3 class="text-slate-800 dark:text-white font-semibold mb-3">Filter Data Harian Berdasarkan Jenis NG</h3>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">Pilih jenis NG untuk melihat grafik harian dari jenis NG tersebut</p>
                    
                    <label class="block text-slate-700 dark:text-white font-medium mb-3">Pilih Jenis NG yang ingin ditampilkan:</label>
                    <select id="dailyDefectSelect" class="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white focus:outline-none focus:border-blue-500">
                        <option value="">-- Pilih Jenis NG --</option>
                        <option value="Warna">Warna</option>
                        <option value="Buram">Buram</option>
                        <option value="Berbayang">Berbayang</option>
                        <option value="Kotor">Kotor</option>
                        <option value="Tdk Terplating">Tdk Terplating</option>
                        <option value="Rontok/ Blister">Rontok/ Blister</option>
                        <option value="Tipis/ EE No Plating">Tipis/ EE No Plating</option>
                        <option value="Flek Kuning">Flek Kuning</option>
                        <option value="Terbakar">Terbakar</option>
                        <option value="Watermark">Watermark</option>
                        <option value="Jig Mark/ Renggang">Jig Mark/ Renggang</option>
                        <option value="Lecet/ Scratch">Lecet/ Scratch</option>
                        <option value="Seret">Seret</option>
                        <option value="Flek Hitam">Flek Hitam</option>
                        <option value="Flek Tangan">Flek Tangan</option>
                        <option value="Belang/ Dempet">Belang/ Dempet</option>
                        <option value="Bintik">Bintik</option>
                        <option value="Kilap">Kilap</option>
                        <option value="Tebal">Tebal</option>
                        <option value="Flek Putih">Flek Putih</option>
                        <option value="Spark">Spark</option>
                        <option value="Kotor H/ Oval">Kotor H/ Oval</option>
                        <option value="Terkikis/ Crack">Terkikis/ Crack</option>
                        <option value="Dimensi/ Penyok">Dimensi/ Penyok</option>
                    </select>
                </div>
                
                <!-- Toggle for Defect Daily Data Table -->
                <details class="mb-6 glass-panel hidden" id="defectDailyTableContainer">
                    <summary class="cursor-pointer p-4 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors flex justify-between items-center group">
                        <span class="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                            📋 Klik untuk melihat Tabel Data Harian untuk Jenis NG: <span id="defectTableTitle"></span>
                        </span>
                        <div class="hidden export-btn-wrapper">
                             <button id="exportDefectDailyDataBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                ⬇️ <span class="ml-1">CSV</span>
                            </button>
                        </div>
                    </summary>
                    <div class="p-4 border-t border-glass-border">
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/30">
                                    <tr>
                                        <th class="py-2 px-3 font-semibold">Tanggal</th>
                                        <th class="py-2 px-3 font-semibold text-right">Qty NG (pcs)</th>
                                        <th class="py-2 px-3 font-semibold text-right">Qty NG (Lot)</th>
                                        <th class="py-2 px-3 font-semibold text-right">INSPECTED (pcs)</th>
                                        <th class="py-2 px-3 font-semibold text-right">INSPECTED (Lot)</th>
                                        <th class="py-2 px-3 font-semibold text-right">NG (%)</th>
                                    </tr>
                                </thead>
                                <tbody id="defectDailyDataTableBody">
                                    <!-- Will be populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>
                
                <!-- Defect Daily Chart Container -->
                <div class="glass-panel p-6 hidden relative" id="defectDailyChartContainer">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-slate-800 dark:text-white font-medium" id="defectDailyChartTitle"></h3>
                        <div class="flex items-center gap-2">
                            <label class="text-xs text-slate-500 dark:text-slate-400 font-medium">Timeframe:</label>
                            <select id="defectTimeframeSelect" class="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs px-2 py-1 text-slate-700 dark:text-white focus:outline-none focus:border-blue-500">
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                                <option value="Yearly">Yearly</option>
                            </select>
                        </div>
                    </div>
                    <div class="h-96">
                        <canvas id="defectDailyChart"></canvas>
                    </div>
                </div>
                
                <!-- PartName Filter Section -->
                <div class="glass-panel p-6 mb-6 border-l-4 border-green-500 hidden relative z-20" id="partNameFilterSection">
                    <h3 class="text-slate-800 dark:text-white font-semibold mb-3">Filter Data Berdasarkan PartName</h3>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-4">Pilih PartName untuk melihat tabel detail harian dan rekapitulasi</p>
                    
                    <label class="block text-slate-800 dark:text-white font-medium mb-3">Pilih PartName:</label>
                    
                    <!-- Selected Part Names Tags -->
                    <div id="defectPartNameTagsContainer" class="flex flex-wrap gap-2 mb-3">
                        <!-- Tags will appear here -->
                    </div>
                    
                    <!-- Dropdown -->
                    <div class="relative">
                        <input 
                            type="text" 
                            id="defectPartNameSearchInput" 
                            class="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            placeholder="Search for part name..."
                        />
                        <svg class="absolute right-3 top-3 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>

                        <!-- Dropdown list - moved inside relative container for better positioning -->
                        <div id="defectPartNameDropdown" class="hidden absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded max-h-60 overflow-y-auto shadow-lg">
                            <!-- Options will be populated dynamically -->
                        </div>
                    </div>
                </div>
                
                <!-- Daily Detail Table -->
                <details class="mb-6 glass-panel hidden" id="defectPartDetailTableContainer">
                    <summary class="cursor-pointer p-4 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors flex justify-between items-center group">
                         <span class="text-slate-800 dark:text-white font-medium flex items-center gap-2">
                            📋 Klik untuk melihat Tabel Harian
                        </span>
                         <div class="hidden export-btn-wrapper">
                             <button id="exportDefectPartDetailBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                                ⬇️ <span class="ml-1">CSV</span>
                            </button>
                        </div>
                    </summary>
                    <div class="p-4 border-t border-slate-700">
                        <h4 class="text-slate-600 dark:text-slate-300 font-medium mb-3" id="defectPartDetailTableTitle">Tabel Tanggal, PartName, Jenis NG (lot), Tot Inspected (lot), JenisNG (%)</h4>
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="text-xs text-slate-600 dark:text-white uppercase bg-slate-800/30">
                                    <tr>
                                        <th class="py-2 px-3 font-semibold">Tanggal</th>
                                        <th class="py-2 px-3 font-semibold">PartName</th>
                                        <th class="py-2 px-3 font-semibold text-right" id="defectPartDetailColHeaderPcs"></th>
                                        <th class="py-2 px-3 font-semibold text-right" id="defectPartDetailColHeader"></th>
                                        <th class="py-2 px-3 font-semibold text-right">Qty Inspected (pcs)</th>
                                        <th class="py-2 px-3 font-semibold text-right">Tot Inspected (lot)</th>
                                        <th class="py-2 px-3 font-semibold text-right" id="defectPartDetailPercentHeader"></th>
                                    </tr>
                                </thead>
                                <tbody id="defectPartDetailTableBody">
                                    <!-- Will be populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </details>
                
                <!-- Summary Table by PartName -->
                <div class="glass-panel p-0 overflow-hidden hidden" id="defectPartSummaryTableContainer">
                    <div class="p-4 border-b border-glass-border bg-slate-800/50 flex justify-between items-center">
                        <h3 class="text-white font-semibold" id="defectPartSummaryTableTitle">Tabel Rekapitulasi by PartName</h3>
                        <button id="exportDefectPartSummaryBtn" class="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs flex items-center shadow-md transition-all hover:scale-105" title="Export to CSV">
                            ⬇️ <span class="ml-1">CSV</span>
                        </button>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm text-left">
                            <thead class="text-xs text-slate-600 dark:text-white uppercase bg-slate-800/30">
                                <tr>
                                    <th class="py-3 px-4 font-semibold text-center">#</th>
                                    <th class="py-3 px-4 font-semibold">PartName</th>
                                    <th class="py-3 px-4 font-semibold text-right border-l-2 border-blue-500" id="defectPartSummaryColHeaderPcs"></th>
                                    <th class="py-3 px-4 font-semibold text-right border-r-2 border-blue-500">Qty Inspected (pcs)</th>
                                    <th class="py-3 px-4 font-semibold text-right" id="defectPartSummaryColHeader"></th>
                                    <th class="py-3 px-4 font-semibold text-right border-r-2 border-blue-500">Qty Inspected (lot)</th>
                                    <th class="py-3 px-4 font-semibold text-right" id="defectPartSummaryPercentHeader"></th>
                                </tr>
                            </thead>
                            <tbody id="defectPartSummaryTableBody">
                                <!-- Will be populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                </div>
            `
						}
        </div>
            </div>
        </div>
    `;

	// Add event listeners only if data is available
	if (state.processedData && uniquePartNames.length > 0) {
		setupFilteringEventListeners(uniquePartNames);
	}

	// Setup daily chart listeners
	if (state.processedData) {
		setupDailyChartListeners();
	}
};

// === DAILY CHART FILTERING FUNCTIONS ===

const setupDailyChartListeners = () => {
	const dailyLineSelect = document.getElementById("dailyLineSelect");
	const dailyDefectSelect = document.getElementById("dailyDefectSelect");
	const timeframeSelect = document.getElementById("timeframeSelect");
	const defectTimeframeSelect = document.getElementById("defectTimeframeSelect");

	const handleTimeframeChange = (newTimeframe) => {
		filteringState.selectedTimeframe = newTimeframe;
		
		// Sync selectors
		if (timeframeSelect) timeframeSelect.value = newTimeframe;
		if (defectTimeframeSelect) defectTimeframeSelect.value = newTimeframe;
		
		// Update Main Chart
		processDailyData();
		renderDailyChart();
		
		// Update Defect Chart if active
		if (filteringState.selectedDefectType) {
			processDefectDailyData(filteringState.selectedDefectType);
			renderDefectDailyChart(filteringState.selectedDefectType);
		}
	};

	if (timeframeSelect) {
		timeframeSelect.addEventListener("change", (e) => handleTimeframeChange(e.target.value));
	}
	if (defectTimeframeSelect) {
		defectTimeframeSelect.addEventListener("change", (e) => handleTimeframeChange(e.target.value));
	}

	// --- Export Buttons Logic ---
	// 1. Daily Data Table Export
	const dailyDataDetails = document.getElementById("dailyDataDetails");
	const exportDailyDataBtn = document.getElementById("exportDailyDataBtn");
	
	if (dailyDataDetails && exportDailyDataBtn) {
		dailyDataDetails.addEventListener("toggle", function() {
			const wrapper = this.querySelector(".export-btn-wrapper");
			if (wrapper) {
				if (this.open) wrapper.classList.remove("hidden");
				else wrapper.classList.add("hidden");
			}
		});
		
		exportDailyDataBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			exportDailyDataToCSV(filteringState.dailyData, filteringState.selectedLine);
		});
	}

	// 2. Defect Daily Data Table Export
	const defectDailyDetails = document.getElementById("defectDailyTableContainer");
	const exportDefectDailyDataBtn = document.getElementById("exportDefectDailyDataBtn");

	if (defectDailyDetails && exportDefectDailyDataBtn) {
		defectDailyDetails.addEventListener("toggle", function() {
			const wrapper = this.querySelector(".export-btn-wrapper");
			if (wrapper) {
				if (this.open) wrapper.classList.remove("hidden");
				else wrapper.classList.add("hidden");
			}
		});

		exportDefectDailyDataBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			exportDefectDailyDataToCSV(filteringState.dailyDefectData, filteringState.selectedLine, filteringState.selectedDefectType);
		});
	}

	// 3. Defect Part Detail Table Export
	const defectPartDetailDetails = document.getElementById("defectPartDetailTableContainer");
	const exportDefectPartDetailBtn = document.getElementById("exportDefectPartDetailBtn");

	if (defectPartDetailDetails && exportDefectPartDetailBtn) {
		defectPartDetailDetails.addEventListener("toggle", function() {
			const wrapper = this.querySelector(".export-btn-wrapper");
			if (wrapper) {
				if (this.open) wrapper.classList.remove("hidden");
				else wrapper.classList.add("hidden");
			}
		});

		exportDefectPartDetailBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			// Note: data variable name verified as partDetailData from renderDefectPartTables function
			exportDefectPartDetailDataToCSV(filteringState.partDetailData, filteringState.selectedLine, filteringState.selectedDefectType);
		});
	}

	// 4. Defect Part Summary Table Export
	const exportDefectPartSummaryBtn = document.getElementById("exportDefectPartSummaryBtn");
	if (exportDefectPartSummaryBtn) {
		exportDefectPartSummaryBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			// Note: data variable name verified as partSummaryData from renderDefectPartTables function
			exportDefectPartSummaryDataToCSV(filteringState.partSummaryData, filteringState.selectedLine, filteringState.selectedDefectType);
		});
	}

	if (dailyLineSelect) {
		dailyLineSelect.addEventListener("change", (e) => {
			filteringState.selectedLine = e.target.value;
			processDailyData();
			renderDailyChart();

			// Reset defect filter when line changes
			if (dailyDefectSelect) {
				dailyDefectSelect.value = "";
				filteringState.selectedDefectType = null;
				filteringState.selectedPartNamesForDefect = []; // Reset PartName selections
				hideDefectCharts();
			}
		});

		// Initial load
		filteringState.selectedLine = dailyLineSelect.value;
		processDailyData();
		renderDailyChart();
	}

	if (dailyDefectSelect) {
		dailyDefectSelect.addEventListener("change", (e) => {
			const defectType = e.target.value;
			filteringState.selectedDefectType = defectType || null;

			if (defectType) {
				filteringState.selectedPartNamesForDefect = []; // Reset part selections for new defect
				processDefectDailyData(defectType);
				renderDefectDailyChart(defectType);
			} else {
				hideDefectCharts();
			}
		});
	}
};

const processDailyData = () => {
	if (!state.processedData) return;

	const selectedLine = filteringState.selectedLine;
	const timeframe = filteringState.selectedTimeframe || "Daily";

	// Filter data for selected line and include trial data
	const lineData = state.processedData.filter(
		(row) => {
			const lineMatch = row["Line"] === selectedLine;
			const trialMatch = filteringState.includeTrialData || !row.isTrial;
			const categoryMatch = row.Kategori !== 'kosong' || row.isTrial;
			return lineMatch && trialMatch && categoryMatch;
		}
	);

	// Group by timeframe
	const groups = {};

	lineData.forEach((row) => {
		const dateObj = row["DateObj"];
		if (!dateObj || isNaN(dateObj)) return;

		let groupKey;
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		if (timeframe === "Weekly") {
			// Monday to Saturday grouping
			const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 1 is Monday
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(dateObj);
			monday.setDate(dateObj.getDate() + diff);
			
			const d = String(monday.getDate()).padStart(2, "0");
			const m = monthNames[monday.getMonth()];
			const y = String(monday.getFullYear()).slice(-2);
			groupKey = `W${getWeekNumber(monday)} (${d}-${m}-${y})`;
		} else if (timeframe === "Monthly") {
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${m}-${y}`;
		} else if (timeframe === "Yearly") {
			groupKey = String(dateObj.getFullYear());
		} else {
			// Daily
			const d = String(dateObj.getDate()).padStart(2, "0");
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${d}-${m}-${y}`;
		}

		if (!groups[groupKey]) {
			groups[groupKey] = {
				date: groupKey,
				dateObj: new Date(dateObj), // Reference date for sorting
				inspLot: 0,
				ngLot: 0,
				sumNGPercent: 0,
				count: 0,
			};
			
			// For Weekly, Monthly, Yearly, we want dateObj to be the start of the period for sorting
			if (timeframe === "Weekly") {
				const dayOfWeek = dateObj.getDay();
				const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
				groups[groupKey].dateObj.setDate(dateObj.getDate() + diff);
			} else if (timeframe === "Monthly") {
				groups[groupKey].dateObj.setDate(1);
			} else if (timeframe === "Yearly") {
				groups[groupKey].dateObj.setMonth(0, 1);
			}
		}

		groups[groupKey].inspLot += Number(row["Insp(Lot)"]) || 0;
		groups[groupKey].ngLot += Number(row["NG(Lot)"]) || 0;

		if (row["NG_%"] !== undefined && row["NG_%"] !== null) {
			groups[groupKey].sumNGPercent += Number(row["NG_%"]);
			groups[groupKey].count += 1;
		}
	});

	// Convert to array and sort by date
	const dailyArray = Object.values(groups).sort(
		(a, b) => a.dateObj - b.dateObj
	);

	// Calculate average NG%
	dailyArray.forEach((day) => {
		day.ngPercent = day.count > 0 ? day.sumNGPercent / day.count : 0;
	});

	filteringState.dailyData = dailyArray;
};

const renderDailyChart = () => {
	const canvas = document.getElementById("dailyChart");
	const titleElement = document.getElementById("dailyChartTitle");
	const tableBody = document.getElementById("dailyDataTableBody");
	const dateHeader = document.querySelector("#dailyDataDetails th:first-child");

	if (!canvas || filteringState.dailyData.length === 0) return;

	const timeframe = filteringState.selectedTimeframe || "Daily";
	const timeframeLabel = timeframe === "Daily" ? "Harian" : 
						 timeframe === "Weekly" ? "Mingguan" :
						 timeframe === "Monthly" ? "Bulanan" : "Tahunan";

	// Update title
	if (titleElement) {
		titleElement.textContent = `Rata-rata NG (%) ${timeframeLabel} & Total Inspected (Lot) - ${filteringState.selectedLine}`;
	}

	// Update table header
	if (dateHeader) {
		dateHeader.textContent = timeframe === "Daily" ? "Tanggal" : "Periode";
	}

	// Update table
	if (tableBody) {
		tableBody.innerHTML = filteringState.dailyData
			.map(
				(day) => `
            <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                <td class="py-2 px-3 text-slate-700 dark:text-slate-300">${
									day.date
								}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.inspLot.toFixed(
									2
								)}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.ngLot.toFixed(
									2
								)}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.ngPercent.toFixed(
									4
								)}</td>
            </tr>
        `
			)
			.join("");
	}

	// Destroy existing chart
	if (state.charts.dailyChart) {
		state.charts.dailyChart.destroy();
	}

	// Prepare data
	const labels = filteringState.dailyData.map((d) => d.date);
	const inspData = filteringState.dailyData.map((d) => d.inspLot);
	const ngData = filteringState.dailyData.map((d) => d.ngPercent);

	// Calculate max for proper scaling
	const maxInsp = Math.max(...inspData);
	const maxNG = Math.max(...ngData);

	const isDark = document.documentElement.classList.contains("dark");
	const gridColor = isDark ? "#334155" : "rgba(0, 0, 0, 0.1)";
	const tickColor = isDark ? "#94a3b8" : "#475569";
	const titleColor = isDark ? "#ffffff" : "#1e293b";

	// Create chart
	const ctx = canvas.getContext("2d");
	state.charts.dailyChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					label: "Total Inspected (Lot)",
					data: inspData,
					backgroundColor: "#ecb34aff",
					borderColor: "#ecb34aff",
					borderWidth: 1,
					yAxisID: "y",
					order: 2,
				},
				{
					label: "NG (%)",
					data: ngData,
					type: "line",
					borderColor: "#ef4444",
					backgroundColor: "#ef4444",
					borderWidth: 2,
					pointRadius: 4,
					pointBackgroundColor: "#ef4444",
					pointBorderColor: "#fff",
					pointBorderWidth: 1,
					yAxisID: "y1",
					order: 1,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						color: tickColor,
						font: { size: 11 },
						padding: 10,
					},
				},
				title: {
					display: false,
				},
				datalabels: {
					display: false,
				},
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					beginAtZero: true,
					suggestedMax: maxInsp * 1.1,
					title: {
						display: true,
						text: "Total Inspected (Lot)",
						color: "#ecb34aff",
						font: { size: 11, weight: "bold" },
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: tickColor,
						font: { size: 10 },
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					beginAtZero: true,
					min: 0,
					suggestedMax: maxNG * 1.1,
					title: {
						display: true,
						text: "NG (%)",
						color: "#ef4444",
						font: { size: 11, weight: "bold" },
					},
					grid: {
						drawOnChartArea: false,
					},
					ticks: {
						color: "#ef4444",
						font: { size: 10 },
						callback: function (value) {
							return value.toFixed(2) + "%";
						},
					},
				},
				x: {
					title: {
						display: true,
						text: timeframe === "Daily" ? "Tanggal" : 
							  timeframe === "Weekly" ? "Minggu" :
							  timeframe === "Monthly" ? "Bulan" : "Tahun",
						color: titleColor,
						font: { size: 11 },
					},
					grid: { display: false },
					ticks: {
						color: tickColor,
						font: { size: 9 },
						maxRotation: 45,
						minRotation: 45,
					},
				},
			},
		},
	});
};

const processDefectDailyData = (defectType) => {
	if (!state.processedData) return;

	const selectedLine = filteringState.selectedLine;
	const timeframe = filteringState.selectedTimeframe || "Daily";

	// Filter data for selected line and include trial data
	const lineData = state.processedData.filter(
		(row) => {
			const lineMatch = row["Line"] === selectedLine;
			const trialMatch = filteringState.includeTrialData || !row.isTrial;
			const categoryMatch = row.Kategori !== 'kosong' || row.isTrial;
			return lineMatch && trialMatch && categoryMatch;
		}
	);

	// Group by timeframe
	const groups = {};

	lineData.forEach((row) => {
		const dateObj = row["DateObj"];
		if (!dateObj || isNaN(dateObj)) return;

		let groupKey;
		const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

		if (timeframe === "Weekly") {
			const dayOfWeek = dateObj.getDay();
			const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
			const monday = new Date(dateObj);
			monday.setDate(dateObj.getDate() + diff);
			
			const d = String(monday.getDate()).padStart(2, "0");
			const m = monthNames[monday.getMonth()];
			const y = String(monday.getFullYear()).slice(-2);
			groupKey = `W${getWeekNumber(monday)} (${d}-${m}-${y})`;
		} else if (timeframe === "Monthly") {
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${m}-${y}`;
		} else if (timeframe === "Yearly") {
			groupKey = String(dateObj.getFullYear());
		} else {
			// Daily
			const d = String(dateObj.getDate()).padStart(2, "0");
			const m = monthNames[dateObj.getMonth()];
			const y = String(dateObj.getFullYear()).slice(-2);
			groupKey = `${d}-${m}-${y}`;
		}

		if (!groups[groupKey]) {
			groups[groupKey] = {
				date: groupKey,
				dateObj: new Date(dateObj),
				defectLot: 0,
				defectPcs: 0,
				inspLot: 0,
				inspPcs: 0,
			};
			
			if (timeframe === "Weekly") {
				const dayOfWeek = dateObj.getDay();
				const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
				groups[groupKey].dateObj.setDate(dateObj.getDate() + diff);
			} else if (timeframe === "Monthly") {
				groups[groupKey].dateObj.setDate(1);
			} else if (timeframe === "Yearly") {
				groups[groupKey].dateObj.setMonth(0, 1);
			}
		}

		groups[groupKey].defectLot += Number(row[defectType]) || 0;
		groups[groupKey].defectPcs += Number(row[defectType + "(pcs)"]) || 0;
		groups[groupKey].inspLot += Number(row["Insp(Lot)"]) || 0;
		groups[groupKey].inspPcs += Number(row["QInspec"]) || 0;
	});

	// Convert to array and sort by date
	const dailyArray = Object.values(groups).sort(
		(a, b) => a.dateObj - b.dateObj
	);

	// Calculate NG% for this defect
	dailyArray.forEach((day) => {
		day.ngPercent = day.inspLot > 0 ? (day.defectLot / day.inspLot) * 100 : 0;
	});

	filteringState.dailyDefectData = dailyArray;
};

const renderDefectDailyChart = (defectType) => {
	const canvas = document.getElementById("defectDailyChart");
	const container = document.getElementById("defectDailyChartContainer");
	const titleElement = document.getElementById("defectDailyChartTitle");
	const tableContainer = document.getElementById("defectDailyTableContainer");
	const tableTitle = document.getElementById("defectTableTitle");
	const tableBody = document.getElementById("defectDailyDataTableBody");
	const dateHeader = document.querySelector("#defectDailyTableContainer th:first-child");

	if (!canvas || filteringState.dailyDefectData.length === 0) return;

	const timeframe = filteringState.selectedTimeframe || "Daily";
	const timeframeLabel = timeframe === "Daily" ? "Harian" : 
						 timeframe === "Weekly" ? "Mingguan" :
						 timeframe === "Monthly" ? "Bulanan" : "Tahunan";

	// Show containers
	if (container) container.classList.remove("hidden");
	if (tableContainer) tableContainer.classList.remove("hidden");

	// Update titles
	if (titleElement) {
		titleElement.textContent = `Qty NG (Lot) - ${defectType} (%) ${timeframeLabel} - ${filteringState.selectedLine}`;
	}
	if (tableTitle) {
		tableTitle.textContent = defectType;
	}
	
	// Update table header
	if (dateHeader) {
		dateHeader.textContent = timeframe === "Daily" ? "Tanggal" : "Periode";
	}

	// Update table
	if (tableBody) {
		tableBody.innerHTML = filteringState.dailyDefectData
			.map(
				(day) => `
            <tr class="border-b border-slate-200 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                <td class="py-2 px-3 text-slate-700 dark:text-slate-300">${
									day.date
								}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right font-medium">${day.defectPcs.toLocaleString()}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.defectLot.toFixed(
									4
								)}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right font-medium">${day.inspPcs.toLocaleString()}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.inspLot.toFixed(
									0
								)}</td>
                <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${day.ngPercent.toFixed(
									4
								)}</td>
            </tr>
        `
			)
			.join("");
	}

	// Destroy existing chart
	if (state.charts.defectDailyChart) {
		state.charts.defectDailyChart.destroy();
	}

	// Prepare data
	const labels = filteringState.dailyDefectData.map((d) => d.date);
	const defectData = filteringState.dailyDefectData.map((d) => d.defectLot);
	const ngData = filteringState.dailyDefectData.map((d) => d.ngPercent);

	// Calculate max for proper scaling
	const maxDefect = Math.max(...defectData);
	const maxNG = Math.max(...ngData);

	const isDark = document.documentElement.classList.contains("dark");
	const gridColor = isDark ? "#334155" : "rgba(0, 0, 0, 0.1)";
	const tickColor = isDark ? "#94a3b8" : "#475569";
	const titleColor = isDark ? "#ffffff" : "#1e293b";

	// Create chart
	const ctx = canvas.getContext("2d");
	state.charts.defectDailyChart = new Chart(ctx, {
		type: "bar",
		data: {
			labels: labels,
			datasets: [
				{
					label: `Qty ${defectType} (Lot)`,
					data: defectData,
					backgroundColor: "#3a4661ff",
					borderColor: "#3a4661ff",
					borderWidth: 1,
					yAxisID: "y",
					order: 2,
				},
				{
					label: `${defectType} (%)`,
					data: ngData,
					type: "line",
					borderColor: "#ef4444",
					backgroundColor: "#ef4444",
					borderWidth: 2,
					pointRadius: 4,
					pointBackgroundColor: "#ef4444",
					pointBorderColor: "#fff",
					pointBorderWidth: 1,
					yAxisID: "y1",
					order: 1,
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: "index",
				intersect: false,
			},
			plugins: {
				legend: {
					position: "bottom",
					labels: {
						color: tickColor,
						font: { size: 11 },
						padding: 10,
					},
				},
				title: {
					display: false,
				},
				datalabels: {
					display: false,
				},
			},
			scales: {
				y: {
					type: "linear",
					display: true,
					position: "left",
					beginAtZero: true,
					suggestedMax: maxDefect * 1.1,
					title: {
						display: true,
						text: `Qty ${defectType} (Lot)`,
						color: "#3a4661ff",
						font: { size: 11, weight: "bold" },
					},
					grid: {
						color: gridColor,
					},
					ticks: {
						color: tickColor,
						font: { size: 10 },
					},
				},
				y1: {
					type: "linear",
					display: true,
					position: "right",
					beginAtZero: true,
					min: 0,
					suggestedMax: maxNG * 1.1,
					title: {
						display: true,
						text: `${defectType} (%)`,
						color: "#ef4444",
						font: { size: 11, weight: "bold" },
					},
					grid: {
						drawOnChartArea: false,
					},
					ticks: {
						color: "#ef4444",
						font: { size: 10 },
						callback: function (value) {
							return value.toFixed(2) + "%";
						},
					},
				},
				x: {
					title: {
						display: true,
						text: timeframe === "Daily" ? "Tanggal" : 
							  timeframe === "Weekly" ? "Minggu" :
							  timeframe === "Monthly" ? "Bulan" : "Tahun",
						color: titleColor,
						font: { size: 11 },
					},
					grid: { display: false },
					ticks: {
						color: tickColor,
						font: { size: 9 },
						maxRotation: 45,
						minRotation: 45,
					},
				},
			},
		},
	});

	// Show PartName filter section and setup listeners
	showPartNameFilter();
	setupPartNameFilterForDefect();

	// Show tables immediately with all PartNames
	processDefectPartData();
	renderDefectPartTables();
};

const hideDefectCharts = () => {
	const container = document.getElementById("defectDailyChartContainer");
	const tableContainer = document.getElementById("defectDailyTableContainer");

	if (container) container.classList.add("hidden");
	if (tableContainer) tableContainer.classList.add("hidden");

	// Destroy chart
	if (state.charts.defectDailyChart) {
		state.charts.defectDailyChart.destroy();
		delete state.charts.defectDailyChart;
	}

	// Hide PartName filter and tables
	hidePartNameFilter();
};

// === PARTNAME FILTER FOR DEFECT FUNCTIONS ===

const setupPartNameFilterForDefect = () => {
	const searchInput = document.getElementById("defectPartNameSearchInput");
	const dropdown = document.getElementById("defectPartNameDropdown");
	const tagsContainer = document.getElementById("defectPartNameTagsContainer");

	if (!searchInput || !dropdown || !state.processedData) return;

	// Get unique part names for current line and defect type
	const lineData = state.processedData.filter(
		(row) =>
			row["Line"] === filteringState.selectedLine &&
			!row.isTrial &&
			row.Kategori !== "kosong" &&
			Number(row[filteringState.selectedDefectType]) > 0
	);

	const partNames = [...new Set(lineData.map((row) => row.partName))]
		.filter((p) => p)
		.sort();

	// Populate dropdown
	dropdown.innerHTML = partNames
		.map(
			(partName) => `
        <div class="px-4 py-2 hover:bg-blue-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-white text-sm defect-partname-option" data-partname="${partName}">
            ${partName}
        </div>
    `
		)
		.join("");

	// Show dropdown on focus
	searchInput.addEventListener("focus", () => {
		dropdown.classList.remove("hidden");
	});

	// Hide dropdown on click outside
	document.addEventListener("click", (e) => {
		if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
			dropdown.classList.add("hidden");
		}
	});

	// Filter dropdown items
	searchInput.addEventListener("input", (e) => {
		const searchTerm = e.target.value.toLowerCase();
		const options = dropdown.querySelectorAll(".defect-partname-option");

		options.forEach((option) => {
			const partName = option.getAttribute("data-partname").toLowerCase();
			if (partName.includes(searchTerm)) {
				option.classList.remove("hidden");
			} else {
				option.classList.add("hidden");
			}
		});

		dropdown.classList.remove("hidden");
	});

	// Add partname to selection
	dropdown.addEventListener("click", (e) => {
		const option = e.target.closest(".defect-partname-option");
		if (!option) return;

		const partName = option.getAttribute("data-partname");

		// Add if not already selected
		if (!filteringState.selectedPartNamesForDefect.includes(partName)) {
			filteringState.selectedPartNamesForDefect.push(partName);
			renderDefectPartNameTags();
			processDefectPartData();
			renderDefectPartTables();
		}

		searchInput.value = "";
		dropdown.classList.add("hidden");
	});

	// Render tags initially
	renderDefectPartNameTags();
};

const renderDefectPartNameTags = () => {
	const tagsContainer = document.getElementById("defectPartNameTagsContainer");
	if (!tagsContainer) return;

	if (filteringState.selectedPartNamesForDefect.length === 0) {
		tagsContainer.innerHTML = "";
		// Don't hide tables, instead show all PartNames
		processDefectPartData();
		renderDefectPartTables();
		return;
	}

	tagsContainer.innerHTML = filteringState.selectedPartNamesForDefect
		.map(
			(partName) => `
        <div class="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded">
            <span>${
							partName.length > 30
								? partName.substring(0, 30) + "..."
								: partName
						}</span>
            <button class="remove-defect-partname-tag hover:bg-red-700 rounded-full p-0.5" data-partname="${partName}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    `
		)
		.join("");

	// Add remove event listeners
	tagsContainer
		.querySelectorAll(".remove-defect-partname-tag")
		.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				const partName = e.currentTarget.getAttribute("data-partname");
				filteringState.selectedPartNamesForDefect =
					filteringState.selectedPartNamesForDefect.filter(
						(p) => p !== partName
					);
				renderDefectPartNameTags();
			});
		});
};

const processDefectPartData = () => {
	if (!state.processedData) return;

	const selectedLine = filteringState.selectedLine;
	const defectType = filteringState.selectedDefectType;

	// Filter data - if no PartNames selected, show all; otherwise filter
	let filteredData;
	if (filteringState.selectedPartNamesForDefect.length === 0) {
		// Step 1: Find all PartNames that have this defect at least once
		const partNamesWithDefect = new Set();
		state.processedData.forEach((row) => {
			const trialMatch = filteringState.includeTrialData || !row.isTrial;
			const categoryMatch = row.Kategori !== 'kosong' || row.isTrial;
			if (
				row["Line"] === selectedLine &&
				trialMatch &&
				categoryMatch &&
				Number(row[defectType]) > 0
			) {
				partNamesWithDefect.add(row.partName);
			}
		});

		// Step 2: Get ALL data for those PartNames (including rows with defect = 0)
		filteredData = state.processedData.filter(
			(row) => {
				const trialMatch = filteringState.includeTrialData || !row.isTrial;
				const categoryMatch = row.Kategori !== 'kosong' || row.isTrial;
				return row["Line"] === selectedLine &&
					trialMatch &&
					categoryMatch &&
					partNamesWithDefect.has(row.partName);
			}
		);
	} else {
		// Filter by selected PartNames - get ALL their data
		filteredData = state.processedData.filter(
			(row) => {
				const trialMatch = filteringState.includeTrialData || !row.isTrial;
				const categoryMatch = row.Kategori !== 'kosong' || row.isTrial;
				return row["Line"] === selectedLine &&
					trialMatch &&
					categoryMatch &&
					filteringState.selectedPartNamesForDefect.includes(row.partName);
			}
		);
	}

	let detailArray = [];
	let summaryArray = [];

	if (filteredData.length > 0) {
		// Process Detail Data (daily by partname)
		const detailData = {};

		filteredData.forEach((row) => {
			const dateObj = row["DateObj"];
			if (!dateObj || isNaN(dateObj)) return;

			// Format date
			const day = String(dateObj.getDate()).padStart(2, "0");
			const monthNames = [
				"Jan",
				"Feb",
				"Mar",
				"Apr",
				"May",
				"Jun",
				"Jul",
				"Aug",
				"Sep",
				"Oct",
				"Nov",
				"Dec",
			];
			const month = monthNames[dateObj.getMonth()];
			const year = String(dateObj.getFullYear()).slice(-2);
			const dateKey = `${day}-${month}-${year}`;

			// Use row.partName which is normalized
			const partName = row.partName;
			const key = `${dateKey}|${partName}`;

			if (!detailData[key]) {
				detailData[key] = {
					date: dateKey, // Use formatted date for display
					dateObj: row["DateObj"],
					partName: partName,
					defectLot: 0,
					defectPcs: 0,
					inspLot: 0,
					inspPcs: 0,
					ngPercent: 0,
				};
			}

			detailData[key].defectLot += Number(row[defectType]) || 0;
			detailData[key].defectPcs += Number(row[defectType + "(pcs)"]) || 0;
			detailData[key].inspLot += Number(row["Insp(Lot)"]) || 0;
			detailData[key].inspPcs += Number(row["QInspec"]) || 0;
		});

		detailArray = Object.values(detailData)
			.map((d) => ({
				...d,
				ngPercent: d.inspLot > 0 ? (d.defectLot / d.inspLot) * 100 : 0,
			}))
			.sort((a, b) => a.dateObj - b.dateObj);

		// Process Summary Data (Total per PartName)
		const summaryData = {};
		filteredData.forEach((row) => {
			const partName = row.partName;
			if (!summaryData[partName]) {
				summaryData[partName] = {
					partName: partName,
					defectLot: 0,
					defectPcs: 0,
					inspLot: 0,
					inspPcs: 0,
				};
			}
			summaryData[partName].defectLot += Number(row[defectType]) || 0;
			summaryData[partName].defectPcs += Number(row[defectType + "(pcs)"]) || 0;
			summaryData[partName].inspLot += Number(row["Insp(Lot)"]) || 0;
			summaryData[partName].inspPcs += Number(row["QInspec"]) || 0;
		});

		summaryArray = Object.values(summaryData)
			.map((d) => ({
				...d,
				ngPercent: d.inspLot > 0 ? (d.defectLot / d.inspLot) * 100 : 0,
			}))
			.sort((a, b) => b.ngPercent - a.ngPercent); // Sort by highest NG% first
	}

	filteringState.partDetailData = detailArray;
	filteringState.partSummaryData = summaryArray;
};

const renderDefectPartTables = () => {
	const detailContainer = document.getElementById(
		"defectPartDetailTableContainer"
	);
	const summaryContainer = document.getElementById(
		"defectPartSummaryTableContainer"
	);

	// Headers
	const detailColHeader = document.getElementById("defectPartDetailColHeader");
	const detailColHeaderPcs = document.getElementById(
		"defectPartDetailColHeaderPcs"
	);
	const detailPercentHeader = document.getElementById(
		"defectPartDetailPercentHeader"
	);
	const summaryColHeader = document.getElementById(
		"defectPartSummaryColHeader"
	);
	const summaryColHeaderPcs = document.getElementById(
		"defectPartSummaryColHeaderPcs"
	);
	const summaryPercentHeader = document.getElementById(
		"defectPartSummaryPercentHeader"
	);

	// Bodies
	const detailBody = document.getElementById("defectPartDetailTableBody");
	const summaryBody = document.getElementById("defectPartSummaryTableBody");

	if (filteringState.selectedDefectType) {
		// Show containers
		if (detailContainer) detailContainer.classList.remove("hidden");
		if (summaryContainer) summaryContainer.classList.remove("hidden");

		// Update Headers
		const defectName = filteringState.selectedDefectType;
		// Helper to update text content safely
		[detailColHeader, summaryColHeader].forEach((el) => {
			if (el) el.textContent = `${defectName} (LOT)`;
		});
		[detailColHeaderPcs, summaryColHeaderPcs].forEach((el) => {
			if (el) el.textContent = `${defectName} (pcs)`;
		});
		[detailPercentHeader, summaryPercentHeader].forEach((el) => {
			if (el) el.textContent = `${defectName}NG_%`;
		});

		// Render Detail Table
		if (detailBody) {
			detailBody.innerHTML = filteringState.partDetailData
				.map(
					(row) => `
                <tr class="border-b border-slate-600 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td class="py-2 px-3 text-slate-700 dark:text-slate-300">${
											row.date
										}</td>
                    <td class="py-2 px-3 text-slate-700 dark:text-slate-300">${
											row.partName
										}</td>
										<td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right font-medium">${row.ngPercent.toFixed(
											2
										)}%</td>
                    <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${row.defectPcs.toLocaleString()}</td>
                    <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${row.defectLot.toFixed(
											2
										)}</td>
                    <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${row.inspPcs.toLocaleString()}</td>
                    <td class="py-2 px-3 text-slate-600 dark:text-slate-400 text-right">${row.inspLot.toFixed(
											2
										)}</td>
                    
                </tr>
            `
				)
				.join("");

			if (filteringState.partDetailData.length === 0) {
				detailBody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-500">No data available for selected filter</td></tr>`;
			}
		}

		// Render Summary Table
		if (summaryBody) {
			summaryBody.innerHTML = filteringState.partSummaryData
				.map(
					(row, index) => `
                <tr class="border-b border-slate-600 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td class="py-3 px-4 text-center text-slate-400 font-medium">${
											index + 1
										}</td>
                    <td class="py-3 px-4 text-slate-900 dark:text-slate-300 font-medium">${
											row.partName
										}</td>
										<td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-right font-medium">${row.ngPercent.toFixed(
											2
										)}%</td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-right border-l-2 border-blue-500/30">${row.defectPcs.toLocaleString()}</td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-right border-r-2 border-blue-500/30">${row.inspPcs.toLocaleString()}</td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-right">${row.defectLot.toFixed(
											2
										)}</td>
                    <td class="py-3 px-4 text-slate-600 dark:text-slate-400 text-right border-r-2 border-blue-500/30">${row.inspLot.toFixed(
											2
										)}</td>
                    
                </tr>
            `
				)
				.join("");

			if (filteringState.partSummaryData.length === 0) {
				summaryBody.innerHTML = `<tr><td colspan="7" class="py-4 text-center text-slate-500">No data available</td></tr>`;
			}
		}
	}
};

const hidePartNameFilter = () => {
	const filterSection = document.getElementById("partNameFilterSection");
	if (filterSection) filterSection.classList.add("hidden");

	hidePartNameTables();
};

const showPartNameFilter = () => {
	const filterSection = document.getElementById("partNameFilterSection");
	if (filterSection) filterSection.classList.remove("hidden");
};

const hidePartNameTables = () => {
	const detailContainer = document.getElementById(
		"defectPartDetailTableContainer"
	);
	const summaryContainer = document.getElementById(
		"defectPartSummaryTableContainer"
	);

	if (detailContainer) detailContainer.classList.add("hidden");
	if (summaryContainer) summaryContainer.classList.add("hidden");
};

// Export Housing HORN data to CSV
const exportHousingHornToCSV = (hhData, tableType) => {
	if (!hhData) {
		alert("No data available to export");
		return;
	}

	let csvContent = "";
	let filename = "";

	if (tableType === "lot") {
		// Export LOT table
		filename = `Housing_Horn_LOT_${new Date().toISOString().split('T')[0]}.csv`;

		// Headers
		csvContent = "PartName,NG (%),OK (lot),NG (lot),NGM (lot),Tot.Insp (lot)\n";

		// Data rows
		hhData.tableDataLot.forEach(row => {
			csvContent += `"${row.partName}",${row.ngPercent.toFixed(2)},${row.okLot.toFixed(2)},${row.ngLot.toFixed(2)},${row.ngmLot.toFixed(2)},${row.totInspLot.toFixed(2)}\n`;
		});

		// Total row
		csvContent += `"TOTAL",${hhData.metrics.ngPercent.toFixed(2)},${hhData.metrics.okLot.toFixed(2)},${hhData.metrics.ngLot.toFixed(2)},0,${hhData.metrics.inspLot.toFixed(2)}\n`;

	} else if (tableType === "pcs") {
		// Export PCS table
		filename = `Housing_Horn_PCS_${new Date().toISOString().split('T')[0]}.csv`;

		// Headers
		csvContent = "PartName,NG (%),OK (pcs),NG (pcs),NGM (pcs),Tot.Insp (pcs)\n";

		// Data rows
		hhData.tableDataPcs.forEach(row => {
			csvContent += `"${row.partName}",${row.ngPercent.toFixed(2)},${row.okPcs},${row.ngPcs},${row.ngmPcs},${row.totInspPcs}\n`;
		});

		// Total row
		csvContent += `"TOTAL",${hhData.metrics.ngPercent.toFixed(2)},${hhData.metrics.okPcs},${hhData.metrics.ngPcs},0,${hhData.metrics.inspPcs}\n`;
	}

	downloadCSV(csvContent, filename);
};

// --- Daily Chart Export Functions ---

// Export Multi Preview Data
const exportMultiPreviewDataToCSV = () => {
    const data = filteringState.multiFilteredData;
    const columns = filteringState.multiFilterColumns;

    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Headers
    let csvContent = columns.join(",") + "\n";

    // Rows
    data.forEach(row => {
        const rowStr = columns.map(col => {
            let val = row[col];
            if (val === undefined || val === null) val = "";
            // Handle quotes/commas in string
            if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(",");
        csvContent += rowStr + "\n";
    });

    const filename = `Multi_Filter_Result_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
};

// Export Multi Grouped Data
const exportMultiGroupedDataToCSV = () => {
	const data = filteringState.multiGroupedData;
	const activeDefects = filteringState.activeMultiGroupDefects || [];
	
	if (!data || data.length === 0) {
		alert("No data to export");
		return;
	}

	// Headers
	let header = ["No", "PartName", "NG_%", "QInspec", "OK(pcs)", "Qty(NG)"];
	activeDefects.forEach(d => header.push(`${d}(pcs)`));

	let csvContent = header.join(",") + "\n";

	// Rows
	data.forEach((row, idx) => {
		let rowData = [
			idx + 1,
			`"${row.PartName}"`,
			row["NG_%"],
			row["QInspec"],
			row["OK(pcs)"],
			row["Qty(NG)"]
		];

		activeDefects.forEach(d => {
			rowData.push(row[d]);
		});

		csvContent += rowData.join(",") + "\n";
	});

	const filename = `Multi_Filter_Rekap_${new Date().toISOString().split('T')[0]}.csv`;
	downloadCSV(csvContent, filename);
};

// Export Daily Data Table
const exportDailyDataToCSV = (data, line) => {
	if (!data || data.length === 0) {
		alert("No data available to export");
		return;
	}
	
	const filename = `Daily_Data_${line.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = "Tanggal,Total Inspected (Lot),QTY NG (Lot),NG (%)\n";
	
	data.forEach(row => {
		csvContent += `${row.date},${row.inspLot.toFixed(2)},${row.ngLot.toFixed(2)},${row.ngPercent.toFixed(4)}\n`;
	});
	
	downloadCSV(csvContent, filename);
};

// Export Defect Daily Data Table
const exportDefectDailyDataToCSV = (data, line, defectType) => {
	if (!data || data.length === 0) {
		alert("No data available to export");
		return;
	}
	
	const filename = `Daily_${defectType.replace(/\s+/g, '_')}_${line.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = "Tanggal,Qty NG (pcs),Qty NG (Lot),INSPECTED (pcs),INSPECTED (Lot),NG (%)\n";
	
	data.forEach(row => {
		csvContent += `${row.date},${row.defectPcs},${row.defectLot.toFixed(4)},${row.inspPcs},${row.inspLot.toFixed(0)},${row.ngPercent.toFixed(4)}\n`;
	});
	
	downloadCSV(csvContent, filename);
};

// Export Defect Part Detail Data Table
const exportDefectPartDetailDataToCSV = (data, line, defectType) => {
	if (!data || data.length === 0) {
		alert("No data available to export");
		return;
	}
	
	const filename = `Detail_${defectType.replace(/\s+/g, '_')}_PartName_${line.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = `Tanggal,PartName,${defectType} (pcs),${defectType} (Lot),Qty Inspected (pcs),Tot Inspected (lot),${defectType} NG (%)\n`;
	
	data.forEach(row => {
		csvContent += `${row.date},"${row.partName}",${row.defectPcs},${row.defectLot.toFixed(2)},${row.inspPcs},${row.inspLot.toFixed(2)},${row.ngPercent.toFixed(2)}\n`;
	});
	
	downloadCSV(csvContent, filename);
};

// Export Defect Part Summary Data Table
const exportDefectPartSummaryDataToCSV = (data, line, defectType) => {
	if (!data || data.length === 0) {
		alert("No data available to export");
		return;
	}
	
	const filename = `Summary_${defectType.replace(/\s+/g, '_')}_PartName_${line.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = `No,PartName,${defectType} (pcs),Qty Inspected (pcs),${defectType} (Lot),Qty Inspected (lot),${defectType} NG (%)\n`;
	
	data.forEach((row, index) => {
		csvContent += `${index + 1},"${row.partName}",${row.defectPcs},${row.inspPcs},${row.defectLot.toFixed(2)},${row.inspLot.toFixed(2)},${row.ngPercent.toFixed(2)}\n`;
	});
	
	downloadCSV(csvContent, filename);
};

// Export Category Table
const exportCategoryTableToCSV = (data) => {
	if (!data || data.length === 0) {
		alert("No data available to export");
		return;
	}
	const filename = `Category_Table_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = "Kategori,Qty Inspected (pcs),QTY NG (pcs),Qty Inspected (lot),Qty NG (lot),NG (%)\n";

	data.forEach(row => {
		csvContent += `"${row.category}",${row.qtyInspectedPcs},${row.qtyNgPcs},${row.qtyInspectedLot.toFixed(2)},${row.qtyNgLot.toFixed(2)},${row.ngPercent.toFixed(2)}\n`;
	});

	downloadCSV(csvContent, filename);
};

// Export Category Line Table
const exportCategoryLineTableToCSV = (data, metricKey, title) => {
	if (!data || !data.rows) {
		alert("No data available to export");
		return;
	}
	const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
	let csvContent = "Kategori,Barrel 4,Nickel,Rack 1,Total\n";

	const { rows, grandTotal } = data;

	rows.forEach(row => {
		 const b4 = row.lines["Barrel 4"][metricKey];
		 const ni = row.lines["Nickel"][metricKey];
		 const r1 = row.lines["Rack 1"][metricKey];
		 const tot = row.total[metricKey];
		 csvContent += `"${row.category}",${b4},${ni},${r1},${tot}\n`;
	});

	// Footer
	const gtB4 = grandTotal.lines["Barrel 4"][metricKey];
	const gtNi = grandTotal.lines["Nickel"][metricKey];
	const gtR1 = grandTotal.lines["Rack 1"][metricKey];
	const gtTot = grandTotal.total[metricKey];
	csvContent += `"Total",${gtB4},${gtNi},${gtR1},${gtTot}\n`;

	downloadCSV(csvContent, filename);
};

// Helper function to download CSV
const downloadCSV = (content, filename) => {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement("a");
	const url = URL.createObjectURL(blob);
	
	link.setAttribute("href", url);
	link.setAttribute("download", filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

// Initial Render
renderLogin();
