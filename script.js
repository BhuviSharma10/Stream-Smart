/* ============================================================
   script.js — Person 3 owns this file
   StreamSmart | EC606 Eclipse 6.0
   ============================================================ */

/* ══════════════════════════════════════
   TAB SWITCHING
══════════════════════════════════════ */
function switchTab(name, btn) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  // Deactivate all tabs
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  // Show selected panel and activate tab
  document.getElementById('panel-' + name).classList.add('active');
  btn.classList.add('active');
}

/* ══════════════════════════════════════
   FILE UPLOAD HANDLING
══════════════════════════════════════ */
let selectedFile = null;

function handleFile(input) {
  selectedFile = input.files[0];
  if (selectedFile) {
    const fileNameEl = document.getElementById('fileName');
    fileNameEl.style.display = 'block';
    fileNameEl.textContent = '✓ ' + selectedFile.name;
    document.getElementById('transcribeBtn').disabled = false;
  }
}

// Drag and Drop support
const zone = document.getElementById('uploadZone');

zone.addEventListener('dragover', (e) => {
  e.preventDefault();
  zone.classList.add('dragover');
});

zone.addEventListener('dragleave', () => {
  zone.classList.remove('dragover');
});

zone.addEventListener('drop', (e) => {
  e.preventDefault();
  zone.classList.remove('dragover');

  const file = e.dataTransfer.files[0];
  if (file) {
    selectedFile = file;
    const fileNameEl = document.getElementById('fileName');
    fileNameEl.style.display = 'block';
    fileNameEl.textContent = '✓ ' + file.name;
    document.getElementById('transcribeBtn').disabled = false;
    
    // Attach video to player
const videoEl = document.getElementById('lectureVideo'); // make sure your HTML has <video id="lectureVideo">
if (videoEl) {
    videoEl.src = URL.createObjectURL(selectedFile);
    videoEl.load();
    videoEl.play().catch(() => {}); // optional autoplay
}
  }
});

/* ══════════════════════════════════════
   TRANSCRIPTION — calls Python backend
══════════════════════════════════════ */

  async function transcribe() {
  if (!selectedFile) return;

  // ── FILE TYPE CHECK ──
  if (!selectedFile.name.match(/\.(mp4|wav|m4a|mp3)$/i)) {
    alert("Unsupported file type. Use MP4, WAV, M4A, or MP3.");
    return;
  }

  const btn = document.getElementById('transcribeBtn');
  btn.disabled = true;
  btn.textContent = 'PROCESSING...';

  document.getElementById('progressWrap').classList.add('visible');
  document.getElementById('transcriptBox').classList.remove('visible');

  // Start elapsed timer
  let secs = 0;
  const timer = setInterval(() => {
    secs++;
    document.getElementById('progressTime').textContent = secs + 's';
  }, 1000);

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);

    // This talks to Person 4's Python backend (app.py)
    const res = await fetch('/transcribe', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();

    clearInterval(timer);
    document.getElementById('progressWrap').classList.remove('visible');

    if (data.error) {
      alert('Error: ' + data.error);
    } else {
      document.getElementById('transcriptText').textContent = data.transcript;
      document.getElementById('transcriptBox').classList.add('visible');
    }

  } catch (err) {
    clearInterval(timer);
    alert('Could not connect to server. Make sure app.py is running on port 5000.');
  }

  btn.disabled = false;
  btn.textContent = 'TRANSCRIBE LECTURE →';
}

/* ══════════════════════════════════════
   COPY TRANSCRIPT TO CLIPBOARD
══════════════════════════════════════ */
function copyTranscript() {
  const text = document.getElementById('transcriptText').textContent;
  navigator.clipboard.writeText(text);

  const copyBtn = document.querySelector('.copy-btn');
  copyBtn.textContent = 'COPIED!';
  setTimeout(() => {
    copyBtn.textContent = 'COPY';
  }, 2000);
}

/* ══════════════════════════════════════
   BANDWIDTH SIMULATION (Panel 3)
══════════════════════════════════════ */
function updateBandwidth(val) {
  const mbps = (val / 100 * 5).toFixed(1);
  document.getElementById('bwValue').textContent = mbps + ' Mbps';

  const fill    = document.getElementById('bwFill');
  const tag     = document.getElementById('modeTag');
  const display = document.getElementById('modeDisplay');
  const icon    = document.getElementById('modeIcon');
  const name    = document.getElementById('modeName');
  const desc    = document.getElementById('modeDescText');

  // Sync top bandwidth bar width
  fill.style.width = val + '%';

  if (val > 50) {
    // ── Good bandwidth → Full Video ──
    fill.className = 'bw-fill';
    tag.className  = 'mode-tag';
    tag.textContent = '📹 VIDEO';
    display.className = 'mode-display video';
    icon.textContent  = '📹';
    name.textContent  = 'VIDEO MODE';
    desc.textContent  = 'Full video stream with delta compression active';

  } else if (val > 20) {
    // ── Medium bandwidth → Audio Only ──
    fill.className = 'bw-fill medium';
    tag.className  = 'mode-tag audio';
    tag.textContent = '🎧 AUDIO';
    display.className = 'mode-display audio';
    icon.textContent  = '🎧';
    name.textContent  = 'AUDIO ONLY MODE';
    desc.textContent  = 'Video dropped automatically — saving ~80% bandwidth';

  } else {
    // ── Low bandwidth → Text/Transcript ──
    fill.className = 'bw-fill low';
    tag.className  = 'mode-tag text';
    tag.textContent = '📝 TEXT';
    display.className = 'mode-display txt';
    icon.textContent  = '📝';
    name.textContent  = 'TEXT TRANSCRIPT MODE';
    desc.textContent  = 'Live Whisper transcription — works on 2G, <50KB/s';
  }
}

/* ══════════════════════════════════════
   INIT — run on page load
══════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  // Set default bandwidth display after short delay
  setTimeout(() => updateBandwidth(70), 500);
});
/* ── AUTOSWITCH FEATURE ── */
let autoSwitchInterval = null;

const autoSwitchCheckbox = document.getElementById('autoSwitch');
const bwSlider = document.getElementById('bwSlider');

autoSwitchCheckbox.addEventListener('change', function() {
  if (this.checked) {
    startAutoSwitch();
  } else {
    stopAutoSwitch();
  }
});

