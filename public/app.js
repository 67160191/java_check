document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const submitBtn = document.getElementById('submit-btn');
    const selectedFileDiv = document.getElementById('selected-file');
    const fileNameSpan = document.getElementById('file-name');
    const removeFileBtn = document.getElementById('remove-file');

    const loadingState = document.getElementById('loading-state');
    const resultSection = document.getElementById('result-section');
    const uploadSection = document.querySelector('.upload-section');

    let currentFile = null;

    // Handle Drag and Drop
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Handle File Input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Handle File Selection
    function handleFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'pdf' && ext !== 'docx') {
            alert('รองรับเฉพาะไฟล์ .pdf และ .docx เท่านั้น');
            return;
        }

        currentFile = file;
        fileNameSpan.textContent = file.name;
        dropZone.classList.add('hidden');
        selectedFileDiv.classList.remove('hidden');
        submitBtn.disabled = false;
    }

    // Handle Remove File
    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropZone.classList.remove('hidden');
        selectedFileDiv.classList.add('hidden');
        submitBtn.disabled = true;
        resultSection.classList.add('hidden');
    });

    // Handle Submit
    submitBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        const formData = new FormData();
        formData.append('file', currentFile);

        // UI State update
        uploadSection.classList.add('hidden');
        loadingState.classList.remove('hidden');
        resultSection.classList.add('hidden');

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Upload failed');
            }

            const data = await response.json();
            displayResults(data);

        } catch (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
            uploadSection.classList.remove('hidden');
        } finally {
            loadingState.classList.add('hidden');
        }
    });

    // Display Results
    function displayResults(data) {
        uploadSection.classList.remove('hidden');
        resultSection.classList.remove('hidden');

        // Reset state
        dropZone.classList.remove('hidden');
        selectedFileDiv.classList.add('hidden');
        submitBtn.disabled = true;
        currentFile = null;
        fileInput.value = '';

        // Show model used
        if (data.modelUsed) {
            document.getElementById('model-name').textContent = data.modelUsed;
            document.getElementById('model-badge').classList.remove('hidden');
        }

        // Update score
        document.getElementById('score-value').textContent = data.totalScore;
        document.getElementById('score-max').textContent = data.maxScore;

        const incorrectList = document.getElementById('incorrect-list');
        incorrectList.innerHTML = '';

        if (data.incorrect.length === 0) {
            incorrectList.innerHTML = '<div class="incorrect-item"><p style="text-align: center; color: var(--accent);">เก่งมาก! ทำถูกทุกข้อเลย 🎉</p></div>';
            return;
        }

        data.incorrect.forEach(item => {
            const div = document.createElement('div');
            div.className = 'incorrect-item';

            div.innerHTML = `
                <div class="incorrect-header">
                    <span class="q-badge">ข้อที่ ${item.question} (ส่วนที่ ${item.part})</span>
                    <span style="color: var(--text-muted); font-size: 0.9rem;">${item.reason}</span>
                </div>
                <div class="comparison">
                    <div class="comparison-box expected">
                        <span>คำตอบที่ถูก</span>
                        <p>${escapeHtml(item.expected)}</p>
                    </div>
                    <div class="comparison-box actual">
                        <span>นักศึกษาตอบ</span>
                        <p>${escapeHtml(item.student)}</p>
                    </div>
                </div>
                <div class="ai-feedback">
                    <span class="ai-icon">🤖</span>
                    <div class="ai-text">
                        <strong>AI วิเคราะห์:</strong><br>
                        ${item.aiFeedback ? escapeHtml(item.aiFeedback).replace(/\\n/g, '<br>') : 'กำลังประมวลผล...'}
                    </div>
                </div>
            `;
            incorrectList.appendChild(div);
        });
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
