require('dotenv').config();

const multer = require("multer");
const express = require("express");
//const app = express();
//app.use(express.json()); // ✅ This enables parsing of JSON bodies
//app.use(express.urlencoded({ extended: true })); // <- for form-data
const mysql = require('mysql2');
const cors = require('cors');
// middleware
//app.use(cors());
//app.use(express.json()); 
//app.use(express.urlencoded({ extended: true }));


const router = express.Router();
const bodyParser = require('body-parser');
const moment = require('moment');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });
const mongoose = require('mongoose');
const User = require('./models/User');
const Task = require('./models/Task');




const Project = require('./models/Project');
const Staff = require('./models/Staff');
const Department = require('./models/Department');
const Employee = require('./models/Employee');
// At the top of your server.js or routes/task.js
const { v4: uuidv4 } = require('uuid');




/*const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ticket' // Change this to your actual DB name
});*/
const jwt = require('jsonwebtoken');



const sendTaskEmail = require('./email');

const app = express();
const port = process.env.PORT || 8083;
const secretKey = process.env.SECRET_KEY;

// Middleware
app.use(cors());
//app.use(express.json());


//app.use(bodyParser.json());
// Allow larger payloads (JSON / URL-encoded)
app.use(bodyParser.json({ limit: "250mb" }));
app.use(bodyParser.urlencoded({ limit: "250mb", extended: true }));


// Get MongoDB connection URI from environment variables
//const dbURI = process.env.MONGODB_URI; 
const dbURI = "mongodb://localhost:27017/ticket"
// Check if MONGODB_URI is defined
if (!dbURI) {
    console.error('Error: MONGODB_URI is not defined in your .env file.');
    // Exit the process or handle the error appropriately
    process.exit(1); 
}


mongoose.connect(dbURI)
    .then(() => {
        console.log('MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
    });

// Optional: Handle Mongoose connection events
mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected!');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// const app = mysql.createapp({
//   connectionLimit: 4,
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.MONGODB_URI,
//   waitForConnections: true,
//   queueLimit: 0,
// });

// app.getConnection((err, connection) => {
//   if (err) {
//     console.error('Error connecting to the database:', err.message);
//     console.log(err)
//     return;
//   }
//   console.log('Database connected successfully');
//   connection.release();
// });

/* ===========================
        REGISTER ROUTES
   =========================== */

//Register users 
app.post('/register', async (req, res) => {
  try {
    const { name, email, password,role} = req.body;
    console.log('Raw req.body:', req.body);

    console.log(name, email, password);

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }    

    const newUser = new User({ name, email, password,role });
    await newUser.save();
   
    res.status(201).json({ success: true, message: 'User registered successfully.' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

app.get('/register', (req, res) => {
  app.post('SELECT * FROM registration', (err, results) => {
    if (err) {

      return res.status(400).json({ message: 'Internal server error', error: err });
    }
    res.json({ success: true, users: results });
  });
});
app.post('/register/check-email', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  app.post('SELECT * FROM registration WHERE email = ?', [email], (err, results) => {
    if (err) {
      return res.status(400).json({ message: 'Internal server error', error: err });
    }
    if (results.length > 0) {
      return res.json({ exists: true });
    }
    return res.json({ exists: false });
  });
});




//FLUTTER APIS
//Fetch employees
app.get('/register', (req, res) => {
  app.post('SELECT * FROM registration', (err, results) => {
    if (err) {

      return res.status(400).json({ message: 'Internal server error', error: err });
    }
    res.json({ success: true, users: results });
  });
});

//Register employee
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const sql = "INSERT INTO registration(name, email, password) VALUES(?)";

  try {
    // Hash the password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const values = [name, email, hashedPassword];

    // Execute the SQL query
    app.post(sql, [values], (err, data) => {
      if (err) {
        console.error('Database error:', err); // Log the error for debugging
        return res.status(500).json({ success: false, message: 'Database error. Please try again.' });
      }

      // Send success response
      return res.status(201).json({ success: true, message: 'User registered successfully.', data });
    });
  } catch (err) {
    console.error('Server error:', err); // Log the error for debugging
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

//Change password
app.post('/registration/password-change', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract JWT from Bearer token
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized access. Please log in again.' });
  }

  try {
    const decoded = jwt.verify(token, secretKey); // Verify JWT
    const userEmail = decoded.email; // Extract user email from the payload

    const { currentPassword, newPassword } = req.body;

    // Validation checks
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Both current password and new password are required.',
      });
    }

    // Fetch user and verify the current password
    const [userRows] = await app.promise().query(
      'SELECT password FROM registration WHERE email = ?',
      [userEmail]
    );

    if (userRows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current password or user does not exist.',
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRows[0].password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Invalid current password.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password cannot be the same as the current password.',
      });
    }

    // Hash the new password and update the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await app.promise().query(
      'UPDATE registration SET password = ? WHERE email = ?',
      [hashedPassword, userEmail]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again later.',
    });
  }
});


