import express from 'express';
import path from 'path';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`DEBUG: Starting server in ${process.env.NODE_ENV || 'development'} mode`);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', mode: process.env.NODE_ENV || 'development' });
  });

  // Lazy Stripe initialization
  let stripe: Stripe | null = null;
  const getStripe = () => {
    if (!stripe) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not configured in .env');
      }
      stripe = new Stripe(key);
    }
    return stripe;
  };

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
      const transportReceiver = (process.env.EMAIL_RECEIVER || "27mahvishsid@gmail.com, mohdjaved52677@gmail.com, javeddd@student.iul.ac.in").trim();

      if (!transportUser || !transportPass) {
        const missing = [];
        if (!transportUser) missing.push('EMAIL_USER');
        if (!transportPass) missing.push('EMAIL_PASS');
        
        console.warn(`MAIL: Missing config: ${missing.join(', ')}`);
        return res.json({ 
          success: true, 
          message: `Stored in Database. To enable email, add ${missing.join(' and ')} in the Settings menu.` 
        });
      }

      console.log(`DEBUG: SMTP Attempt | User: ${transportUser} | PassLength: ${transportPass.length} | To: ${transportReceiver}`);

      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: transportUser,
          pass: transportPass,
        },
        timeout: 10000 // 10 second timeout
      } as any);

      try {
        console.log(`DEBUG: SMTP Verifying...`);
        await transporter.verify();
        console.log('DEBUG: SMTP connection verified successfully');
      } catch (verifyErr: any) {
        console.error('DEBUG: SMTP Auth Failed:', verifyErr.message);
        const isUniEmail = transportUser.includes('.edu') || transportUser.includes('.ac.in');
        return res.status(401).json({ 
          error: 'Gmail Authentication Failed',
          details: `The App Password for ${transportUser} was rejected. ${isUniEmail ? 'University accounts often block App Passwords—try a personal @gmail.com account.' : 'Check if 2FA is on and you copied all 16 characters.'}`
        });
      }

      const mailOptions = {
        from: `"NikaahConnect" <${transportUser}>`,
        to: transportReceiver,
        subject: `NikaahConnect - New ${type} from ${name}`,
        text: `
Type: ${type}
Name: ${name}
Email: ${email}
Message:
${message}

---
Sent via NikaahConnect Platform
        `,
        replyTo: email
      };

      await transporter.sendMail(mailOptions);
      const successMessage = type === 'Feedback' ? 'Feedback sent successfully' : 'Email sent successfully';
      res.json({ success: true, message: successMessage });
    } catch (error: any) {
      console.error('Mail Error:', error);
      res.status(500).json({ error: 'Failed to send email but stored in database.' });
    }
  });

  // API Route for creating a Stripe Checkout Session
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { priceId, userId, userEmail } = req.body;

      if (!userId || !userEmail) {
        return res.status(400).json({ error: 'Missing user information' });
      }

      // Check if Stripe is configured
      const key = process.env.STRIPE_SECRET_KEY;
      const isDemo = !key || key.includes('demo') || (priceId && (priceId.includes('placeholder') || priceId.includes('demo')));
      
      if (isDemo) {
        console.warn('STRIPE: Entering Demo Mode (Missing or demo keys).');
        // In demo mode, we just redirect back to the success URL
        const origin = req.headers.origin || req.headers.referer || 'http://localhost:3000';
        const baseUrl = new URL(origin).origin;
        const demoUrl = `${baseUrl}/dashboard?session_id=demo_session_${userId}_${Date.now()}&success=true`;
        console.log('DEBUG: Generated Demo URL:', demoUrl);
        return res.json({ id: 'demo_id', url: demoUrl });
      }

      const stripeClient = getStripe();

      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${req.headers.origin}/dashboard?success=false`,
        customer_email: userEmail,
        client_reference_id: userId,
        metadata: {
          userId: userId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for verifying a checkout session
  app.get('/api/verify-session', async (req, res) => {
    try {
      const { sessionId } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'Missing session ID' });
      }

      if (sessionId.startsWith('demo_session_')) {
        const parts = sessionId.split('_');
        const demoUserId = parts[2];
        return res.json({ 
          status: 'paid', 
          userId: demoUserId, 
          customerEmail: 'demo@example.com'
        });
      }

      const stripeClient = getStripe();
      const session = await stripeClient.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        res.json({ 
          status: 'paid', 
          userId: session.client_reference_id,
          customerEmail: session.customer_email 
        });
      } else {
        res.json({ status: session.payment_status });
      }
    } catch (error: any) {
      console.error('Verify Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
