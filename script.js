// Global Variables
let numProcesses = 0;
let numResources = 0;
let allocation = [];
let maximum = [];
let need = [];
let available = [];
let total = [];

// DOM Elements
const generateBtn = document.getElementById('generateBtn');
const safetyBtn = document.getElementById('safetyBtn');
const requestBtn = document.getElementById('requestBtn');
const tablesContainer = document.getElementById('tablesContainer');

// Landing Page Elements
const landingPage = document.getElementById('landingPage');
const simulatorApp = document.getElementById('simulatorApp');
const startSimulatorBtn = document.getElementById('startSimulatorBtn');
const startSimulatorBtn2 = document.getElementById('startSimulatorBtn2');
const learnMoreBtn = document.getElementById('learnMoreBtn');
const exitSimulatorBtn = document.getElementById('exitSimulatorBtn');

// Event Listeners
generateBtn.addEventListener('click', generateTables);
safetyBtn.addEventListener('click', runSafetyAlgorithm);
requestBtn.addEventListener('click', handleResourceRequest);

// Landing Page Event Listeners
startSimulatorBtn.addEventListener('click', () => {
    landingPage.style.display = 'none';
    simulatorApp.style.display = 'block';
    window.scrollTo(0, 0);
});

startSimulatorBtn2.addEventListener('click', () => {
    landingPage.style.display = 'none';
    simulatorApp.style.display = 'block';
    window.scrollTo(0, 0);
});

learnMoreBtn.addEventListener('click', () => {
    document.getElementById('features').scrollIntoView({ behavior: 'smooth' });
});

exitSimulatorBtn.addEventListener('click', () => {
    simulatorApp.style.display = 'none';
    landingPage.style.display = 'block';
    window.scrollTo(0, 0);
});

// Add keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement.id === 'numProcesses' || 
        e.key === 'Enter' && document.activeElement.id === 'numResources') {
        generateTables();
    }
});

/**
 * Generate all tables based on user input
 */