/* ===========================
       LOGIN ROUTES
 =========================== */

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
      const user = await User.findOne({ email });

       if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });

       }
        const validPassword = await user.comparePassword(password);
        if (!validPassword) {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate a token
        const token = jwt.sign({ id: user._id, email: user.email, name: user.name,  role: user.role }, secretKey, { expiresIn: '120m' });  
        return res.status(200).json({ message: 'Login successful', email: user.email, name: user.name, role: user.role, authToken: token });
      
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.'});
  }
});

// ✅ Middleware to verify JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ success: false, message: "No token provided" });

  jwt.verify(token, secretKey, (err, user) => {
    if (err) return res.status(403).json({ success: false, message: "Invalid token" });
    req.user = user; // { id, email, name, role }
    next();
  });
}


// ✅ Change Password Route
app.post("/user/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    // update password
    user.password = newPassword; // pre('save') will hash
    await user.save();

    // generate new token
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: user.role },
      secretKey,
      { expiresIn: "30m" }
    );

    res.json({
      success: true,
      message: "Password updated successfully",
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
//FLUTTER ROUTES
/*app.post('/log', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ success: false, message: 'Email and password are required' });
  }

  const query = 'SELECT * FROM registration WHERE email = ?';
  try {
    app.post(query, [email], async (err, result) => {
      if (err) {
        console.error('Database error:', err); // Log error for debugging
        return res.status(500).send({ success: false, message: 'Internal server error' });
      }

      if (result.length === 0) {
        return res.status(401).send({ success: false, message: 'Invalid credentials' });
      }

      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).send({ success: false, message: 'Invalid credentials' });
      }

      // Generate a token
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, secretKey, { expiresIn: '1h' });

      const sanitizedUser = { id: user.id, email: user.email, role: user.role, name: user.name };
      console.log(user.role);
      return res.status(200).send({
        success: true,
        message: 'Login successful',
        token,
        user: sanitizedUser,
      });
    });
  } catch (error) {
    console.error('Unexpected error during login:', error); // Log unexpected errors
    res.status(500).send({ success: false, message: 'An error occurred. Please try again later.' });
  }
});*/







/* ===========================
       EMPLOYEE ROUTES
   =========================== */

app.post('/employee', async (req, res) => {
  const { name, email, telephone_no, departmentId } = req.body;

  if (!name || !email || !telephone_no || !departmentId) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }

    const employee = new Employee({
      name,
      email,
      telephone_no,
      departmentId,
      department: department.name
    });

    await employee.save();
    res.json({ success: true, message: 'Employee added successfully', employee });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add employee', error: err.message });
  }
});

// ===========================
// UPDATE employee
// ===========================
app.put('/employee/update', async (req, res) => {
  const { id, name, email, telephone_no, departmentId } = req.body;

  if (!id || !name || !email || !telephone_no || !departmentId) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const department = await Department.findById(departmentId);
    if (!department) {
      return res.status(400).json({ success: false, message: 'Invalid department' });
    }

    const result = await Employee.updateOne(
      { _id: id },
      { $set: { name, email, telephone_no, departmentId, department: department.name } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating employee', error: err.message });
  }
});

// ===========================
// DELETE employee
// ===========================
app.delete('/employee/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Employee.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting employee', error: err.message });
  }
});

