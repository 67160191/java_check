document.addEventListener('DOMContentLoaded', () => {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const fileNameText = document.getElementById('file-name');
    const removeBtn = document.getElementById('remove-file-btn');
    const submitBtn = document.getElementById('submit-btn');
    const spinner = document.getElementById('spinner');
    const btnText = submitBtn.querySelector('span');

    const resultSection = document.getElementById('result-section');
    const scoreValue = document.getElementById('score-value');
    const mistakesContainer = document.getElementById('mistakes-container');

    let currentFile = null;

    // --- Drag and Drop Logic ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => {
            dropArea.classList.remove('drag-over');
        }, false);
    });

    dropArea.addEventListener('drop', (e) => {
        let dt = e.dataTransfer;
        let files = dt.files;
        handleFiles(files);
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const validTypes = [
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword'
            ];

            if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx')) {
                currentFile = file;
                fileNameText.textContent = file.name;
                dropArea.style.display = 'none';
                fileNameDisplay.classList.remove('hidden');
                submitBtn.disabled = false;
                resultSection.classList.add('hidden'); // hide previous results
            } else {
                alert('กรุณาอัปโหลดไฟล์ PDF หรือ DOCX เท่านั้น');
            }
        }
    }

    removeBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        dropArea.style.display = 'block';
        fileNameDisplay.classList.add('hidden');
        submitBtn.disabled = true;
    });

    // --- API Call Logic ---
    submitBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        const formData = new FormData();
        formData.append('document', currentFile);

        // UI Loading State
        submitBtn.disabled = true;
        btnText.textContent = 'กำลังประมวลผล...';
        spinner.classList.remove('hidden');
        resultSection.classList.add('hidden');

        try {
            const response = await fetch('/api/grade', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                const detailMsg = errorData.details ? `\nรายละเอียด: ${errorData.details}` : '';
                throw new Error((errorData.error || 'เกิดข้อผิดพลาดในการตรวจ') + detailMsg);
            }

            const result = await response.json();
            displayResult(result);

        } catch (error) {
            alert(`ข้อผิดพลาด: ${error.message}`);
        } finally {
            // Restore UI State
            submitBtn.disabled = false;
            btnText.textContent = 'เริ่มตรวจงาน';
            spinner.classList.add('hidden');
        }
    });

    function displayResult(result) {
        // Update basic info
        scoreValue.innerHTML = result.score ? result.score.replace('/', ' <span class="score-divider">/</span> ') : '- / -';
        // summaryText.textContent = result.summary || 'ไม่มีบทสรุป';

        // Clear previous mistakes
        mistakesContainer.innerHTML = '';
        
        const wrongSummaryContainer = document.getElementById('wrong-summary-container');
        const wrongSummaryText = document.getElementById('wrong-summary-text');

        if (!result.mistakes || result.mistakes.length === 0) {
            const perfectEl = document.createElement('div');
            perfectEl.className = 'perfect-score';
            perfectEl.innerHTML = '<h3>🎉 ยอดเยี่ยม! ไม่พบข้อผิดพลาดในงานนี้</h3>';
            mistakesContainer.appendChild(perfectEl);
            document.getElementById('mistakes-header').style.display = 'none';
            wrongSummaryContainer.classList.add('hidden');
        } else {
            document.getElementById('mistakes-header').style.display = 'block';
            result.mistakes.forEach((mistake, index) => {
                const card = document.createElement('div');
                card.className = 'mistake-card fade-in';
                card.style.animationDelay = `${index * 0.15}s`;

                card.innerHTML = `
                    <div class="mistake-header">
                        <span class="question-badge">ข้อที่ ${index + 1}</span>
                        <span class="question-title">${mistake.question || 'ไม่ระบุโจทย์'}</span>
                    </div>
                    
                    <div class="answers-grid">
                        <div class="answer-box">
                            <span class="box-label">คำตอบที่ถูก</span>
                            <div class="box-content">${mistake.correct_answer || '-'}</div>
                        </div>
                        <div class="answer-box">
                            <span class="box-label">นักศึกษาตอบ</span>
                            <div class="box-content">${mistake.student_answer || '-'}</div>
                        </div>
                    </div>
                    
                    <div class="ai-analysis">
                        <div class="ai-icon">🤖</div>
                        <div class="ai-text">
                            <strong>AI วิเคราะห์:</strong>
                            <p>${mistake.explanation || '-'}</p>
                        </div>
                    </div>
                `;
                mistakesContainer.appendChild(card);
            });
            
            if (result.wrong_summary) {
                wrongSummaryText.textContent = result.wrong_summary;
                wrongSummaryContainer.classList.remove('hidden');
            } else {
                wrongSummaryContainer.classList.add('hidden');
            }
        }

        // Show result section
        resultSection.classList.remove('hidden');

        // Scroll to result
        setTimeout(() => {
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
});
