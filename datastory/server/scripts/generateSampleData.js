const fs = require('fs');
const path = require('path');

const SAMPLE_DIR = path.join(__dirname, '../../sample-datasets');
if (!fs.existsSync(SAMPLE_DIR)) {
  fs.mkdirSync(SAMPLE_DIR, { recursive: true });
}

// Helper to format Date YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Generate Date Array from Jan 1, 2024 to Dec 31, 2025
function generateDateRange(count) {
  const start = new Date('2024-01-01').getTime();
  const end = new Date('2025-12-31').getTime();
  const dates = [];
  for (let i = 0; i < count; i++) {
    const randomTime = start + (i / count) * (end - start) + (Math.random() * 86400000 * 0.5);
    dates.push(formatDate(new Date(randomTime)));
  }
  return dates.sort();
}

// 1. Campus Attendance (500 rows)
function generateCampusAttendance() {
  const dates = generateDateRange(500);
  const departments = ['Computer Science', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Business Admin'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const rows = ['date,department,year,students_present,students_absent,total_strength'];

  dates.forEach((date, i) => {
    const department = departments[i % departments.length];
    const year = years[i % years.length];
    const total_strength = Math.floor(120 + Math.random() * 80); // 120-200
    // Attendance rate ~ 75% to 98%
    const rate = 0.75 + Math.random() * 0.23;
    const students_present = Math.floor(total_strength * rate);
    const students_absent = total_strength - students_present;

    rows.push(`${date},"${department}","${year}",${students_present},${students_absent},${total_strength}`);
  });

  const filePath = path.join(SAMPLE_DIR, 'Campus Attendance.csv');
  fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
  console.log(`Generated ${filePath} (500 rows)`);
}

// 2. City Transport (500 rows)
function generateCityTransport() {
  const dates = generateDateRange(500);
  const routes = [
    'Route 101 - Downtown Express',
    'Route 204 - Metro Circle',
    'Route 305 - Airport Shuttle',
    'Route 408 - Suburban Link'
  ];
  const timeSlots = ['Morning', 'Afternoon', 'Evening'];

  const rows = ['date,route_name,bus_id,passengers,revenue,delay_minutes,time_slot'];

  dates.forEach((date, i) => {
    const route_name = routes[i % routes.length];
    const bus_id = `BUS-${1000 + (i % 35)}`;
    const time_slot = timeSlots[i % timeSlots.length];
    
    // Rush hour factor
    const isPeak = time_slot === 'Morning' || time_slot === 'Evening';
    const passengers = Math.floor((isPeak ? 180 : 90) + Math.random() * 120);
    const ticketPrice = 2.5 + (i % 3) * 0.75;
    const revenue = parseFloat((passengers * ticketPrice).toFixed(2));
    const delay_minutes = Math.max(0, Math.floor((isPeak ? 8 : 2) + Math.sin(i) * 12 + Math.random() * 10));

    rows.push(`${date},"${route_name}","${bus_id}",${passengers},${revenue},${delay_minutes},"${time_slot}"`);
  });

  const filePath = path.join(SAMPLE_DIR, 'City Transport.csv');
  fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
  console.log(`Generated ${filePath} (500 rows)`);
}

// 3. Energy Consumption (500 rows)
function generateEnergyConsumption() {
  const dates = generateDateRange(500);
  const buildings = ['Tech Tower A', 'Innovation Lab', 'Science Block B', 'Admin HQ', 'Student Center'];
  const floors = ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5'];

  const rows = ['date,building_name,floor,kwh_used,peak_hour_usage,solar_generated,temperature_celsius'];

  dates.forEach((date, i) => {
    const building_name = buildings[i % buildings.length];
    const floor = floors[i % floors.length];
    const month = new Date(date).getMonth(); // 0-11
    
    // Summer/Winter HVAC load
    const temp_celsius = parseFloat((18 + Math.sin((month / 12) * Math.PI * 2) * 12 + (Math.random() * 4 - 2)).toFixed(1));
    const hvacLoad = Math.abs(temp_celsius - 21) * 35;
    
    const kwh_used = Math.floor(350 + hvacLoad + Math.random() * 300);
    const peak_hour_usage = Math.floor(kwh_used * (0.35 + Math.random() * 0.25));
    // Solar generation (higher in summer months May-Aug)
    const solarFactor = Math.max(0.1, Math.sin((month / 12) * Math.PI));
    const solar_generated = Math.floor(solarFactor * 180 + Math.random() * 60);

    rows.push(`${date},"${building_name}","${floor}",${kwh_used},${peak_hour_usage},${solar_generated},${temp_celsius}`);
  });

  const filePath = path.join(SAMPLE_DIR, 'Energy Consumption.csv');
  fs.writeFileSync(filePath, rows.join('\n'), 'utf8');
  console.log(`Generated ${filePath} (500 rows)`);
}

function main() {
  console.log('Generating 3 sample datasets...');
  generateCampusAttendance();
  generateCityTransport();
  generateEnergyConsumption();
  console.log('Sample datasets generated successfully.');
}

main();
