const express = require('express');
const app = express();
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const flash = require('connect-flash');
const User = require('./models/User');
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
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// Passport config
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (!user) return done(null, false, { message: 'Incorrect username.' });
  const valid = await user.isValidPassword(password);
  if (!valid) return done(null, false, { message: 'Incorrect password.' });
  return done(null, user);
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Auth middleware
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

// Redirect root to login if not authenticated, or to register if no users
app.get('/', async (req, res) => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    return res.redirect('/register');
  }
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  const vehicles = await Vehicle.find();
  res.render('index', { vehicles, user: req.user });
});

// Login page: if no users, redirect to register
app.get('/login', async (req, res, next) => {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    return res.redirect('/register');
  }
  if (req.isAuthenticated()) return res.redirect('/');
  next();
}, (req, res) => res.render('login', { message: req.flash('error') }));

// Register page: if users exist and logged in, redirect to home
app.get('/register', async (req, res, next) => {
  const userCount = await User.countDocuments();
  if (userCount > 0 && req.isAuthenticated()) return res.redirect('/');
  next();
}, (req, res) => res.render('register', { message: req.flash('error') }));
// Auth routes
app.post('/register', async (req, res) => {
  try {
    const { username, password, email, age } = req.body;
    await User.create({ username, password, email, age });
    res.redirect('/login');
  } catch (err) {
    req.flash('error', 'Username already exists');
    res.redirect('/register');
  }
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
  failureFlash: true
}));

app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login'));
});

// Vehicle routes (protected)
app.get('/vehicles/add', ensureAuthenticated, (req, res) => {
  res.render('add');
});

app.post('/vehicles', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const { vehicleName, price, desc, brand } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '';
  await Vehicle.create({ vehicleName, price, image, desc, brand });
  res.redirect('/');
});

app.get('/vehicles/:id/edit', ensureAuthenticated, async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).send('Not found');
  res.render('edit', { vehicle });
});

app.post('/vehicles/:id', ensureAuthenticated, upload.single('image'), async (req, res) => {
  const { vehicleName, price, desc, brand } = req.body;
  const updateData = { vehicleName, price, desc, brand };
  if (req.file) {
    updateData.image = '/uploads/' + req.file.filename;
  }
  await Vehicle.findByIdAndUpdate(req.params.id, updateData);
  res.redirect('/');
});

app.delete('/vehicles/:id', ensureAuthenticated, async (req, res) => {
  await Vehicle.findByIdAndDelete(req.params.id);
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});