// ==========================================================================
// Application State & Globals
// ==========================================================================
let state = {
    // Loaded from data.json
    presetAnnouncements: {},
    activities: [],

    // Unified list of institutions (preset + custom, supporting edits/deletes)
    unifiedInstitutions: [],
    // Custom added announcements mapped by source name
    customAnnouncements: {},

    // Current View State
    selectedSource: '臺北市立圖書館',
    activeTab: 'announcements', // 'announcements', 'activities', or 'today-summary'
    searchQuery: '',
    sourceSearchQuery: '',
    currentPage: 1,
    itemsPerPage: 10,

    // Filters
    filters: {
        dateStart: '', // Used as range start for normal, or exact date for today summary
        dateEnd: '',
        activityHall: '',
        activityPrice: '',
        activitySort: 'id-asc'
    }
};

// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const DOM = {
    // Counts
    totalSourcesCount: document.getElementById('total-sources-count'),
    totalAnnouncementsCount: document.getElementById('total-announcements-count'),
    
    // Sidebar
    searchSourcesInput: document.getElementById('search-sources-input'),
    presetSectionTitle: document.getElementById('preset-section-title'),
    presetSourcesList: document.getElementById('preset-sources-list'),
    customSectionTitle: document.getElementById('custom-section-title'),
    customSourcesList: document.getElementById('custom-sources-list'),
    btnOpenAddSourceModal: document.getElementById('btn-open-add-source-modal'),
    btnTodaySummary: document.getElementById('btn-today-summary'),
    btnRefreshData: document.getElementById('btn-refresh-data'),
    
    // Header
    currentSourceTitle: document.getElementById('current-source-title'),
    currentSourceBadge: document.getElementById('current-source-badge'),
    currentSourceUrl: document.getElementById('current-source-url'),
    currentSourceUrlWrapper: document.getElementById('current-source-url-wrapper'),
    btnOpenAddAnnouncementModal: document.getElementById('btn-open-add-announcement-modal'),
    
    // Tabs Navigation
    tabsNavigationBar: document.getElementById('tabs-navigation-bar'),
    tabBtns: document.querySelectorAll('.tab-btn'),
    
    // Content Controls
    searchBoxWrapper: document.getElementById('search-box-wrapper'),
    announcementSearch: document.getElementById('announcement-search'),
    filtersRowArea: document.getElementById('filters-row-area'),
    dateFilterGroup: document.getElementById('date-filter-group'),
    lblDateStart: document.getElementById('lbl-date-start'),
    dateRangeSeparator: document.getElementById('date-range-separator'),
    filterDateStart: document.getElementById('filter-date-start'),
    filterDateEnd: document.getElementById('filter-date-end'),
    activityFiltersGroup: document.getElementById('activity-filters-group'),
    filterHallSelect: document.getElementById('filter-hall-select'),
    filterPriceSelect: document.getElementById('filter-price-select'),
    sortActivitySelect: document.getElementById('sort-activity-select'),
    btnClearFilters: document.getElementById('btn-clear-filters'),
    
    // Viewports
    panelAnnouncements: document.getElementById('panel-announcements'),
    panelActivities: document.getElementById('panel-activities'),
    panelTodaySummary: document.getElementById('panel-today-summary'),
    announcementsContainer: document.getElementById('announcements-container'),
    activitiesContainer: document.getElementById('activities-container'),
    todaySummaryContainer: document.getElementById('today-summary-container'),
    
    // Pagination
    paginationContainer: document.getElementById('pagination-container'),
    paginationInfoText: document.getElementById('pagination-info-text'),
    btnPrevPage: document.getElementById('btn-prev-page'),
    btnNextPage: document.getElementById('btn-next-page'),
    
    // Modals
    addSourceModal: document.getElementById('add-source-modal'),
    addSourceForm: document.getElementById('add-source-form'),
    btnCloseSourceModal: document.getElementById('btn-close-source-modal'),
    btnCancelSourceModal: document.getElementById('btn-cancel-source-modal'),
    
    editSourceModal: document.getElementById('edit-source-modal'),
    editSourceForm: document.getElementById('edit-source-form'),
    btnCloseEditSourceModal: document.getElementById('btn-close-edit-source-modal'),
    btnCancelEditSourceModal: document.getElementById('btn-cancel-edit-source-modal'),
    
    addAnnouncementModal: document.getElementById('add-announcement-modal'),
    addAnnouncementForm: document.getElementById('add-announcement-form'),
    announcementSourceDisplay: document.getElementById('announcement-source-display'),
    announcementTitle: document.getElementById('announcement-title'),
    announcementDate: document.getElementById('announcement-date'),
    btnCloseAnnouncementModal: document.getElementById('btn-close-announcement-modal'),
    btnCancelAnnouncementModal: document.getElementById('btn-cancel-announcement-modal')
};

// ==========================================================================
// Initialization & LocalStorage Integration
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    loadLocalStorage();
    setupEventListeners();
    autoRefreshAndFetchData();
});

