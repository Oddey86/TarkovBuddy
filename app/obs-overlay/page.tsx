<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Compact Kappa Progress Overlay</title>
  <style>
    :root {
      --bg-card: rgba(26, 29, 46, 0.95);
      --border: rgba(36, 40, 59, 0.8);
      --text-primary: #e8eaf6;
      --text-secondary: #8a8fa5;
      --primary-start: #6b73ff;
      --primary-end: #8a9aff;
      --bg-progress: #0e0f13;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: transparent;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
      overflow: hidden;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background-color: var(--bg-card);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 8px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      min-width: 250px;
      overflow: hidden;
    }
    .title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }
    .stats-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .count {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .progress-bar-wrapper {
      width: 128px;
      height: 8px;
      background-color: var(--bg-progress);
      border-radius: 999px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--primary-start), var(--primary-end));
      width: 0%;
      transition: width 0.5s ease-out;
      border-radius: 999px;
    }
    .percentage {
      font-size: 12px;
      color: var(--text-secondary);
      width: 40px;
      text-align: right;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    .container.updated {
      animation: pulse 0.4s ease;
    }
  </style>
</head>
<body>

  <div class="container" id="container">
    <div class="title">Kappa Progress</div>
    <div class="stats-row">
      <div class="count"><span id="completedValue">...</span>/<span id="totalValue">...</span></div>
      <div class="progress-bar-wrapper">
        <div class="progress-bar-fill" id="progressBarFill"></div>
      </div>
      <div class="percentage" id="progressValue">...%</div>
    </div>
  </div>

  <script>
    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyCiajU6SCyYOwuSpgX-xHtV4IDpftFve3g",
      authDomain: "tarkov-tracker-a1c31.firebaseapp.com",
      databaseURL: "https://tarkov-tracker-a1c31-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "tarkov-tracker-a1c31"
    };

    const params = new URLSearchParams(window.location.search);
    const USER_ID = params.get('user');

    if (!USER_ID) {
      document.body.innerHTML = '<div style="padding:20px;color:#ff6b6b;font-family:monospace;">ERROR: User ID missing</div>';
    }

    const REFRESH_INTERVAL = 2000;
    let lastProgressValue = null;

    function addPulseAnimation(element) {
      element.classList.add('updated');
      setTimeout(() => element.classList.remove('updated'), 400);
    }

    function updateStats(stats) {
      if (!stats) {
        document.getElementById('completedValue').textContent = '0';
        document.getElementById('totalValue').textContent = '0';
        document.getElementById('progressValue').textContent = '0.0%';
        document.getElementById('progressBarFill').style.width = '0%';
        return;
      }

      const totalTasks = stats.total || 0;
      const completedTasks = stats.completed || 0;
      const progress = parseFloat(stats.progress) || 0;
      
      document.getElementById('completedValue').textContent = completedTasks;
      document.getElementById('totalValue').textContent = totalTasks;
      document.getElementById('progressValue').textContent = progress.toFixed(1) + '%';
      document.getElementById('progressBarFill').style.width = progress + '%';
      
      if (lastProgressValue !== null && lastProgressValue !== progress) {
        addPulseAnimation(document.getElementById('container'));
      }
      
      lastProgressValue = progress;
    }

    async function fetchStats() {
      try {
        const url = `${FIREBASE_CONFIG.databaseURL}/users/${USER_ID}/stats.json?timestamp=${Date.now()}`;
        const response = await fetch(url, { cache: 'no-store' });
        
        if (response.ok) {
          const stats = await response.json();
          updateStats(stats);
        }
      } catch(e) {
        console.error('Error fetching from Firebase:', e);
      }
    }

    updateStats(null);
    fetchStats();
    setInterval(fetchStats, REFRESH_INTERVAL);
  </script>
</body>
</html>
