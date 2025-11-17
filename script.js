// Configuration
const CONFIG = {
    PIPEDREAM_WEBHOOK_URL: 'https://hubspot-deal-proxy.vercel.app/api/search', // We'll update this in Phase 3
    MIN_SEARCH_LENGTH: 2,
    SEARCH_DELAY: 300 // ms
};

// State
let searchTimeout;
let selectedCompany = null;
let selectedContact = null;
let selectedOwner = null;
let selectedCompanyOwner = null;
let selectedContactOwner = null;
let isCreatingNewCompany = false;
let isCreatingNewContact = false;
let additionalCompanies = []; // Array to store additional companies
let additionalContacts = []; // Array to store additional contacts
let companyCounter = 0; // Counter for unique IDs
let contactCounter = 0; // Counter for unique IDs

// Initialize form
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
});

function initializeForm() {
    const form = document.getElementById('dealForm');
    
    // Company search
    const companySearch = document.getElementById('companySearch');
    companySearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
            searchTimeout = setTimeout(() => searchItems('company', query), CONFIG.SEARCH_DELAY);
        } else {
            hideResults('company');
        }
    });

    // Contact search
    const contactSearch = document.getElementById('contactSearch');
    contactSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
            searchTimeout = setTimeout(() => searchItems('contact', query), CONFIG.SEARCH_DELAY);
        } else {
            hideResults('contact');
        }
    });

    const companyOwnerSearch = document.getElementById('newCompanyOwnerSearch');
    if (companyOwnerSearch) {
        companyOwnerSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
                searchTimeout = setTimeout(() => searchItems('companyowner', query), CONFIG.SEARCH_DELAY);
            } else {
                hideResults('companyowner');
            }
        });
    }

    const contactOwnerSearch = document.getElementById('newContactOwnerSearch');
    if (contactOwnerSearch) {
        contactOwnerSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
                searchTimeout = setTimeout(() => searchItems('contactowner', query), CONFIG.SEARCH_DELAY);
            } else {
                hideResults('contactowner');
            }
        });
    }

    // Deal Owner search
    const ownerSearch = document.getElementById('dealOwnerSearch');
    ownerSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
            searchTimeout = setTimeout(() => searchItems('owner', query), CONFIG.SEARCH_DELAY);
        } else {
            hideResults('owner');
        }
    });


    // Pipeline auto-suggest based on amount
    const amountField = document.getElementById('amount');
    const pipelineField = document.getElementById('pipeline');
    
    amountField.addEventListener('input', (e) => {
        const amount = parseFloat(e.target.value) || 0;
        if (amount > 0) {
            if (amount < 100000) {
                pipelineField.value = 'small';
                pipelineField.style.borderColor = '#1da1f2';
            } else {
                pipelineField.value = 'large';
                pipelineField.style.borderColor = '#794bc4';
            }
        }
    });

    // Create new company button
    document.getElementById('createNewCompanyBtn').addEventListener('click', toggleNewCompanyFields);
    
    // Create new contact button
    document.getElementById('createNewContactBtn').addEventListener('click', toggleNewContactFields);

    // Add more companies button
    document.getElementById('addMoreCompaniesBtn').addEventListener('click', addCompanyField);

    // Add more contacts button
    document.getElementById('addMoreContactsBtn').addEventListener('click', addContactField);

    // Form submission
    form.addEventListener('submit', handleSubmit);

    // Form reset
    form.addEventListener('reset', () => {
        resetAllSelections();
        document.getElementById('newCompanyFields').style.display = 'none';
        document.getElementById('newContactFields').style.display = 'none';
        isCreatingNewCompany = false;
        isCreatingNewContact = false;
    });
}

    // Add additional company field
