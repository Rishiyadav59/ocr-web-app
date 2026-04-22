const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

let history = [];

// --- OCR API ROUTE ---
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file" });
        
        // This is the OCR System
        const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng');
        
        const newEntry = { id: Date.now(), text, date: new Date().toLocaleString() };
        history.unshift(newEntry);
        res.json(newEntry);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/history', (req, res) => res.json(history));

// --- FRONTEND ROUTE ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>OCR System</title>
        <style>
            body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; line-height: 1.6; }
            .box { border: 2px dashed #007bff; padding: 20px; text-align: center; border-radius: 8px; background: #f9f9f9; }
            .result-box { background: #eee; padding: 15px; margin-top: 20px; white-space: pre-wrap; border: 1px solid #ccc; }
            .history-item { border-bottom: 1px solid #ddd; padding: 10px 0; font-size: 14px; }
            button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        </style>
    </head>
    <body>
        <h1>AI Text Extractor</h1>
        <div class="box">
            <input type="file" id="imageInput" accept="image/*"><br><br>
            <button onclick="uploadImage()" id="btn">Convert to Text</button>
        </div>
        <div id="status"></div>
        <div id="result"></div>
        <hr>
        <h3>History</h3>
        <div id="history"></div>

        <script>
            async function uploadImage() {
                const file = document.getElementById('imageInput').files[0];
                if(!file) return alert("Select image!");
                
                const btn = document.getElementById('btn');
                const status = document.getElementById('status');
                btn.disabled = true;
                status.innerText = "Processing OCR... please wait...";

                const formData = new FormData();
                formData.append('image', file);

                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();

                if(data.text) {
                    document.getElementById('result').innerHTML = \`
                        <div class="result-box">
                            <strong>Extracted Text:</strong><br>\${data.text}
                            <br><button onclick="navigator.clipboard.writeText(\\\`\${data.text}\\\`); alert('Copied!')">Copy Text</button>
                        </div>\`;
                    loadHistory();
                }
                btn.disabled = false;
                status.innerText = "";
            }

            async function loadHistory() {
                const res = await fetch('/api/history');
                const data = await res.json();
                document.getElementById('history').innerHTML = data.map(h => \`
                    <div class="history-item">
                        <strong>\${h.date}</strong>: \${h.text.substring(0, 50)}...
                    </div>\`).join('');
            }
            loadHistory();
        </script>
    </body>
    </html>
    `);
});

app.listen(5000, () => console.log("🚀 App running on http://localhost:5000"));