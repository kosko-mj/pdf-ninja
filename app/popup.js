var selectedFiles = [];
const extpay = ExtPay('pdf-ninja-v2');

/**
 * GLOBAL VARIABLES & HOOKS
 * We define these once at the top so the whole app can see them.
 */
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const statusDiv = document.getElementById('status');
const fileControls = document.getElementById('fileControls');
const fileNameInput = document.getElementById('fileNameInput');
const clearAllBtn = document.getElementById('clearAllBtn');
const logoIcon = document.querySelector('.logo-box svg');

/**
 * SECTION 1: PAYMENT & ACCESS CONTROL
 */
async function checkPayment() {
    try {
        const user = await extpay.getUser();
        const paywall = document.getElementById('paywall-screen');
        const app = document.getElementById('app-screen');

        if (user && user.paid) {
            if (paywall) paywall.style.display = 'none';
            if (app) app.style.display = 'block';
        } else {
            if (paywall) paywall.style.display = 'block';
            if (app) app.style.display = 'none';
        }
    } catch (e) {
        console.error('Payment check failed', e);
    }
}

checkPayment();

const payBtn = document.getElementById('pay-button');
if (payBtn) {
    payBtn.addEventListener('click', () => {
        extpay.openPaymentPage();
    });
}

/**
 * SECTION 2: UI UPDATES
 */
function updateUI() {
    // If we have files, show the naming bar and the "Clear All" button
    if (selectedFiles.length > 0) {
        if (fileControls) fileControls.style.display = 'flex';
        // Enable Merge button only if there are 2 or more PDFs
        if (mergeBtn) mergeBtn.disabled = selectedFiles.length < 2;
    } else {
        // No files? Hide the naming bar and disable the Merge button
        if (fileControls) fileControls.style.display = 'none';
        if (mergeBtn) mergeBtn.disabled = true;

        if (fileNameInput) fileNameInput.value = '';
    }
}

function showStatus(message, isError = false) {
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'status error' : 'status';
    setTimeout(() => { statusDiv.textContent = ''; }, 4000);
}

/**
 * SECTION 3: FILE HANDLING & RENDERING
 */
function handleNewFiles(files) {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
        showStatus('Only PDF files are allowed', true);
    }

    for (const newFile of pdfFiles) {
        // Avoid duplicates by name
        if (!selectedFiles.some(f => f.name === newFile.name)) {
            selectedFiles.push(newFile);
        }
    }
    renderFileList();
    updateUI();
}

function renderFileList() {
    if (selectedFiles.length === 0) {
        fileListDiv.innerHTML = '<div style="padding: 40px; color: #666; text-align: center; border: 2px dashed #222; border-radius: 10px;">Your PDF list is empty</div>';
        return;
    }
    
    fileListDiv.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.setAttribute('draggable', true);
        fileItem.setAttribute('data-index', index);
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="drag-handle">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
                <span>${file.name} <small>(${(file.size / 1024).toFixed(1)} KB)</small></span>
            </div>
            <button class="remove-btn" data-index="${index}">✕</button>
        `;
        
        fileItem.addEventListener('dragstart', handleDragStart);
        fileItem.addEventListener('dragover', handleDragOver);
        fileItem.addEventListener('drop', handleDrop);
        fileItem.addEventListener('dragend', handleDragEnd);
        
        fileListDiv.appendChild(fileItem);
    });

    // Re-attach individual remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            selectedFiles.splice(idx, 1);
            renderFileList();
            updateUI();
        };
    });
}

/**
 * SECTION 4: DRAG & DROP REORDERING
 */
let draggedItemIndex = null;

function handleDragStart(e) {
    draggedItemIndex = this.getAttribute('data-index');
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = this.getAttribute('data-index');
    if (draggedItemIndex !== targetIndex) {
        const movedItem = selectedFiles.splice(draggedItemIndex, 1)[0];
        selectedFiles.splice(targetIndex, 0, movedItem);
        renderFileList();
    }
}

function handleDragEnd() { this.style.opacity = '1'; }

/**
 * SECTION 5: EVENT LISTENERS
 */
fileInput.addEventListener('change', (e) => handleNewFiles(Array.from(e.target.files)));

document.body.addEventListener('dragover', (e) => { e.preventDefault(); document.body.style.backgroundColor = '#222'; });
document.body.addEventListener('dragleave', () => { document.body.style.backgroundColor = '#1a1a1a'; });
document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.style.backgroundColor = '#1a1a1a';
    handleNewFiles(Array.from(e.dataTransfer.files));
});

clearAllBtn?.addEventListener('click', () => {
    selectedFiles = [];
    renderFileList();
    updateUI();
});

/**
 * SECTION 6: THE MERGE ENGINE
 */
mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length < 2) return;

    if (logoIcon) logoIcon.classList.add('spinning');
    mergeBtn.disabled = true;
    mergeBtn.textContent = 'Merging...';
    
    try {
        const mergedPdf = await window.PDFLib.PDFDocument.create();
        
        for (const file of selectedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        
        // USE CUSTOM FILE NAME
        const customName = fileNameInput.value.trim() || 'merged-ninja';
        a.download = `${customName}.pdf`;
        a.click();
        
        showStatus('✅ Merge complete!');

        setTimeout(() => {
            selectedFiles = [];
            renderFileList();
            updateUI();
            mergeBtn.textContent = 'Merge PDFs';
            if (logoIcon) logoIcon.classList.remove('spinning');
        }, 2500);

    } catch (error) {
        console.error('MERGE ERROR:', error);
        showStatus('Error merging PDFs.', true);
        if (logoIcon) logoIcon.classList.remove('spinning');
        mergeBtn.disabled = false;
        mergeBtn.textContent = 'Merge PDFs';
    }
});

// Initial Run
updateUI();