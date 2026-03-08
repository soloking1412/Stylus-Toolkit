async function loadData() {
  try {
    const response = await fetch('/data.json');
    if (!response.ok) {
      throw new Error('Failed to load data');
    }
    return await response.json();
  } catch (error) {
    throw new Error(`Error loading data: ${error.message}`);
  }
}

function calculateStats(data) {
  if (data.length === 0) {
    return {
      totalProfiles: 0,
      avgSavings: 0,
      maxSavings: 0,
      contractsProfiled: 0
    };
  }

  const totalProfiles = data.length;
  const avgSavings = data.reduce((sum, r) => sum + r.tco.tcoPercentage, 0) / totalProfiles;
  const maxSavings = Math.max(...data.map(r => r.tco.tcoPercentage));
  const uniqueContracts = new Set(data.map(r => r.contractName));
  const contractsProfiled = uniqueContracts.size;

  return {
    totalProfiles,
    avgSavings: avgSavings.toFixed(2),
    maxSavings: maxSavings.toFixed(2),
    contractsProfiled
  };
}

function renderStats(stats) {
  const statsContainer = document.getElementById('stats');
  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Profiles</div>
      <div class="stat-value">${stats.totalProfiles}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Average TCO Savings</div>
      <div class="stat-value ${stats.avgSavings < 0 ? 'negative' : ''}">${stats.avgSavings}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Maximum Savings</div>
      <div class="stat-value">${stats.maxSavings}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Contracts Profiled</div>
      <div class="stat-value">${stats.contractsProfiled}</div>
    </div>
  `;
}

function renderCharts(data) {
  if (data.length === 0) {
    return;
  }

  // TCO Trend Chart
  const tcoCtx = document.getElementById('tcoChart').getContext('2d');
  new Chart(tcoCtx, {
    type: 'line',
    data: {
      labels: data.map(r => new Date(r.timestamp).toLocaleDateString()),
      datasets: [
        {
          label: 'Rust (Stylus) TCO',
          data: data.map(r => r.tco.rustTCO),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Solidity TCO',
          data: data.map(r => r.tco.solidityTCO),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        x: {
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8'
          }
        }
      }
    }
  });

  // Savings Percentage Chart
  const savingsCtx = document.getElementById('savingsChart').getContext('2d');
  new Chart(savingsCtx, {
    type: 'bar',
    data: {
      labels: data.map((r, i) => `${r.contractName} (${new Date(r.timestamp).toLocaleDateString()})`),
      datasets: [{
        label: 'TCO Savings %',
        data: data.map(r => r.tco.tcoPercentage),
        backgroundColor: data.map(r => r.tco.tcoPercentage >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
        borderColor: data.map(r => r.tco.tcoPercentage >= 0 ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return value + '%';
            }
          }
        },
        x: {
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            maxRotation: 45,
            minRotation: 45
          }
        }
      }
    }
  });

  // Costs Breakdown Chart
  const costsCtx = document.getElementById('costsChart').getContext('2d');
  const latestData = data[data.length - 1];

  new Chart(costsCtx, {
    type: 'bar',
    data: {
      labels: ['Deployment', 'Execution (100 calls)'],
      datasets: [
        {
          label: 'Rust (Stylus)',
          data: [
            latestData.rustProfile.deploymentGas,
            latestData.tco.rustTCO - latestData.rustProfile.deploymentGas
          ],
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 1
        },
        {
          label: 'Solidity',
          data: [
            latestData.solidityProfile.deploymentGas,
            latestData.tco.solidityTCO - latestData.solidityProfile.deploymentGas
          ],
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          labels: {
            color: '#e2e8f0'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            callback: function(value) {
              return value.toLocaleString() + ' gas';
            }
          }
        },
        x: {
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8'
          }
        }
      }
    }
  });
}

async function renderDashboard() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const dashboardEl = document.getElementById('dashboard');

  try {
    const data = await loadData();

    loadingEl.style.display = 'none';

    if (data.length === 0) {
      errorEl.style.display = 'block';
      document.getElementById('error-message').textContent = 'No profiling data available yet. Run "stylus-toolkit profile" to generate data.';
      return;
    }

    const stats = calculateStats(data);
    renderStats(stats);
    renderCharts(data);

    dashboardEl.style.display = 'block';
  } catch (error) {
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
    document.getElementById('error-message').textContent = error.message;
  }
}

renderDashboard();
