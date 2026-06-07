const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

// Enable CORS so the app can talk to the server from different IP/ports
app.use(cors());
app.use(express.json());

// Serve static UI files
app.use(express.static(__dirname));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'funny_snack.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    // Create draft_buffer table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS draft_buffer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tempId INTEGER,
      name TEXT,
      category TEXT,
      supplier_id TEXT,
      quantity INTEGER,
      purchase_price REAL,
      selling_price REAL,
      expiry_date TEXT,
      barcode TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// Get temporary draft
app.get('/api/draft', (req, res) => {
  db.all('SELECT tempId, name, category, supplier_id, quantity, purchase_price, selling_price, expiry_date, barcode FROM draft_buffer ORDER BY tempId ASC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ items: rows });
  });
});

// Save temporary draft
app.post('/api/draft', (req, res) => {
  const { items } = req.body;
  
  db.serialize(() => {
    db.run('DELETE FROM draft_buffer', [], (err) => {
      if (err) {
        console.error('Error clearing draft:', err.message);
      }
    });

    if (!items || items.length === 0) {
      res.json({ success: true, message: 'Draft cleared.' });
      return;
    }

    const stmt = db.prepare(`INSERT INTO draft_buffer 
      (tempId, name, category, supplier_id, quantity, purchase_price, selling_price, expiry_date, barcode) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    items.forEach((item) => {
      stmt.run(
        item.tempId,
        item.name,
        item.category,
        item.supplier_id,
        item.quantity,
        item.purchase_price,
        item.selling_price || 0,
        item.expiry_date || '',
        item.barcode || ''
      );
    });

    stmt.finalize((err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ success: true, count: items.length });
      }
    });
  });
});

// Fallback route to serve UI
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`퍼니스낵 재고관리 로컬 서버가 성공적으로 실행되었습니다!`);
  console.log(`PC 브라우저 주소: http://localhost:${port}`);
  console.log(`모바일(폰) 접속 주소: PC와 동일한 공유기(Wi-Fi)에 연결한 뒤,`);
  console.log(`PC의 IP 주소(예: http://192.168.0.XX:${port})로 접속하세요.`);
  console.log(`=============================================================`);
});
