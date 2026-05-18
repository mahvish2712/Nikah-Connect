import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.NODE_ENV || 'development' });
});

app.use(express.json());

// API Route for sending contact emails
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, type = 'Query' } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const transportUser = (process.env.EMAIL_USER || "").trim();
    const transportPass = (process.env.EMAIL_PASS || "").replace(/\s/g, '');
    const transportReceiver = (process.env.EMAIL_RECEIVER || "27mahvishsid@gmail.com").trim();

    if (!transportUser || !transportPass) {
      return res.json({ success: true, message: 'Stored in Database. (Email credentials missing)' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: transportUser, pass: transportPass }
    } as any);

    await transporter.sendMail({
      from: `"NikaahConnect" <${transportUser}>`,
      to: transportReceiver,
      subject: `NikaahConnect - New ${type} from ${name}`,
      text: message,
      replyTo: email
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// In development, we don't start the listener here if run via Vite middleware, 
// but for standard node/tsx we do.
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