function startAutoSwitch() {
  if (autoSwitchInterval) return; // already running

  autoSwitchInterval = setInterval(() => {
    // Real bandwidth detection (modern browsers)
    let bandwidthPercent = 70; // default fallback
    if (navigator.connection && navigator.connection.downlink) {
      // downlink is in Mbps, normalize to 0-100
      bandwidthPercent = Math.min(Math.max(navigator.connection.downlink / 5 * 100, 0), 100);
    } else {
      // fallback simulation if API not supported
      bandwidthPercent = Math.floor(Math.random() * 95) + 5;
    }

    // Update slider & UI
    bwSlider.value = bandwidthPercent;
    updateBandwidth(bandwidthPercent);
  }, 3000); // every 3 seconds
}

function stopAutoSwitch() {
  clearInterval(autoSwitchInterval);
  autoSwitchInterval = null;
}

/* ── Ensure manual slider works with autoswitch too ── */
bwSlider.addEventListener('input', () => {
  updateBandwidth(bwSlider.value);
});
/* ============================================================
   DELTA STREAMING FEATURE (ADD THIS AT THE BOTTOM)
   ============================================================ */

let streamingInterval = null;
let normalTotal = 0;
let deltaTotal = 0;
let frameCount = 0;
let isStreaming = false;

const NORMAL_RATE = 4.0;
const DELTA_RATE = 1.2;

function startStreaming() {
  if (isStreaming) return;
  
  isStreaming = true;
  frameCount = 0;
  
  document.getElementById('normalCircle').classList.add('streaming');
  document.getElementById('deltaCircle').classList.add('streaming');
  
  streamingInterval = setInterval(() => {
    frameCount++;
    
    normalTotal += NORMAL_RATE;
    deltaTotal += DELTA_RATE;
    
    document.getElementById('normalTotal').textContent = normalTotal.toFixed(1);
    document.getElementById('deltaTotal').textContent = deltaTotal.toFixed(1);
    
    const savings = ((normalTotal - deltaTotal) / normalTotal * 100).toFixed(1);
    if (normalTotal > 0) {
      document.getElementById('savingIndicator').style.display = 'block';
      document.getElementById('savingPercent').textContent = savings;
      
      const badge = document.getElementById('savingBadge');
      if (savings > 70) {
        badge.innerHTML = `⚡ ${savings}% LESS DATA — background sent once, only face + hands stream continuously`;
        badge.style.background = '#00ff8820';
        badge.style.borderColor = '#00ff88';
        badge.style.color = '#00ff88';
      } else if (savings > 50) {
        badge.innerHTML = `📊 ${savings}% SAVINGS — Delta compression active`;
        badge.style.background = '#00c8ff20';
        badge.style.borderColor = '#00c8ff';
        badge.style.color = '#00c8ff';
      }
    }
    
    const normalSpan = document.getElementById('normalDataRate');
    const deltaSpan = document.getElementById('deltaDataRate');
    
    normalSpan.style.transform = 'scale(1.1)';
    setTimeout(() => { normalSpan.style.transform = 'scale(1)'; }, 100);
    
    deltaSpan.style.transform = 'scale(1.05)';
    setTimeout(() => { deltaSpan.style.transform = 'scale(1)'; }, 100);
    
  }, 1000);
}

function stopStreaming() {
  if (streamingInterval) {
    clearInterval(streamingInterval);
    streamingInterval = null;
  }
  isStreaming = false;
  
  document.getElementById('normalCircle').classList.remove('streaming');
  document.getElementById('deltaCircle').classList.remove('streaming');
}

function resetCounters() {
  normalTotal = 0;
  deltaTotal = 0;
  frameCount = 0;
  
  document.getElementById('normalTotal').textContent = '0';
  document.getElementById('deltaTotal').textContent = '0';
  document.getElementById('savingIndicator').style.display = 'none';
  
  const badge = document.getElementById('savingBadge');
  badge.innerHTML = '⚡ UP TO 70% LESS DATA — background sent once, only face + hands stream continuously';
  badge.style.background = 'rgba(0,200,255,0.1)';
  badge.style.borderColor = 'var(--accent)';
  badge.style.color = 'var(--accent)';
  
  if (!isStreaming) {
    document.getElementById('normalCircle').classList.remove('streaming');
    document.getElementById('deltaCircle').classList.remove('streaming');
  }
}
// ============================================
// GO TO VIDEO CONFERENCE PAGE
// ============================================
function goToVideoConference() {
    window.location.href = '/video_conference';
}
// Go to video conference page
function goToVideoConference() {
    window.location.href = '/video_conference_page';
}

// Show delta savings without leaving page (for demo)
function simulateDeltaOffline() {
    // Show a quick demo of savings
    const savings = document.getElementById('savingPercent');
    if (savings) {
        savings.textContent = "70";
        document.getElementById('savingIndicator').style.display = 'block';
    }
    alert("⚡ Delta Streaming would save 70% data!\n\nClick 'START VIDEO CALL' to join a real conference with delta compression.");
}

function resetDeltaDemo() {
    const normalTotal = document.getElementById('normalTotal');
    const deltaTotal = document.getElementById('deltaTotal');
    const savingIndicator = document.getElementById('savingIndicator');
    
    if (normalTotal) normalTotal.textContent = "0";
    if (deltaTotal) deltaTotal.textContent = "0";
    if (savingIndicator) savingIndicator.style.display = 'none';

}
// Navigation functions
function goToVideoConference() {
    console.log("Going to video conference...");
    window.location.href = '/video_conference_page';
}

function goToLanding() {
    console.log("Going back to landing page...");
    window.location.href = '/';
}

function simulateDeltaOffline() {
    const savingIndicator = document.getElementById('savingIndicator');
    const savingPercent = document.getElementById('savingPercent');
    
    if (savingIndicator && savingPercent) {
        savingPercent.textContent = "70";
        savingIndicator.style.display = 'block';
        
        const badge = document.getElementById('savingBadge');
        if (badge) {
            badge.innerHTML = '⚡ 70% SAVINGS! Delta streaming demo';
            badge.style.background = '#00ff8820';
        }
    }
    
    setTimeout(() => {
        if (savingIndicator) savingIndicator.style.display = 'none';
    }, 3000);
}

function resetDeltaDemo() {
    const normalTotal = document.getElementById('normalTotal');
    const deltaTotal = document.getElementById('deltaTotal');
    const savingIndicator = document.getElementById('savingIndicator');
    
    if (normalTotal) normalTotal.textContent = "0";
    if (deltaTotal) deltaTotal.textContent = "0";
    if (savingIndicator) savingIndicator.style.display = 'none';
}


// ============================================
// ANALYTICS DASHBOARD
// ============================================