// ===========================
// GET employee count
// ===========================
app.get('/employee/count', async (req, res) => {
  try {
    const count = await Employee.countDocuments();
    res.json({ success: true, count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

/* ===========================
        TASK ROUTES
   =========================== */

/*app.get('/task', (req, res) => {
  const page = parseInt(req.query.page) || 1;  // Get page number from query (default: 1)
  const limit = parseInt(req.query.limit) || 20;  // Get limit from query (default: 20)
  const offset = (page - 1) * limit;  // Calculate offset

  // Query to get paginated tasks
  const queryTasks = 'SELECT * FROM task LIMIT ? OFFSET ?';
  // Query to count total tasks
  const queryCount = 'SELECT COUNT(*) AS total FROM task';

  app.post(queryTasks, [limit, offset], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error', error: err });
    }

    // Get total number of tasks
    app.post(queryCount, (err, countResult) => {
      if (err) {
        return res.status(500).json({ message: 'Error counting tasks', error: err });
      }

      const totalTasks = countResult[0].total;
      const totalPages = Math.ceil(totalTasks / limit);

      res.json({
        success: true,
        tasks: results,
        totalPages,
        currentPage: page,
        totalTasks
      });
    });
  });
});

app.post('/task', (req, res) => {
  const { name, description, project_key, contact_person } = req.body;
  if (!name || !description || !project_key || !contact_person) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const sql = "INSERT INTO task (name, description, project_key, contact_person) VALUES (?, ?, ?, ?)";
  app.post(sql, [name, description, project_key, contact_person], (err, result) => {
    if (err) {
      return res.status(400).json({ success: false, message: 'Failed to save task to the database', error: err });
    }
    return res.json({ success: true, message: 'Task saved successfully' });
  });
});*/
// ------------------- GET TASKS -------------------

// ✅ Task routes

// Get tasks with pagination & project filter
app.get("/task", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    const filter = {};

    // Accept both projectId and project_key
    if (req.query.projectId) {
      filter.project_key = req.query.projectId;
    } else if (req.query.project_key) {
      filter.project_key = req.query.project_key;
    }

    // ✅ Role-based filtering
    // If not admin, only return tasks assigned to this user
    if (req.user && req.user.role !== "admin") {
      // If assigned_to in DB is stored as ObjectId (ref to User model)
      try {
        filter.assigned_to = new mongoose.Types.ObjectId(req.user._id);
      } catch (e) {
        return res.status(400).json({ success: false, message: "Invalid user ID format" });
      }

      // If assigned_to is stored as a username string (e.g. "vin", "dan")
      // use this instead:
      // filter.assigned_to = req.user.username;
    }

    const tasks = await Task.find(filter).skip(skip).limit(limit).lean();
    const totalTasks = await Task.countDocuments(filter);
    const totalPages = Math.ceil(totalTasks / limit);

    res.json({
      success: true,
      tasks,
      totalTasks,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ✅ Get task count only (lighter request)
app.get("/task/count", async (req, res) => {
  try {
    const filter = {};

    if (req.query.projectId) {
      filter.project_key = req.query.projectId;
    } else if (req.query.project_key) {
      filter.project_key = req.query.project_key;
    }

    // ✅ Role-based filtering
    if (req.user && req.user.role !== "admin") {
      try {
        filter.assigned_to = new mongoose.Types.ObjectId(req.user._id);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid user ID format" });
      }
      // Or, if `assigned_to` is a username string:
      // filter.assigned_to = req.user.username;
    }

    const count = await Task.countDocuments(filter);

    res.json({ success: true, count });
  } catch (error) {
    console.error("Error fetching task count:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
});



// ------------------- CREATE TASK -------------------
app.post("/task", async (req, res) => {
  const {
    name,
    description,
    projectId,
    project_key,
    assigned_to,
    contact_person,
    start_date,
    end_date,
    priority,
    status,
    request_type,
    resolution_type,
    ticket, // ✅ NEW
  } = req.body;

  const project = projectId || project_key;
  if (!name || !description || !project) {
    return res.status(400).json({
      success: false,
      message: "Name, description, and projectId are required",
    });
  }

  try {
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(400).json({
        success: false,
        message: "Selected project not found.",
      });
    }

    // Create task with consistent fields
    const newTask = new Task({
      name,
      description,
      project_key: project,
      contact_person: contact_person || null,
      assigned_to: assigned_to || null,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : new Date(),
      priority: priority || "Medium",
      status: status || "NOT STARTED",
      request_type: request_type || "New Request",
      resolution_type: resolution_type || "Functional",
      done: false,
      task_key: uuidv4(),
      ticket: ticket || null, // ✅ NEW
    });

    const savedTask = await newTask.save();

    //  Link task to ticket
    if (ticket) {
      await Ticket.findByIdAndUpdate(ticket, {
        $addToSet: { tasks: savedTask._id },
      });
    }

    //  Resolve contact person name for response
    let contactName = "N/A";
    if (contact_person) {
      const employee = await Employee.findById(contact_person).lean();
      if (employee) {
        contactName = employee.name;

        if (employee.email) {
          sendTaskEmail(
            employee.email,
            {
              taskName: name,
              contact_person: employee.name,
            },
            "assigned"
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      task: {
        ...savedTask.toObject(),
        contact_person_name: contactName,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to create task",
      error: err.message,
    });
  }
});



// ------------------- BULK UPLOAD -------------------

// ✅ Bulk Upload Route (Support Project, Ticket ID Reference)
app.post("/tasks/bulk", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || req.file.size === 0) {
      return res.status(400).json({ message: "Invalid file uploaded" });
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, range: 0, header: 1 });

    if (jsonData.length < 2) {
      return res.status(400).json({ message: "Uploaded file is empty" });
    }

    // --- Header mapping ---
    const headerMap = {
      "MODULE NAME": "module_name",
      "PROCESS NAME": "description",
      "SUB MODULE": "name",
      "PROCEDURE": "procedure",
      "COMMENTS": "comments",
      "OWNER": "contact_person",
      "ASSIGNED DEV": "assigned_to",
      "TESTER": "assigned_to",
      "START DATE": "start_date",
      "END DATE": "end_date",
      "PRIORITY": "priority",
      "QA STATUS": "qa_status",
      "UAT STATUS": "uat_status",
      "REQUEST TYPE": "request_type",
      "RESOLUTION TYPE (FUNCTIONAL OR TECHNICAL)": "resolution_type",
      "TICKET ID": "ticket_id", // ✅ Optional ticket reference
    };

    const cleanString = (val) => (!val ? "" : String(val).replace(/\u00a0/g, " ").trim());
    const normalizeName = (val) => cleanString(val).toLowerCase();
    const parseDate = (value) => {
      if (!value) return null;
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };
    const safeEnum = (val, allowed, fallback) => {
      val = cleanString(val);
      return allowed.includes(val) ? val : fallback;
    };
    const normalizeKey = (key) => {
      const k = key.toUpperCase().trim();
      return headerMap[k] || k.toLowerCase().replace(/\s+/g, "_");
    };

    // --- Extract headers + rows ---
    const headers = jsonData[0].map((h) => normalizeKey(h));
    const rows = jsonData.slice(1).map((row, idx) => {
      const newRow = {};
      headers.forEach((h, i) => (newRow[h] = row[i] || ""));
      newRow.__rowNum__ = idx + 2;
      return newRow;
    });

    const projects = await Project.find();
    const employees = await Employee.find();

    const projectMap = {};
    projects.forEach((p) => (projectMap[p.name.toLowerCase()] = p));

    const employeeMap = {};
    employees.forEach((e) => (employeeMap[normalizeName(e.name)] = e._id));

    const allowedPriorities = ["High", "Medium", "Low"];
    const allowedStatuses = ["Done", " Work In Progress", "done"];
    const allowedRequestTypes = ["New Request", "Existing Request"];
    const allowedResolutionTypes = ["Functional", "Technical"];

    const validTasks = [];
    const invalidRows = [];
    const createdEmployees = [];
    const createdProjects = [];

    const addToFunctionalTeam = async (projectDoc, employeeId) => {
      if (!projectDoc) return;
      projectDoc.teams = projectDoc.teams || {};
      projectDoc.teams.FUNCTIONAL = projectDoc.teams.FUNCTIONAL || [];
      const alreadyInTeam = projectDoc.teams.FUNCTIONAL.some(
        (id) => id.toString() === employeeId.toString()
      );
      if (!alreadyInTeam) {
        await Project.updateOne(
          { _id: projectDoc._id },
          { $addToSet: { "teams.FUNCTIONAL": employeeId } }
        );
      }
    };

    for (let i = 0; i < rows.length; i++) {
      const task = rows[i];
      const rowNum = task.__rowNum__;

      // --- Project ---
      let projectDoc = projectMap[cleanString(task.module_name).toLowerCase()];
      if (!projectDoc && cleanString(task.module_name)) {
        projectDoc = await Project.create({
          name: cleanString(task.module_name),
          description: "Auto-created via bulk upload",
          teams: { FUNCTIONAL: [] },
        });
        projectMap[cleanString(task.module_name).toLowerCase()] = projectDoc;
        createdProjects.push(projectDoc.name);
      }

      // --- Contact Person ---
      let contactPersonId = null;
      const contactName = cleanString(task.contact_person);
      if (contactName) {
        const normContact = normalizeName(contactName);
        contactPersonId = employeeMap[normContact] || null;

        if (!contactPersonId) {
          const newEmployee = await Employee.create({
            name: contactName,
            department: "FUNCTIONAL",
            telephone_no: "N/A",
            email: `${normContact.replace(/\s+/g, ".")}@example.com`,
          });
          contactPersonId = newEmployee._id;
          employeeMap[normContact] = newEmployee._id;
          createdEmployees.push(contactName);
          await addToFunctionalTeam(projectDoc, newEmployee._id);
          if (projectDoc && !projectDoc.contact_person) {
            projectDoc.contact_person = newEmployee._id;
            await projectDoc.save();
          }
        } else {
          await addToFunctionalTeam(projectDoc, contactPersonId);
        }
      }

      // --- Assigned DEV / Tester ---
      let assignedToId = null;
      const assignedName = cleanString(task.assigned_to);
      if (assignedName) {
        const normAssigned = normalizeName(assignedName);
        assignedToId = employeeMap[normAssigned] || null;

        if (!assignedToId) {
          const newEmployee = await Employee.create({
            name: assignedName,
            department: "QA",
            telephone_no: "N/A",
            email: `${normAssigned.replace(/\s+/g, ".")}@example.com`,
          });
          assignedToId = newEmployee._id;
          employeeMap[normAssigned] = newEmployee._id;
          createdEmployees.push(assignedName);
          await addToFunctionalTeam(projectDoc, newEmployee._id);
        } else {
          await addToFunctionalTeam(projectDoc, assignedToId);
        }
      }

      const newTask = {
        orderIndex: i,
        name: cleanString(task.name) || `Untitled-${rowNum}`,
        description: cleanString(task.description),
        project_key: projectDoc?._id || null,
        sub_module: cleanString(task.name),
        procedure: cleanString(task.procedure),
        comments: cleanString(task.comments),
        qa_status: cleanString(task.qa_status),
        uat_status: cleanString(task.uat_status),
        contact_person: contactPersonId || undefined,
        assigned_to: assignedToId || null,
        start_date: parseDate(task.start_date),
        end_date: parseDate(task.end_date),
        priority: safeEnum(task.priority, allowedPriorities, "Medium"),
        status: safeEnum(task.status, allowedStatuses, "NOT STARTED"),
        request_type: safeEnum(task.request_type, allowedRequestTypes, "New Request"),
        resolution_type: safeEnum(task.resolution_type, allowedResolutionTypes, "Functional"),
        done: false,
        completed: task.status && task.status.toString().toUpperCase() === "DONE",
        fromBulk: true,
        ticketId: task.ticket_id || null, // ✅ store ticket reference if provided
      };

      if (!projectDoc) {
        invalidRows.push({
          row: rowNum,
          name: newTask.name,
          error: `Project '${task.module_name}' not found and could not be created`,
        });
      }

      validTasks.push(newTask);
    }

    // --- Insert / Update tasks ---
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const toInsert = [];

    for (const task of validTasks) {
      if (!task.project_key) continue;

      const existing = await Task.findOne({
        name: task.name,
        project_key: task.project_key,
        description: task.description,
        procedure: task.procedure,
      });

      if (!existing) {
        toInsert.push(task);
      } else {
        const fieldsToCompare = [
          "procedure",
          "sub_module",
          "comments",
          "description",
          "qa_status",
          "uat_status",
          "contact_person",
          "assigned_to",
          "start_date",
          "end_date",
          "priority",
          "status",
          "request_type",
          "resolution_type",
          "ticketId", // compare ticket reference
        ];

        let changed = false;
        for (const field of fieldsToCompare) {
          const oldVal = existing[field] ? String(existing[field]) : "";
          const newVal = task[field] ? String(task[field]) : "";
          if (oldVal !== newVal) {
            changed = true;
            break;
          }
        }

        if (changed) {
          await Task.updateOne({ _id: existing._id }, { $set: task });
          updatedCount++;
        } else {
          skippedCount++;
        }
      }
    }

    if (toInsert.length > 0) {
      await Task.insertMany(toInsert, { ordered: true });
      insertedCount = toInsert.length;
    }

    res.status(201).json({
      success: true,
      message: `${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} unchanged.`,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      invalidRows,
      createdEmployees,
      createdProjects,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});



// ------------------- UPDATE TASK -------------------
app.put("/task/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    // Get the previous task before updating
    const prevTask = await Task.findOne({
      $or: [{ _id: id }, { task_key: id }],
    }).lean();
    if (!prevTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Update task
    const updatedTask = await Task.findOneAndUpdate(
      { $or: [{ _id: id }, { task_key: id }] },
      update,
      { new: true, runValidators: true }
    ).lean();

    //  Sync ticket linkage if ticket changed
    if (update.ticket && update.ticket !== prevTask.ticket?.toString()) {
      if (prevTask.ticket) {
        await Ticket.findByIdAndUpdate(prevTask.ticket, {
          $pull: { tasks: prevTask._id },
        });
      }
      await Ticket.findByIdAndUpdate(update.ticket, {
        $addToSet: { tasks: updatedTask._id },
      });
    }

    // Email notify new contact person 
    if (updatedTask.contact_person) {
      const employee = await Employee.findById(updatedTask.contact_person);
      if (employee?.email) {
        sendTaskEmail(employee.email, {
          action: "updated",
          previous: {
            name: prevTask.name || "N/A",
          },
          updated: {
            name: updatedTask.name || "N/A",
          },
        });
      }
    }

    res.json({ success: true, task: updatedTask });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});


// ------------------- DELETE TASK -------------------
app.delete("/task/:id", async (req, res) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.params.id);
    if (!deletedTask)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

    // 🔗 Remove from ticket
    if (deletedTask.ticket) {
      await Ticket.findByIdAndUpdate(deletedTask.ticket, {
        $pull: { tasks: deletedTask._id },
      });
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// ------------------- GET TASKS BY TICKET -------------------
app.get("/tasks/by-ticket/:ticketId", async (req, res) => {
  try {
    const tasks = await Task.find({ ticket: req.params.ticketId })
      .populate("assigned_to contact_person", "name email")
      .lean();

    res.json({ success: true, tasks });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error: err.message });
  }
});
// ------------------- COUNT TASKS -------------------
/*app.get("/task/count", async (req, res) => {
  try {
    const count = await Task.countDocuments();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
});*/


/* ===========================
      DEPARTMENT APIS
   =========================== */
// Create department
app.post('/department', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Department name is required' });
  }
  try {
    const department = new Department({ name });
    await department.save();
    res.status(201).json({ success: true, message: 'Department created successfully', department });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error creating department', error: err.message });
  }
});

// Get all departments
app.get('/department', async (req, res) => {
  try {
    const departments = await Department.find();

    const departmentsWithEmployees = await Promise.all(
      departments.map(async (dep) => {
        const employees = await Employee.find({ departmentId: dep._id });
        return {
          ...dep.toObject(),
          employees,
        };
      })
    );

    res.json({ success: true, departments: departmentsWithEmployees });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching departments', error: err.message });
  }
});


// Update department
app.put("/department/:id", async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: "Name is required" });
  }

  try {
    const updated = await Department.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    res.json({ success: true, department: updated });
  } catch (err) {
    console.error("Error updating department:", err);
    res.status(500).json({ success: false, message: "Failed to update department" });
  }
});


// Delete department
app.delete('/department/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await Department.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error deleting department', error: err.message });
  }
});
app.get("/departments-with-employees", async (req, res) => {
  try {
    const departments = await Department.find().lean();
    const employees = await Employee.find();

    const withEmployees = departments.map(dep => ({
      ...dep,
      employees: employees.filter(emp => String(emp.departmentId) === String(dep._id))
    }));

    res.json({ success: true, departments: withEmployees });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching data" });
  }
});