function generateTables() {
    // Get input values
    numProcesses = parseInt(document.getElementById('numProcesses').value);
    numResources = parseInt(document.getElementById('numResources').value);

    // Validate input
    if (numProcesses < 1 || numResources < 1) {
        showToast('⚠️ Please enter valid numbers for processes and resources (minimum 1)', 'warning');
        return;
    }

    if (numProcesses > 20 || numResources > 10) {
        showToast('⚠️ Maximum 20 processes and 10 resources allowed', 'warning');
        return;
    }

    // Preserve old data when resizing
    const oldAllocation = allocation.length > 0 ? allocation.map(row => [...row]) : [];
    const oldMaximum = maximum.length > 0 ? maximum.map(row => [...row]) : [];
    const oldTotal = total.length > 0 ? [...total] : [];

    // Initialize matrices
    allocation = Array(numProcesses).fill(0).map(() => Array(numResources).fill(0));
    maximum = Array(numProcesses).fill(0).map(() => Array(numResources).fill(0));
    need = Array(numProcesses).fill(0).map(() => Array(numResources).fill(0));
    available = Array(numResources).fill(0);
    total = Array(numResources).fill(10); // Default total resources

    // Restore old data where possible
    for (let i = 0; i < Math.min(oldAllocation.length, numProcesses); i++) {
        for (let j = 0; j < Math.min(oldAllocation[i]?.length || 0, numResources); j++) {
            allocation[i][j] = oldAllocation[i][j] || 0;
        }
    }
    for (let i = 0; i < Math.min(oldMaximum.length, numProcesses); i++) {
        for (let j = 0; j < Math.min(oldMaximum[i]?.length || 0, numResources); j++) {
            maximum[i][j] = oldMaximum[i][j] || 0;
        }
    }
    for (let j = 0; j < Math.min(oldTotal.length, numResources); j++) {
        total[j] = oldTotal[j] || 10;
    }

    // Add/remove body class for wide resources
    document.body.classList.toggle('wide-resources', numResources > 3);

    // Generate resource labels (A, B, C, ...)
    const resourceLabels = generateResourceLabels();

    // Generate tables
    createTotalResourcesTable(resourceLabels);
    createMatrixTable('allocationTable', 'Allocation', allocation, resourceLabels, false);
    createMatrixTable('maximumTable', 'Maximum', maximum, resourceLabels, false);
    createMatrixTable('needTable', 'Need', need, resourceLabels, true);
    createAvailableTable(resourceLabels);
    populateProcessSelect();
    createRequestInputs(resourceLabels);

    // Show tables container
    tablesContainer.style.display = 'block';

    // Show success notification
    showToast(`✓ Successfully generated tables for ${numProcesses} processes and ${numResources} resources`, 'success');

    // Smooth scroll to tables
    setTimeout(() => {
        tablesContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Clear previous results
    clearResults();
}

/**
 * Generate resource labels (A, B, C, D, ...)
 */
function generateResourceLabels() {
    const labels = [];
    for (let i = 0; i < numResources; i++) {
        labels.push(String.fromCharCode(65 + i)); // A=65 in ASCII
    }
    return labels;
}

/**
 * Create Total Resources Table
 */
function createTotalResourcesTable(resourceLabels) {
    const container = document.getElementById('totalResourcesTable');
    let html = '<table><thead><tr>';
    
    resourceLabels.forEach(label => {
        html += `<th>Resource ${label}</th>`;
    });
    html += '</tr></thead><tbody><tr>';
    
    resourceLabels.forEach((label, i) => {
        html += `<td><input type="number" min="0" value="${total[i]}" onchange="updateTotal(${i}, this.value)" /></td>`;
    });
    html += '</tr></tbody></table>';
    
    container.innerHTML = html;
}

/**
 * Update total resources and recalculate available
 */
function updateTotal(index, value) {
    total[index] = parseInt(value) || 0;
    calculateAvailable();
    
    // Also recalculate need in case maximum changed
    calculateNeed();
}

/**
 * Create a matrix table (Allocation, Maximum, or Need)
 */
function createMatrixTable(containerId, matrixName, matrix, resourceLabels, isReadOnly) {
    const container = document.getElementById(containerId);
    let html = '<table id="' + matrixName.toLowerCase() + '"><thead><tr><th>Process</th>';
    
    resourceLabels.forEach(label => {
        html += `<th>${label}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    for (let i = 0; i < numProcesses; i++) {
        html += `<tr data-process="${i}"><td class="process-label">P${i}</td>`;
        for (let j = 0; j < numResources; j++) {
            const inputAttrs = isReadOnly ? 'readonly' : '';
            const onchangeAttr = isReadOnly ? '' : `onchange="updateMatrix('${matrixName.toLowerCase()}', ${i}, ${j}, this.value)"`;
            html += `<td><input type="number" min="0" value="${matrix[i][j]}" ${inputAttrs} ${onchangeAttr} id="${matrixName.toLowerCase()}-${i}-${j}" /></td>`;
        }
        html += '</tr>';
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

/**
 * Update matrix values and recalculate dependent values
 */
function updateMatrix(matrixName, i, j, value) {
    const val = parseInt(value) || 0;
    const inputElement = document.getElementById(`${matrixName}-${i}-${j}`);
    
    if (matrixName === 'allocation') {
        allocation[i][j] = val;
        
        // Validate: Allocation should not exceed Maximum (only if Maximum is already set to non-zero)
        if (val > 0 && maximum[i][j] > 0 && allocation[i][j] > maximum[i][j]) {
            showToast(`⚠️ Warning: Allocation for P${i} exceeds Maximum for resource ${String.fromCharCode(65 + j)}`, 'warning');
            allocation[i][j] = maximum[i][j];
            inputElement.value = maximum[i][j];
            inputElement.style.borderColor = '#ffc107';
            setTimeout(() => { inputElement.style.borderColor = ''; }, 2000);
        }
        
        calculateNeed();
        calculateAvailable();
    } else if (matrixName === 'maximum') {
        maximum[i][j] = val;
        
        // Validate: Maximum should not be less than Allocation (only if Allocation is already set to non-zero)
        if (val > 0 && allocation[i][j] > 0 && maximum[i][j] < allocation[i][j]) {
            showToast(`⚠️ Warning: Maximum for P${i} is less than current Allocation for resource ${String.fromCharCode(65 + j)}`, 'warning');
            maximum[i][j] = allocation[i][j];
            inputElement.value = allocation[i][j];
            inputElement.style.borderColor = '#ffc107';
            setTimeout(() => { inputElement.style.borderColor = ''; }, 2000);
        }
        
        calculateNeed();
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        max-width: 350px;
        font-size: 0.95rem;
        border-left: 4px solid ${type === 'warning' ? '#ffc107' : type === 'success' ? '#28a745' : '#667eea'};
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Calculate Need Matrix (Need = Maximum - Allocation)
 */
function calculateNeed() {
    for (let i = 0; i < numProcesses; i++) {
        for (let j = 0; j < numResources; j++) {
            need[i][j] = maximum[i][j] - allocation[i][j];
            const input = document.getElementById(`need-${i}-${j}`);
            if (input) {
                input.value = need[i][j];
            }
        }
    }
}

/**
 * Create Available Resources Table
 */
function createAvailableTable(resourceLabels) {
    const container = document.getElementById('availableTable');
    let html = '<table><thead><tr>';
    
    resourceLabels.forEach(label => {
        html += `<th>${label}</th>`;
    });
    html += '</tr></thead><tbody><tr>';
    
    resourceLabels.forEach((label, i) => {
        html += `<td><input type="number" value="${available[i]}" readonly id="available-${i}" /></td>`;
    });
    html += '</tr></tbody></table>';
    
    container.innerHTML = html;
    calculateAvailable();
}

/**
 * Calculate Available Resources (Available = Total - Sum of Allocations)
 */
function calculateAvailable() {
    for (let j = 0; j < numResources; j++) {
        let sum = 0;
        for (let i = 0; i < numProcesses; i++) {
            sum += allocation[i][j];
        }
        available[j] = total[j] - sum;
        
        const input = document.getElementById(`available-${j}`);
        if (input) {
            input.value = available[j];
        }
    }
}

/**
 * Populate process selection dropdown
 */
function populateProcessSelect() {
    const select = document.getElementById('processSelect');
    const oldValue = select.value;
    select.innerHTML = '';
    for (let i = 0; i < numProcesses; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `P${i}`;
        select.appendChild(option);
    }
    
    // Restore old selection if still valid
    if (oldValue && parseInt(oldValue) < numProcesses) {
        select.value = oldValue;
    }
    
    // Add change listener to highlight process
    select.removeEventListener('change', handleProcessSelectChange);
    select.addEventListener('change', handleProcessSelectChange);
    
    // Highlight initial process
    highlightProcess(parseInt(select.value) || 0);
}

function handleProcessSelectChange() {
    const select = document.getElementById('processSelect');
    highlightProcess(parseInt(select.value) || 0);
}

/**
 * Create request input fields
 */
function createRequestInputs(resourceLabels) {
    const container = document.getElementById('requestInputs');
    let html = '';
    
    resourceLabels.forEach((label, i) => {
        html += `
            <div class="input-field">
                <label for="request-${i}">Resource ${label}:</label>
                <input type="number" min="0" value="0" id="request-${i}" />
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * Run Safety Algorithm
 */
function runSafetyAlgorithm() {
    const result = checkSafety(available, allocation, need);
    displaySafetyResult(result);
}

/**
 * Banker's Safety Algorithm Implementation
 */
function checkSafety(availableResources, allocationMatrix, needMatrix) {
    // Create copies to avoid modifying originals
    const work = [...availableResources];
    const finish = Array(numProcesses).fill(false);
    const safeSequence = [];
    
    // Find a safe sequence
    let count = 0;
    while (count < numProcesses) {
        let found = false;
        
        for (let i = 0; i < numProcesses; i++) {
            if (!finish[i]) {
                // Check if process i can finish with available resources
                let canFinish = true;
                for (let j = 0; j < numResources; j++) {
                    if (needMatrix[i][j] > work[j]) {
                        canFinish = false;
                        break;
                    }
                }
                
                if (canFinish) {
                    // Process can finish, release its resources
                    for (let j = 0; j < numResources; j++) {
                        work[j] += allocationMatrix[i][j];
                    }
                    
                    safeSequence.push(i);
                    finish[i] = true;
                    found = true;
                    count++;
                }
            }
        }
        
        // If no process could finish in this iteration, system is unsafe
        if (!found) {
            return {
                safe: false,
                sequence: []
            };
        }
    }
    
    return {
        safe: true,
        sequence: safeSequence
    };
}

/**
 * Display Safety Algorithm Result
 */
function displaySafetyResult(result) {
    const resultBox = document.getElementById('safetyResult');
    resultBox.classList.remove('safe', 'unsafe', 'show');
    
    if (result.safe) {
        const sequenceStr = result.sequence.map(i => `P${i}`).join(' → ');
        resultBox.innerHTML = `
            <h3>✓ System is SAFE</h3>
            <p>A safe sequence exists. The system can avoid deadlock by following this order:</p>
            <div class="safe-sequence">${sequenceStr}</div>
        `;
        resultBox.classList.add('safe', 'show');
    } else {
        resultBox.innerHTML = `
            <h3>✗ System is UNSAFE</h3>
            <p>No safe sequence exists. The system is in a potential deadlock state.</p>
            <p style="margin-top: 10px;"><strong>Recommendation:</strong> Adjust resource allocation or maximum requirements to ensure system safety.</p>
        `;
        resultBox.classList.add('unsafe', 'show');
    }

    // Smooth scroll to result
    setTimeout(() => {
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Handle Resource Request
 */
function handleResourceRequest() {
    const processIndex = parseInt(document.getElementById('processSelect').value);
    const request = [];
    
    // Get request values
    for (let i = 0; i < numResources; i++) {
        const value = parseInt(document.getElementById(`request-${i}`).value) || 0;
        request.push(value);
    }
    
    // Highlight selected process
    highlightProcess(processIndex);
    
    // Validate request
    const validation = validateRequest(processIndex, request);
    if (!validation.valid) {
        displayRequestResult(validation.message, 'warning');
        return;
    }
    
    // Try to grant request (temporarily)
    const tempAvailable = [...available];
    const tempAllocation = allocation.map(row => [...row]);
    const tempNeed = need.map(row => [...row]);
    
    // Apply temporary allocation
    for (let j = 0; j < numResources; j++) {
        tempAvailable[j] -= request[j];
        tempAllocation[processIndex][j] += request[j];
        tempNeed[processIndex][j] -= request[j];
    }
    
    // Check if system remains safe
    const safetyResult = checkSafety(tempAvailable, tempAllocation, tempNeed);
    
    if (safetyResult.safe) {
        // Accept request and update actual matrices
        for (let j = 0; j < numResources; j++) {
            available[j] = tempAvailable[j];
            allocation[processIndex][j] = tempAllocation[processIndex][j];
            need[processIndex][j] = tempNeed[processIndex][j];
            
            // Update UI
            document.getElementById(`allocation-${processIndex}-${j}`).value = allocation[processIndex][j];
            document.getElementById(`need-${processIndex}-${j}`).value = need[processIndex][j];
            document.getElementById(`available-${j}`).value = available[j];
        }
        
        const sequenceStr = safetyResult.sequence.map(i => `P${i}`).join(' → ');
        displayRequestResult(
            `✓ Request APPROVED for P${processIndex}<br>` +
            `System remains safe with sequence: <div class="safe-sequence">${sequenceStr}</div>`,
            'safe'
        );
    } else {
        displayRequestResult(
            `✗ Request DENIED for P${processIndex}<br>` +
            `Granting this request would make the system unsafe and could lead to deadlock.`,
            'unsafe'
        );
    }
}

/**
 * Validate Resource Request
 */
function validateRequest(processIndex, request) {
    // Check 1: Request <= Need
    for (let j = 0; j < numResources; j++) {
        if (request[j] > need[processIndex][j]) {
            return {
                valid: false,
                message: `Request exceeds Need for P${processIndex}. ` +
                        `Requested ${request[j]} of resource ${String.fromCharCode(65 + j)}, ` +
                        `but Need is only ${need[processIndex][j]}.`
            };
        }
    }
    
    // Check 2: Request <= Available
    for (let j = 0; j < numResources; j++) {
        if (request[j] > available[j]) {
            return {
                valid: false,
                message: `Request exceeds Available resources. ` +
                        `Requested ${request[j]} of resource ${String.fromCharCode(65 + j)}, ` +
                        `but only ${available[j]} are available.`
            };
        }
    }
    
    // Check 3: No negative values
    for (let j = 0; j < numResources; j++) {
        if (request[j] < 0) {
            return {
                valid: false,
                message: 'Request values cannot be negative.'
            };
        }
    }
    
    return { valid: true };
}

/**
 * Display Resource Request Result
 */
function displayRequestResult(message, type) {
    const resultBox = document.getElementById('requestResult');
    resultBox.classList.remove('safe', 'unsafe', 'warning', 'show');
    resultBox.innerHTML = message;
    resultBox.classList.add(type, 'show');
    
    // Smooth scroll to result
    setTimeout(() => {
        resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

/**
 * Highlight selected process row across all matrices
 */
function highlightProcess(processIndex) {
    const tableIds = ['allocation', 'maximum', 'need'];
    
    tableIds.forEach(tableId => {
        const table = document.getElementById(tableId);
        if (table && table.tBodies[0]) {
            const rows = Array.from(table.tBodies[0].rows);
            rows.forEach((row, idx) => {
                if (idx === processIndex) {
                    row.classList.add('highlighted');
                } else {
                    row.classList.remove('highlighted');
                }
            });
        }
    });
}

/**
 * Clear all result boxes
 */
function clearResults() {
    document.getElementById('safetyResult').classList.remove('show');
    document.getElementById('requestResult').classList.remove('show');
}
