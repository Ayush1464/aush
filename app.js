const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session'); // Import express-session
const multer = require('multer');


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, 'uploads/pdfs'); // PDF upload folder
        } else if (file.mimetype.startsWith('video/')) {
            cb(null, 'uploads/videos'); // Video upload folder
        } else {
            cb(new Error('Unsupported file type'), false);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer middleware for handling file uploads
const upload = multer({ storage: storage });

require('dotenv').config();

const app = express();

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Set up session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Change this to a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// MySQL connection setup
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'oms',
});

// Connect to the MySQL database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
    } else {
        console.log('Connected to MySQL Database');
    }
});

// Serve the login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve the signup page
app.get('/adminsignup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_signup.html'));
});

// Serve the admin login page
app.get('/adminlogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Serve the user signup page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle user signup form submission
app.post('/signup', (req, res) => {
    const { username, password, email } = req.body;

    // Hash the password before storing it
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ message: 'Error creating user' });
        }

        const sql = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hash, email], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ message: 'Database query error' });
            }

            // User created successfully, redirect to login page
            res.redirect('/login');
        });
    });
});

// Handle admin signup form submission
app.post('/adminsignup', (req, res) => {
    const { username, password, email } = req.body;

    // Hash the password before storing it
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ message: 'Error creating admin' });
        }

        const sql = 'INSERT INTO admins (username, password, email) VALUES (?, ?, ?)';
        db.query(sql, [username, hash, email], (err, results) => {
            if (err) {
                console.error('Database query error:', err);
                return res.status(500).json({ message: 'Database query error' });
            }

            // Admin created successfully, redirect to login page
            res.redirect('/adminlogin');
        });
    });
});

// Handle user login form submission
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('Attempting to login with username:', username);

    const sql = 'SELECT * FROM users WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }

        console.log('Query results:', results);

        if (results.length > 0) {
            const user = results[0];
            // Compare the provided password with the hashed password in the database
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    return res.status(500).json({ message: 'Error comparing passwords' });
                }

                if (isMatch) {
                    // Store user information in the session
                    req.session.userId = user.id; // Store user ID or username
                    req.session.username = user.username; // Optional: store username
                    // Login successful, redirect to home
                    return res.redirect('/home');
                } else {
                    console.log('Incorrect password for user:', username);
                    return res.json({ message: 'Incorrect username or password' });
                }
            });
        } else {
            console.log('User not found:', username);
            return res.json({ message: 'Incorrect username or password' });
        }
    });
});

// Handle admin login form submission
app.post('/adminlogin', (req, res) => {
    const { username, password } = req.body;
    console.log('Attempting to login with username:', username);

    const sql = 'SELECT * FROM admins WHERE username = ?';
    db.query(sql, [username], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }

        console.log('Query results:', results);

        if (results.length > 0) {
            const admin = results[0];
            // Compare the provided password with the hashed password in the database
            bcrypt.compare(password, admin.password, (err, isMatch) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    return res.status(500).json({ message: 'Error comparing passwords' });
                }

                if (isMatch) {
                    // Store admin information in the session
                    req.session.adminId = admin.id; // Store admin ID or username
                    req.session.adminUsername = admin.username; // Optional: store username
                    // Login successful, redirect to home
                    return res.redirect('/adminhome');
                } else {
                    console.log('Incorrect password for admin:', username);
                    return res.json({ message: 'Incorrect username or password' });
                }
            });
        } else {
            console.log('Admin not found:', username);
            return res.json({ message: 'Incorrect username or password' });
        }
    });
});

// Serve the home page after successful user login
app.get('/home', (req, res) => {
    if (req.session.username) {
        res.sendFile(path.join(__dirname, 'public', 'home.html')); // Serve the home.html file
    } else {
        res.redirect('/login'); // Redirect to login if not authenticated
    }
});

// Serve the admin home page after successful admin login
app.get('/adminhome', (req, res) => {
    if (req.session.adminUsername) {
        res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html')); // Serve the admin_home.html file
    } else {
        res.redirect('/adminlogin'); // Redirect to admin login if not authenticated
    }
});

// API endpoint to get the username and email
app.get('/api/get-user-info', (req, res) => {
    if (req.session.username) {
        res.json({ username: req.session.username });
    } else {
        res.status(401).json({ username: null });
    }
});

// Get all courses
app.get('/get-courses', (req, res) => {
    const sql = 'SELECT * FROM courses';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }
        res.json(results);
    });
});

// Get all assignments
app.get('/api/get-assignments', (req, res) => {
    const sql = 'SELECT * FROM assignments';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }
        res.json(results);
    });
});

// Get all quizzes
app.get('/api/get-quizzes', (req, res) => {
    const sql = 'SELECT * FROM quizzes';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }
        res.json(results);
    });
});

// Handle logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ message: 'Error during logout' });
        }
        res.redirect('/login'); // Redirect to login after logout
    });
});

app.post('/post-course', upload.single('file'), (req, res) => {
    const { courseName, courseDescription } = req.body;
    const file = req.file;

    // Check if a file was uploaded
    if (!file) {
        return res.status(400).json({ message: 'Please upload a video or PDF file' });
    }

    const filePath = file.path; // The path where the file is saved
    const fileType = file.mimetype; // The MIME type of the file

    // SQL query to insert course data along with file info
    const sql = 'INSERT INTO courses (title, description, file_path, file_type) VALUES (?, ?, ?, ?)';
    db.query(sql, [courseName, courseDescription, filePath, fileType], (err, results) => {
        if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ message: 'Database query error' });
        }
        res.json({ message: 'Course posted successfully', filePath });
    });
});




// Handle posting an assignment
app.post('/post-assignment', (req, res) => {
    const { course_id, title, description, due_date } = req.body;
    const sql = 'INSERT INTO assignments (course_id, title, description, due_date) VALUES (?, ?, ?, ?)';
    db.query(sql, [course_id, title, description, due_date], (err, results) => {
        if (err) {
            console.error('Error posting assignment:', err);
            return res.status(500).json({ message: 'Error posting assignment' });
        }
        res.json({ message: 'Assignment posted successfully' });
    });
});

// Handle posting a quiz
app.post('/post-quiz', (req, res) => {
    const { course_id, title, questions } = req.body;
    const sql = 'INSERT INTO quizzes (course_id, title, questions) VALUES (?, ?, ?)';
    db.query(sql, [course_id, title, questions], (err, results) => {
        if (err) {
            console.error('Error posting quiz:', err);
            return res.status(500).json({ message: 'Error posting quiz' });
        }
        res.json({ message: 'Quiz posted successfully' });
    });
});

// Starting the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