// Auto-refresh data on startup by calling /api/refresh then loading data.json
function autoRefreshAndFetchData() {
    fetch('/api/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("HTTP " + response.status);
        }
        return response.json();
    })
    .then(() => {
        fetchData();
    })
    .catch(err => {
        console.warn("Auto-refresh endpoint skipped or unreachable, loading data.json directly:", err);
        fetchData();
    });
}

// Load unified institutions and custom data from LocalStorage
function loadLocalStorage() {
    try {
        const storedInsts = localStorage.getItem('unified_institutions');
        if (storedInsts) {
            state.unifiedInstitutions = JSON.parse(storedInsts);
        }
        
        const customAnns = localStorage.getItem('custom_announcements');
        if (customAnns) {
            state.customAnnouncements = JSON.parse(customAnns);
        }
    } catch (e) {
        console.error("Error reading LocalStorage data:", e);
        state.unifiedInstitutions = [];
        state.customAnnouncements = {};
    }
}

// Write unified institutions and custom data to LocalStorage
function saveLocalStorage() {
    try {
        localStorage.setItem('unified_institutions', JSON.stringify(state.unifiedInstitutions));
        localStorage.setItem('custom_announcements', JSON.stringify(state.customAnnouncements));
    } catch (e) {
        console.error("Error writing to LocalStorage:", e);
    }
}

// Fetch predefined data from generated JSON
function fetchData(onSuccessCallback = null) {
    // Append timestamp to url to prevent cache
    fetch('data.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(data => {
            state.presetAnnouncements = data.announcements || {};
            state.activities = data.activities || [];
            
            const incomingPresets = data.institutions || [];
            
            // Reconcile Preset Institutions with the unified list
            if (state.unifiedInstitutions.length === 0) {
                state.unifiedInstitutions = incomingPresets.map(inst => ({
                    name: inst.name,
                    url: inst.url || '',
                    isPreset: true,
                    originalName: inst.name
                }));
            } else {
                // Merge incoming presets that aren't already represented in unifiedInstitutions
                incomingPresets.forEach(incoming => {
                    const exists = state.unifiedInstitutions.some(existing => 
                        existing.originalName === incoming.name || existing.name === incoming.name
                    );
                    if (!exists) {
                        state.unifiedInstitutions.push({
                            name: incoming.name,
                            url: incoming.url || '',
                            isPreset: true,
                            originalName: incoming.name
                        });
                    }
                });
            }
            
            saveLocalStorage();
            
            // Set default selected source to first active source if none selected
            if (!state.selectedSource && state.unifiedInstitutions.length > 0) {
                const firstPreset = state.unifiedInstitutions.find(i => i.isPreset);
                state.selectedSource = firstPreset ? firstPreset.name : state.unifiedInstitutions[0].name;
            }
            
            // Initialize Citizen Hall filter options
            populateHallFilterOptions();
            
            // Update Dashboard UI
            updateDashboard();
            
            if (onSuccessCallback) {
                onSuccessCallback();
            }
        })
        .catch(err => {
            console.error("Failed to fetch dashboard data:", err);
            renderEmptyState(DOM.announcementsContainer, "無法載入資料", "請確認是否已執行 python parse_data.py，並且啟動本機伺服器。");
        });
}

// Dynamic populate Hall dropdown options from activities data
function populateHallFilterOptions() {
    if (!state.activities) return;
    
    // Get unique hall names
    const halls = [...new Set(state.activities.map(a => a.hall).filter(Boolean))];
    DOM.filterHallSelect.innerHTML = '<option value="">所有館別</option>';
    
    halls.forEach(hall => {
        const option = document.createElement('option');
        option.value = hall;
        option.textContent = hall;
        DOM.filterHallSelect.appendChild(option);
    });
}

// Get the latest date in the entire dataset
function getLatestAnnouncementDate() {
    let latest = '';
    
    // Check preset announcements
    for (const instName in state.presetAnnouncements) {
        state.presetAnnouncements[instName].forEach(ann => {
            if (ann.date && ann.date > latest && ann.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                latest = ann.date;
            }
        });
    }
    // Check custom announcements
    for (const instName in state.customAnnouncements) {
        state.customAnnouncements[instName].forEach(ann => {
            if (ann.date && ann.date > latest && ann.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                latest = ann.date;
            }
        });
    }
    
    return latest || new Date().toISOString().slice(0, 10);
}

