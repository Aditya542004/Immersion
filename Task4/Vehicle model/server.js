const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PORT = 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/vehiclesdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Vehicle Schema
const vehicleSchema = new mongoose.Schema({
  vehicleName: String,
  price: String,
  image: String,
  desc: String,
  brand: String
});
const Vehicle = mongoose.model('Vehicle', vehicleSchema);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

// Home page - list all vehicles
app.get('/', async (req, res) => {
  const vehicles = await Vehicle.find();
  res.render('index', { vehicles });
});

// Show add vehicle form
app.get('/vehicles/add', (req, res) => {
  res.render('add');
});

// Add a new vehicle (with image upload)
app.post('/vehicles', upload.single('image'), async (req, res) => {
  const { vehicleName, price, desc, brand } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  await Vehicle.create({ vehicleName, price, image, desc, brand });
  res.redirect('/');
});

// Show edit vehicle form
app.get('/vehicles/:id/edit', async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).send('Not found');
  res.render('edit', { vehicle });
});

// Update a vehicle (with optional image upload)
app.post('/vehicles/:id', upload.single('image'), async (req, res) => {
  const { vehicleName, price, desc, brand } = req.body;
  const updateData = { vehicleName, price, desc, brand };
  if (req.file) {
    updateData.image = '/uploads/' + req.file.filename;
  }
  await Vehicle.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/');
});

// Delete a vehicle
app.delete('/vehicles/:id', async (req, res) => {
  await Vehicle.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});