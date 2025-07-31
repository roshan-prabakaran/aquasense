import { Chart } from "@/components/ui/chart"
class AquaSenseApp {
  constructor() {
    this.chart = null
    this.updateInterval = null
    this.init()
  }

  init() {
    this.startDataUpdates()
    this.initChart()
    this.setupEventListeners()
  }

  setupEventListeners() {
    // Auto-refresh every 5 seconds
    this.updateInterval = setInterval(() => {
      this.fetchCurrentData()
    }, 5000)

    // Initial load
    this.fetchCurrentData()
    this.fetchHistoricalData()
  }

  async fetchCurrentData() {
    try {
      const response = await fetch("/api/current-data")
      const data = await response.json()

      this.updateParameters(data.data)
      this.updateAlerts(data.alerts)
      this.updateCartridges(data.cartridges)
      this.checkPendingDispensing(data.pending_dispensing)
      this.updateLastUpdated()
    } catch (error) {
      console.error("Error fetching current data:", error)
    }
  }

  async fetchHistoricalData() {
    try {
      const response = await fetch("/api/historical-data")
      const data = await response.json()
      this.updateChart(data)
    } catch (error) {
      console.error("Error fetching historical data:", error)
    }
  }

  updateParameters(data) {
    // Update pH
    document.getElementById("phValue").textContent = data.ph
    this.updateParameterStatus("ph", data.ph, 6.5, 8.0)

    // Update Dissolved Oxygen
    document.getElementById("oxygenValue").innerHTML = `${data.dissolved_oxygen} <span>mg/L</span>`
    this.updateParameterStatus("oxygen", data.dissolved_oxygen, 5.0, 10.0)

    // Update Ammonia
    document.getElementById("ammoniaValue").innerHTML = `${data.ammonia} <span>mg/L</span>`
    this.updateParameterStatus("ammonia", data.ammonia, 0, 0.5, true)

    // Update Temperature
    document.getElementById("temperatureValue").innerHTML = `${data.temperature} <span>°C</span>`
    this.updateParameterStatus("temperature", data.temperature, 22, 28)

    // Update Mineral Content
    document.getElementById("mineralValue").innerHTML = `${data.mineral_content} <span>%</span>`
    this.updateParameterStatus("mineral", data.mineral_content, 70, 95)
  }

  updateParameterStatus(parameter, value, min, max, reverse = false) {
    const statusElement = document.getElementById(`${parameter}Status`)
    const icon = statusElement.querySelector("i")

    let status = "good"
    if (reverse) {
      // For parameters where lower is better (like ammonia)
      if (value > max) {
        status = "critical"
      } else if (value > max * 0.8) {
        status = "warning"
      }
    } else {
      // For parameters where being in range is better
      if (value < min || value > max) {
        status = "critical"
      } else if (value < min * 1.1 || value > max * 0.9) {
        status = "warning"
      }
    }

    statusElement.className = `parameter-status ${status}`

    switch (status) {
      case "good":
        icon.className = "fas fa-check-circle"
        break
      case "warning":
        icon.className = "fas fa-exclamation-triangle"
        break
      case "critical":
        icon.className = "fas fa-times-circle"
        break
    }
  }

  updateAlerts(alerts) {
    const alertsList = document.getElementById("alertsList")
    const alertBanner = document.getElementById("alertBanner")

    if (alerts.length === 0) {
      alertsList.innerHTML = `
                <div class="no-alerts">
                    <i class="fas fa-check-circle"></i>
                    <p>No recent alerts. System running normally.</p>
                </div>
            `
      alertBanner.style.display = "none"
    } else {
      // Show banner for critical alerts
      const criticalAlert = alerts.find((alert) => alert.type === "critical")
      if (criticalAlert) {
        document.getElementById("alertTitle").textContent = `${criticalAlert.parameter} Alert`
        document.getElementById("alertMessage").textContent = criticalAlert.message
        alertBanner.style.display = "block"
      }

      // Update alerts list
      alertsList.innerHTML = alerts
        .map(
          (alert) => `
                <div class="alert-item ${alert.type}">
                    <div class="alert-icon">
                        <i class="fas fa-${alert.type === "critical" ? "exclamation-circle" : "exclamation-triangle"}"></i>
                    </div>
                    <div class="alert-details">
                        <h4>${alert.parameter}: ${alert.value}</h4>
                        <p>${alert.message}</p>
                        <div class="alert-recommendation" onclick="requestDispensing('${alert.mineral_needed}', '${alert.message}')">
                            ${alert.recommendation}
                        </div>
                    </div>
                    <div class="alert-time">${alert.timestamp}</div>
                </div>
            `,
        )
        .join("")
    }
  }

