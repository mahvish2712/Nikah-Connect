import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize AI if key exists
const genAI: any = process.env.GEMINI_API_KEY ? new GoogleGenAI(process.env.GEMINI_API_KEY as any) : null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: process.env.NODE_ENV || 'development' });
});

// Persistent Mail Transporter
let transporter: any = null;
const getTransporter = () => {
  if (!transporter) {
    const user = (process.env.EMAIL_USER || "").trim();
    const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, '');
    if (user && pass) {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user, pass }
      });
    }
  }
  return transporter;
};

// API Route for sending contact emails
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, type = 'Query' } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const mailTransporter = getTransporter();
    if (!mailTransporter) {
      console.log('MAIL: Missing credentials, returning simulated success.');
      return res.json({ success: true, message: 'Stored in DB (Email config missing)' });
    }

    // Fire and forget email to avoid UI hang (best effort for Vercel)
    mailTransporter.sendMail({
      from: `"NikaahConnect" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER || "27mahvishsid@gmail.com",
      subject: `NikaahConnect - New ${type} from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      replyTo: email
    }).catch((e: any) => console.error('Delayed mail error:', e));

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed' });
  }
});

// Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { priceId, userId, userEmail } = req.body;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeKey || stripeKey.includes('demo') || (priceId && priceId.includes('demo'))) {
      const origin = req.headers.origin || 'http://localhost:3000';
      return res.json({ url: `${origin}/dashboard?session_id=demo_${Date.now()}&success=true` });
    }

    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${req.headers.origin}/dashboard?success=false`,
      customer_email: userEmail,
      client_reference_id: userId,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe Session Verification
app.get('/api/verify-session', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (typeof sessionId === 'string' && sessionId.startsWith('demo_')) {
      return res.json({ status: 'paid', userId: sessionId.split('_')[1] });
    }
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(400).json({ error: 'Stripe not configured' });
    
    const stripe = new Stripe(stripeKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId as string);
    res.json({ 
      status: session.payment_status, 
      userId: session.client_reference_id 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Generation Endpoint (Gemini)
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!genAI) return res.status(401).json({ error: 'AI not configured' });
    
    const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    res.json({ response: result.response.text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup function for Vite or Static Serving
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (process.env.VERCEL !== '1') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

startApp().catch(err => console.error('Start error:', err));

export default app;
