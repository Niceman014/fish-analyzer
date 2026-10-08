require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Production CORS setup (supports environment-defined allowed origins)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`);
  }
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Dynamically resolve Python script path
function getPythonScriptPath() {
  const possibleNames = ['analyze_fish.py', 'analyze_fish_3.py', 'analyze_fish_4.py'];
  for (const name of possibleNames) {
    const scriptPath = path.join(__dirname, name);
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
  }
  return path.join(__dirname, 'analyze_fish.py');
}

app.post('/api/analyze', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  // Ensure API key is configured on the server
  if (!process.env.GROQ_API_KEY) {
    fs.unlink(req.file.path, () => {});
    return res.status(500).json({ error: 'Server configuration error: GROQ_API_KEY is missing.' });
  }

  const imagePath = req.file.path;
  const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';
  const scriptPath = getPythonScriptPath();

  const pythonProcess = spawn(pythonExecutable, [
    scriptPath,
    imagePath
  ], {
    env: { 
      ...process.env, 
      GROQ_API_KEY: process.env.GROQ_API_KEY 
    }
  });

  let pythonData = '';
  let pythonError = '';

  pythonProcess.stdout.on('data', (data) => {
    pythonData += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    pythonError += data.toString();
  });

  pythonProcess.on('close', (code) => {
    // Delete temporary upload file safely
    fs.unlink(imagePath, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    if (code !== 0) {
      console.error('Python Error Log:', pythonError);
      return res.status(500).json({ 
        error: pythonError.trim() || 'Fish analysis process failed.' 
      });
    }

    try {
      const result = JSON.parse(pythonData.trim());
      return res.json(result);
    } catch (e) {
      console.error('Python Output:', pythonData);
      return res.status(500).json({ 
        error: 'Failed to parse model response.' 
      });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Fish Analyzer backend running on port ${PORT}`);
});