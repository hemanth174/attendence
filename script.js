 document.addEventListener('DOMContentLoaded', () => {
            // --- Common Elements ---
            const form = document.getElementById('attendanceForm');
            const dateInput = document.getElementById('date');
            const sessionSelect = document.getElementById('session');
            const totalStrengthInput = document.getElementById('totalStrength');
            const presentInput = document.getElementById('present');
            const absentInput = document.getElementById('absent');
            const headCountInput = document.getElementById('headCount');
            const sectionInput = document.getElementById('section');
            const notesTextarea = document.getElementById('notes');

            // --- Gemini AI Feature Elements ---
            const aiFeatureSection = document.getElementById('ai-feature-section');
            const generateReportNoteBtn = document.getElementById('generateReportNoteBtn');
            const draftFacultyMessageBtn = document.getElementById('draftFacultyMessageBtn');
            const aiLoader = document.getElementById('ai-loader');
            const aiOutputSection = document.getElementById('ai-output-section');
            const aiSummaryOutput = document.getElementById('aiSummaryOutput');
            const aiActionBtn = document.getElementById('aiActionBtn');
            const toastNotification = document.getElementById('toast-notification');

            // --- Tab Switching Logic ---
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabPanels = document.querySelectorAll('.tab-panel');

            function switchTab(tabId) {
                tabButtons.forEach(button => button.classList.toggle('active', button.dataset.tab === tabId));
                tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabId));
            }
            tabButtons.forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
            switchTab('manual');

            // --- Initialize Date and Session ---
            function initializeDateTime() {
                const today = new Date();
                const day = String(today.getDate()).padStart(2, '0');
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();
                dateInput.value = `${day}-${month}-${year}`;
                sessionSelect.value = (today.getHours() >= 13) ? 'Second half (Afternoon)' : 'First half (Forenoon)';
            }
            initializeDateTime();

            // --- Function to Calculate Absent Count and Toggle AI button ---
            const updateFormState = () => {
                const total = parseInt(totalStrengthInput.value, 10) || 0;
                const present = parseInt(presentInput.value, 10) || 0;
                const headCount = parseInt(headCountInput.value, 10) || 0;

                absentInput.value = (total >= present) ? total - present : '';

                if (total > 0 && present > 0 && headCount > 0) {
                    aiFeatureSection.classList.remove('hidden');
                } else {
                    aiFeatureSection.classList.add('hidden');
                }
            };
            [totalStrengthInput, presentInput, headCountInput].forEach(input => input.addEventListener('input', updateFormState));
            updateFormState();
            
            // --- Core Message Sending Function ---
            function sendWhatsAppMessage() {
                const section = sectionInput.value;
                const date = dateInput.value;
                const session = sessionSelect.value;
                const totalStrength = totalStrengthInput.value;
                const present = presentInput.value;
                const absent = absentInput.value;
                const headCount = headCountInput.value;
                const notes = notesTextarea.value.trim();

                if (!section || !totalStrength || !present || !headCount) {
                    alert('Please fill in all required fields before sending.');
                    return false;
                }
                
                let message = `📋Attendance Report – ${section}\n \n`;
                message += `📅Date: ${date}\n \n`;
                message += `🕘Session: ${session}\n \n`;
                message += `👥Total Strength: ${totalStrength}\n \n`;
                message += `✅Present: ${present}\n \n`;
                message += `🚫Absent: ${absent}\n \n`;
                message += `🔢Head Count Taken: ${headCount}\n \n`;
                if (notes) {
                    message += `\n\n📝 *NOTE:*\n${notes}`;
                }

                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
                window.open(whatsappUrl, '_blank');
                return true;
            }

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                sendWhatsAppMessage();
            });

            // --- AUTOMATION FEATURES ---
            const sheetUrlInput = document.getElementById('sheetUrl');
            const fetchDataBtn = document.getElementById('fetchData');
            const sendTimeInput = document.getElementById('sendTime');
            const scheduleSendBtn = document.getElementById('scheduleSend');
            const statusDiv = document.getElementById('status');
            const statusColumnInput = document.getElementById('statusColumn');
            const presentKeywordInput = document.getElementById('presentKeyword');
            
            let scheduledTimeoutId = null;
            let countdownIntervalId = null;

            fetchDataBtn.addEventListener('click', async () => {
                const url = sheetUrlInput.value.trim();
                if (!url) return alert('Please provide a Google Sheet CSV link.');

                const statusColumn = parseInt(statusColumnInput.value, 10);
                const presentKeyword = presentKeywordInput.value.trim().toLowerCase();

                if (isNaN(statusColumn) || statusColumn < 1) {
                    return alert('Please enter a valid column number for the status.');
                }
                if (!presentKeyword) {
                    return alert("Please enter the keyword for 'Present'.");
                }
                
                fetchDataBtn.textContent = 'Fetching...';
                fetchDataBtn.disabled = true;
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                
                try {
                    const response = await fetch(proxyUrl);
                    if (!response.ok) throw new Error('Network response was not ok.');
                    const csvText = await response.text();
                    
                    const rows = csvText.trim().split('\n').slice(1).filter(row => row.trim() !== '');

                    if (rows.length === 0) {
                        throw new Error("No data found in the sheet. It might be empty or formatted incorrectly.");
                    }

                    const totalStrength = rows.length;
                    const presentCount = rows.filter(row => {
                        const columns = row.split(',');
                        if (columns.length >= statusColumn) {
                            const status = (columns[statusColumn - 1] || '').trim().toLowerCase();
                            return status === presentKeyword;
                        }
                        return false;
                    }).length;

                    totalStrengthInput.value = totalStrength;
                    presentInput.value = presentCount;
                    updateFormState();
                    alert('Data fetched and fields populated successfully!');
                    switchTab('manual');
                } catch (error) {
                    console.error('Fetch Error:', error);
                    alert('Failed to fetch or parse data.\n\nTroubleshooting Tips:\n1. Ensure the link is from "File > Share > Publish to web" as a CSV.\n2. Verify the sheet is public.\n3. Check that the "Status Column" number is correct.');
                } finally {
                    fetchDataBtn.textContent = 'Fetch & Fill Data';
                    fetchDataBtn.disabled = false;
                }
            });

            function clearSchedule() {
                if (scheduledTimeoutId) clearTimeout(scheduledTimeoutId);
                if (countdownIntervalId) clearInterval(countdownIntervalId);
                scheduledTimeoutId = null;
                countdownIntervalId = null;
                statusDiv.innerHTML = 'Schedule a time to see status here.';
                scheduleSendBtn.textContent = 'Schedule Automatic Send';
                scheduleSendBtn.classList.replace('bg-red-600', 'bg-green-600');
                scheduleSendBtn.classList.replace('hover:bg-red-700', 'hover:bg-green-700');
            }

            scheduleSendBtn.addEventListener('click', () => {
                if (scheduledTimeoutId) {
                    clearSchedule();
                    return;
                }

                const sendTime = sendTimeInput.value;
                if (!sendTime) {
                    alert('Please select a time to schedule the message.');
                    return;
                }

                const [hours, minutes] = sendTime.split(':');
                const now = new Date();
                let targetTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

                if (targetTime <= now) {
                    targetTime.setDate(targetTime.getDate() + 1);
                }

                const delay = targetTime - now;
                
                scheduledTimeoutId = setTimeout(() => {
                    sendWhatsAppMessage();
                    clearSchedule();
                }, delay);

                scheduleSendBtn.textContent = 'Cancel Scheduled Send';
                scheduleSendBtn.classList.replace('bg-green-600', 'bg-red-600');
                scheduleSendBtn.classList.replace('hover:bg-green-700', 'hover:bg-red-700');

                const updateCountdown = () => {
                    const remaining = targetTime - new Date();
                    if (remaining <= 0) {
                        clearInterval(countdownIntervalId);
                        statusDiv.innerHTML = 'Sending now...';
                        return;
                    }
                    const totalSeconds = Math.floor(remaining / 1000);
                    const days = Math.floor(totalSeconds / 86400);
                    const hours = Math.floor((totalSeconds % 86400) / 3600);
                    const mins = Math.floor((totalSeconds % 3600) / 60);
                    const secs = totalSeconds % 60;

                    let countdownText = 'Sending in ';
                    if (days > 0) countdownText += `${days}d `;
                    if (hours > 0 || days > 0) countdownText += `${hours}h `;
                    countdownText += `${mins}m ${secs}s`;

                    const scheduledDay = targetTime.toDateString() === new Date().toDateString() ? 'today' : 'tomorrow';
                    statusDiv.innerHTML = `Scheduled for <b>${sendTime} ${scheduledDay}</b>.<br>${countdownText}`;
                };
                
                updateCountdown();
                countdownIntervalId = setInterval(updateCountdown, 1000);
            });
            
            // --- GEMINI API INTEGRATION ---
            
            // Reusable function to call Gemini API
            async function callGemini(systemPrompt, userQuery, button) {
                aiLoader.classList.remove('hidden');
                button.disabled = true;
                draftFacultyMessageBtn.disabled = true; // Disable both buttons
                generateReportNoteBtn.disabled = true;

                const apiKey = "AIzaSyAwH3dapx9yhlmastD5xLuYaNI0yutLXOA";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: userQuery }] }],
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                        })
                    });
                    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
                    const result = await response.json();
                    const candidate = result.candidates?.[0];
                    if (candidate && candidate.content?.parts?.[0]?.text) {
                        aiSummaryOutput.value = candidate.content.parts[0].text;
                        aiOutputSection.classList.remove('hidden');
                    } else {
                        throw new Error('No content received from AI.');
                    }
                } catch (error) {
                    console.error('Gemini API Error:', error);
                    aiSummaryOutput.value = `Error generating content: ${error.message}. Please try again.`;
                    aiOutputSection.classList.remove('hidden');
                } finally {
                    aiLoader.classList.add('hidden');
                    button.disabled = false;
                    draftFacultyMessageBtn.disabled = false;
                    generateReportNoteBtn.disabled = false;
                }
            }
            
            // 1. Generate Report Note Feature
            generateReportNoteBtn.addEventListener('click', async () => {
                const total = totalStrengthInput.value;
                const present = presentInput.value;
                const absent = absentInput.value;
                const headCount = headCountInput.value;
                const notes = notesTextarea.value.trim();
                
                const systemPrompt = `You are an academic assistant helping a class representative (CR) write a clear and professional note for an attendance report. Your tone should be formal, concise, and helpful. Analyze the provided data for any discrepancies.`;
                const userQuery = `
                    Based on the following attendance data, please draft a summary note.
                    - Total Strength: ${total}
                    - Present in class: ${present}
                    - Absent: ${absent}
                    - Final Head Count Taken in class: ${headCount}
                    - Existing notes from CR: "${notes || 'None'}"

                    1.  Summarize the situation clearly.
                    2.  Critically check if "Present" count matches "Final Head Count". 
                    3.  If there is a discrepancy, politely highlight it and suggest a reason (e.g., "This may include students on other duties..."). 
                    4.  If there are no discrepancies, provide a clean summary.
                    5.  Incorporate the CR's existing notes.
                    6.  Keep the entire response to 2-3 short sentences.`;
                
                aiActionBtn.textContent = 'Append to Main Note';
                await callGemini(systemPrompt, userQuery, generateReportNoteBtn);
            });

            // 2. Draft Faculty Message Feature
            draftFacultyMessageBtn.addEventListener('click', async () => {
                const section = sectionInput.value;
                const total = totalStrengthInput.value;
                const present = presentInput.value;
                const absent = absentInput.value;

                const systemPrompt = `You are an academic assistant helping a class representative (CR) draft a professional, concise message to a faculty member about class attendance.`;
                const userQuery = `
                    Please draft a brief message to a faculty advisor based on this attendance report:
                    - Section: ${section}
                    - Total Strength: ${total}
                    - Present: ${present}
                    - Absent: ${absent}

                    The message should be formal and to the point.
                    - If attendance is low (less than 75% present), express this concern politely.
                    - If attendance is high, mention it positively.
                    - Address the message as "Respected Sir/Ma'am," and sign off as "Regards,\nClass Representative,\n${section}".`;
                
                aiActionBtn.textContent = 'Copy Message';
                await callGemini(systemPrompt, userQuery, draftFacultyMessageBtn);
            });

            function showToast(message) {
                toastNotification.textContent = message;
                toastNotification.classList.remove('opacity-0', 'translate-y-10');
                setTimeout(() => {
                    toastNotification.classList.add('opacity-0', 'translate-y-10');
                }, 2500);
            }

            aiActionBtn.addEventListener('click', () => {
                const action = aiActionBtn.textContent;
                const aiText = aiSummaryOutput.value;

                if (action === 'Append to Main Note' && aiText) {
                    const existingNotes = notesTextarea.value.trim();
                    notesTextarea.value = existingNotes ? `${aiText}\n\nOriginal Note: ${existingNotes}` : aiText;
                    showToast('Note appended!');
                } else if (action === 'Copy Message' && aiText) {
                    navigator.clipboard.writeText(aiText).then(() => {
                        showToast('Message copied to clipboard!');
                    }).catch(err => {
                        console.error('Clipboard copy failed:', err);
                        showToast('Failed to copy.');
                    });
                }
                aiOutputSection.classList.add('hidden'); 
            });

        });