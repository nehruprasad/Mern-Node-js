const express = require('express'); 
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const mysql = require('mysql2');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '123456789',
  database: 'role_management',
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'mySuperSecretJWTKey',
  resave: false,
  saveUninitialized: true,
}));

// Route for Home Page
app.get('/', (req, res) => {
  if (req.session.user) {
    // Render a home page if the user is logged in
    res.render('home', { user: req.session.user });
  } else {
    // Redirect to login if not authenticated
    res.redirect('/login');
  }
});


// Route for Registration
app.get('/register', (req, res) => {
  res.render('register');
});
app.post('/register', (req, res) => {
  const { username, email, password, role } = req.body;
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) throw err;

    const query = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
    db.query(query, [username, email, hashedPassword, role], (err, result) => {
      if (err) throw err;
      sendWelcomeEmail(email);
      res.redirect('/login');
    });
  });
});

function sendWelcomeEmail(to) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject: 'Welcome to our platform',
    text: 'Thank you for registering!',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Route for Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      bcrypt.compare(password, result[0].password, (err, isMatch) => {
        if (isMatch) {
          req.session.user = result[0];
          sendLoginEmail(result[0].email);
          res.redirect('/');
        } else {
          res.send('Incorrect password');
        }
      });
    } else {
      res.send('Email not found');
    }
  });
});

function sendLoginEmail(to) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject: 'Login Successful',
    text: 'You have successfully logged in.',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Route for Forgot Password
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      const resetToken = Math.random().toString(36).substr(2);
      sendPasswordResetEmail(email, resetToken);
      res.send('Password reset email sent');
    } else {
      res.send('Email not found');
    }
  });
});