// ==========================================================================
// Event Listeners & Handlers
// ==========================================================================
function setupEventListeners() {
    // Sidebar search input
    DOM.searchSourcesInput.addEventListener('input', (e) => {
        state.sourceSearchQuery = e.target.value.toLowerCase().trim();
        renderSidebar();
    });

    // Content search
    DOM.announcementSearch.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        state.currentPage = 1;
        renderMainView();
    });

    // Sync Excel Data button
    DOM.btnRefreshData.addEventListener('click', () => {
        refreshExcelData();
    });

    // Date Filters
    DOM.filterDateStart.addEventListener('change', (e) => {
        state.filters.dateStart = e.target.value;
        state.currentPage = 1;
        renderMainView();
    });
    DOM.filterDateEnd.addEventListener('change', (e) => {
        state.filters.dateEnd = e.target.value;
        state.currentPage = 1;
        renderMainView();
    });

    // Citizen Activity Filters
    DOM.filterHallSelect.addEventListener('change', (e) => {
        state.filters.activityHall = e.target.value;
        state.currentPage = 1;
        renderMainView();
    });
    DOM.filterPriceSelect.addEventListener('change', (e) => {
        state.filters.activityPrice = e.target.value;
        state.currentPage = 1;
        renderMainView();
    });
    DOM.sortActivitySelect.addEventListener('change', (e) => {
        state.filters.activitySort = e.target.value;
        state.currentPage = 1;
        renderMainView();
    });

    // Clear filters button
    DOM.btnClearFilters.addEventListener('click', () => {
        DOM.filterDateStart.value = '';
        DOM.filterDateEnd.value = '';
        DOM.filterHallSelect.value = '';
        DOM.filterPriceSelect.value = '';
        DOM.sortActivitySelect.value = 'id-asc';
        DOM.announcementSearch.value = '';
        
        state.searchQuery = '';
        state.filters.dateStart = (state.selectedSource === '__today_summary__') ? getLatestAnnouncementDate() : '';
        if (state.selectedSource === '__today_summary__') {
            DOM.filterDateStart.value = state.filters.dateStart;
        }
        state.filters.dateEnd = '';
        state.filters.activityHall = '';
        state.filters.activityPrice = '';
        state.filters.activitySort = 'id-asc';
        state.currentPage = 1;
        
        renderMainView();
    });

    // Pagination
    DOM.btnPrevPage.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderMainView();
            DOM.panelAnnouncements.scrollIntoView({ behavior: 'smooth' });
        }
    });
    DOM.btnNextPage.addEventListener('click', () => {
        state.currentPage++;
        renderMainView();
        DOM.panelAnnouncements.scrollIntoView({ behavior: 'smooth' });
    });

    // Special Today Summary sidebar item click
    DOM.btnTodaySummary.addEventListener('click', () => {
        selectTodaySummary();
    });

    // Tab buttons switching
    DOM.tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabBtn = e.currentTarget;
            DOM.tabBtns.forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            
            state.activeTab = tabBtn.getAttribute('data-tab');
            state.currentPage = 1;
            
            toggleTabPanels();
            renderMainView();
        });
    });

    // Modals visibility toggles
    // Add Source Modal
    DOM.btnOpenAddSourceModal.addEventListener('click', () => {
        DOM.addSourceModal.classList.add('open');
        DOM.addSourceForm.reset();
        document.getElementById('source-name').focus();
    });
    DOM.btnCloseSourceModal.addEventListener('click', () => DOM.addSourceModal.classList.remove('open'));
    DOM.btnCancelSourceModal.addEventListener('click', () => DOM.addSourceModal.classList.remove('open'));
    
    // Add Source Form submission
    DOM.addSourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('source-name').value.trim();
        const url = document.getElementById('source-url').value.trim();
        
        if (!name) return;
        
        // Prevent duplicate names
        if (state.unifiedInstitutions.some(inst => inst.name === name)) {
            alert("此來源名稱已存在！");
            return;
        }
        
        // Add to state
        state.unifiedInstitutions.push({
            name: name,
            url: url,
            isPreset: false
        });
        state.customAnnouncements[name] = [];
        
        saveLocalStorage();
        DOM.addSourceModal.classList.remove('open');
        
        selectSource(name);
    });

    // Edit Source Modal
    DOM.btnCloseEditSourceModal.addEventListener('click', () => DOM.editSourceModal.classList.remove('open'));
    DOM.btnCancelEditSourceModal.addEventListener('click', () => DOM.editSourceModal.classList.remove('open'));
    
    // Edit Source Form submission
    DOM.editSourceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldName = document.getElementById('edit-source-old-name').value;
        const newName = document.getElementById('edit-source-name').value.trim();
        const url = document.getElementById('edit-source-url').value.trim();
        
        if (!newName) return;
        
        // Check duplicate name
        if (oldName !== newName) {
            if (state.unifiedInstitutions.some(inst => inst.name === newName)) {
                alert("此來源名稱已存在！");
                return;
            }
        }
        
        const inst = state.unifiedInstitutions.find(i => i.name === oldName);
        if (inst) {
            inst.name = newName;
            inst.url = url;
            
            if (inst.isPreset && !inst.originalName) {
                inst.originalName = oldName;
            }
            
            if (oldName !== newName) {
                if (state.customAnnouncements[oldName]) {
                    state.customAnnouncements[newName] = state.customAnnouncements[oldName];
                    delete state.customAnnouncements[oldName];
                }
                
                if (state.selectedSource === oldName) {
                    state.selectedSource = newName;
                }
            }
        }
        
        saveLocalStorage();
        DOM.editSourceModal.classList.remove('open');
        updateDashboard();
    });

    // Add Announcement Modal
    DOM.btnOpenAddAnnouncementModal.addEventListener('click', () => {
        DOM.announcementSourceDisplay.value = state.selectedSource;
        DOM.announcementTitle.value = '';
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
        DOM.announcementDate.value = localISOTime;
        
        DOM.addAnnouncementModal.classList.add('open');
        DOM.announcementTitle.focus();
    });
    DOM.btnCloseAnnouncementModal.addEventListener('click', () => DOM.addAnnouncementModal.classList.remove('open'));
    DOM.btnCancelAnnouncementModal.addEventListener('click', () => DOM.addAnnouncementModal.classList.remove('open'));

    // Add Announcement Form submission
    DOM.addAnnouncementForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = DOM.announcementTitle.value.trim();
        const date = DOM.announcementDate.value;
        
        if (!title || !date) return;
        
        if (!state.customAnnouncements[state.selectedSource]) {
            state.customAnnouncements[state.selectedSource] = [];
        }
        state.customAnnouncements[state.selectedSource].unshift({ title, date });
        
        saveLocalStorage();
        DOM.addAnnouncementModal.classList.remove('open');
        
        state.currentPage = 1;
        updateDashboard();
    });
}

