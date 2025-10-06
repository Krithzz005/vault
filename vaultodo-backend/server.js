require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer'); // <-- NEW: For handling file uploads
const path = require('path');     // <-- NEW: For handling file paths
const fs = require('fs');         // <-- NEW: For deleting files from disk

const app = express();
const PORT = process.env.PORT || 5501;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5501", // For local frontend testing
    "https://vault-frontend-acmm.onrender.com"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));


app.use(express.json());

app.get('/', (req, res) => res.send('Hello! VaulToDo Server is running.'));

// NEW: Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Ensure 'uploads' directory exists

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB.'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// --- Multer Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Create the 'uploads' directory if it doesn't exist
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, 'uploads/'); 
    },
    filename: (req, file, cb) => {
        // Create a unique file name: timestamp-original-filename.ext
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Create the multer instance
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 10 } // Limit file size to 10MB
});
// -----------------------------


// MongoDB Schemas
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    passwordResetToken: String,
    passwordResetExpires: Date
});
const User = mongoose.model('User', userSchema);

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: { type: String, enum: ['To Do', 'In Progress', 'Done'], default: 'To Do' },
    due_date: { type: Date, default: null },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    created_at: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

// NEW: File Schema and Model
const fileSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true }, // Local path to the file
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadDate: { type: Date, default: Date.now }
});
const File = mongoose.model('File', fileSchema);
// -----------------------------


// JWT Middleware for route protection
const auth = (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        console.log('Auth Middleware: Received token (partial):', token ? token.substring(0, 20) + '...' : 'No token');
        if (!token) throw new Error('No token provided.');
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log('Auth Middleware: Decoded user:', req.user);
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please authenticate again.' });
        }
        // Ensure all auth errors return JSON!
        res.status(401).json({ error: 'Please authenticate.' }); 
    }
};

// NEW: Admin Middleware
const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        // Ensure all admin errors return JSON!
        res.status(403).json({ error: 'Access denied: Admin privileges required.' }); 
    }
};

// --- Auth Routes ---

// User Registration (Sign Up) - Now includes default role
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword, role: 'user' }); 
        await user.save();
        res.status(201).json({ message: 'Account created successfully. Please sign in.' });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ error: 'Email already registered.' });
        } else {
            console.error('Signup error:', error);
            res.status(400).json({ error: 'Signup failed. Please try again.' });
        }
    }
});

// User Login (Sign In) - Now includes role in JWT payload
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) throw new Error('Invalid login credentials.');

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error('Invalid login credentials.');

        const token = jwt.sign(
            { _id: user._id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );
        console.log('Signin Success: Generated token for user:', user.email, 'Role:', user.role);
        res.status(200).json({ user: { id: user._id, email: user.email, role: user.role }, token });
    } catch (error) {
        console.error('Signin Error:', error.message);
        res.status(400).json({ error: error.message || 'Invalid login credentials.' });
    }
});

// NEW: Forgot Password - Request Reset Token
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');
        const passwordResetExpires = Date.now() + 3600000;

        user.passwordResetToken = resetToken;
        user.passwordResetExpires = passwordResetExpires;
        await user.save();

        console.log(`Password reset token for ${email}: ${resetToken}`);
        console.log(`(In a real app, this would be emailed to the user)`);

        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Error processing password reset request.' });
    }
});

// --- Task Routes ---

app.get('/api/tasks', auth, async (req, res) => {
    console.log('Fetch Tasks Route: Authenticated User ID:', req.user._id);
    try {
        const tasks = await Task.find({ user_id: req.user._id }).sort({ created_at: -1 });
        console.log('Tasks Fetched Successfully:', tasks.length, 'tasks');
        res.status(200).json(tasks);
    } catch (error) {
        console.error('Error in Fetch Tasks Route:', error);
        res.status(500).json({ error: 'Error fetching tasks.' });
    }
});

app.post('/api/tasks', auth, async (req, res) => {
    console.log('Add Task Route: Request Body:', req.body);
    console.log('Add Task Route: Authenticated User ID:', req.user._id);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
            throw new Error('Invalid user ID format.');
        }
        const task = new Task({ ...req.body, user_id: req.user._id });
        await task.save();
        console.log('Task Added Successfully:', task);
        res.status(201).json(task);
    } catch (error) {
        console.error('Error in Add Task Route:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Error creating task.' });
    }
});

app.patch('/api/tasks/:id', auth, async (req, res) => {
    console.log('Update Task Route: Task ID:', req.params.id, 'Request Body:', req.body);
    console.log('Update Task Route: Authenticated User ID:', req.user._id);
    try {
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, user_id: req.user._id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!task) return res.status(404).json({ error: 'Task not found.' });
        console.log('Task Updated Successfully:', task);
        res.status(200).json(task);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(400).json({ error: 'Error updating task.' });
    }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
    console.log('Delete Task Route: Task ID:', req.params.id);
    console.log('Delete Task Route: Authenticated User ID:', req.user._id);
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, user_id: req.user._id });
        if (!task) return res.status(404).json({ error: 'Task not found.' });
        console.log('Task Deleted Successfully:', task);
        res.status(200).json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Error deleting task.' });
    }
});