function sendPasswordResetEmail(to, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to,
    subject: 'Password Reset Request',
    text: `To reset your password, use this token: ${token}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// Route for Settings Page
app.get('/settings', (req, res) => {
  if (req.session.user) {
    res.render('settings', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

app.post('/settings', (req, res) => {
  const { email, password } = req.body;
  const userId = req.session.user.id;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) throw err;

    const query = 'UPDATE users SET email = ?, password = ? WHERE id = ?';
    db.query(query, [email, hashedPassword, userId], (err, result) => {
      if (err) throw err;
      res.redirect('/');
    });
  });
});


app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Logout failed');
    }
    res.redirect('/login');
  });
});


  app.post('/register', (req, res) => {
    const { username, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) throw err;
  
      // Check if it's the first user
      const role = 'user'; // Default role
      const checkFirstUserQuery = 'SELECT COUNT(*) AS count FROM users';
      db.query(checkFirstUserQuery, (err, result) => {
        if (err) throw err;
  
        if (result[0].count === 0) {
          // If it's the first user, make them an admin
          role = 'admin';
        }
  
        const query = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)';
        db.query(query, [username, email, hashedPassword, role], (err, result) => {
          if (err) throw err;
          sendWelcomeEmail(email);
          res.redirect('/login');
        });
      });
    });
  });
  app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, result) => {
      if (err) throw err;
  
      if (result.length > 0) {
        bcrypt.compare(password, result[0].password, (err, isMatch) => {
          if (isMatch) {
            req.session.user = result[0]; // Set the session for the logged-in user
            sendLoginEmail(result[0].email);
  
            // Check if the logged-in user is an admin
            if (result[0].role === 'admin') {
              res.redirect('/admin'); // Redirect to the admin dashboard
            } else {
              res.redirect('/'); // Redirect to the home page for regular users
            }
          } else {
            res.send('Incorrect password');
          }
        });
      } else {
        res.send('Email not found');
      }
    });
  });


// Middleware to check if the user is an admin
function isAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied. Admins only.');
}

// Route to get all users (admin only)
app.get('/admin/users', isAdmin, (req, res) => {
  const query = 'SELECT id, username, email, role FROM users';
  db.query(query, (err, users) => {
    if (err) throw err;
    res.render('admin-users', { admin: req.session.user, users });
  });
});

// Route to delete a user (admin only)
app.post('/admin/delete-user', isAdmin, (req, res) => {
  const { userId } = req.body;

  const query = 'DELETE FROM users WHERE id = ?';
  db.query(query, [userId], (err, result) => {
    if (err) throw err;
    res.redirect('/admin/users');
  });
});

// Route to promote a user to admin (admin only)
app.post('/admin/promote-user', isAdmin, (req, res) => {
  const { userId } = req.body;

  const query = 'UPDATE users SET role = "admin" WHERE id = ?';
  db.query(query, [userId], (err, result) => {
    if (err) throw err;
    res.redirect('/admin/users');
  });
});

// Render admin dashboard
app.get('/admin', isAdmin, (req, res) => {
  res.render('admin-dashboard', { admin: req.session.user });
});


  // Route for Mood Log
app.get('/mood-log', (req, res) => {
  if (req.session.user) {
    // Render the mood log page if the user is logged in
    res.render('mood-log', { user: req.session.user });
  } else {
    // Redirect to login if not authenticated
    res.redirect('/login');
  }
});

// Function to get the moods for a specific user
const getMoodsForUser = (userId) => {
  return new Promise((resolve, reject) => {
      db.query('SELECT * FROM moods WHERE user_id = ? ORDER BY date DESC', [userId], (err, results) => {
          if (err) {
              return reject(err);
          }
          resolve(results);
      });
  });
};


// Route for Mood History
app.get('/mood-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user; // Get the logged-in user info
    getMoodsForUser(user.id, (err, moods) => {
      if (err) {
        return res.status(500).send('Error retrieving mood history');
      }
      // Render the mood-history page, passing the moods data
      res.render('mood-history', { user: user, moods: moods });
    });
  } else {
    res.redirect('/login'); // Redirect to login if not authenticated
  }
});

// Route for handling POST requests for mood log
app.post('/mood-log', (req, res) => {
  if (req.session.user) {
    // Retrieve the mood data from the request body
    const { mood } = req.body; // Assuming mood data is sent in the request body

    // Insert the mood into the 'moods' table, using 'date' column instead of 'timestamp'
    const userId = req.session.user.id;
    const query = 'INSERT INTO moods (user_id, mood, date) VALUES (?, ?, NOW())'; // Use 'date' here
    db.query(query, [userId, mood], (err, result) => {
      if (err) throw err;
      // Redirect to the mood-history page after logging the mood
      res.redirect('/mood-history');
    });
  } else {
    // Redirect to login if the user is not authenticated
    res.redirect('/login');
  }
});

// Route for Stress Level Assessment
app.get('/stress-level', (req, res) => {
  if (req.session.user) {
    res.render('stress-level', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// POST route for stress level
app.post('/stress-level', (req, res) => {
  if (req.session.user) {
    const { stressLevel } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO stress_levels (user_id, stress_level, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, stressLevel], (err, result) => {
      if (err) throw err;
      res.redirect('/stress-history');
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Stress History
app.get('/stress-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    const query = 'SELECT * FROM stress_levels WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [user.id], (err, stressLevels) => {
      if (err) throw err;
      res.render('stress-history', { user: user, stressLevels: stressLevels });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Daily Affirmations
app.get('/affirmations', (req, res) => {
  if (req.session.user) {
    res.render('affirmations', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// POST route for affirmations
app.post('/affirmations', (req, res) => {
  if (req.session.user) {
    const { affirmation } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO daily_affirmations (user_id, affirmation, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, affirmation], (err, result) => {
      if (err) throw err;
      res.redirect('/affirmations-history');
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Affirmations History
app.get('/affirmations-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    const query = 'SELECT * FROM daily_affirmations WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [user.id], (err, affirmations) => {
      if (err) throw err;
      res.render('affirmations-history', { user: user, affirmations: affirmations });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Gratitude Journal
app.get('/gratitude-journal', (req, res) => {
  if (req.session.user) {
    res.render('gratitude-journal', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// POST route for gratitude journal
app.post('/gratitude-journal', (req, res) => {
  if (req.session.user) {
    const { entry } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO gratitude_journal (user_id, entry, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, entry], (err, result) => {
      if (err) throw err;
      res.redirect('/gratitude-history');
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Gratitude History
app.get('/gratitude-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    const query = 'SELECT * FROM gratitude_journal WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [user.id], (err, gratitudeEntries) => {
      if (err) throw err;
      res.render('gratitude-history', { user: user, gratitudeEntries: gratitudeEntries });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Sleep Quality Tracker
app.get('/sleep-quality', (req, res) => {
  if (req.session.user) {
    res.render('sleep-quality', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// POST route for sleep quality
app.post('/sleep-quality', (req, res) => {
  if (req.session.user) {
    const { quality } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO sleep_quality (user_id, quality, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, quality], (err, result) => {
      if (err) throw err;
      res.redirect('/sleep-history');
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Sleep Quality History
app.get('/sleep-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    const query = 'SELECT * FROM sleep_quality WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [user.id], (err, sleepQuality) => {
      if (err) throw err;
      res.render('sleep-history', { user: user, sleepQuality: sleepQuality });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Coping Strategies
app.get('/coping-strategies', (req, res) => {
  if (req.session.user) {
    res.render('coping-strategies', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// POST route for coping strategies
app.post('/coping-strategies', (req, res) => {
  if (req.session.user) {
    const { strategy } = req.body;
    const userId = req.session.user.id;
    const query = 'INSERT INTO coping_strategies (user_id, strategy, date) VALUES (?, ?, NOW())';
    db.query(query, [userId, strategy], (err, result) => {
      if (err) throw err;
      res.redirect('/coping-history');
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Coping Strategies History
app.get('/coping-history', (req, res) => {
  if (req.session.user) {
    const user = req.session.user;
    const query = 'SELECT * FROM coping_strategies WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [user.id], (err, copingStrategies) => {
      if (err) throw err;
      res.render('coping-history', { user: user, copingStrategies: copingStrategies });
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Chart Page
app.get('/chart', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    // Fetch data for chart visualization
    const moodQuery = 'SELECT date, mood FROM moods WHERE user_id = ?';
    const sleepQuery = 'SELECT date, sleep_start, sleep_end FROM sleep_data WHERE user_id = ?';

    db.query(moodQuery, [userId], (err, moodData) => {
      if (err) throw err;

      db.query(sleepQuery, [userId], (err, sleepData) => {
        if (err) throw err;

        // Send data to the chart view
        res.render('chart', { user: req.session.user, moodData, sleepData });
      });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Sleep Tracker
app.get('/sleep-tracker', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    // Fetch sleep data for the user
    const query = 'SELECT * FROM sleep_data WHERE user_id = ?';
    db.query(query, [userId], (err, sleepData) => {
      if (err) throw err;
      res.render('sleep-tracker', { user: req.session.user, sleepData });
    });
  } else {
    res.redirect('/login');
  }
});

// Route to handle POST request for adding sleep data
app.post('/sleep-tracker', (req, res) => {
  if (req.session.user) {
    const { sleepStart, sleepEnd } = req.body;
    const userId = req.session.user.id;

    // Insert the sleep data into the database
    const query = 'INSERT INTO sleep_data (user_id, sleep_start, sleep_end, date) VALUES (?, ?, ?, NOW())';
    db.query(query, [userId, sleepStart, sleepEnd], (err, result) => {
      if (err) throw err;
      res.redirect('/sleep-tracker');
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Mood Calendar
app.get('/mood-calendar', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    // Fetch moods for the calendar view
    const query = 'SELECT * FROM moods WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [userId], (err, moods) => {
      if (err) throw err;
      res.render('mood-calendar', { user: req.session.user, moods });
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Quizzes Page
app.get('/quizzes', (req, res) => {
  if (req.session.user) {
    // Fetch quizzes from the database
    const query = 'SELECT * FROM quizzes';
    db.query(query, (err, quizzes) => {
      if (err) throw err;
      res.render('quizzes', { user: req.session.user, quizzes });
    });
  } else {
    res.redirect('/login');
  }
});

// Route for submitting quiz answers
app.post('/quizzes/submit', (req, res) => {
  if (req.session.user) {
    const { quizId, answers } = req.body;
    const userId = req.session.user.id;

    // Logic to calculate the score and insert into database
    const score = calculateScore(answers); // Assuming calculateScore function exists

    const query = 'INSERT INTO quiz_results (user_id, quiz_id, score) VALUES (?, ?, ?)';
    db.query(query, [userId, quizId, score], (err, result) => {
      if (err) throw err;
      res.redirect('/quizzes');
    });
  } else {
    res.redirect('/login');
  }
});
// Route for Progress Page
app.get('/progress', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    // Query to fetch progress data for the user
    const query = 'SELECT * FROM progress WHERE user_id = ?';
    db.query(query, [userId], (err, progressData) => {
      if (err) throw err;
      res.render('progress', { user: req.session.user, progressData });
    });
  } else {
    res.redirect('/login');
  }
});

// Route for Breathing Exercises
app.get('/breathing', (req, res) => {
  if (req.session.user) {
    res.render('breathing', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// Route for Weekly Wellness
app.get('/weekly-wellness', (req, res) => {
  if (req.session.user) {
    res.render('weekly-wellness', { user: req.session.user });
  } else {
    res.redirect('/login');
  }
});

// Route for Running Tracker
app.get('/running', (req, res) => {
  if (req.session.user) {
    const userId = req.session.user.id;

    // Fetch running data for the user
    const query = 'SELECT * FROM running_data WHERE user_id = ? ORDER BY date DESC';
    db.query(query, [userId], (err, runningData) => {
      if (err) throw err;
      res.render('running', { user: req.session.user, runningData });
    });
  } else {
    res.redirect('/login');
  }
});

// POST route for Running Tracker (Adding a running entry)
app.post('/running', (req, res) => {
  if (req.session.user) {
    const { distance, time } = req.body; // Distance in kilometers and time in minutes
    const userId = req.session.user.id;

    // Insert running data into the database
    const query = 'INSERT INTO running_data (user_id, distance, time, date) VALUES (?, ?, ?, NOW())';
    db.query(query, [userId, distance, time], (err, result) => {
      if (err) throw err;
      res.redirect('/running');
    });
  } else {
    res.redirect('/login');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