// Submits POST request to backend Python server to run parse_data.py
function refreshExcelData() {
    const origBtnHTML = DOM.btnRefreshData.innerHTML;
    DOM.btnRefreshData.disabled = true;
    DOM.btnRefreshData.innerHTML = `<i data-lucide="loader" class="spin-icon"></i> <span>即時更新資料中...</span>`;
    lucide.createIcons();
    
    // Add rotating animation style helper if not already defined
    if (!document.getElementById('refresh-spin-style')) {
        const style = document.createElement('style');
        style.id = 'refresh-spin-style';
        style.innerHTML = `
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .spin-icon {
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Check if running on GitHub Pages or static host without Python backend
    const isStaticHost = window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app') || window.location.hostname.includes('netlify.app');
    
    if (isStaticHost) {
        fetchData(() => {
            alert("靜態展示模式：已成功重新載入最新資料 (data.json)！\n（提示：即時爬蟲解析需於本機執行 python parse_data.py 並將 updated data.json 上傳）");
        });
        DOM.btnRefreshData.disabled = false;
        DOM.btnRefreshData.innerHTML = origBtnHTML;
        lucide.createIcons();
        return;
    }
    
    fetch('/api/refresh', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        const contentType = response.headers.get("content-type");
        if (!response.ok || !contentType || !contentType.includes("application/json")) {
            throw new Error("無後端 API 服務 (HTTP " + response.status + ")");
        }
        return response.json();
    })
    .then(data => {
        // Success backend parse. Reload data.json
        fetchData(() => {
            alert(data.message || "資料更新成功！");
        });
    })
    .catch(err => {
        console.warn("Failed to update via backend API, fallback to fetchData:", err);
        fetchData(() => {
            alert("靜態展示模式：已重新載入最新 data.json 資料！");
        });
    })
    .finally(() => {
        // Restore button state
        DOM.btnRefreshData.disabled = false;
        DOM.btnRefreshData.innerHTML = origBtnHTML;
        lucide.createIcons();
    });
}

// Toggle displays between announcements tab, activities tab and daily summary
function toggleTabPanels() {
    DOM.panelAnnouncements.classList.remove('active');
    DOM.panelActivities.classList.remove('active');
    DOM.panelTodaySummary.classList.remove('active');
    
    if (state.selectedSource === '__today_summary__') {
        DOM.panelTodaySummary.classList.add('active');
        DOM.searchBoxWrapper.style.display = 'none'; 
        DOM.dateFilterGroup.style.display = 'flex';
        DOM.lblDateStart.textContent = "匯總日期:";
        DOM.dateRangeSeparator.style.display = 'none';
        DOM.filterDateEnd.style.display = 'none';
        DOM.activityFiltersGroup.style.display = 'none';
        DOM.paginationContainer.style.display = 'none'; 
    } else if (state.activeTab === 'activities' && state.selectedSource === '公民會館') {
        DOM.panelActivities.classList.add('active');
        DOM.searchBoxWrapper.style.display = 'block';
        DOM.dateFilterGroup.style.display = 'none';
        DOM.activityFiltersGroup.style.display = 'flex';
        DOM.paginationContainer.style.display = 'flex';
    } else {
        DOM.panelAnnouncements.classList.add('active');
        DOM.searchBoxWrapper.style.display = 'block';
        DOM.lblDateStart.textContent = "日期範圍:";
        DOM.dateRangeSeparator.style.display = 'inline';
        DOM.filterDateEnd.style.display = 'inline-block';
        DOM.dateFilterGroup.style.display = 'flex';
        DOM.activityFiltersGroup.style.display = 'none';
        DOM.paginationContainer.style.display = 'flex';
    }
}

// ==========================================================================
// Dashboard Update Orchestrator
// ==========================================================================
function updateDashboard() {
    updateStats();
    renderSidebar();
    renderMainView();
}

// Update counters
function updateStats() {
    const totalSources = state.unifiedInstitutions.length;
    
    // Count all announcements across active institutions
    let totalAnns = 0;
    state.unifiedInstitutions.forEach(inst => {
        totalAnns += getAnnouncementsList(inst.name).length;
    });
    
    DOM.totalSourcesCount.textContent = totalSources;
    DOM.totalAnnouncementsCount.textContent = totalAnns;
}

// Get combined, sorted list of announcements for a source
function getAnnouncementsList(instName) {
    const inst = state.unifiedInstitutions.find(i => i.name === instName);
    if (!inst) return [];
    
    const originalKey = inst.originalName || instName;
    const presetList = state.presetAnnouncements[originalKey] || [];
    const customList = state.customAnnouncements[instName] || [];
    
    const combined = [...customList, ...presetList];
    
    combined.sort((a, b) => {
        if (!a.date) return 1;  
        if (!b.date) return -1;
        return b.date.localeCompare(a.date); 
    });
    
    return combined;
}

// Open Edit source modal
function openEditSourceModal(name, event) {
    event.stopPropagation(); 
    const inst = state.unifiedInstitutions.find(i => i.name === name);
    if (!inst) return;
    
    document.getElementById('edit-source-old-name').value = name;
    document.getElementById('edit-source-name').value = name;
    document.getElementById('edit-source-url').value = inst.url || '';
    
    DOM.editSourceModal.classList.add('open');
}

// Delete institution (Preset or Custom)
function deleteSource(name, event) {
    event.stopPropagation(); 
    
    if (!confirm(`確定要刪除資訊來源「${name}」及其所有公告嗎？`)) {
        return;
    }
    
    state.unifiedInstitutions = state.unifiedInstitutions.filter(inst => inst.name !== name);
    delete state.customAnnouncements[name];
    
    saveLocalStorage();
    
    if (state.selectedSource === name) {
        const remainingPreset = state.unifiedInstitutions.find(i => i.isPreset);
        if (remainingPreset) {
            selectSource(remainingPreset.name);
        } else if (state.unifiedInstitutions.length > 0) {
            selectSource(state.unifiedInstitutions[0].name);
        } else {
            state.selectedSource = '';
            updateDashboard();
        }
    } else {
        updateDashboard();
    }
}

// ==========================================================================
// Render Sidebar Sources List
// ==========================================================================
function renderSidebar() {
    DOM.presetSourcesList.innerHTML = '';
    DOM.customSourcesList.innerHTML = '';
    DOM.btnTodaySummary.classList.remove('active');
    
    if (state.selectedSource === '__today_summary__') {
        DOM.btnTodaySummary.classList.add('active');
    }
    
    const filteredPresets = state.unifiedInstitutions.filter(inst => 
        inst.isPreset && inst.name.toLowerCase().includes(state.sourceSearchQuery)
    );
    const filteredCustoms = state.unifiedInstitutions.filter(inst => 
        !inst.isPreset && inst.name.toLowerCase().includes(state.sourceSearchQuery)
    );
    
    DOM.presetSectionTitle.style.display = filteredPresets.length > 0 ? 'block' : 'none';
    
    filteredPresets.forEach(inst => {
        const totalCount = getAnnouncementsList(inst.name).length;
        
        const li = document.createElement('li');
        li.className = `source-item ${state.selectedSource === inst.name ? 'active' : ''}`;
        li.innerHTML = `
            <div class="source-item-info">
                <i data-lucide="globe"></i>
                <span class="source-item-name">${inst.name}</span>
            </div>
            <div class="source-item-actions">
                <span class="source-badge-count">${totalCount}</span>
                <button class="btn-edit-source" title="編輯來源">
                    <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                </button>
                <button class="btn-delete-source" title="刪除來源">
                    <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                </button>
            </div>
        `;
        li.addEventListener('click', () => selectSource(inst.name));
        
        li.querySelector('.btn-edit-source').addEventListener('click', (e) => openEditSourceModal(inst.name, e));
        li.querySelector('.btn-delete-source').addEventListener('click', (e) => deleteSource(inst.name, e));
        
        DOM.presetSourcesList.appendChild(li);
    });
    
    const hasCustoms = state.unifiedInstitutions.some(i => !i.isPreset);
    if (hasCustoms) {
        DOM.customSectionTitle.style.display = 'block';
        
        filteredCustoms.forEach(inst => {
            const totalCount = getAnnouncementsList(inst.name).length;
            
            const li = document.createElement('li');
            li.className = `source-item ${state.selectedSource === inst.name ? 'active-custom' : ''}`;
            li.innerHTML = `
                <div class="source-item-info">
                    <i data-lucide="bookmark"></i>
                    <span class="source-item-name">${inst.name}</span>
                </div>
                <div class="source-item-actions">
                    <span class="source-badge-count">${totalCount}</span>
                    <button class="btn-edit-source" title="編輯來源">
                        <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
                    </button>
                    <button class="btn-delete-source" title="刪除來源">
                        <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
                    </button>
                </div>
            `;
            li.addEventListener('click', () => selectSource(inst.name));
            
            li.querySelector('.btn-edit-source').addEventListener('click', (e) => openEditSourceModal(inst.name, e));
            li.querySelector('.btn-delete-source').addEventListener('click', (e) => deleteSource(inst.name, e));
            
            DOM.customSourcesList.appendChild(li);
        });
    } else {
        DOM.customSectionTitle.style.display = 'none';
    }
    
    lucide.createIcons();
}

function selectSource(name) {
    state.selectedSource = name;
    state.currentPage = 1;
    
    state.filters.dateStart = '';
    state.filters.dateEnd = '';
    DOM.filterDateStart.value = '';
    DOM.filterDateEnd.value = '';
    
    if (name === '公民會館') {
        state.activeTab = 'announcements';
        DOM.tabsNavigationBar.style.display = 'flex';
        DOM.tabBtns.forEach(b => {
            if (b.getAttribute('data-tab') === 'announcements') b.classList.add('active');
            else b.classList.remove('active');
        });
    } else {
        state.activeTab = 'announcements';
        DOM.tabsNavigationBar.style.display = 'none';
    }
    
    toggleTabPanels();
    renderSidebar();
    renderMainView();
}

function getTodayDateStr() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Select daily summary page
function selectTodaySummary() {
    state.selectedSource = '__today_summary__';
    state.activeTab = 'today-summary';
    state.currentPage = 1;
    DOM.tabsNavigationBar.style.display = 'none';
    
    const todayDate = getTodayDateStr();
    state.filters.dateStart = todayDate;
    DOM.filterDateStart.value = todayDate;
    
    toggleTabPanels();
    renderSidebar();
    renderMainView();
}

// ==========================================================================
// Render Main Panel Layout & Data Views
// ==========================================================================
function renderMainView() {
    if (state.selectedSource === '__today_summary__') {
        renderTodaySummaryView();
        return;
    }
    
    if (!state.selectedSource) {
        DOM.currentSourceTitle.textContent = '請選擇或新增一個資訊來源';
        DOM.currentSourceBadge.style.display = 'none';
        DOM.currentSourceUrlWrapper.style.display = 'none';
        DOM.btnOpenAddAnnouncementModal.style.display = 'none';
        renderEmptyState(DOM.announcementsContainer, "沒有選取的來源", "請從左側選單選擇一個來源，或新增一個來源。");
        return;
    }
    
    const currentInstObj = state.unifiedInstitutions.find(inst => inst.name === state.selectedSource);
    
    DOM.currentSourceTitle.textContent = currentInstObj.name;
    DOM.btnOpenAddAnnouncementModal.style.display = 'inline-flex';
    
    if (currentInstObj.isPreset) {
        DOM.currentSourceBadge.textContent = '預設';
        DOM.currentSourceBadge.className = 'source-badge';
    } else {
        DOM.currentSourceBadge.textContent = '自定義';
        DOM.currentSourceBadge.className = 'source-badge custom';
    }
    
    if (currentInstObj.url) {
        DOM.currentSourceUrlWrapper.style.display = 'flex';
        DOM.currentSourceUrl.href = currentInstObj.url;
        DOM.currentSourceUrl.textContent = currentInstObj.url;
    } else {
        DOM.currentSourceUrlWrapper.style.display = 'none';
    }
    
    if (state.activeTab === 'activities' && state.selectedSource === '公民會館') {
        renderActivitiesView();
    } else {
        renderAnnouncementsView();
    }
}

// Renders announcements list view
function renderAnnouncementsView() {
    const list = getAnnouncementsList(state.selectedSource);
    
    let filtered = list.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(state.searchQuery);
        
        let matchesDate = true;
        if (item.date) {
            if (state.filters.dateStart && item.date < state.filters.dateStart) {
                matchesDate = false;
            }
            if (state.filters.dateEnd && item.date > state.filters.dateEnd) {
                matchesDate = false;
            }
        } else if (state.filters.dateStart || state.filters.dateEnd) {
            matchesDate = false;
        }
        
        return matchesSearch && matchesDate;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
    
    if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
    }
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + state.itemsPerPage);
    
    DOM.announcementsContainer.innerHTML = '';
    
    if (paginatedItems.length === 0) {
        renderEmptyState(
            DOM.announcementsContainer,
            "找不到相關公告",
            state.searchQuery || state.filters.dateStart || state.filters.dateEnd
                ? "請嘗試放寬您的搜尋關鍵字或日期篩選範圍。"
                : "目前無公告項目，您可以點擊右上角為此來源新增公告！"
        );
        DOM.paginationContainer.style.display = 'none';
    } else {
        DOM.paginationContainer.style.display = 'flex';
        DOM.paginationInfoText.textContent = `第 ${state.currentPage} 頁 / 共 ${totalPages} 頁 (共 ${totalItems} 筆)`;
        DOM.btnPrevPage.disabled = state.currentPage === 1;
        DOM.btnNextPage.disabled = state.currentPage === totalPages;
        
        paginatedItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'announcement-card';
            
            let displayTitle = item.title;
            let badgeHTML = '';
            
            const tagMatch = item.title.match(/^\[(.*?)\]\s*(.*)$/);
            if (tagMatch) {
                const category = tagMatch[1];
                displayTitle = tagMatch[2];
                const badgeClass = category === '新聞' ? 'category-badge-news' : 'category-badge-notice';
                badgeHTML = `<span class="category-badge ${badgeClass}">${category}</span>`;
            }
            
            card.innerHTML = `
                <div class="announcement-card-content">
                    <h3 class="announcement-title">${badgeHTML}${displayTitle}</h3>
                    <div class="announcement-meta">
                        <div class="meta-item">
                            <i data-lucide="calendar"></i>
                            <span>${item.date || '無發布日期'}</span>
                        </div>
                    </div>
                </div>
            `;
            DOM.announcementsContainer.appendChild(card);
        });
    }
    
    lucide.createIcons();
}

// Renders structured activities view for Citizen Hall
function renderActivitiesView() {
    let filtered = [...state.activities];
    
    filtered = filtered.filter(item => {
        const query = state.searchQuery;
        const matchesSearch = !query || 
            item.name.toLowerCase().includes(query) ||
            item.teacher.toLowerCase().includes(query) ||
            item.hall.toLowerCase().includes(query) ||
            item.time.toLowerCase().includes(query) ||
            item.note.toLowerCase().includes(query);
            
        const matchesHall = !state.filters.activityHall || item.hall === state.filters.activityHall;
        
        let matchesPrice = true;
        if (state.filters.activityPrice === 'free') {
            matchesPrice = item.cost === 0 || item.cost === '免費';
        } else if (state.filters.activityPrice === 'paid') {
            matchesPrice = item.cost > 0 && item.cost !== '免費';
        }
        
        return matchesSearch && matchesHall && matchesPrice;
    });

    filtered.sort((a, b) => {
        const sortType = state.filters.activitySort;
        if (sortType === 'price-asc') {
            const costA = typeof a.cost === 'number' ? a.cost : 0;
            const costB = typeof b.cost === 'number' ? b.cost : 0;
            return costA - costB;
        } else if (sortType === 'price-desc') {
            const costA = typeof a.cost === 'number' ? a.cost : 0;
            const costB = typeof b.cost === 'number' ? b.cost : 0;
            return costB - costA;
        } else if (sortType === 'enroll-desc') {
            const capA = a.accepted || 1;
            const capB = b.accepted || 1;
            const rateA = a.registered / capA;
            const rateB = b.registered / capB;
            return rateB - rateA;
        } else {
            return a.id - b.id;
        }
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.itemsPerPage));
    
    if (state.currentPage > totalPages) {
        state.currentPage = totalPages;
    }
    
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const paginatedItems = filtered.slice(startIndex, startIndex + state.itemsPerPage);
    
    DOM.activitiesContainer.innerHTML = '';
    
    if (paginatedItems.length === 0) {
        renderEmptyState(
            DOM.activitiesContainer,
            "找不到符合條件的活動",
            "請嘗試調整您的篩選選項或搜尋條件。"
        );
        DOM.paginationContainer.style.display = 'none';
    } else {
        DOM.paginationContainer.style.display = 'flex';
        DOM.paginationInfoText.textContent = `第 ${state.currentPage} 頁 / 共 ${totalPages} 頁 (共 ${totalItems} 筆)`;
        DOM.btnPrevPage.disabled = state.currentPage === 1;
        DOM.btnNextPage.disabled = state.currentPage === totalPages;
        
        paginatedItems.forEach(item => {
            const card = document.createElement('div');
            card.className = 'activity-card';
            
            let hallClass = '';
            if (item.hall.includes('北投')) hallClass = 'hall-beitou';
            else if (item.hall.includes('信義')) hallClass = 'hall-xinyi';
            else if (item.hall.includes('文山')) hallClass = 'hall-wenshan';
            
            const isFree = item.cost === 0 || item.cost === '免費' || !item.cost;
            const costBadgeHTML = isFree
                ? `<span class="activity-cost-badge cost-free">免費</span>`
                : `<span class="activity-cost-badge cost-paid">$${item.cost} 元</span>`;
                
            const acceptedNum = item.accepted || 0;
            const registeredNum = item.registered || 0;
            let percent = 0;
            if (acceptedNum > 0) {
                percent = Math.round((registeredNum / acceptedNum) * 100);
            }
            const fillPercent = Math.min(100, percent);
            
            card.innerHTML = `
                <div>
                    <div class="activity-card-header">
                        <span class="activity-hall-badge ${hallClass}">${item.hall}</span>
                        ${costBadgeHTML}
                    </div>
                    <h3 class="activity-name">${item.name}</h3>
                    
                    <div class="activity-details">
                        <div class="activity-info-row">
                            <i data-lucide="clock"></i>
                            <span>${item.time}</span>
                        </div>
                        <div class="activity-info-row">
                            <i data-lucide="user"></i>
                            <span>指導老師: ${item.teacher || '無'}</span>
                        </div>
                        ${item.note ? `
                        <div class="activity-info-row">
                            <i data-lucide="info"></i>
                            <span>備註: ${item.note}</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="activity-enrollment">
                    <div class="enrollment-header">
                        <span class="enrollment-lbl">招生人數 (正取 ${acceptedNum} 人 / 備取 ${item.waitlisted} 人)</span>
                        <span class="enrollment-val">${registeredNum} 人已報名 (${percent}%)</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill ${percent >= 100 ? 'full' : ''}" style="width: ${fillPercent}%"></div>
                    </div>
                </div>
            `;
            DOM.activitiesContainer.appendChild(card);
        });
    }
    
    lucide.createIcons();
}

