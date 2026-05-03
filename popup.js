// Store selected files
let selectedFiles = [];

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileListDiv = document.getElementById('fileList');
const mergeBtn = document.getElementById('mergeBtn');
const statusDiv = document.getElementById('status');

// Helper: Show status message
function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.className = isError ? 'status error' : 'status';
  setTimeout(() => {
    if (statusDiv.textContent === message) {
      statusDiv.textContent = '';
    }
  }, 3000);
}

// Helper: Display the list of selected files
function renderFileList() {
  if (selectedFiles.length === 0) {
    fileListDiv.innerHTML = '<div style="padding: 8px; color: #666; text-align: center;">No files selected</div>';
    return;
  }

  fileListDiv.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <span>${file.name} (${(file.size / 1024).toFixed(1)} KB)</span>
      <button class="remove-btn" data-index="${index}">✕</button>
    `;
    fileListDiv.appendChild(fileItem);
  });

  // Add remove event listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(btn.dataset.index);
      selectedFiles.splice(index, 1);
      renderFileList();
      fileInput.value = ''; // Clear input so same file can be reselected if needed
    });
  });
}

// Handle file selection
fileInput.addEventListener('change', (event) => {
  const files = Array.from(event.target.files);
  
  // Filter only PDF files
  const pdfFiles = files.filter(file => file.type === 'application/pdf');
  
  if (pdfFiles.length !== files.length) {
    showStatus('Only PDF files are allowed', true);
  }
  
  // Add new files to the list (avoid duplicates by name)
  for (const newFile of pdfFiles) {
    if (!selectedFiles.some(f => f.name === newFile.name)) {
      selectedFiles.push(newFile);
    }
  }
  
  renderFileList();
  fileInput.value = ''; // Clear input so same file can be selected again
});

// Merge PDFs
mergeBtn.addEventListener('click', async () => {
  if (selectedFiles.length < 2) {
    showStatus('Please select at least 2 PDF files to merge', true);
    return;
  }

  mergeBtn.disabled = true;
  mergeBtn.textContent = 'Merging...';
  showStatus('Merging PDFs, please wait...');

  try {
    // Create a new PDF document
    const mergedPdf = await window.PDFLib.PDFDocument.create();
    
    // Process each file in order
    for (const file of selectedFiles) {
      // Read file as ArrayBuffer
      const fileArrayBuffer = await file.arrayBuffer();
      
      // Load the PDF document
      const pdfDoc = await window.PDFLib.PDFDocument.load(fileArrayBuffer);
      
      // Copy all pages from this PDF to the merged document
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      for (const page of pages) {
        mergedPdf.addPage(page);
      }
    }
    
    // Save the merged PDF as bytes
    const mergedPdfBytes = await mergedPdf.save();
    
    // Create a blob and download
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'merged.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('✅ Merge complete! File downloaded.');
  } catch (error) {
    console.error('Merge error:', error);
    showStatus('Error merging PDFs. Check console for details.', true);
  } finally {
    mergeBtn.disabled = false;
    mergeBtn.textContent = 'Merge Selected PDFs';
  }
});