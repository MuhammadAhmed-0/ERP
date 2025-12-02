let allLeads = [];
let filteredLeads = [];
let csrModuleInitialized = false;

function initializeCSRModule() {
  console.log('[CSR] Initializing CSR Module...');
  
  // Only initialize event listeners once to prevent duplicate submissions
  if (!csrModuleInitialized) {
    initializeCSRNavigation();
    initializeCSRTabs();
    initializeCSRForm();
    initializeCSRFilters();
    initializeCSRExports();
    csrModuleInitialized = true;
  }
  
  loadCSRLeads();
  setDefaultDates();
}

function initializeCSRNavigation() {
  // Navigation is handled in index.html's showSection function
  // This function is kept for any additional CSR-specific navigation setup
  console.log('[CSR] Navigation initialized');
}

function showCSRSection() {
  const sections = ['dashboardSection', 'projectsSection', 'tasksSection', 'analyticsSection', 'adminSection', 'dailyReportSection', 'csrSection'];
  sections.forEach(section => {
    const element = document.getElementById(section);
    if (element) {
      element.style.display = section === 'csrSection' ? 'block' : 'none';
    }
  });
  
  loadCSRLeads();
  updateCSRDashboard();
}

function initializeCSRTabs() {
  const tabs = {
    'tabCSRDashboard': 'csrDashboardContent',
    'tabCSRLeads': 'csrLeadsContent',
    'tabCSRAddLead': 'csrAddLeadContent',
    'tabCSRMonthlyReport': 'csrMonthlyReportContent'
  };

  Object.keys(tabs).forEach(tabId => {
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.addEventListener('click', () => {
        Object.keys(tabs).forEach(t => {
          const tabEl = document.getElementById(t);
          const contentEl = document.getElementById(tabs[t]);
          if (tabEl && contentEl) {
            tabEl.classList.remove('text-cyan-600', 'border-b-2', 'border-cyan-600');
            tabEl.classList.add('text-gray-600');
            contentEl.style.display = 'none';
          }
        });
        
        tab.classList.remove('text-gray-600');
        tab.classList.add('text-cyan-600', 'border-b-2', 'border-cyan-600');
        const content = document.getElementById(tabs[tabId]);
        if (content) {
          content.style.display = 'block';
        }
        
        if (tabId === 'tabCSRDashboard') {
          updateCSRDashboard();
        } else if (tabId === 'tabCSRLeads') {
          renderLeadsTable();
        } else if (tabId === 'tabCSRMonthlyReport') {
          generateMonthlyReport();
        }
      });
    }
  });
}

function initializeCSRForm() {
  const leadForm = document.getElementById('csrLeadForm');
  const statusSelect = document.getElementById('csrLeadStatus');
  const clearFormBtn = document.getElementById('csrClearForm');

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      const emailSection = document.getElementById('csrEmailSection');
      if (emailSection) {
        if (statusSelect.value === 'Email Sent') {
          emailSection.classList.remove('hidden');
        } else {
          emailSection.classList.add('hidden');
        }
      }
    });
  }

  if (leadForm) {
    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await addNewLead();
    });
  }

  if (clearFormBtn) {
    clearFormBtn.addEventListener('click', clearLeadForm);
  }
}

function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const dateOfContact = document.getElementById('csrDateOfContact');
  if (dateOfContact) {
    dateOfContact.value = today;
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const reportMonth = document.getElementById('csrReportMonth');
  if (reportMonth) {
    reportMonth.value = currentMonth;
  }
}