/* ===========================
     PROJECT ROUTES
  =========================== */

// Route to add a new project
/*app.post('/projects', (req, res) => {
  const { name, description, contact_person } = req.body;
  const sql = "INSERT INTO projects (name, description, contact_person) VALUES (?, ?, ?)";
  app.post(sql, [name, description, contact_person], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to add project' });
    }
    res.json({ success: true, message: 'Project added successfully' });
  });
});*/
// server.js or routes/projects.js
// Create a new project
app.post('/projects', async (req, res) => {
  try {
    const { name, description, contact_person } = req.body;

    if (!name || !description || !contact_person) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const newProject = new Project({
      name,
      description,
      contact_person // employee _id
      
    });

    await newProject.save();

    // populate before sending response
    const populatedProject = await Project.findById(newProject._id)
      .populate("contact_person", "name email");

    res.status(201).json({ success: true, project: populatedProject });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ success: false, message: "Failed to create project" });
  }
});


// Fetch all projects with employee populated
app.get('/projects', async (req, res) => {
  try {
    const projects = await Project.find()
      .populate('contact_person', 'name email') // populate only name and email fields
      .exec(); // always good to use exec() for proper error handling
    res.json({ success: true, projects });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
});





/** -------------------------------
 *  Fetch all employees
 * ------------------------------- */
app.get("/employee", async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("departmentId", "name") // populate only the 'name' field of the department
      .exec();
    res.json({ success: true, employees });
  } catch (err) {
    console.error("Error fetching employees:", err);
    res.status(500).json({ success: false, message: "Failed to fetch employees" });
  }
});