function addCompanyField() {
    companyCounter++;
    const fieldId = `additionalCompany${companyCounter}`;
    
    const fieldHTML = `
        <div class="additional-field" id="${fieldId}-container" style="margin-top: 20px;">
            <div class="form-group">
                <label for="${fieldId}">Additional Company</label>
                <input 
                    type="text" 
                    id="${fieldId}" 
                    name="${fieldId}"
                    autocomplete="off"
                    data-field-type="additional-company"
                    data-field-id="${fieldId}"
                >
                <div id="${fieldId}Results" class="autocomplete-results"></div>
                <input type="hidden" id="${fieldId}Id" name="${fieldId}Id">
                <button type="button" class="btn-link remove-field" data-container="${fieldId}-container">− Remove</button>
            </div>
        </div>
    `;
    
    document.getElementById('additionalCompaniesContainer').insertAdjacentHTML('beforeend', fieldHTML);
    
    // Add search listener to new field
    const newField = document.getElementById(fieldId);
    newField.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
            searchTimeout = setTimeout(() => searchItems('company', query, fieldId), CONFIG.SEARCH_DELAY);
        } else {
            hideResults('company', fieldId);
        }
    });
    
    // Add remove listener
    document.querySelector(`[data-container="${fieldId}-container"]`).addEventListener('click', function() {
        document.getElementById(`${fieldId}-container`).remove();
        // Remove from array
        additionalCompanies = additionalCompanies.filter(c => c.fieldId !== fieldId);
    });
}

// Add additional contact field
function addContactField() {
    contactCounter++;
    const fieldId = `additionalContact${contactCounter}`;
    
    const fieldHTML = `
        <div class="additional-field" id="${fieldId}-container" style="margin-top: 20px;">
            <div class="form-group">
                <label for="${fieldId}">Additional Contact</label>
                <input 
                    type="text" 
                    id="${fieldId}" 
                    name="${fieldId}"
                    autocomplete="off"
                    data-field-type="additional-contact"
                    data-field-id="${fieldId}"
                >
                <div id="${fieldId}Results" class="autocomplete-results"></div>
                <input type="hidden" id="${fieldId}Id" name="${fieldId}Id">
                <button type="button" class="btn-link remove-field" data-container="${fieldId}-container">− Remove</button>
            </div>
        </div>
    `;
    
    document.getElementById('additionalContactsContainer').insertAdjacentHTML('beforeend', fieldHTML);
    
    // Add search listener to new field
    const newField = document.getElementById(fieldId);
    newField.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= CONFIG.MIN_SEARCH_LENGTH) {
            searchTimeout = setTimeout(() => searchItems('contact', query, fieldId), CONFIG.SEARCH_DELAY);
        } else {
            hideResults('contact', fieldId);
        }
    });
    
    // Add remove listener
    document.querySelector(`[data-container="${fieldId}-container"]`).addEventListener('click', function() {
        document.getElementById(`${fieldId}-container`).remove();
        // Remove from array
        additionalContacts = additionalContacts.filter(c => c.fieldId !== fieldId);
    });
}

// Generic search function for companies, contacts, and owners
async function searchItems(type, query, fieldId = null) {
    let resultsDiv, action;
    
    // Determine which results div to use
    if (fieldId) {
        // For additional fields
        resultsDiv = document.getElementById(`${fieldId}Results`);
    } else {
        // For primary fields
        if (type === 'company') {
            resultsDiv = document.getElementById('companyResults');
        } else if (type === 'contact') {
            resultsDiv = document.getElementById('contactResults');
        } else if (type === 'owner') {
            resultsDiv = document.getElementById('ownerResults');
        } else if (type === 'companyowner') {
            resultsDiv = document.getElementById('companyOwnerResults');
        } else if (type === 'contactowner') {
            resultsDiv = document.getElementById('contactOwnerResults');
        }
    }
    
    // Determine which API action
    if (type === 'company') {
        action = 'search_companies';
    } else if (type === 'contact') {
        action = 'search_contacts';
    } else if (type === 'owner' || type === 'companyowner' || type === 'contactowner') {
        action = 'search_owners';
    }
    
    try {
        resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
        resultsDiv.style.display = 'block';

        const response = await fetch(CONFIG.PIPEDREAM_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                query: query
            })
        });

        if (!response.ok) {
            throw new Error('Search request failed');
        }

        const data = await response.json();
        displayResults(type, data.results, fieldId);
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<div class="error">Search failed. Please try again.</div>';
    }
}