async function addNewLead() {
  const leadName = document.getElementById('csrLeadName').value.trim();
  const contactNumber = document.getElementById('csrContactNumber').value.trim();
  const companyName = document.getElementById('csrCompanyName').value.trim();
  const serviceInterested = document.getElementById('csrServiceInterested').value.trim();
  const leadStatus = document.getElementById('csrLeadStatus').value;
  const dateOfContact = document.getElementById('csrDateOfContact').value;
  const assignedCSR = document.getElementById('csrAssignedCSR').value.trim() || (currentUser ? currentUser.email : 'Unknown');
  const callbackTime = document.getElementById('csrCallbackTime').value;
  const notes = document.getElementById('csrLeadNotes').value.trim();

  if (!leadName || !contactNumber || !companyName || !serviceInterested || !leadStatus) {
    alert('Please fill in all required fields.');
    return;
  }

  const leadData = {
    leadName,
    contactNumber,
    companyName,
    serviceInterested,
    status: leadStatus,
    dateOfContact: firebase.firestore.Timestamp.fromDate(new Date(dateOfContact)),
    assignedCSR,
    callbackTime: callbackTime ? firebase.firestore.Timestamp.fromDate(new Date(callbackTime)) : null,
    notes,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    createdBy: currentUser ? currentUser.uid : 'unknown',
    followUpDates: [],
    followUpCompleted: []
  };

  if (leadStatus === 'Email Sent') {
    const emailSentDate = document.getElementById('csrEmailSentDate').value;
    const emailConfirmed = document.getElementById('csrEmailConfirmed').value;
    
    if (emailSentDate) {
      leadData.emailSentDate = firebase.firestore.Timestamp.fromDate(new Date(emailSentDate));
      leadData.emailConfirmed = emailConfirmed;
      leadData.followUpDates = calculateFollowUpDates(new Date(emailSentDate));
      leadData.followUpCompleted = leadData.followUpDates.map(() => false);
    }
  }

  try {
    await db.collection('csr_leads').add(leadData);
    alert('Lead added successfully!');
    clearLeadForm();
    loadCSRLeads();
    
    document.getElementById('tabCSRLeads').click();
  } catch (error) {
    console.error('Error adding lead:', error);
    alert('Error adding lead. Please try again.');
  }
}

function calculateFollowUpDates(startDate) {
  const followUpDays = [3, 5, 7, 9, 11];
  const followUpDates = [];

  followUpDays.forEach(days => {
    let currentDate = new Date(startDate);
    let businessDays = 0;
    
    while (businessDays < days) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    followUpDates.push(firebase.firestore.Timestamp.fromDate(currentDate));
  });

  return followUpDates;
}

function clearLeadForm() {
  document.getElementById('csrLeadForm').reset();
  setDefaultDates();
  document.getElementById('csrEmailSection').classList.add('hidden');
}

async function loadCSRLeads() {
  try {
    const snapshot = await db.collection('csr_leads').orderBy('createdAt', 'desc').get();
    allLeads = [];
    
    snapshot.forEach(doc => {
      allLeads.push({
        id: doc.id,
        ...doc.data()
      });
    });

    filteredLeads = [...allLeads];
    renderLeadsTable();
    updateCSRDashboard();
  } catch (error) {
    console.error('Error loading leads:', error);
  }
}

function initializeCSRFilters() {
  const searchInput = document.getElementById('csrSearchInput');
  const statusFilter = document.getElementById('csrStatusFilter');
  const dateFilter = document.getElementById('csrDateFilter');
  const clearFilters = document.getElementById('csrClearFilters');

  if (searchInput) {
    searchInput.addEventListener('input', applyCSRFilters);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', applyCSRFilters);
  }
  if (dateFilter) {
    dateFilter.addEventListener('change', applyCSRFilters);
  }
  if (clearFilters) {
    clearFilters.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = '';
      if (dateFilter) dateFilter.value = 'all';
      filteredLeads = [...allLeads];
      renderLeadsTable();
    });
  }
}