/** -------------------------------
 *  Update project
 * ------------------------------- */
app.post("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const { name, description, contact_person } = req.body;

  if (!name || !description || !contact_person) {
    return res.status(400).json({ error: "Please provide all required fields" });
  }

  try {
    const project = await Project.findByIdAndUpdate(
      projectId, // ✅ use _id
      { name, description, contact_person },
      { new: true }
    ).populate("contact_person", "name email");

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ message: "Project updated successfully", project });
  } catch (err) {
    console.error("Error updating project:", err);
    res.status(500).json({ error: "Failed to update project" });
  }
});

// Get all tasks for a specific project
// GET tasks for a project

app.get("/projects/:projectId/tasks", async (req, res) => {
  const { projectId } = req.params;

  try {
    const tasks = await Task.find({ project_key: projectId })
      .populate("assigned_to", "name email"); // only include name & email
    res.json({ tasks });
  } catch (err) {
    console.error("Error fetching project tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks for project" });
  }
});





/** -------------------------------
 *  Delete project
 * ------------------------------- */
/*app.delete("/projects/:projectKey", async (req, res) => {
  const { projectKey } = req.params;
  try {
    const result = await Project.findOneAndDelete({ project_key: projectKey });
    if (!result) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ error: "Failed to delete project" });
  }
});*/
app.delete('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Delete request received for project ID:", id);

    const deletedProject = await Project.findByIdAndDelete(id);
    console.log("Deleted project:", deletedProject);

    if (!deletedProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    await Task.deleteMany({ project_key: id });
    res.json({ success: true, message: 'Project and related tasks deleted successfully' });
  } catch (err) {
    console.error('Error deleting project:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE Project and related Tasks

const handleDeleteProject = async (projectId) => {
  console.log("🔍 Trying to delete project:", projectId);   // log the id
  console.log("Delete URL:", `${BASE_URL}/projects/${projectId}`);

  if (!window.confirm("Are you sure you want to delete this project and all its tasks?")) return;

  setLoading(true);
  setErrorMessage("");
  setSuccessMessage("");

  try {
    await axios.delete(`${BASE_URL}/projects/${projectId}`);

    setSuccessMessage("Project and its tasks deleted successfully!");
    if (selectedProject && (selectedProject._id === projectId || selectedProject.id === projectId)) {
      setSelectedProject(null);
      setTasks([]);
    }
    await fetchProjects();
  } catch (err) {
    console.error("❌ Error deleting project:", err.response?.data || err.message || err);
    setErrorMessage("Error deleting project: " + (err.response?.data?.message || err.message));
  } finally {
    setLoading(false);
  }
};




//FLUTTER APIS

//Fetch employee


// ✅ GET all employees

// ✅ GET all employees
app.get('/employee', async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate('departmentId', 'name') // populate only the name
      .exec();

    res.json({ success: true, employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// ✅ POST new employee
// GET all employees
app.get('/employee', async (req, res) => {
  try {
    // Populate department name
    const employees = await Employee.find()
      .populate('departmentId', 'name') // only get 'name' field from Department
      .exec();

    res.json({ success: true, employees });
  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Error fetching employees' });
  }
});

// POST new employee
app.post('/employee', async (req, res) => {
  const { name, email, departmentId, telephone_no } = req.body;

  if (!name || !email || !departmentId || !telephone_no) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const exists = await Employee.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const newEmployee = new Employee({ name, email, departmentId, telephone_no });
    await newEmployee.save();

    const populatedEmployee = await newEmployee.populate('departmentId', 'name');

    res.status(201).json({
      success: true,
      message: 'Employee saved successfully',
      employee: populatedEmployee
    });
  } catch (error) {
    console.error('❌ Error saving employee:', error);
    res.status(500).json({ success: false, message: 'Error saving employee' });
  }
});

// PUT update employee
app.put('/employee/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, departmentId, telephone_no } = req.body;

  try {
    const updated = await Employee.findByIdAndUpdate(
      id,
      { name, email, departmentId, telephone_no },
      { new: true, runValidators: true }
    ).populate('departmentId', 'name');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee updated successfully', employee: updated });
  } catch (error) {
    console.error('❌ Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Error updating employee' });
  }
});
// PUT - update a project by ID
app.put('/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contact_person } = req.body;

    if (!name || !description || !contact_person) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { name, description, contact_person },
      { new: true, runValidators: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({ success: true, project: updatedProject });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE employee
app.delete('/employee/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Employee.findByIdAndDelete(id);

    if (!result) return res.status(404).json({ success: false, message: 'Employee not found' });

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Error deleting employee' });
  }
});


/* ===========================
    DASHBOARD ROUTES
=========================== */

app.get('/task/pie', (req, res) => {
  app.post('SELECT * FROM task', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
    res.status(200).json({ tasks: results });

  });
});

app.get('/employee/bar', (req, res) => {
  app.post('SELECT department, COUNT(*) as employeeCount FROM employee GROUP BY department', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error', error: err.message });
    }
    res.status(200).json({ employee: results });


  })
});

app.get('/task/bar', (req, res) => {
  app.post(
    `SELECT p.name, COUNT(*) AS taskCount 
       FROM task t
       JOIN projects p ON t.project_key = p.project_key
       GROUP BY t.project_key`,
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error', error: err.message });
      }
      res.status(200).json({ tasks: results });

    }
  );
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
module.exports = mongoose
/* ===========================
   STARTING SERVER
=========================== */