// Display search results
function displayResults(type, results, fieldId = null) {
    let resultsDiv;
    
    // Determine which results div
    if (fieldId) {
        resultsDiv = document.getElementById(`${fieldId}Results`);
    } else {
        if (type === 'company') {
            resultsDiv = document.getElementById('companyResults');
        } else if (type === 'contact') {
            resultsDiv = document.getElementById('contactResults');
        } else if (type === 'owner') {
            resultsDiv = document.getElementById('ownerResults');
        } else if (type === 'companyowner') {
            resultsDiv = document.getElementById('companyOwnerResults');
        } else if (type === 'contactowner') {
            resultsDiv = document.getElementById('contactOwnerResults');
        }
    }
    
    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No results found. Try a different search term.</div>';
        return;
    }

    const html = results.map(item => {
        let displayName, subtext;
        
        if (type === 'company') {
            displayName = item.name || 'Unnamed Company';
            subtext = item.location || item.domain || '';
        } else if (type === 'contact') {
            displayName = `${item.firstname || ''} ${item.lastname || ''}`.trim() || 'Unnamed Contact';
            subtext = item.email || item.company || '';
        } else if (type === 'owner' || type === 'companyowner' || type === 'contactowner') {
            displayName = `${item.firstname || ''} ${item.lastname || ''}`.trim() || 'Unnamed User';
            subtext = item.email || '';
        }
        
        return `
            <div class="result-item" data-type="${type}" data-id="${item.id}" data-name="${displayName}" data-field-id="${fieldId || ''}">
                <div class="result-name">${displayName}</div>
                ${subtext ? `<div class="result-location">${subtext}</div>` : ''}
            </div>
        `;
    }).join('');

    resultsDiv.innerHTML = html;

    // Add click handlers
    resultsDiv.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => selectItem(item));
    });
}

// Select an item from search results
function selectItem(item) {
    const type = item.dataset.type;
    const id = item.dataset.id;
    const name = item.dataset.name;
    const fieldId = item.dataset.fieldId;
    
    // Handle additional fields
    if (fieldId) {
        if (type === 'company') {
            // Additional company
            document.getElementById(fieldId).value = name;
            document.getElementById(`${fieldId}Id`).value = id;
            document.getElementById(`${fieldId}Selected`).textContent = name;
            
            // Add to array
            const existingIndex = additionalCompanies.findIndex(c => c.fieldId === fieldId);
            if (existingIndex >= 0) {
                additionalCompanies[existingIndex] = { fieldId, id, name };
            } else {
                additionalCompanies.push({ fieldId, id, name });
            }
            
            hideResults('company', fieldId);
        } else if (type === 'contact') {
            // Additional contact
            document.getElementById(fieldId).value = name;
            document.getElementById(`${fieldId}Id`).value = id;
            document.getElementById(`${fieldId}Selected`).textContent = name;
            
            // Add to array
            const existingIndex = additionalContacts.findIndex(c => c.fieldId === fieldId);
            if (existingIndex >= 0) {
                additionalContacts[existingIndex] = { fieldId, id, name };
            } else {
                additionalContacts.push({ fieldId, id, name });
            }
            
            hideResults('contact', fieldId);
        }
        return;
    }
    
    // Handle primary fields (existing logic)
    if (type === 'company') {
        selectedCompany = { id, name };
        document.getElementById('companySearch').value = name;
        document.getElementById('companyId').value = id;
        document.getElementById('selectedCompany').textContent = name;
        hideResults('company');
    } else if (type === 'contact') {
        selectedContact = { id, name };
        document.getElementById('contactSearch').value = name;
        document.getElementById('contactId').value = id;
        document.getElementById('selectedContact').textContent = name;
        hideResults('contact');
    } else if (type === 'owner') {
        selectedOwner = { id, name };
        document.getElementById('dealOwnerSearch').value = name;
        document.getElementById('dealOwnerId').value = id;
        document.getElementById('selectedOwner').textContent = name;
        hideResults('owner');
    } else if (type === 'companyowner') {
        selectedCompanyOwner = { id, name };
        document.getElementById('newCompanyOwnerSearch').value = name;
        document.getElementById('newCompanyOwnerId').value = id;
        document.getElementById('selectedCompanyOwner').textContent = name;
        hideResults('companyowner');
    } else if (type === 'contactowner') {
        selectedContactOwner = { id, name };
        document.getElementById('newContactOwnerSearch').value = name;
        document.getElementById('newContactOwnerId').value = id;
        document.getElementById('selectedContactOwner').textContent = name;
        hideResults('contactowner');
    }
}