function applyCSRFilters() {
  const searchTerm = document.getElementById('csrSearchInput')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('csrStatusFilter')?.value || '';
  const dateFilter = document.getElementById('csrDateFilter')?.value || 'all';

  filteredLeads = allLeads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.leadName?.toLowerCase().includes(searchTerm) ||
      lead.companyName?.toLowerCase().includes(searchTerm) ||
      lead.contactNumber?.includes(searchTerm) ||
      lead.serviceInterested?.toLowerCase().includes(searchTerm);

    const matchesStatus = !statusFilter || lead.status === statusFilter;

    let matchesDate = true;
    if (dateFilter !== 'all' && lead.dateOfContact) {
      const leadDate = lead.dateOfContact.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          matchesDate = leadDate >= today && leadDate < tomorrow;
          break;
        case 'week':
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          matchesDate = leadDate >= weekAgo;
          break;
        case 'month':
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          matchesDate = leadDate >= monthStart;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  renderLeadsTable();
}

function renderLeadsTable() {
  const tbody = document.getElementById('csrLeadsTableBody');
  if (!tbody) return;

  const countEl = document.getElementById('csrLeadsCount');
  if (countEl) {
    countEl.textContent = `(${filteredLeads.length} leads)`;
  }

  if (filteredLeads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="py-8 text-center text-gray-500">No leads found</td></tr>';
    return;
  }

  tbody.innerHTML = filteredLeads.map(lead => {
    const dateAdded = lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
    const callbackTime = lead.callbackTime?.toDate ? lead.callbackTime.toDate() : (lead.callbackTime ? new Date(lead.callbackTime) : null);
    
    return `
      <tr class="border-b border-gray-100 hover:bg-gray-50">
        <td class="py-4 pr-4">
          <div class="font-medium text-gray-900">${escapeHtml(lead.leadName)}</div>
          <div class="text-sm text-gray-500">${escapeHtml(lead.assignedCSR || '')}</div>
        </td>
        <td class="py-4 pr-4 text-gray-700">${escapeHtml(lead.contactNumber)}</td>
        <td class="py-4 pr-4 text-gray-700">${escapeHtml(lead.companyName)}</td>
        <td class="py-4 pr-4 text-gray-700">${escapeHtml(lead.serviceInterested)}</td>
        <td class="py-4 pr-4">${getStatusBadge(lead.status)}</td>
        <td class="py-4 pr-4 text-gray-700 text-sm">${formatDate(dateAdded)}</td>
        <td class="py-4 pr-4 text-gray-700 text-sm">${callbackTime ? formatDateTime(callbackTime) : '-'}</td>
        <td class="py-4">
          <div class="flex gap-2">
            <button onclick="editLead('${lead.id}')" class="text-blue-600 hover:text-blue-800" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="viewLead('${lead.id}')" class="text-cyan-600 hover:text-cyan-800" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            <button onclick="deleteLead('${lead.id}')" class="text-red-600 hover:text-red-800" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusBadge(status) {
  const statusColors = {
    'Interested': 'bg-green-100 text-green-800',
    'Not Interested': 'bg-red-100 text-red-800',
    'Follow-up': 'bg-yellow-100 text-yellow-800',
    'Email Sent': 'bg-purple-100 text-purple-800',
    'Lead Closed': 'bg-teal-100 text-teal-800',
    'Meeting Set': 'bg-indigo-100 text-indigo-800'
  };

  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  return `<span class="px-3 py-1 rounded-full text-xs font-medium ${colorClass}">${escapeHtml(status)}</span>`;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function updateCSRDashboard() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const monthLeads = allLeads.filter(lead => {
    const leadDate = lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
    return leadDate >= monthStart;
  });

  const stats = {
    total: monthLeads.length,
    interested: monthLeads.filter(l => l.status === 'Interested').length,
    notInterested: monthLeads.filter(l => l.status === 'Not Interested').length,
    followUp: monthLeads.filter(l => l.status === 'Follow-up').length,
    emailSent: monthLeads.filter(l => l.status === 'Email Sent').length,
    closed: monthLeads.filter(l => l.status === 'Lead Closed').length,
    meetingSet: monthLeads.filter(l => l.status === 'Meeting Set').length
  };

  document.getElementById('csrTotalLeads').textContent = stats.total;
  document.getElementById('csrInterestedLeads').textContent = stats.interested;
  document.getElementById('csrNotInterestedLeads').textContent = stats.notInterested;
  document.getElementById('csrFollowUpLeads').textContent = stats.followUp;
  document.getElementById('csrEmailSentLeads').textContent = stats.emailSent;
  document.getElementById('csrClosedLeads').textContent = stats.closed;
  document.getElementById('csrMeetingSetLeads').textContent = stats.meetingSet;

  let completedFollowUps = 0;
  let totalFollowUps = 0;
  allLeads.forEach(lead => {
    if (lead.followUpCompleted && lead.followUpDates) {
      totalFollowUps += lead.followUpDates.length;
      completedFollowUps += lead.followUpCompleted.filter(c => c).length;
    }
  });
  
  const followUpRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;
  document.getElementById('csrFollowUpRate').textContent = followUpRate + '%';

  updateStatusChart(stats);
  updatePendingFollowUps();
}

function updateStatusChart(stats) {
  const total = stats.total || 1;
  
  const updateBar = (id, count) => {
    const bar = document.getElementById(id);
    if (bar) {
      const percentage = Math.round((count / total) * 100);
      bar.style.width = Math.max(percentage, count > 0 ? 10 : 0) + '%';
      bar.textContent = count;
    }
  };

  updateBar('csrBarInterested', stats.interested);
  updateBar('csrBarNotInterested', stats.notInterested);
  updateBar('csrBarFollowUp', stats.followUp);
  updateBar('csrBarEmailSent', stats.emailSent);
  updateBar('csrBarClosed', stats.closed);
  updateBar('csrBarMeetingSet', stats.meetingSet);
}

function updatePendingFollowUps() {
  const container = document.getElementById('csrPendingFollowUps');
  if (!container) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const pendingFollowUps = [];
  
  allLeads.forEach(lead => {
    if (lead.followUpDates && lead.followUpCompleted) {
      lead.followUpDates.forEach((date, index) => {
        if (!lead.followUpCompleted[index]) {
          const followUpDate = date.toDate ? date.toDate() : new Date(date);
          if (followUpDate <= today || (followUpDate - today) / (1000 * 60 * 60 * 24) <= 3) {
            pendingFollowUps.push({
              leadId: lead.id,
              leadName: lead.leadName,
              companyName: lead.companyName,
              followUpDate,
              followUpIndex: index
            });
          }
        }
      });
    }
    
    if (lead.callbackTime) {
      const callbackDate = lead.callbackTime.toDate ? lead.callbackTime.toDate() : new Date(lead.callbackTime);
      if (callbackDate >= today && (callbackDate - today) / (1000 * 60 * 60 * 24) <= 1) {
        pendingFollowUps.push({
          leadId: lead.id,
          leadName: lead.leadName,
          companyName: lead.companyName,
          followUpDate: callbackDate,
          isCallback: true
        });
      }
    }
  });

  pendingFollowUps.sort((a, b) => a.followUpDate - b.followUpDate);

  if (pendingFollowUps.length === 0) {
    container.innerHTML = '<p class="text-gray-500 text-center py-4">No pending follow-ups</p>';
    return;
  }

  container.innerHTML = pendingFollowUps.slice(0, 10).map(item => {
    const isOverdue = item.followUpDate < today;
    const statusClass = isOverdue ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
    const iconClass = isOverdue ? 'text-red-600' : 'text-yellow-600';
    const label = item.isCallback ? 'Callback' : 'Follow-up';
    
    return `
      <div class="p-3 ${statusClass} border rounded-lg">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900">${escapeHtml(item.leadName)}</div>
            <div class="text-sm text-gray-600">${escapeHtml(item.companyName)}</div>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium ${iconClass}">
              ${label} ${isOverdue ? '(Overdue)' : ''}
            </div>
            <div class="text-xs text-gray-500">${formatDate(item.followUpDate)}</div>
          </div>
        </div>
        ${!item.isCallback ? `
        <button onclick="markFollowUpComplete('${item.leadId}', ${item.followUpIndex})" 
          class="mt-2 w-full px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg">
          Mark Complete
        </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function markFollowUpComplete(leadId, followUpIndex) {
  try {
    const lead = allLeads.find(l => l.id === leadId);
    if (lead && lead.followUpCompleted) {
      lead.followUpCompleted[followUpIndex] = true;
      await db.collection('csr_leads').doc(leadId).update({
        followUpCompleted: lead.followUpCompleted
      });
      updatePendingFollowUps();
      updateCSRDashboard();
    }
  } catch (error) {
    console.error('Error marking follow-up complete:', error);
    alert('Error updating follow-up status.');
  }
}

async function deleteLead(leadId) {
  if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
    return;
  }

  try {
    await db.collection('csr_leads').doc(leadId).delete();
    allLeads = allLeads.filter(l => l.id !== leadId);
    filteredLeads = filteredLeads.filter(l => l.id !== leadId);
    renderLeadsTable();
    updateCSRDashboard();
    alert('Lead deleted successfully!');
  } catch (error) {
    console.error('Error deleting lead:', error);
    alert('Error deleting lead. Please try again.');
  }
}

function viewLead(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;

  let followUpInfo = '';
  if (lead.followUpDates && lead.followUpDates.length > 0) {
    followUpInfo = `
      <div class="mt-4">
        <h4 class="font-semibold mb-2">Email Follow-up Schedule:</h4>
        <ul class="text-sm space-y-1">
          ${lead.followUpDates.map((date, i) => {
            const d = date.toDate ? date.toDate() : new Date(date);
            const completed = lead.followUpCompleted?.[i];
            return `<li class="${completed ? 'text-green-600' : 'text-gray-600'}">
              ${completed ? '✓' : '○'} Day ${[3,5,7,9,11][i]}: ${formatDate(d)}
            </li>`;
          }).join('')}
        </ul>
      </div>
    `;
  }

  const details = `
    <div class="text-left">
      <p><strong>Lead Name:</strong> ${escapeHtml(lead.leadName)}</p>
      <p><strong>Contact:</strong> ${escapeHtml(lead.contactNumber)}</p>
      <p><strong>Company:</strong> ${escapeHtml(lead.companyName)}</p>
      <p><strong>Service:</strong> ${escapeHtml(lead.serviceInterested)}</p>
      <p><strong>Status:</strong> ${escapeHtml(lead.status)}</p>
      <p><strong>Assigned CSR:</strong> ${escapeHtml(lead.assignedCSR || 'N/A')}</p>
      <p><strong>Date Added:</strong> ${formatDate(lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : lead.dateOfContact)}</p>
      ${lead.callbackTime ? `<p><strong>Callback Time:</strong> ${formatDateTime(lead.callbackTime?.toDate ? lead.callbackTime.toDate() : lead.callbackTime)}</p>` : ''}
      ${lead.notes ? `<p><strong>Notes:</strong> ${escapeHtml(lead.notes)}</p>` : ''}
      ${followUpInfo}
    </div>
  `;
  
  alert(details.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' '));
}

async function editLead(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;

  const newStatus = prompt('Update lead status:\n\n1. Interested\n2. Not Interested\n3. Follow-up\n4. Email Sent\n5. Lead Closed\n6. Meeting Set\n\nCurrent: ' + lead.status + '\n\nEnter new status or leave blank to keep current:');
  
  if (newStatus === null) return;
  
  const statusMap = {
    '1': 'Interested',
    '2': 'Not Interested', 
    '3': 'Follow-up',
    '4': 'Email Sent',
    '5': 'Lead Closed',
    '6': 'Meeting Set'
  };
  
  const status = statusMap[newStatus] || newStatus || lead.status;
  
  if (['Interested', 'Not Interested', 'Follow-up', 'Email Sent', 'Lead Closed', 'Meeting Set'].includes(status)) {
    try {
      await db.collection('csr_leads').doc(leadId).update({ status });
      lead.status = status;
      renderLeadsTable();
      updateCSRDashboard();
      alert('Lead status updated!');
    } catch (error) {
      console.error('Error updating lead:', error);
      alert('Error updating lead.');
    }
  } else {
    alert('Invalid status. Please enter a number 1-6 or a valid status name.');
  }
}

function generateMonthlyReport() {
  const monthInput = document.getElementById('csrReportMonth');
  if (!monthInput) return;
  
  const selectedMonth = monthInput.value;
  const [year, month] = selectedMonth.split('-').map(Number);
  
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  const monthLeads = allLeads.filter(lead => {
    const leadDate = lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
    return leadDate >= monthStart && leadDate <= monthEnd;
  });

  const stats = {
    total: monthLeads.length,
    interested: monthLeads.filter(l => l.status === 'Interested').length,
    notInterested: monthLeads.filter(l => l.status === 'Not Interested').length,
    followUp: monthLeads.filter(l => l.status === 'Follow-up').length,
    emailSent: monthLeads.filter(l => l.status === 'Email Sent').length,
    closed: monthLeads.filter(l => l.status === 'Lead Closed').length,
    meetingSet: monthLeads.filter(l => l.status === 'Meeting Set').length
  };

  let completedFollowUps = 0;
  let totalFollowUps = 0;
  monthLeads.forEach(lead => {
    if (lead.followUpCompleted && lead.followUpDates) {
      totalFollowUps += lead.followUpDates.length;
      completedFollowUps += lead.followUpCompleted.filter(c => c).length;
    }
  });

  document.getElementById('reportTotalLeads').textContent = stats.total;
  document.getElementById('reportInterestedLeads').textContent = stats.interested;
  document.getElementById('reportNotInterestedLeads').textContent = stats.notInterested;
  document.getElementById('reportFollowUpLeads').textContent = stats.followUp;
  document.getElementById('reportEmailSentLeads').textContent = stats.emailSent;
  document.getElementById('reportClosedLeads').textContent = stats.closed;
  document.getElementById('reportMeetingSetLeads').textContent = stats.meetingSet;
  
  const followUpRate = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;
  document.getElementById('reportFollowUpCompletion').textContent = followUpRate + '%';
}

function initializeCSRExports() {
  const generateReportBtn = document.getElementById('csrGenerateReport');
  const exportLeadsBtn = document.getElementById('csrExportLeads');
  const exportCSVBtn = document.getElementById('csrExportCSV');
  const exportPDFBtn = document.getElementById('csrExportPDF');

  if (generateReportBtn) {
    generateReportBtn.addEventListener('click', generateMonthlyReport);
  }

  if (exportLeadsBtn) {
    exportLeadsBtn.addEventListener('click', () => exportLeadsToCSV(filteredLeads));
  }

  if (exportCSVBtn) {
    exportCSVBtn.addEventListener('click', () => {
      const monthInput = document.getElementById('csrReportMonth');
      const selectedMonth = monthInput?.value || new Date().toISOString().slice(0, 7);
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      const monthLeads = allLeads.filter(lead => {
        const leadDate = lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
        return leadDate >= monthStart && leadDate <= monthEnd;
      });
      
      exportLeadsToCSV(monthLeads, `csr_report_${selectedMonth}.csv`);
    });
  }

  if (exportPDFBtn) {
    exportPDFBtn.addEventListener('click', exportReportToPDF);
  }
}

function exportLeadsToCSV(leads, filename = 'csr_leads.csv') {
  const headers = ['Lead Name', 'Contact Number', 'Company', 'Service Interested', 'Status', 'Date Added', 'Callback Time', 'Assigned CSR', 'Notes'];
  
  const rows = leads.map(lead => {
    const dateAdded = lead.dateOfContact?.toDate ? lead.dateOfContact.toDate() : new Date(lead.dateOfContact);
    const callbackTime = lead.callbackTime?.toDate ? lead.callbackTime.toDate() : (lead.callbackTime ? new Date(lead.callbackTime) : null);
    
    return [
      lead.leadName,
      lead.contactNumber,
      lead.companyName,
      lead.serviceInterested,
      lead.status,
      formatDate(dateAdded),
      callbackTime ? formatDateTime(callbackTime) : '',
      lead.assignedCSR || '',
      lead.notes || ''
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

function exportReportToPDF() {
  const monthInput = document.getElementById('csrReportMonth');
  const selectedMonth = monthInput?.value || new Date().toISOString().slice(0, 7);
  
  const total = document.getElementById('reportTotalLeads')?.textContent || '0';
  const interested = document.getElementById('reportInterestedLeads')?.textContent || '0';
  const notInterested = document.getElementById('reportNotInterestedLeads')?.textContent || '0';
  const followUp = document.getElementById('reportFollowUpLeads')?.textContent || '0';
  const emailSent = document.getElementById('reportEmailSentLeads')?.textContent || '0';
  const closed = document.getElementById('reportClosedLeads')?.textContent || '0';
  const meetingSet = document.getElementById('reportMeetingSetLeads')?.textContent || '0';
  const followUpCompletion = document.getElementById('reportFollowUpCompletion')?.textContent || '0%';

  const reportContent = `
CSR MONTHLY REPORT
==================

Report Period: ${selectedMonth}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Leads Added: ${total}

LEAD STATUS BREAKDOWN
--------------------
Interested: ${interested}
Not Interested: ${notInterested}
Follow-up Required: ${followUp}
Email Sent: ${emailSent}
Lead Closed: ${closed}
Meeting Set: ${meetingSet}

PERFORMANCE METRICS
------------------
Follow-up Completion Rate: ${followUpCompletion}
  `;

  const blob = new Blob([reportContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `csr_report_${selectedMonth}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert('Report exported! For PDF format, you can print this file as PDF from your text editor or browser.');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (typeof firebase !== 'undefined' && firebase.auth) {
      firebase.auth().onAuthStateChanged((user) => {
        if (user) {
          initializeCSRModule();
        }
      });
    }
  }, 500);
});

window.editLead = editLead;
window.viewLead = viewLead;
window.deleteLead = deleteLead;
window.markFollowUpComplete = markFollowUpComplete;