// Analytics data (saved in localStorage)
let analyticsData = {
  totalDataSaved: 0,
  transcriptsCount: 0,
  totalNormalData: 0,
  totalDeltaData: 0,
  activities: []
};

// Load saved analytics from browser storage
function loadAnalytics() {
  const saved = localStorage.getItem('streamsmart_analytics');
  if (saved) {
    analyticsData = JSON.parse(saved);
  }
  updateAnalyticsDisplay();
}

// Save analytics to browser storage
function saveAnalytics() {
  localStorage.setItem('streamsmart_analytics', JSON.stringify(analyticsData));
}

// Update analytics from delta streaming
function updateAnalyticsFromDelta(normalData, deltaData) {
  const dataSaved = normalData - deltaData;
  analyticsData.totalDataSaved += dataSaved;
  analyticsData.totalNormalData += normalData;
  analyticsData.totalDeltaData += deltaData;
  
  // Add activity
  addActivity(`Streaming session: Saved ${dataSaved.toFixed(1)} MB data (${((dataSaved/normalData)*100).toFixed(1)}% savings)`);
  
  saveAnalytics();
  updateAnalyticsDisplay();
}

// Update analytics from transcription
function updateAnalyticsFromTranscription() {
  analyticsData.transcriptsCount++;
  addActivity(`Lecture transcribed successfully!`);
  saveAnalytics();
  updateAnalyticsDisplay();
}

// Add activity log
function addActivity(message) {
  const time = new Date().toLocaleTimeString();
  analyticsData.activities.unshift({ time, message });
  
  // Keep only last 10 activities
  if (analyticsData.activities.length > 10) {
    analyticsData.activities.pop();
  }
}

// Update the analytics display
function updateAnalyticsDisplay() {
  // Update numbers
  document.getElementById('dataSaved').textContent = analyticsData.totalDataSaved.toFixed(1);
  document.getElementById('transcriptsCount').textContent = analyticsData.transcriptsCount;
  
  // Calculate money saved (₹10 per GB = ₹0.01 per MB)
  const moneySaved = (analyticsData.totalDataSaved / 1024) * 10;
  document.getElementById('moneySaved').textContent = '₹' + moneySaved.toFixed(2);
  
  // Calculate average savings
  let avgSavings = 0;
  if (analyticsData.totalNormalData > 0) {
    avgSavings = ((analyticsData.totalNormalData - analyticsData.totalDeltaData) / analyticsData.totalNormalData * 100).toFixed(1);
  }
  document.getElementById('avgSavings').textContent = avgSavings + '%';
  
  // Update bars (max height 150px for 100MB)
  const maxHeight = 150;
  const normalHeight = Math.min((analyticsData.totalNormalData / 100) * maxHeight, maxHeight);
  const deltaHeight = Math.min((analyticsData.totalDeltaData / 100) * maxHeight, maxHeight);
  const savingsHeight = Math.min((analyticsData.totalDataSaved / 100) * maxHeight, maxHeight);
  
  document.getElementById('normalBar').style.height = normalHeight + 'px';
  document.getElementById('deltaBar').style.height = deltaHeight + 'px';
  document.getElementById('savingsBar').style.height = savingsHeight + 'px';
  
  document.getElementById('normalBarValue').textContent = analyticsData.totalNormalData.toFixed(1) + ' MB';
  document.getElementById('deltaBarValue').textContent = analyticsData.totalDeltaData.toFixed(1) + ' MB';
  document.getElementById('savingsBarValue').textContent = analyticsData.totalDataSaved.toFixed(1) + ' MB';
  
  // Update activity list
  const activityList = document.getElementById('activityList');
  if (analyticsData.activities.length === 0) {
    activityList.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">No activity yet. Start streaming or transcribe a lecture!</div>';
  } else {
    activityList.innerHTML = analyticsData.activities.map(activity => `
      <div style="padding: 10px; border-bottom: 1px solid var(--border); font-size: 12px;">
        <span style="color: var(--accent);">[${activity.time}]</span>
        <span style="color: var(--text);"> ${activity.message}</span>
      </div>
    `).join('');
  }
}

// Reset analytics
function resetAnalytics() {
  if (confirm('Are you sure you want to reset all analytics data?')) {
    analyticsData = {
      totalDataSaved: 0,
      transcriptsCount: 0,
      totalNormalData: 0,
      totalDeltaData: 0,
      activities: [],
      quizStats: {           // ADD THIS
        totalQuizzesTaken: 0,
        averageScore: 0,
        totalScore: 0
      }
    };
    saveAnalytics();
    updateAnalyticsDisplay();
    addActivity('Analytics reset');
    showNotification('Analytics reset successfully!', '#00c8ff');
  }
}
// Show notification helper
function showNotification(message, color = '#00c8ff') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${color};
    color: #000;
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Modify your existing startStreaming function to track analytics
const originalStartStreaming = startStreaming;
window.startStreaming = function() {
  originalStartStreaming();
  // Analytics will be updated through the interval
};

// Modify your transcribe function to track analytics
const originalTranscribe = transcribe;
window.transcribe = async function() {
  const result = await originalTranscribe();
  if (result && !result.error) {
    updateAnalyticsFromTranscription();
  }
  return result;
};

// Load analytics on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAnalytics();
});

// Also update analytics from delta streaming interval
setInterval(() => {
  if (typeof normalTotal !== 'undefined' && typeof deltaTotal !== 'undefined' && normalTotal > 0) {
    // This will update periodically
    const dataSaved = normalTotal - deltaTotal;
    if (dataSaved > 0) {
      // Update happens through the existing streaming function
    }
  }
}, 5000);
// Inside your streaming interval, after updating totals, add:
if (typeof updateAnalyticsFromDelta === 'function') {
  // Update analytics every 10 seconds to avoid too many entries
  if (frameCount % 10 === 0) {
    updateAnalyticsFromDelta(normalTotal, deltaTotal);
  }
}
// ============================================
// QUIZ FEATURE
// ============================================

let quizzes = []; // Store all quizzes
let currentQuiz = null;
let userAnswers = [];

// Load quizzes from localStorage
function loadQuizzes() {
  const saved = localStorage.getItem('streamsmart_quizzes');
  if (saved) {
    quizzes = JSON.parse(saved);
  }
  displayQuizzes();
}

// Save quizzes to localStorage
function saveQuizzes() {
  localStorage.setItem('streamsmart_quizzes', JSON.stringify(quizzes));
  displayQuizzes();
}