// Hide results dropdown
function hideResults(type, fieldId = null) {
    if (fieldId) {
        const resultsDiv = document.getElementById(`${fieldId}Results`);
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }
    
    if (type === 'company') {
        document.getElementById('companyResults').style.display = 'none';
    } else if (type === 'contact') {
        document.getElementById('contactResults').style.display = 'none';
    } else if (type === 'owner') {
        document.getElementById('ownerResults').style.display = 'none';
    } else if (type === 'companyowner') {
        document.getElementById('companyOwnerResults').style.display = 'none';
    } else if (type === 'contactowner') {
        document.getElementById('contactOwnerResults').style.display = 'none';
    }
}

// Toggle new company fields
function toggleNewCompanyFields() {
    const fieldsDiv = document.getElementById('newCompanyFields');
    const btn = document.getElementById('createNewCompanyBtn');
    
    isCreatingNewCompany = !isCreatingNewCompany;
    
    if (isCreatingNewCompany) {
        fieldsDiv.style.display = 'block';
        btn.textContent = '− Cancel New Company';
        document.getElementById('companySearch').required = false;
        document.getElementById('newCompanyName').required = true;
        document.getElementById('newCompanyOwnerSearch').required = true;
        document.getElementById('newCompanyLifecycle').required = true;
        document.getElementById('newCompanyType').required = true;
        document.getElementById('newCompanyMarketSectors').required = true;

        
        // Clear existing selection
        selectedCompany = null;
        document.getElementById('companySearch').value = '';
        document.getElementById('companyId').value = '';
        document.getElementById('selectedCompany').textContent = 'Creating new company';
    } else {
        fieldsDiv.style.display = 'none';
        btn.textContent = '+ Create New Company';
        document.getElementById('companySearch').required = true;
        document.getElementById('newCompanyName').required = false;
        document.getElementById('newCompanyOwnerSearch').required = false;
        document.getElementById('newCompanyLifecycle').required = false;
        document.getElementById('newCompanyType').required = false;
        document.getElementById('newCompanyMarketSectors').required = false;
        document.getElementById('selectedCompany').textContent = 'None';
        
        // Clear new company fields
        selectedCompanyOwner = null;
        document.getElementById('newCompanyName').value = '';
        document.getElementById('newCompanyDomain').value = '';
        document.getElementById('newCompanyPhone').value = '';
        document.getElementById('newCompanyIndustry').value = '';
        document.getElementById('newCompanyOwnerSearch').value = '';
        document.getElementById('newCompanyOwnerId').value = '';
        document.getElementById('selectedCompanyOwner').textContent = 'None';
        document.getElementById('newCompanyLifecycle').value = '';
        document.getElementById('newCompanyType').value = '';
        document.getElementById('newCompanyMarketSectors').selectedIndex = -1;
    }
}