// --- NEW: File Storage Routes ---

// 1. Upload File(s)
app.post('/api/files/upload', auth, upload.array('files'), async (req, res) => {
    console.log('File Upload Route: Authenticated User ID:', req.user._id);
    console.log('Files Received:', req.files ? req.files.length : 0);
    if (req.files) {
        console.log('Multer Files Data:', req.files.map(f => ({ name: f.originalname, path: f.path })));
    }


    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded.' });
        }

        // Map Multer data to Mongoose schema objects
        const fileRecords = req.files.map(file => ({
            name: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path, // The local path where Multer saved the file
            user_id: req.user._id, // This MUST be a valid ObjectId
        }));

        // ATTEMPT DATABASE INSERTION
        await File.insertMany(fileRecords);
        
        console.log('SUCCESS: Files saved to DB successfully. Collection should be visible in Atlas now.');
        res.status(201).json({ message: `${req.files.length} file(s) uploaded and recorded.` });

    } catch (error) {
        // --- CRITICAL DEBUGGING LOGGING ---
        console.error('\n*** MONGODB INSERTION FAILED ***');
        console.error('Error Name:', error.name);
        console.error('Detailed Error Message:', error.message);
        if (error.errors) {
             console.error('Validation Errors:', error.errors);
        }
        // ----------------------------------

        // Clean up the locally saved files if the DB operation fails
        if (req.files) {
             req.files.forEach(file => {
                 fs.unlink(file.path, (err) => {
                     if (err) console.error(`Failed to cleanup file: ${file.path}`, err);
                 });
             });
             console.log('Cleaned up physical files due to DB error.');
        }

        res.status(500).json({ error: 'Failed to record file metadata in the database.' });
    }
});

// 2. Get Stored Files List
app.get('/api/files', auth, async (req, res) => {
    console.log('Fetch Files Route: Authenticated User ID:', req.user._id);
    try {
        const files = await File.find({ user_id: req.user._id }).sort({ uploadDate: -1 }).select('-__v'); 
        
        const fileData = files.map(file => ({
            _id: file._id,
            name: file.name,
            size: file.size,
            uploadDate: file.uploadDate,
            url: `${req.protocol}://${req.get('host')}/${file.path.replace(/\\/g, '/')}` // Replaces Windows backslashes
        }));

        console.log('Files Fetched Successfully:', fileData.length, 'files');
        res.status(200).json(fileData);
    } catch (error) {
        console.error('Error in Fetch Files Route:', error);
        res.status(500).json({ error: 'Error fetching stored files.' });
    }
});

// 3. Delete File
app.delete('/api/files/:fileId', auth, async (req, res) => {
    console.log('Delete File Route: File ID:', req.params.fileId);
    console.log('Delete File Route: Authenticated User ID:', req.user._id);
    try {
        const fileRecord = await File.findOneAndDelete({ 
            _id: req.params.fileId, 
            user_id: req.user._id 
        });

        if (!fileRecord) {
            return res.status(404).json({ error: 'File not found or unauthorized.' });
        }
        
        // --- Delete the actual file from the server's disk ---
        fs.unlink(fileRecord.path, (err) => {
            if (err) {
                console.error(`Error deleting physical file at ${fileRecord.path}:`, err);
                // Continue, as the database record is already gone.
            } else {
                console.log(`Physical file deleted successfully: ${fileRecord.path}`);
            }
        });
        // ----------------------------------------------------

        console.log('File DB record deleted successfully for ID:', req.params.fileId);
        res.status(200).json({ message: 'File deleted successfully.' });

    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Error deleting file.' });
    }
});
// ---------------------------------

// --- NEW: Admin Routes (Protected by auth and isAdmin middleware) ---

// Get all users (Admin only)
app.get('/api/admin/users', auth, isAdmin, async (req, res) => {
    console.log('Admin Users Route: Authenticated User:', req.user.email, 'Role:', req.user.role);
    try {
        const users = await User.find({}).select('-password -passwordResetToken -passwordResetExpires');
        console.log('Admin Users Fetched Successfully:', users.length, 'users');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching all users (admin):', error);
        res.status(500).json({ error: 'Error fetching users.' });
    }
});

