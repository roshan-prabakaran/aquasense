from flask import Flask, render_template, jsonify, request
import random
import time
from datetime import datetime, timedelta
import json
import os
app = Flask(__name__)

# Simulated sensor data and system state
class AquaSenseSystem:
    def __init__(self):
        self.current_data = {
            'ph': 7.2,
            'dissolved_oxygen': 6.5,
            'ammonia': 0.3,
            'temperature': 24.5,
            'mineral_content': 85
        }
        self.alerts = []
        self.mineral_cartridges = {
            'lime': {'level': 85, 'unit': '%'},
            'oxygen_tablets': {'level': 72, 'unit': '%'},
            'ph_buffer': {'level': 91, 'unit': '%'},
            'ammonia_neutralizer': {'level': 68, 'unit': '%'}
        }
        self.pending_dispensing = None
        self.historical_data = self.generate_historical_data()
    
    def generate_historical_data(self):
        data = []
        now = datetime.now()
        for i in range(24):  # Last 24 hours
            timestamp = now - timedelta(hours=i)
            data.append({
                'timestamp': timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'ph': round(7.0 + random.uniform(-0.5, 0.5), 1),
                'dissolved_oxygen': round(6.0 + random.uniform(-1.0, 2.0), 1),
                'ammonia': round(0.2 + random.uniform(0, 0.3), 2),
                'temperature': round(24.0 + random.uniform(-2, 3), 1),
                'mineral_content': round(80 + random.uniform(-10, 15))
            })
        return list(reversed(data))
    
    def update_sensors(self):
        # Simulate sensor readings with some variation
        self.current_data['ph'] += random.uniform(-0.1, 0.1)
        self.current_data['dissolved_oxygen'] += random.uniform(-0.2, 0.2)
        self.current_data['ammonia'] += random.uniform(-0.05, 0.05)
        self.current_data['temperature'] += random.uniform(-0.3, 0.3)
        self.current_data['mineral_content'] += random.uniform(-2, 2)
        
        # Keep values in realistic ranges
        self.current_data['ph'] = max(6.0, min(8.5, self.current_data['ph']))
        self.current_data['dissolved_oxygen'] = max(3.0, min(10.0, self.current_data['dissolved_oxygen']))
        self.current_data['ammonia'] = max(0.0, min(1.0, self.current_data['ammonia']))
        self.current_data['temperature'] = max(20.0, min(30.0, self.current_data['temperature']))
        self.current_data['mineral_content'] = max(60, min(100, self.current_data['mineral_content']))
        
        # Round values
        for key in self.current_data:
            if key == 'ammonia':
                self.current_data[key] = round(self.current_data[key], 2)
            else:
                self.current_data[key] = round(self.current_data[key], 1)
        
        self.check_alerts()
    
    def check_alerts(self):
        new_alerts = []
        
        # Check pH levels
        if self.current_data['ph'] < 6.5:
            new_alerts.append({
                'type': 'critical',
                'parameter': 'pH',
                'value': self.current_data['ph'],
                'message': 'pH too low - Risk of fish stress',
                'recommendation': 'Add lime to increase pH',
                'mineral_needed': 'lime',
                'timestamp': datetime.now().strftime('%H:%M:%S')
            })
        elif self.current_data['ph'] > 8.0:
            new_alerts.append({
                'type': 'critical',
                'parameter': 'pH',
                'value': self.current_data['ph'],
                'message': 'pH too high - Risk of fish stress',
                'recommendation': 'Add pH buffer to stabilize',
                'mineral_needed': 'ph_buffer',
                'timestamp': datetime.now().strftime('%H:%M:%S')
            })
        
        # Check dissolved oxygen
        if self.current_data['dissolved_oxygen'] < 5.0:
            new_alerts.append({
                'type': 'critical',
                'parameter': 'Dissolved Oxygen',
                'value': self.current_data['dissolved_oxygen'],
                'message': 'Low oxygen levels - Fish may suffocate',
                'recommendation': 'Add oxygen tablets immediately',
                'mineral_needed': 'oxygen_tablets',
                'timestamp': datetime.now().strftime('%H:%M:%S')
            })
        
        # Check ammonia levels
        if self.current_data['ammonia'] > 0.5:
            new_alerts.append({
                'type': 'warning',
                'parameter': 'Ammonia',
                'value': self.current_data['ammonia'],
                'message': 'High ammonia levels detected',
                'recommendation': 'Add ammonia neutralizer',
                'mineral_needed': 'ammonia_neutralizer',
                'timestamp': datetime.now().strftime('%H:%M:%S')
            })
        
        # Add new alerts to the list (keep only last 10)
        self.alerts.extend(new_alerts)
        self.alerts = self.alerts[-10:]

# Initialize system
aquasense = AquaSenseSystem()

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/current-data')
def get_current_data():
    aquasense.update_sensors()
    return jsonify({
        'data': aquasense.current_data,
        'alerts': aquasense.alerts,
        'cartridges': aquasense.mineral_cartridges,
        'pending_dispensing': aquasense.pending_dispensing
    })

@app.route('/api/historical-data')
def get_historical_data():
    return jsonify(aquasense.historical_data)

@app.route('/api/request-dispensing', methods=['POST'])
def request_dispensing():
    data = request.json
    mineral = data.get('mineral')
    reason = data.get('reason')
    
    aquasense.pending_dispensing = {
        'mineral': mineral,
        'reason': reason,
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'amount': '50ml'  # Default amount
    }
    
    return jsonify({'status': 'success', 'message': 'Dispensing request created'})

@app.route('/api/approve-dispensing', methods=['POST'])
def approve_dispensing():
    if aquasense.pending_dispensing:
        mineral = aquasense.pending_dispensing['mineral']
        # Simulate dispensing - reduce cartridge level
        if mineral in aquasense.mineral_cartridges:
            aquasense.mineral_cartridges[mineral]['level'] -= random.randint(5, 15)
            aquasense.mineral_cartridges[mineral]['level'] = max(0, aquasense.mineral_cartridges[mineral]['level'])
        
        aquasense.pending_dispensing = None
        return jsonify({'status': 'success', 'message': 'Mineral dispensed successfully'})
    
    return jsonify({'status': 'error', 'message': 'No pending dispensing request'})

@app.route('/api/cancel-dispensing', methods=['POST'])
def cancel_dispensing():
    aquasense.pending_dispensing = None
    return jsonify({'status': 'success', 'message': 'Dispensing request cancelled'})

import os

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))  # fallback to 5000 locally
    app.run(host='0.0.0.0', port=port)