// Toggle new contact fields
function toggleNewContactFields() {
    const fieldsDiv = document.getElementById('newContactFields');
    const btn = document.getElementById('createNewContactBtn');
    
    isCreatingNewContact = !isCreatingNewContact;
    
    if (isCreatingNewContact) {
        fieldsDiv.style.display = 'block';
        btn.textContent = '− Cancel New Contact';
        document.getElementById('contactSearch').required = false;
        document.getElementById('newContactFirstName').required = true;
        document.getElementById('newContactLastName').required = true;
        document.getElementById('newContactEmail').required = true;
        document.getElementById('newContactOwnerSearch').required = true;
        document.getElementById('newContactLifecycle').required = true;
        document.getElementById('newContactLeadStatus').required = true;
        document.getElementById('newContactType').required = true;
        
        // Clear existing selection
        selectedContact = null;
        document.getElementById('contactSearch').value = '';
        document.getElementById('contactId').value = '';
        document.getElementById('selectedContact').textContent = 'Creating new contact';
    } else {
        fieldsDiv.style.display = 'none';
        btn.textContent = '+ Create New Contact';
        document.getElementById('contactSearch').required = true;
        document.getElementById('newContactFirstName').required = false;
        document.getElementById('newContactLastName').required = false;
        document.getElementById('newContactEmail').required = false;
        document.getElementById('newContactOwnerSearch').required = false;
        document.getElementById('newContactLifecycle').required = false;
        document.getElementById('newContactLeadStatus').required = false;
        document.getElementById('newContactType').required = false;
        document.getElementById('selectedContact').textContent = 'None';
        
        // Clear new contact fields
        document.getElementById('newContactFirstName').value = '';
        document.getElementById('newContactLastName').value = '';
        document.getElementById('newContactEmail').value = '';
        document.getElementById('newContactPhone').value = '';
        document.getElementById('newContactTitle').value = '';
        document.getElementById('newContactOwnerSearch').value = '';
        document.getElementById('newContactOwnerId').value = '';
        document.getElementById('selectedContactOwner').textContent = 'None';
        document.getElementById('newContactLifecycle').value = '';
        document.getElementById('newContactLeadStatus').value = '';
        document.getElementById('newContactType').selectedIndex = -1;
        document.getElementById('newContactPodcast').value = '';
    }
}