// Update user role (Admin only)
app.patch('/api/admin/users/:userId/role', auth, isAdmin, async (req, res) => {
    console.log('Admin Update User Role Route: User ID:', req.params.userId, 'New Role:', req.body.newRole);
    console.log('Admin Update User Role Route: Admin User:', req.user.email);
    try {
        const { userId } = req.params;
        const { newRole } = req.body;

        if (!['user', 'admin'].includes(newRole)) {
            return res.status(400).json({ error: 'Invalid role specified.' });
        }

        if (req.user._id.toString() === userId) {
             // Change made to the previous logic: If user is updating their own role, this logic handles the 403 response.
             if (newRole === 'user') {
                return res.status(403).json({ error: 'Admins cannot demote themselves via this interface.' });
             }
        }

        const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true, runValidators: true });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        console.log('User Role Updated Successfully:', user.email, 'to', user.role);
        res.status(200).json({ message: `User role updated to ${newRole}`, user: { id: user._id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Error updating user role (admin):', error);
        res.status(500).json({ error: 'Error updating user role.' });
    }
});

// Delete a user (Admin only)
app.delete('/api/admin/users/:userId', auth, isAdmin, async (req, res) => {
    console.log('Admin Delete User Route: User ID:', req.params.userId);
    console.log('Admin Delete User Route: Admin User:', req.user.email);
    try {
        const { userId } = req.params;

        if (req.user._id.toString() === userId) {
            return res.status(403).json({ error: 'Admins cannot delete their own account via this interface.' });
        }

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Also delete all tasks associated with this user
        await Task.deleteMany({ user_id: userId });
        // NEW: Delete all files associated with this user
        const userFiles = await File.find({ user_id: userId });
        userFiles.forEach(file => {
             fs.unlink(file.path, (err) => {
                 if (err) console.error(`Failed to cleanup file for deleted user: ${file.path}`, err);
             });
        });
        await File.deleteMany({ user_id: userId });
        
        console.log('User, tasks, and files deleted successfully for user ID:', userId);
        res.status(200).json({ message: 'User and associated data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user (admin):', error);
        res.status(500).json({ error: 'Error deleting user.' });
    }
});

// Get all tasks (Admin only) - This is a global view of all tasks
app.get('/api/admin/tasks', auth, isAdmin, async (req, res) => {
    console.log('Admin All Tasks Route: Authenticated User:', req.user.email, 'Role:', req.user.role);
    try {
        const tasks = await Task.find({}).populate('user_id', 'email'); 
        const tasksWithUserEmail = tasks.map(task => ({
            ...task.toObject(),
            userEmail: task.user_id ? task.user_id.email : 'Unknown User'
        }));
        console.log('Admin All Tasks Fetched Successfully:', tasksWithUserEmail.length, 'tasks');
        res.status(200).json(tasksWithUserEmail);
    } catch (error) {
        console.error('Error fetching all tasks (admin):', error);
        res.status(500).json({ error: 'Error fetching all tasks.' });
    }
});

app.delete('/api/admin/tasks/:taskId', auth, isAdmin, async (req, res) => {
    console.log('Admin Delete Task Route: Task ID:', req.params.taskId);
    console.log('Admin Delete Task Route: Admin User:', req.user.email);
    try {
        const { taskId } = req.params;
        const task = await Task.findByIdAndDelete(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found.' });
        }
        console.log('Task deleted successfully (admin) for Task ID:', taskId);
        res.status(200).json({ message: 'Task deleted successfully.' });
    } catch (error) {
        console.error('Error deleting task (admin):', error);
        res.status(500).json({ error: 'Error deleting task.' });
    }
});

// --- NEW: Vault Key Management Routes (Protected) ---

// POST /api/vault/setup - Set the initial vault key and question
app.post('/api/vault/setup', auth, async (req, res) => {
    try {
        const { vaultKey, securityQuestion } = req.body;
        
        if (!vaultKey || !securityQuestion) {
            return res.status(400).json({ error: 'Vault Key and Security Question are required.' });
        }

        // Check if vault already exists for this user
        const existingVault = await VaultKey.findOne({ user_id: req.user._id });
        if (existingVault) {
            return res.status(400).json({ error: 'Vault key already set.' });
        }
        
        // Hash the vault key (using bcrypt for security, just like the login password)
        const hashedVaultKey = await bcrypt.hash(vaultKey, 10);

        const newVault = new VaultKey({
            vault_key_hash: hashedVaultKey,
            security_question: securityQuestion,
            user_id: req.user._id,
        });

        await newVault.save();
        res.status(201).json({ message: 'Vault setup complete.', success: true });
    } catch (error) {
        console.error('Vault setup error:', error);
        res.status(500).json({ error: 'Failed to set up vault key.' });
    }
});

// POST /api/vault/unlock - Verify the vault key
app.post('/api/vault/unlock', auth, async (req, res) => {
    try {
        const { vaultKey } = req.body;

        const vault = await VaultKey.findOne({ user_id: req.user._id });
        if (!vault) {
            return res.status(404).json({ error: 'Vault not set up.' });
        }

        const isMatch = await bcrypt.compare(vaultKey, vault.vault_key_hash);
        
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid vault key.' });
        }

        // SUCCESS: Vault unlocked. We can return the security question for display/reset.
        res.status(200).json({ message: 'Vault unlocked.', securityQuestion: vault.security_question });

    } catch (error) {
        console.error('Vault unlock error:', error);
        res.status(500).json({ error: 'Error processing unlock request.' });
    }
});

// GET /api/vault/status - Check if the vault is set up
app.get('/api/vault/status', auth, async (req, res) => {
    try {
        const vault = await VaultKey.findOne({ user_id: req.user._id }).select('security_question');
        res.status(200).json({ 
            isSetup: !!vault, 
            securityQuestion: vault ? vault.security_question : null 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error checking vault status.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
