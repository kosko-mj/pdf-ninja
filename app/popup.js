const extpay = ExtPay('pdf-ninja-v2');

/**
 * SECTION 1: PAYMENT & ACCESS CONTROL
 * Checks if the user has paid and toggles the UI
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
 * SECTION 2: FILE SELECTION & DRAG-AND-DROP
 * Manages how files get into the app
 */
let selectedFiles = [];
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const statusDiv = document.getElementById('status');

// Handle click-to-upload
fileInput.addEventListener('change', (event) => {
    handleNewFiles(Array.from(event.target.files));
    fileInput.value = ''; // Reset so the same file can be added again if deleted
});

// Handle Drag-and-Drop
document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.style.backgroundColor = '#222'; 
});

document.body.addEventListener('dragleave', () => {
    document.body.style.backgroundColor = '#1a1a1a';
});

document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.style.backgroundColor = '#1a1a1a';
    handleNewFiles(Array.from(e.dataTransfer.files));
});

/**
 * SECTION 3: UI RENDERING
 */
function handleNewFiles(files) {
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== files.length) {
        showStatus('Only PDF files are allowed', true);
    }
    for (const newFile of pdfFiles) {
        if (!selectedFiles.some(f => f.name === newFile.name)) {
            selectedFiles.push(newFile);
        }
    }
    renderFileList();
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
        fileItem.setAttribute('draggable', true); // Make the row draggable
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
        
        // Drag Events
        fileItem.addEventListener('dragstart', handleDragStart);
        fileItem.addEventListener('dragover', handleDragOver);
        fileItem.addEventListener('drop', handleDrop);
        fileItem.addEventListener('dragend', handleDragEnd);
        
        fileListDiv.appendChild(fileItem);
    });

    // Re-attach remove listeners
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedFiles.splice(parseInt(btn.dataset.index), 1);
            renderFileList();
        });
    });
}

// DRAG & DROP REORDER LOGIC
let draggedItemIndex = null;

function handleDragStart(e) {
    draggedItemIndex = this.getAttribute('data-index');
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    const targetIndex = this.getAttribute('data-index');
    
    if (draggedItemIndex !== targetIndex) {
        // Remove the dragged item from its old position
        const movedItem = selectedFiles.splice(draggedItemIndex, 1)[0];
        // Insert it into the new position
        selectedFiles.splice(targetIndex, 0, movedItem);
        renderFileList();
    }
}

function handleDragEnd() {
    this.style.opacity = '1';
}

function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? 'status error' : 'status';
    setTimeout(() => { statusDiv.textContent = ''; }, 4000);
}

/**
 * SECTION 4: THE MERGE ENGINE
 * The actual PDF-Lib logic
 */
mergeBtn.addEventListener('click', async () => {
    if (selectedFiles.length < 2) {
        showStatus('Please select at least 2 PDF files to merge', true);
        return;
    }

    mergeBtn.disabled = true;
    mergeBtn.textContent = 'Merging...';
    
    try {
        const mergedPdf = await window.PDFLib.PDFDocument.create();
        
        for (const file of selectedFiles) {
            const arrayBuffer = await file.arrayBuffer();
            // Load with encryption bypass for stability
            const pdfDoc = await window.PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        // Trigger Download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged-ninja.pdf';
        a.click();
        
        showStatus('✅ Merge complete! Your file is downloading.');
    } catch (error) {
        console.error('MERGE ERROR:', error);
        showStatus('Error merging PDFs. Check the console for details.', true);
    } finally {
        mergeBtn.disabled = false;
        mergeBtn.textContent = 'Merge Selected PDFs';
    }
});