// Reset all selections
function resetAllSelections() {
    selectedCompany = null;
    selectedContact = null;
    selectedOwner = null;
    selectedCompanyOwner = null;
    selectedContactOwner = null;
    
    document.getElementById('selectedCompany').textContent = 'None';
    document.getElementById('selectedContact').textContent = 'None';
    document.getElementById('selectedOwner').textContent = 'None';
    document.getElementById('selectedCompanyOwner').textContent = 'None';
    document.getElementById('selectedContactOwner').textContent = 'None';
    
    document.getElementById('companyId').value = '';
    document.getElementById('contactId').value = '';
    document.getElementById('dealOwnerId').value = '';
    document.getElementById('newCompanyOwnerId').value = '';
    document.getElementById('newContactOwnerId').value = '';
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    const statusMessage = document.getElementById('statusMessage');
    
    // Validate selections
    if (!isCreatingNewCompany && !selectedCompany) {
        showStatus('Please select a company or create a new one', 'error');
        return;
    }
    if (isCreatingNewCompany && !selectedCompanyOwner) {
        showStatus('Please select a company owner for the new company', 'error');
        return;
    }
    
    if (!isCreatingNewContact && !selectedContact) {
        showStatus('Please select a contact or create a new one', 'error');
        return;
    }

    if (isCreatingNewContact && !selectedContactOwner) {
        showStatus('Please select a contact owner for the new contact', 'error');
        return;
    }
    
    if (!isCreatingNewContact && !selectedContact) {
        showStatus('Please select a contact or create a new one', 'error');
        return;
    }
    
    if (!selectedOwner) {
        showStatus('Please select a deal owner', 'error');
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    showStatus('Processing your request...', 'loading');
    
    try {
        // Get development status (multi-select)
        const developmentStatusSelect = document.getElementById('developmentStatus');
        const developmentStatus = Array.from(developmentStatusSelect.selectedOptions).map(opt => opt.value);
        
        // Gather form data
        const formData = {
            action: 'create_deal',
            
            // Company info
            company: isCreatingNewCompany ? {
                isNew: true,
                name: document.getElementById('newCompanyName').value,
                domain: document.getElementById('newCompanyDomain').value,
                phone: document.getElementById('newCompanyPhone').value,
                industry: document.getElementById('newCompanyIndustry').value,
                owner: {
                    id: selectedCompanyOwner.id,
                    name: selectedCompanyOwner.name
                },
                lifecyclestage: document.getElementById('newCompanyLifecycle').value,
                companyType: document.getElementById('newCompanyType').value,
                marketSectors: Array.from(document.getElementById('newCompanyMarketSectors').selectedOptions).map(opt => opt.value)
            } : {
                isNew: false,
                id: selectedCompany.id,
                name: selectedCompany.name
            },

            additionalCompanies: additionalCompanies.map(c => ({ id: c.id, name: c.name })),
            
            // Contact info
            contact: isCreatingNewContact ? {
                isNew: true,
                // ... new contact data
            } : {
                isNew: false,
                id: selectedContact.id,
                name: selectedContact.name
            },
            
            additionalContacts: additionalContacts.map(c => ({ id: c.id, name: c.name })),

            
            // Contact info
            contact: isCreatingNewContact ? {
                isNew: true,
                firstname: document.getElementById('newContactFirstName').value,
                lastname: document.getElementById('newContactLastName').value,
                email: document.getElementById('newContactEmail').value,
                phone: document.getElementById('newContactPhone').value,
                jobtitle: document.getElementById('newContactTitle').value,
                owner: {
                    id: selectedContactOwner.id,
                    name: selectedContactOwner.name
                },
                lifecyclestage: document.getElementById('newContactLifecycle').value,
                hs_lead_status: document.getElementById('newContactLeadStatus').value,
                contactType: Array.from(document.getElementById('newContactType').selectedOptions).map(opt => opt.value),
                podcast_relationship: document.getElementById('newContactPodcast').value
            } : {
                isNew: false,
                id: selectedContact.id,
                name: selectedContact.name
            },
            
            // Deal Information
            deal: {
                name: document.getElementById('dealName').value,
                pipeline: document.getElementById('pipeline').value,
                dealstage: document.getElementById('dealStage').value,
                owner: {
                    id: selectedOwner.id,
                    name: selectedOwner.name
                },
                description: document.getElementById('dealDescription').value,
                
                // Location
                street: document.getElementById('dealStreet').value,
                city: document.getElementById('dealCity').value,
                state: document.getElementById('dealState').value,
                zip: document.getElementById('dealZip').value,
                
                // Financial
                amount: parseFloat(document.getElementById('amount').value) || 0,
                framedArea: document.getElementById('framedArea').value,
                dealType: document.getElementById('dealType').value,
                
                // Market & Client
                marketType: document.getElementById('marketType').value,
                newRepeatClient: document.getElementById('newRepeatClient').value,
                
                // RFP Details
                developmentStatus: developmentStatus,
                rfpDetail: document.getElementById('rfpDetail').value,
                likelihoodToClose: document.getElementById('likelihoodToClose').value
            },
            
            // Options
            options: {
                createProposal: document.getElementById('createProposal').checked
            },
            
            // Metadata
            metadata: {
                submittedBy: 'Rosa Hayes', // Could make this dynamic
                submittedAt: new Date().toISOString()
            }
        };

        // Send to Pipedream webhook
        const response = await fetch(CONFIG.PIPEDREAM_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Webhook request failed');
        }

        const result = await response.json();
        
        // Success!
        showStatus(`✓ Success! Deal created with proposal #${result.proposalNumber}. Check HubSpot and Google Sheets.`, 'success');
        
        // Reset form after 3 seconds
        setTimeout(() => {
            document.getElementById('dealForm').reset();
            resetAllSelections();
            document.getElementById('newCompanyFields').style.display = 'none';
            document.getElementById('newContactFields').style.display = 'none';
            isCreatingNewCompany = false;
            isCreatingNewContact = false;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Deal & Proposal';
            statusMessage.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('Submission error:', error);
        showStatus('Error: Failed to create deal. Please try again or contact Rosa.', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Deal & Proposal';
    }
}

// Show status message
function showStatus(message, type) {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

// Click outside to close results
document.addEventListener('click', (e) => {
    if (!e.target.closest('.form-group')) {
        hideResults('company');
        hideResults('contact');
        hideResults('owner');
        hideResults('companyowner');
        hideResults('contactowner');
    }
});