  updateCartridges(cartridges) {
    Object.keys(cartridges).forEach((mineral) => {
      const level = cartridges[mineral].level
      const levelElement = document.getElementById(`${mineral}Level`)
      const levelTextElement = document.getElementById(`${mineral}LevelText`)

      if (levelElement && levelTextElement) {
        levelElement.style.width = `${level}%`
        levelTextElement.textContent = `${level}%`

        // Update color based on level
        if (level < 20) {
          levelElement.style.background = "linear-gradient(90deg, #ef4444, #dc2626)"
        } else if (level < 50) {
          levelElement.style.background = "linear-gradient(90deg, #f59e0b, #d97706)"
        } else {
          levelElement.style.background = "linear-gradient(90deg, #10b981, #059669)"
        }
      }
    })
  }

  checkPendingDispensing(pendingDispensing) {
    if (pendingDispensing) {
      this.showDispensingModal(pendingDispensing)
    }
  }

  updateLastUpdated() {
    const now = new Date()
    const timeString = now.toLocaleTimeString()
    document.getElementById("lastUpdated").textContent = `Last updated: ${timeString}`
  }

  initChart() {
    const ctx = document.getElementById("trendsChart").getContext("2d")
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "pH",
            data: [],
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.1)",
            tension: 0.4,
          },
          {
            label: "Dissolved Oxygen (mg/L)",
            data: [],
            borderColor: "#06b6d4",
            backgroundColor: "rgba(6, 182, 212, 0.1)",
            tension: 0.4,
          },
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
    })
  }

  updateChart(historicalData) {
    const labels = historicalData.map((item) => {
      const date = new Date(item.timestamp)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    })

    this.chart.data.labels = labels
    this.chart.data.datasets[0].data = historicalData.map((item) => item.ph)
    this.chart.data.datasets[1].data = historicalData.map((item) => item.dissolved_oxygen)
    this.chart.data.datasets[2].data = historicalData.map((item) => item.temperature)

    this.chart.update()
  }

  showDispensingModal(dispensingData) {
    document.getElementById("dispensingMineral").textContent = this.formatMineralName(dispensingData.mineral)
    document.getElementById("dispensingReason").textContent = dispensingData.reason
    document.getElementById("dispensingTime").textContent = dispensingData.timestamp

    document.getElementById("dispensingModal").classList.add("active")
    document.getElementById("overlay").classList.add("active")
  }

  formatMineralName(mineral) {
    return mineral.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  startDataUpdates() {
    // This method can be used to start real-time updates
    console.log("Data updates started")
  }
}

// Global functions for UI interactions
async function requestDispensing(mineral, reason) {
  try {
    const response = await fetch("/api/request-dispensing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mineral, reason }),
    })

    const result = await response.json()
    if (result.status === "success") {
      // The modal will be shown automatically on next data update
      console.log("Dispensing request created")
    }
  } catch (error) {
    console.error("Error requesting dispensing:", error)
  }
}

async function approveDispensing() {
  try {
    const response = await fetch("/api/approve-dispensing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()
    if (result.status === "success") {
      closeModal()
      showNotification("Mineral dispensed successfully!", "success")
    }
  } catch (error) {
    console.error("Error approving dispensing:", error)
  }
}

async function cancelDispensing() {
  try {
    const response = await fetch("/api/cancel-dispensing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()
    if (result.status === "success") {
      closeModal()
      showNotification("Dispensing request cancelled", "info")
    }
  } catch (error) {
    console.error("Error cancelling dispensing:", error)
  }
}

function closeModal() {
  document.getElementById("dispensingModal").classList.remove("active")
  document.getElementById("overlay").classList.remove("active")
}

function closeAlert() {
  document.getElementById("alertBanner").style.display = "none"
}

function showNotification(message, type) {
  // Create a simple notification
  const notification = document.createElement("div")
  notification.className = `notification ${type}`
  notification.textContent = message
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `

  if (type === "success") {
    notification.style.background = "linear-gradient(135deg, #10b981, #059669)"
  } else if (type === "info") {
    notification.style.background = "linear-gradient(135deg, #3b82f6, #1d4ed8)"
  }

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 3000)
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new AquaSenseApp()
})

// Add CSS for notification animation
const style = document.createElement("style")
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`
document.head.appendChild(style)
