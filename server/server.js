// server/server.js
const express = require("express")
const bodyParser = require("body-parser")
const nodemailer = require("nodemailer")
const cors = require("cors")
const path = require("path")
const sqlite3 = require("sqlite3").verbose()
const { Parser } = require("json2csv")
const rateLimit = require("express-rate-limit")
require("dotenv").config()

const app = express()
const PORT = process.env.SERVER_PORT || 3001

// Rate limiting
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: "Too many contact form submissions, please try again later.",
  },
})

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:3001"]

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = "The CORS policy for this site does not allow access from the specified Origin."
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
  }),
)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Database setup
const dbPath = path.join(__dirname, "dvm_messages.db")
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err)
    return
  }
  console.log("Connected to the DVM SQLite database.")

  // Create messages table if it doesn't exist
  db.run(
    `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
    (err) => {
      if (err) {
        console.error("Error creating table:", err)
      } else {
        console.log("DVM Messages table ready")
      }
    },
  )
})

// Email transporter setup
const transporter = nodemailer.createTransporter({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("Email configuration error:", error)
  } else {
    console.log("Email server is ready to send messages")
  }
})

// Helper function to save message to database
function saveMessage(name, email, message, ipAddress, userAgent) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "INSERT INTO messages (name, email, message, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    )
    stmt.run([name, email, message, ipAddress, userAgent], function (err) {
      if (err) {
        reject(err)
      } else {
        resolve(this.lastID)
      }
    })
    stmt.finalize()
  })
}

// Helper function to send email
function sendContactEmail(name, email, message) {
  const submissionId = `dvm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const mailOptions = {
    from: `"${name}" <${process.env.EMAIL_USER}>`,
    to: process.env.RECEIVER_EMAIL,
    subject: `New DVM Contact Form Submission - ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px;">
        <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);">
          <h1 style="color: #333; margin: 0; font-size: 28px; background: linear-gradient(135deg, #ffd700, #ff6b35, #e91e63, #9c27b0, #00bcd4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
            🚀 New DVM Contact Form Submission
          </h1>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 5px solid #9c27b0;">
            <h3 style="color: #495057; margin-bottom: 20px;">📋 Contact Details:</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
            <p><strong>ID:</strong> ${submissionId}</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); padding: 25px; border-radius: 10px;">
            <h3 style="color: #1976d2; margin-bottom: 20px;">💬 Message:</h3>
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <p style="color: #333; line-height: 1.8; margin: 0; white-space: pre-wrap;">${message}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 2px solid #f1f3f4;">
            <h3 style="color: #333; font-weight: bold; margin-bottom: 10px;">Department of Visual Media 🎯</h3>
            <p style="color: #666; font-style: italic;">Empowering the Future through Visual Innovation</p>
          </div>
        </div>
      </div>
    `,
    text: `New DVM Contact Form Submission

From: ${name} (${email})
Submitted: ${new Date().toISOString()}
ID: ${submissionId}

Message:
${message}

---
Department of Visual Media
Empowering the Future through Visual Innovation`,
  }

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error)
        reject(error)
      } else {
        console.log("Email sent: " + info.response)
        resolve(info)
      }
    })
  })
}

// Form validation
function validateForm(data) {
  const { name, email, message } = data
  const errors = []

  if (!name || name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long")
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please provide a valid email address")
  }

  if (!message || message.trim().length < 10) {
    errors.push("Message must be at least 10 characters long")
  }

  return errors
}

// Error handling middleware for async routes
const asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next)
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "DVM Contact Server",
    timestamp: new Date().toISOString(),
  })
})

// Contact form endpoint
app.post(
  "/contact",
  contactLimiter,
  asyncHandler(async (req, res) => {
    const errors = validateForm(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors })
    }

    const { name, email, message } = req.body
    const ipAddress = req.ip || req.connection.remoteAddress
    const userAgent = req.get("User-Agent")

    try {
      // Save to database
      const messageId = await saveMessage(name, email, message, ipAddress, userAgent)
      console.log(`Message saved with ID: ${messageId}`)

      // Send email
      await sendContactEmail(name, email, message)

      return res.json({
        success: true,
        message: "Thank you for your interest! We'll get back to you soon.",
        id: messageId,
      })
    } catch (error) {
      console.error("Error processing contact form:", error)
      throw error
    }
  }),
)

// 🔐 Protected route to view messages as JSON
app.get("/admin/messages", (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" })
  }

  db.all("SELECT * FROM messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
    res.json({ count: rows.length, messages: rows })
  })
})

// 🔐 Protected route to download messages as CSV
app.get("/admin/messages.csv", (req, res) => {
  if (req.query.key !== process.env.ADMIN_KEY) {
    return res.status(403).send("Forbidden")
  }

  db.all("SELECT * FROM messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      return res.status(500).send("Error generating CSV")
    }

    try {
      const parser = new Parser()
      const csv = parser.parse(rows)

      res.header("Content-Type", "text/csv")
      res.attachment("dvm_messages_backup.csv")
      res.send(csv)
    } catch (parseError) {
      res.status(500).send("CSV conversion error")
    }
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    success: false,
    message: "An error occurred on the server.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found",
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`DVM Contact Server is running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
  console.log(`Contact endpoint: http://localhost:${PORT}/contact`)
})

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully")
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err)
    } else {
      console.log("Database connection closed.")
    }
    process.exit(0)
  })
})

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err)
  db.close((closeErr) => {
    if (closeErr) {
      console.error("Error closing database:", closeErr)
    }
    process.exit(1)
  })
})
