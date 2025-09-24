const express = require("express");
const app = express();
const PORT = 4000;

app.use(express.json());

app.use(authMiddleware);


// Mock data: appointments with type
let appointments = [
  { id: 1, type: "Gym", name: "John Doe", date: "2025-09-25", time: "10:00" },
  { id: 2, type: "Pool", name: "Alice", date: "2025-09-25", time: "14:00" }
];

// Define slot timings per type
const slotConfig = {
  Gym: { start: 6, end: 22 },        // 6 AM – 10 PM
  Pool: { start: 8, end: 20 },       // 8 AM – 8 PM
  Recreation: { start: 9, end: 17 }  // 9 AM – 5 PM
};

// Helper: generate hourly slots
function generateSlots(startHour, endHour) {
  let slots = [];
  for (let h = startHour; h < endHour; h++) {
    const hourStr = h < 10 ? `0${h}` : `${h}`;
    slots.push(`${hourStr}:00`);
  }
  return slots;
}

// ✅ Get available slots by type and date
app.get("/slots/:type/:date", (req, res) => {
  const { type, date } = req.params;

  if (!slotConfig[type]) {
    return res.status(400).json({ error: "Invalid booking type" });
  }

  // All slots for this type
  const { start, end } = slotConfig[type];
  const allSlots = generateSlots(start, end);

  // Booked slots for this type & date
  const booked = appointments
    .filter(a => a.type === type && a.date === date)
    .map(a => a.time);

  // Only return free slots
  const availableSlots = allSlots.filter(time => !booked.includes(time));

  res.json({ type, date, slots: availableSlots });
});

// ✅ Book a new appointment
app.post("/appointments", (req, res) => {
  const { type, name, date, time } = req.body;

  if (!type || !name || !date || !time) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!slotConfig[type]) {
    return res.status(400).json({ error: "Invalid booking type" });
  }

  // Check if slot is already booked
  const exists = appointments.find(
    a => a.type === type && a.date === date && a.time === time
  );
  if (exists) {
    return res.status(400).json({ error: "Slot already booked" });
  }

  const newAppointment = {
    id: appointments.length + 1,
    type,
    name,
    date,
    time
  };

  appointments.push(newAppointment);
  res.status(201).json(newAppointment);
});

// ✅ Cancel appointment
app.delete("/appointments/:id", (req, res) => {
  const { id } = req.params;
  const index = appointments.findIndex(a => a.id == id);

  if (index === -1) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const cancelled = appointments.splice(index, 1);
  res.json({ message: `Appointment ${id} cancelled`, cancelled });
});

// ✅ Get all appointments (for debugging)
app.get("/appointments",(req, res) => {
  res.json(appointments);
});

app.listen(PORT, () => {
  console.log(`Mock booking server running at http://localhost:${PORT}`);
});

// ✅ Update appointment (reschedule)
app.put("/appointments/:id", (req, res) => {
  const { id } = req.params;
  const { type, name, date, time } = req.body;

  const appointment = appointments.find(a => a.id == id);
  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  if (!type || !name || !date || !time) {
    return res.status(400).json({ error: "Missing fields" });
  }
  if (!slotConfig[type]) {
    return res.status(400).json({ error: "Invalid booking type" });
  }

  // Check if slot already booked by another appointment
  const exists = appointments.find(
    a => a.id != id && a.type === type && a.date === date && a.time === time
  );
  if (exists) {
    return res.status(400).json({ error: "Slot already booked" });
  }

  // Update appointment details
  appointment.type = type;
  appointment.name = name;
  appointment.date = date;
  appointment.time = time;

  res.json({ message: `Appointment ${id} updated`, appointment });
});

// ✅ Get a single appointment by ID
app.get("/appointments/:id", (req, res) => {
  const { id } = req.params;
  const appointment = appointments.find(a => a.id == id);

  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  res.json(appointment);
});

function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  
  if (!authHeader) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.split(" ")[1]; // Expect "Bearer <token>"
  
  if (token !== "propertytesting") {
    return res.status(403).json({ error: "Invalid token" });
  }

  next(); // pass control to next route
}