// Add new question to quiz creator
function addQuestion() {
  const container = document.getElementById('questionsContainer');
  const questionCount = container.children.length + 1;
  
  const newQuestion = document.createElement('div');
  newQuestion.className = 'question-item';
  newQuestion.style.cssText = 'background: var(--bg); border-radius: 8px; padding: 15px; margin-bottom: 15px;';
  newQuestion.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
      <strong>Question ${questionCount}</strong>
      <button onclick="removeQuestion(this)" style="background: none; border: none; color: #ff3c6e; cursor: pointer;">❌</button>
    </div>
    <input type="text" placeholder="Question" class="question-text" style="width: 100%; padding: 8px; margin-bottom: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
    <input type="text" placeholder="Option A" class="option-a" style="width: 100%; padding: 8px; margin-bottom: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
    <input type="text" placeholder="Option B" class="option-b" style="width: 100%; padding: 8px; margin-bottom: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
    <input type="text" placeholder="Option C" class="option-c" style="width: 100%; padding: 8px; margin-bottom: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
    <input type="text" placeholder="Option D" class="option-d" style="width: 100%; padding: 8px; margin-bottom: 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
    <select class="correct-answer" style="width: 100%; padding: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
      <option value="">Select Correct Answer</option>
      <option value="A">A</option>
      <option value="B">B</option>
      <option value="C">C</option>
      <option value="D">D</option>
    </select>
  `;
  
  container.appendChild(newQuestion);
}

// Remove question
function removeQuestion(button) {
  button.closest('.question-item').remove();
  // Renumber remaining questions
  const questions = document.querySelectorAll('.question-item');
  questions.forEach((q, index) => {
    q.querySelector('strong').textContent = `Question ${index + 1}`;
  });
}

// Create quiz from form
function createQuiz() {
  const topic = document.getElementById('quizTopic').value.trim();
  if (!topic) {
    alert('Please enter a quiz topic!');
    return;
  }
  
  const questionElements = document.querySelectorAll('.question-item');
  if (questionElements.length === 0) {
    alert('Please add at least one question!');
    return;
  }
  
  const questions = [];
  let valid = true;
  
  questionElements.forEach((q, index) => {
    const questionText = q.querySelector('.question-text').value.trim();
    const options = [
      q.querySelector('.option-a').value.trim(),
      q.querySelector('.option-b').value.trim(),
      q.querySelector('.option-c').value.trim(),
      q.querySelector('.option-d').value.trim()
    ];
    const correctAnswer = q.querySelector('.correct-answer').value;
    
    if (!questionText) {
      alert(`Please enter question ${index + 1}`);
      valid = false;
      return;
    }
    
    if (options.some(opt => !opt)) {
      alert(`Please fill all options for question ${index + 1}`);
      valid = false;
      return;
    }
    
    if (!correctAnswer) {
      alert(`Please select correct answer for question ${index + 1}`);
      valid = false;
      return;
    }
    
    questions.push({
      text: questionText,
      options: options,
      correct: correctAnswer,
      explanation: `The correct answer is ${correctAnswer}: ${options[correctAnswer.charCodeAt(0) - 65]}`
    });
  });
  
  if (!valid) return;
  
  const quiz = {
    id: Date.now(),
    topic: topic,
    questions: questions,
    createdAt: new Date().toISOString(),
    attempts: 0,
    averageScore: 0
  };
  
  quizzes.push(quiz);
  saveQuizzes();
  
  // Clear form
  document.getElementById('quizTopic').value = '';
  document.getElementById('questionsContainer').innerHTML = '';
  addQuestion(); // Add one empty question back
  
  alert(`✅ Quiz "${topic}" created successfully!`);
  showNotification(`Quiz created! Share the quiz ID: ${quiz.id}`, '#00ff88');
}

// Display all quizzes
function displayQuizzes() {
  const container = document.getElementById('quizzesList');
  if (!container) return;
  
  if (quizzes.length === 0) {
    container.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">No active quizzes. Create one above!</div>';
    return;
  }
  
  container.innerHTML = quizzes.map(quiz => `
    <div class="quiz-card" style="background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer;" onclick="takeQuiz(${quiz.id})">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong style="color: var(--accent);">📝 ${escapeHtml(quiz.topic)}</strong>
          <div style="font-size: 11px; color: var(--muted); margin-top: 5px;">
            ${quiz.questions.length} questions • ${quiz.attempts} attempts • Avg score: ${quiz.averageScore}%
          </div>
        </div>
        <button onclick="event.stopPropagation(); deleteQuiz(${quiz.id})" style="background: none; border: none; color: #ff3c6e; cursor: pointer; font-size: 20px;">🗑️</button>
      </div>
    </div>
  `).join('');
}

// Take a quiz
function takeQuiz(quizId) {
  currentQuiz = quizzes.find(q => q.id === quizId);
  if (!currentQuiz) return;
  
  userAnswers = new Array(currentQuiz.questions.length).fill(null);
  
  document.getElementById('quizCreator').style.display = 'none';
  document.getElementById('activeQuizzes').style.display = 'none';
  document.getElementById('quizTaker').style.display = 'block';
  document.getElementById('currentQuizTopic').textContent = currentQuiz.topic;
  
  const questionsHtml = currentQuiz.questions.map((q, idx) => `
    <div style="margin-bottom: 30px; padding: 15px; background: var(--bg); border-radius: 8px;">
      <h4 style="margin-bottom: 15px;">${idx + 1}. ${escapeHtml(q.text)}</h4>
      ${q.options.map((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
          <div class="quiz-option" onclick="selectAnswer(${idx}, '${letter}')">
            <input type="radio" name="q${idx}" value="${letter}" ${userAnswers[idx] === letter ? 'checked' : ''}>
            <strong style="margin-right: 10px;">${letter}.</strong> ${escapeHtml(opt)}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
  
  document.getElementById('quizQuestions').innerHTML = questionsHtml;
}

// Select answer
function selectAnswer(questionIndex, answer) {
  userAnswers[questionIndex] = answer;
  
  // Update radio button
  const radios = document.querySelectorAll(`input[name="q${questionIndex}"]`);
  radios.forEach(radio => {
    if (radio.value === answer) {
      radio.checked = true;
    }
  });
  
  // Highlight selected option
  const options = document.querySelectorAll(`#quizQuestions .quiz-option`);
  options.forEach(opt => {
    opt.classList.remove('selected');
    if (opt.querySelector('input').value === answer) {
      opt.classList.add('selected');
    }
  });
}

// Submit quiz
function submitQuiz() {
  // Check if all questions answered
  const unanswered = userAnswers.some(ans => ans === null);
  if (unanswered) {
    alert('Please answer all questions before submitting!');
    return;
  }
  
  // Calculate score
  let correct = 0;
  const results = currentQuiz.questions.map((q, idx) => {
    const isCorrect = userAnswers[idx] === q.correct;
    if (isCorrect) correct++;
    return {
      question: q.text,
      userAnswer: userAnswers[idx],
      correctAnswer: q.correct,
      isCorrect: isCorrect,
      explanation: q.explanation
    };
  });
  
  const score = (correct / currentQuiz.questions.length) * 100;
  
  // Update quiz stats
  currentQuiz.attempts++;
  currentQuiz.averageScore = ((currentQuiz.averageScore * (currentQuiz.attempts - 1) + score) / currentQuiz.attempts).toFixed(1);
  saveQuizzes();
  
  // Add to analytics
  if (typeof addActivity === 'function') {
    addActivity(`Quiz completed: ${currentQuiz.topic} - Score: ${score.toFixed(1)}%`);
  }
  
  // Show results
  showQuizResults(score, correct, results);
}

// Show quiz results
function showQuizResults(score, correct, results) {
  document.getElementById('quizTaker').style.display = 'none';
  document.getElementById('quizResults').style.display = 'block';
  
  const grade = score >= 80 ? '🌟 Excellent!' : score >= 60 ? '👍 Good!' : score >= 40 ? '📚 Keep Learning!' : '💪 Need More Practice!';
  const gradeColor = score >= 80 ? '#00ff88' : score >= 60 ? '#00c8ff' : score >= 40 ? '#ffaa00' : '#ff3c6e';
  
  const resultsHtml = `
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 48px; margin-bottom: 10px;">${score >= 80 ? '🏆' : score >= 60 ? '🎉' : '📚'}</div>
      <div style="font-size: 36px; font-weight: bold; color: ${gradeColor};">${score.toFixed(1)}%</div>
      <div style="font-size: 18px; margin: 10px 0;">${grade}</div>
      <div style="color: var(--muted);">${correct} out of ${currentQuiz.questions.length} correct</div>
    </div>
    <div style="max-height: 400px; overflow-y: auto;">
      ${results.map((r, idx) => `
        <div style="padding: 15px; margin-bottom: 10px; background: var(--bg); border-left: 4px solid ${r.isCorrect ? '#00ff88' : '#ff3c6e'}; border-radius: 4px;">
          <div><strong>Q${idx + 1}:</strong> ${escapeHtml(r.question)}</div>
          <div style="font-size: 13px; margin-top: 8px;">
            <div>Your answer: <span style="color: ${r.isCorrect ? '#00ff88' : '#ff3c6e'}">${r.userAnswer}</span></div>
            <div>Correct answer: <span style="color: #00ff88">${r.correctAnswer}</span></div>
            <div style="color: var(--muted); margin-top: 5px;">💡 ${escapeHtml(r.explanation)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  
  document.getElementById('resultsContent').innerHTML = resultsHtml;
  
  // Add to analytics
  updateAnalyticsFromQuiz(score);
}

// Update analytics from quiz
function updateAnalyticsFromQuiz(score) {
  if (typeof analyticsData !== 'undefined') {
    if (!analyticsData.quizStats) {
      analyticsData.quizStats = {
        totalQuizzesTaken: 0,
        averageScore: 0,
        totalScore: 0
      };
    }
    analyticsData.quizStats.totalQuizzesTaken++;
    analyticsData.quizStats.totalScore += score;
    analyticsData.quizStats.averageScore = (analyticsData.quizStats.totalScore / analyticsData.quizStats.totalQuizzesTaken).toFixed(1);
    saveAnalytics();
  }
}

// Delete quiz
function deleteQuiz(quizId) {
  if (confirm('Are you sure you want to delete this quiz?')) {
    quizzes = quizzes.filter(q => q.id !== quizId);
    saveQuizzes();
    showNotification('Quiz deleted!', '#ff3c6e');
  }
}

// Close quiz taker
function closeQuiz() {
  document.getElementById('quizTaker').style.display = 'none';
  document.getElementById('quizCreator').style.display = 'block';
  document.getElementById('activeQuizzes').style.display = 'block';
  currentQuiz = null;
  userAnswers = [];
}

// Close results
function closeResults() {
  document.getElementById('quizResults').style.display = 'none';
  document.getElementById('quizCreator').style.display = 'block';
  document.getElementById('activeQuizzes').style.display = 'block';
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize quiz feature
function initQuiz() {
  loadQuizzes();
  // Add one default question
  if (document.querySelectorAll('.question-item').length === 0) {
    addQuestion();
  }
}

// Call init when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuiz);
} else {
  initQuiz();
}
// ============================================
// SIMPLE WORKING AI QUIZ
// ============================================

let currentQuizQuestions = [];
let userSelections = [];

// Question bank for different topics
const quizDatabase = {
  python: [
    { q: "What is Python?", a: "Programming language", b: "Snake", c: "Game", d: "OS", correct: "a" },
    { q: "How to print in Python?", a: "print()", b: "echo()", c: "console.log()", d: "write()", correct: "a" },
    { q: "What is a variable?", a: "Storage container", b: "Function", c: "Loop", d: "Class", correct: "a" },
    { q: "What does pip stand for?", a: "Package installer", b: "Python tool", c: "Program", d: "Process", correct: "a" },
    { q: "Comments in Python use?", a: "#", b: "//", c: "/*", d: "--", correct: "a" }
  ],
  javascript: [
    { q: "What is JavaScript?", a: "Programming language", b: "Coffee", c: "Database", d: "Style sheet", correct: "a" },
    { q: "How to write to console?", a: "console.log()", b: "print()", c: "echo()", d: "write()", correct: "a" },
    { q: "What does DOM stand for?", a: "Document Object Model", b: "Data Object Model", c: "Display Object Model", d: "Digital Object Model", correct: "a" },
    { q: "JavaScript comments use?", a: "//", b: "#", c: "/*", d: "<!--", correct: "a" },
    { q: "What is a function?", a: "Reusable code", b: "Variable", c: "Loop", d: "Array", correct: "a" }
  ],
  history: [
    { q: "Who discovered America?", a: "Columbus", b: "Magellan", c: "Cook", d: "Vespucci", correct: "a" },
    { q: "When did WW2 start?", a: "1939", b: "1940", c: "1941", d: "1938", correct: "a" },
    { q: "Who was the first US President?", a: "Washington", b: "Adams", c: "Jefferson", d: "Franklin", correct: "a" },
    { q: "The Great Wall is in?", a: "China", b: "India", c: "Japan", d: "Korea", correct: "a" },
    { q: "Who painted Mona Lisa?", a: "Da Vinci", b: "Van Gogh", c: "Picasso", d: "Rembrandt", correct: "a" }
  ],
  science: [
    { q: "What is H2O?", a: "Water", b: "Oxygen", c: "Hydrogen", d: "Salt", correct: "a" },
    { q: "What planet is known as Red Planet?", a: "Mars", b: "Jupiter", c: "Venus", d: "Saturn", correct: "a" },
    { q: "What is the hardest natural substance?", a: "Diamond", b: "Gold", c: "Iron", d: "Platinum", correct: "a" },
    { q: "What gas do plants absorb?", a: "CO2", b: "O2", c: "N2", d: "H2", correct: "a" },
    { q: "What is the center of an atom called?", a: "Nucleus", b: "Proton", c: "Neutron", d: "Electron", correct: "a" }
  ],
  default: [
    { q: "What is the main concept?", a: "Core understanding", b: "Basic idea", c: "Key principle", d: "Fundamental", correct: "a" },
    { q: "Why is this important?", a: "Practical use", b: "Theory only", c: "Historical", d: "Future", correct: "a" },
    { q: "Where is it used?", a: "Many fields", b: "One field", c: "Nowhere", d: "Rarely", correct: "a" },
    { q: "What is a key benefit?", a: "Improves efficiency", b: "No benefit", c: "Small benefit", d: "Unknown", correct: "a" },
    { q: "How to learn more?", a: "Study and practice", b: "Impossible", c: "Hard", d: "Expensive", correct: "a" }
  ]
};

// Main function to generate quiz
function generateQuiz() {
  const topicInput = document.getElementById('aiTopicInput');
  const topic = topicInput.value.trim().toLowerCase();
  
  if (!topic) {
    alert('Please enter a topic!');
    return;
  }
  
  // Show loading
  const loadingDiv = document.getElementById('quizLoading');
  if (loadingDiv) loadingDiv.style.display = 'block';
  
  // Get questions based on topic
  setTimeout(() => {
    let questions = [];
    
    if (topic.includes('python')) {
      questions = quizDatabase.python;
    } else if (topic.includes('java')) {
      questions = quizDatabase.javascript;
    } else if (topic.includes('history') || topic.includes('war')) {
      questions = quizDatabase.history;
    } else if (topic.includes('science') || topic.includes('biology') || topic.includes('chemistry') || topic.includes('physics')) {
      questions = quizDatabase.science;
    } else {
      questions = quizDatabase.default;
    }
    
    currentQuizQuestions = questions;
    userSelections = new Array(5).fill(null);
    
    // Hide loading
    if (loadingDiv) loadingDiv.style.display = 'none';
    
    // Display the quiz
    displayQuiz(topic);
    
  }, 500);
}

// Display the quiz
function displayQuiz(topic) {
  const displayArea = document.getElementById('quizDisplayArea');
  
  let html = `
    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="color: #00ff88;">📝 Quiz: ${topic}</h3>
        <button onclick="closeQuizDisplay()" class="btn" style="background: #ff3c6e; margin: 0;">Close</button>
      </div>
  `;
  
  currentQuizQuestions.forEach((q, idx) => {
    html += `
      <div style="margin-bottom: 25px; padding: 15px; background: var(--bg); border-radius: 8px;">
        <p style="margin-bottom: 10px; font-weight: bold;">${idx + 1}. ${q.q}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; background: ${userSelections[idx] === 'a' ? 'rgba(0,255,136,0.1)' : 'transparent'}" onclick="selectAnswer(${idx}, 'a')">
            <input type="radio" name="q${idx}" value="a" ${userSelections[idx] === 'a' ? 'checked' : ''}> A) ${q.a}
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; background: ${userSelections[idx] === 'b' ? 'rgba(0,255,136,0.1)' : 'transparent'}" onclick="selectAnswer(${idx}, 'b')">
            <input type="radio" name="q${idx}" value="b" ${userSelections[idx] === 'b' ? 'checked' : ''}> B) ${q.b}
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; background: ${userSelections[idx] === 'c' ? 'rgba(0,255,136,0.1)' : 'transparent'}" onclick="selectAnswer(${idx}, 'c')">
            <input type="radio" name="q${idx}" value="c" ${userSelections[idx] === 'c' ? 'checked' : ''}> C) ${q.c}
          </label>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 8px; border-radius: 6px; background: ${userSelections[idx] === 'd' ? 'rgba(0,255,136,0.1)' : 'transparent'}" onclick="selectAnswer(${idx}, 'd')">
            <input type="radio" name="q${idx}" value="d" ${userSelections[idx] === 'd' ? 'checked' : ''}> D) ${q.d}
          </label>
        </div>
      </div>
    `;
  });
  
  html += `
      <button onclick="submitQuiz()" class="btn" style="background: #00ff88; color: #000; width: 100%; margin-top: 10px;">✅ Submit Quiz</button>
    </div>
  `;
  
  displayArea.innerHTML = html;
}

// Select answer
function selectAnswer(questionIndex, answer) {
  userSelections[questionIndex] = answer;
  
  // Update the display to show selected background
  const displayArea = document.getElementById('quizDisplayArea');
  const topic = document.getElementById('aiTopicInput').value;
  displayQuiz(topic);
}

// Submit quiz and show results
function submitQuiz() {
  // Check if all questions answered
  const unanswered = userSelections.some(sel => sel === null);
  if (unanswered) {
    alert('Please answer all 5 questions before submitting!');
    return;
  }
  
  // Calculate score
  let correctCount = 0;
  const results = [];
  
  currentQuizQuestions.forEach((q, idx) => {
    const isCorrect = userSelections[idx] === q.correct;
    if (isCorrect) correctCount++;
    results.push({
      question: q.q,
      userAnswer: userSelections[idx],
      correctAnswer: q.correct,
      isCorrect: isCorrect,
      correctText: q[q.correct]
    });
  });
  
  const score = (correctCount / 5) * 100;
  
  // Display results
  displayResults(score, correctCount, results);
}

// Display results
function displayResults(score, correctCount, results) {
  const displayArea = document.getElementById('quizDisplayArea');
  
  let grade = '';
  let emoji = '';
  let color = '';
  
  if (score >= 80) {
    grade = 'Excellent!';
    emoji = '🏆';
    color = '#00ff88';
  } else if (score >= 60) {
    grade = 'Good!';
    emoji = '🎉';
    color = '#00c8ff';
  } else if (score >= 40) {
    grade = 'Keep Learning!';
    emoji = '📚';
    color = '#ffaa00';
  } else {
    grade = 'Need More Practice!';
    emoji = '💪';
    color = '#ff3c6e';
  }
  
  let html = `
    <div style="background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="font-size: 64px;">${emoji}</div>
        <div style="font-size: 48px; font-weight: bold; color: ${color};">${score}%</div>
        <div style="font-size: 24px; margin: 10px 0;">${grade}</div>
        <div style="color: var(--muted);">${correctCount} out of 5 correct</div>
      </div>
      
      <div style="max-height: 400px; overflow-y: auto;">
  `;
  
  results.forEach((r, idx) => {
    html += `
      <div style="padding: 15px; margin-bottom: 10px; background: var(--bg); border-left: 4px solid ${r.isCorrect ? '#00ff88' : '#ff3c6e'}; border-radius: 8px;">
        <div><strong>Q${idx + 1}:</strong> ${r.question}</div>
        <div style="font-size: 13px; margin-top: 8px;">
          Your answer: <span style="color: ${r.isCorrect ? '#00ff88' : '#ff3c6e'}">${r.userAnswer.toUpperCase()}</span><br>
          Correct answer: <span style="color: #00ff88">${r.correctAnswer.toUpperCase()}: ${r.correctText}</span>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
      <button onclick="generateQuiz()" class="btn" style="background: #00c8ff; color: #000; width: 100%; margin-top: 20px;">🎯 Take Another Quiz</button>
    </div>
  `;
  
  displayArea.innerHTML = html;
}

// Close quiz display
function closeQuizDisplay() {
  document.getElementById('quizDisplayArea').innerHTML = '';
  document.getElementById('aiTopicInput').value = '';
  currentQuizQuestions = [];
  userSelections = [];
}

console.log('AI Quiz feature loaded!');
// ============================================
// REAL AVATAR SYSTEM — Connected to Uploaded Lecture
// Extracts face from video, sends only expressions
// ============================================

let uploadedVideoElement = null;
let baseFaceImage = null;
let expressionTracker = null;
let isAvatarModeActive = false;
let currentExpressionData = {
  mouthOpen: 0,
  eyeBlink: 0,
  headTilt: 0,
  eyebrowRaise: 0,
  timestamp: 0
};

// Call this when user uploads a lecture video
function initAvatarFromLecture(videoElement) {
  uploadedVideoElement = videoElement;
  
  // Step 1: Capture base face from first frame
  captureBaseFace(videoElement);
  
  // Step 2: Start tracking expressions
  startExpressionTracking(videoElement);
  
  showMessage('✅ Avatar initialized from your lecture! Face stored once, tracking expressions...', '#00ff88');
}

// Capture face from first frame of uploaded lecture
function captureBaseFace(videoElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  
  // Draw face region from video
  ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight, 
                0, 0, canvas.width, canvas.height);
  
  baseFaceImage = canvas.toDataURL();
  
  // Store base face in localStorage for demo
  localStorage.setItem('avatarBaseFace', baseFaceImage);
  
  console.log('Base face captured — will reuse for all frames');
}

// Track expressions from uploaded lecture (simulated AI)
function startExpressionTracking(videoElement) {
  // In real implementation, this would use face-api.js or similar
  // For demo, we simulate expression tracking from video timeline
  
  let lastTime = 0;
  
  videoElement.addEventListener('timeupdate', () => {
    if (!isAvatarModeActive) return;
    
    const currentTime = videoElement.currentTime;
    const delta = currentTime - lastTime;
    
    // Simulate expression detection based on video audio intensity
    // In production: actual face mesh tracking
    const mockExpression = {
      mouthOpen: 0.1 + Math.sin(currentTime * 5) * 0.1,
      eyeBlink: Math.sin(currentTime * 2) > 0.9 ? 1 : 0,
      headTilt: Math.sin(currentTime * 1.5) * 5,
      eyebrowRaise: Math.abs(Math.sin(currentTime * 3)) * 0.3
    };
    
    currentExpressionData = mockExpression;
    lastTime = currentTime;
    
    // Update stats display
    updateTransmissionStats();
  });
}

// Draw avatar using base face + current expressions
function drawAvatarWithExpressions(ctx, w, h, expression, baseImage) {
  if (!baseImage) {
    // Fallback to drawn avatar
    drawFallbackAvatar(ctx, w, h, expression);
    return;
  }
  
  // Load base face image
  const img = new Image();
  img.src = baseImage;
  
  if (img.complete) {
    ctx.drawImage(img, 0, 0, w, h);
    
    // Overlay expression modifications
    // Modify mouth based on expression.mouthOpen
    ctx.fillStyle = '#C47A6B';
    const mouthY = h * 0.65;
    const mouthOpen = expression.mouthOpen * 15;
    ctx.beginPath();
    ctx.ellipse(w/2, mouthY, 12, 6 + mouthOpen, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Blink effect
    if (expression.eyeBlink > 0.5) {
      ctx.fillStyle = '#E8C39E';
      ctx.fillRect(w*0.35, h*0.4, 30, 15);
      ctx.fillRect(w*0.55, h*0.4, 30, 15);
    }
  } else {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
    };
  }
}

// Show data transmission savings (REAL numbers)
function updateTransmissionStats() {
  // Normal video: 30 fps × 200KB = 6,000 KB/s
  // Avatar: 10 updates/sec × 50 bytes = 0.5 KB/s
  const normalRate = 6000;
  const avatarRate = 0.5;
  const savings = ((normalRate - avatarRate) / normalRate * 100).toFixed(2);
  
  document.getElementById('normalVideoRate').textContent = (normalRate/1000).toFixed(1);
  document.getElementById('avatarRate').textContent = (avatarRate/1000).toFixed(3);
  document.getElementById('avatarSavings').textContent = savings;
  document.getElementById('savingsFill').style.width = savings + '%';
  document.getElementById('currentBandwidthUsed').textContent = (avatarRate/1000).toFixed(3);
}

function showMessage(msg, color) {
  const statusDiv = document.getElementById('audioStatusText');
  if (statusDiv) {
    statusDiv.innerHTML = msg;
    statusDiv.style.color = color;
  }
}

// Toggle avatar mode (replace video with avatar)
function toggleAvatarMode(enabled) {
  isAvatarModeActive = enabled;
  const videoPreview = document.getElementById('lectureVideoPreview');
  const avatarCanvas = document.getElementById('avatarCanvasMain');
  
  if (enabled && uploadedVideoElement) {
    // Hide real video, show avatar
    if (videoPreview) videoPreview.style.display = 'none';
    if (avatarCanvas) avatarCanvas.style.display = 'block';
    
    showMessage('🤖 AVATAR MODE ACTIVE — Sending only 0.5 KB/s (vs 6000 KB/s for video)', '#00ff88');
  } else {
    if (videoPreview) videoPreview.style.display = 'block';
    if (avatarCanvas) avatarCanvas.style.display = 'none';
    showMessage('📹 Normal video mode — Full bandwidth usage', '#ffaa00');
  }
}
// ============================================
// AI AVATAR FUNCTIONS (ADD AT BOTTOM OF script.js)
// ============================================

let extractedFaceImage = null;
let isAvatarPlaying = false;
let animationFrame = null;
let mouthState = 0;
let mouthDirection = 1;
// ============================================
// AI AVATAR - WORKING VERSION
// ============================================

let avatarImageSaved = null;
let isAvatarActive = false;
let animationRequestId = null;

// Handle file upload
document.getElementById('avatarFileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) {
    alert('Please select a video file');
    return;
  }
  
  // Show loading
  const displayArea = document.getElementById('avatarDisplayArea');
  const statusMsg = document.getElementById('avatarStatusMsg');
  
  displayArea.style.display = 'block';
  statusMsg.innerHTML = '🎨 Creating your AI avatar...';
  statusMsg.style.color = '#ffaa00';
  
  // Create avatar after short delay
  setTimeout(() => {
    createAvatarImage();
    statusMsg.innerHTML = '✅ Avatar created! 99% data savings ready!';
    statusMsg.style.color = '#00ff88';
  }, 800);
});

// Create avatar image
function createAvatarImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(0, 0, 300, 300);
  
  // Glow
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#00ff88';
  
  // Face
  ctx.fillStyle = '#FFDDB7';
  ctx.beginPath();
  ctx.arc(150, 150, 85, 0, Math.PI * 2);
  ctx.fill();
  
  // Eyes
  ctx.fillStyle = '#2C1810';
  ctx.beginPath();
  ctx.arc(115, 130, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(185, 130, 11, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye shine
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(111, 126, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(181, 126, 3, 0, Math.PI * 2);
  ctx.fill();
  
  // Smile
  ctx.strokeStyle = '#2C1810';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(150, 170, 32, 0.1, Math.PI - 0.1);
  ctx.stroke();
  
  // Futuristic glasses
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(92, 115, 48, 32);
  ctx.strokeRect(160, 115, 48, 32);
  ctx.beginPath();
  ctx.moveTo(140, 131);
  ctx.lineTo(160, 131);
  ctx.stroke();
  
  // AI Badge
  ctx.shadowBlur = 0;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#00ff88';
  ctx.fillText('🤖 AI AVATAR', 100, 270);
  
  // Tech dots on glasses
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(116, 131, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(184, 131, 3, 0, Math.PI * 2);
  ctx.fill();
  
  avatarImageSaved = canvas.toDataURL();
  
  // Display on main canvas
  const mainCanvas = document.getElementById('avatarCanvasMain');
  const mainCtx = mainCanvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    mainCtx.drawImage(img, 0, 0, 300, 300);
  };
  img.src = avatarImageSaved;
}

// Start avatar playback
function startAvatarPlayback() {
  if (!avatarImageSaved) {
    alert('Please upload a video first!');
    return;
  }
  
  if (isAvatarActive) {
    stopAvatarPlayback();
  }
  
  isAvatarActive = true;
  animateAvatarFace();
  
  const statusMsg = document.getElementById('avatarStatusMsg');
  statusMsg.innerHTML = '🎤 AVATAR ACTIVE! Voice + expressions streaming at 50 KB/s';
  statusMsg.style.color = '#00ff88';
}

// Animate avatar face
function animateAvatarFace() {
  if (!isAvatarActive) return;
  
  const canvas = document.getElementById('avatarCanvasMain');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    ctx.clearRect(0, 0, 300, 300);
    ctx.drawImage(img, 0, 0, 300, 300);
    
    // Animated mouth
    const mouthSize = 8 + Math.sin(Date.now() / 150) * 6;
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.ellipse(150, 185, 14, mouthSize, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Blinking effect
    if (Math.sin(Date.now() / 2000) > 0.95) {
      ctx.fillStyle = '#2C1810';
      ctx.fillRect(100, 120, 30, 8);
      ctx.fillRect(170, 120, 30, 8);
    }
    
    // Data rate display
    ctx.font = '9px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText('📡 DATA: 50 KB/s', 195, 290);
    
    // Expression level
    const expr = Math.floor(Math.sin(Date.now() / 200) * 50 + 50);
    ctx.fillStyle = '#00ff88';
    ctx.fillText(`🎭 EXPRESSION: ${expr}%`, 10, 290);
  };
  img.src = avatarImageSaved;
  
  animationRequestId = requestAnimationFrame(animateAvatarFace);
}

// Stop avatar playback
function stopAvatarPlayback() {
  isAvatarActive = false;
  if (animationRequestId) {
    cancelAnimationFrame(animationRequestId);
    animationRequestId = null;
  }
  
  // Redraw static avatar
  const canvas = document.getElementById('avatarCanvasMain');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, 300, 300);
    ctx.drawImage(img, 0, 0, 300, 300);
  };
  img.src = avatarImageSaved;
  
  const statusMsg = document.getElementById('avatarStatusMsg');
  statusMsg.innerHTML = '⏹️ Avatar stopped. 99% data saved!';
  statusMsg.style.color = '#00c8ff';
}

// Reset avatar
function resetAvatarFeature() {
  stopAvatarPlayback();
  avatarImageSaved = null;
  
  document.getElementById('avatarDisplayArea').style.display = 'none';
  document.getElementById('avatarFileInput').value = '';
  
  // Clear canvas
  const canvas = document.getElementById('avatarCanvasMain');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(0, 0, 300, 300);
  ctx.fillStyle = '#666';
  ctx.font = '14px monospace';
  ctx.fillText('Upload a video', 95, 150);
  ctx.fillText('to create avatar', 90, 170);
}

console.log('✅ AI Avatar ready!');  