// Renders the daily summary aggregated page
function renderTodaySummaryView() {
    DOM.currentSourceTitle.textContent = '全站當日公告匯總';
    DOM.currentSourceBadge.textContent = '匯總';
    DOM.currentSourceBadge.className = 'source-badge summary';
    DOM.currentSourceUrlWrapper.style.display = 'none';
    DOM.btnOpenAddAnnouncementModal.style.display = 'none';
    
    const targetDate = state.filters.dateStart; 
    
    DOM.todaySummaryContainer.innerHTML = '';
    
    if (!targetDate) {
        renderEmptyState(DOM.todaySummaryContainer, "請選擇匯總日期", "請在篩選欄中選擇一個日期來檢視公告。");
        return;
    }
    
    let hasData = false;
    
    state.unifiedInstitutions.forEach(inst => {
        const list = getAnnouncementsList(inst.name);
        if (list.length === 0) return;
        
        // Strict Rule: If the institution's latest item release date is NOT targetDate (Today), do not display it!
        const latestItem = list[0];
        if (!latestItem || !latestItem.date || latestItem.date !== targetDate) {
            return;
        }
        
        const dayAnns = list.filter(item => item.date === targetDate);
        
        if (dayAnns.length > 0) {
            hasData = true;
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'summary-group';
            
            let urlLinkHTML = '';
            if (inst.url) {
                urlLinkHTML = `<a href="${inst.url}" target="_blank">前往官網 <i data-lucide="external-link" style="width:12px; height:12px;"></i></a>`;
            }
            
            groupDiv.innerHTML = `
                <div class="summary-group-header">
                    <div class="summary-group-title">
                        <i data-lucide="building-2"></i>
                        <span>${inst.name}</span>
                    </div>
                    ${urlLinkHTML}
                </div>
                <div class="summary-group-list">
                    <!-- Announcements under this group -->
                </div>
            `;
            
            const listDiv = groupDiv.querySelector('.summary-group-list');
            
            dayAnns.forEach(ann => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'summary-announcement-item';
                
                let displayTitle = ann.title;
                let badgeHTML = '';
                
                const tagMatch = ann.title.match(/^\[(.*?)\]\s*(.*)$/);
                if (tagMatch) {
                    const category = tagMatch[1];
                    displayTitle = tagMatch[2];
                    const badgeClass = category === '新聞' ? 'category-badge-news' : 'category-badge-notice';
                    badgeHTML = `<span class="category-badge ${badgeClass}">${category}</span>`;
                }
                
                itemDiv.innerHTML = `
                    <h4 class="announcement-title">${badgeHTML}${displayTitle}</h4>
                    <div class="summary-item-date">
                        <i data-lucide="calendar"></i>
                        <span>發布日期：${ann.date || targetDate}</span>
                    </div>
                `;
                listDiv.appendChild(itemDiv);
            });
            
            DOM.todaySummaryContainer.appendChild(groupDiv);
        }
    });
    
    if (!hasData) {
        renderEmptyState(
            DOM.todaySummaryContainer,
            `當日（${targetDate}）無任何公告`,
            "請嘗試選擇其他日期（例如資料集內有公告的 2025-03-26）。"
        );
    }
    
    lucide.createIcons();
}

// Render empty state UI helper
function renderEmptyState(container, title, desc) {
    container.innerHTML = `
        <div class="state-container" style="grid-column: 1 / -1; width: 100%;">
            <i data-lucide="info" class="state-icon"></i>
            <h4 class="state-title">${title}</h4>
            <p class="state-desc">${desc}</p>
        </div>
    `;
    lucide.createIcons();
}
