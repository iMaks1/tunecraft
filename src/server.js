require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://maksly1008_db_user:ECKfzqLlpUlraSv5@tunecraft.wpu893s.mongodb.net/tunecraft?retryWrites=true&w=majority';

if (!process.env.MONGODB_URI) {
    console.warn('WARNING: MONGODB_URI is not defined in environment variables, using fallback URI');
}

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

// Monitor connection
mongoose.connection.on('error', err => {
    console.error('Mongoose connection error:', err);
});

// Define Order Schema
const orderSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    status: { type: String, default: 'pending_payment' },
    date: { type: Date, default: Date.now },
    stripe_session_id: String,
    amount_total: Number,
    payment_status: String,
    formData: Object
});

const Order = mongoose.model('Order', orderSchema);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Basic Auth Middleware
const checkAuth = (req, res, next) => {
    // Credentials: TuneCraftAdmin1002 / Admin1002#
    const auth = {login: 'TuneCraftAdmin1002', password: 'Admin1002#'}
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    if (login && password && login === auth.login && password === auth.password) {
        return next()
    }
    res.set('WWW-Authenticate', 'Basic realm="TuneCraft Admin"')
    res.status(401).send('Authentication required.')
}

// Serve static assets from specific directories
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/media', express.static(path.join(__dirname, 'media')));

// Serve HTML pages explicitly
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/create.html', (req, res) => res.sendFile(path.join(__dirname, 'create.html')));
app.get('/success.html', (req, res) => res.sendFile(path.join(__dirname, 'success.html')));
app.get('/terms.html', (req, res) => res.sendFile(path.join(__dirname, 'terms.html')));
app.get('/privacy.html', (req, res) => res.sendFile(path.join(__dirname, 'privacy.html')));
app.get('/track-order.html', (req, res) => res.sendFile(path.join(__dirname, 'track-order.html')));
app.get('/reviews.html', (req, res) => res.sendFile(path.join(__dirname, 'reviews.html')));

// Create Stripe Checkout Session
app.post('/create-checkout-session', async (req, res) => {
    try {
        const formData = req.body;
        const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';
        console.log("Domain: " + DOMAIN)
        // Create a unique Order ID
        const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Save preliminary order data to MongoDB
        const newOrder = new Order({
            id: orderId,
            status: 'pending_payment',
            formData: formData
        });
        
        await newOrder.save();

        // Determine price based on delivery speed
        // Default price (Standard)
        let unitAmount = 5000; // $50.00 in cents
        
        if (formData.deliverySpeed === 'express') {
             unitAmount = 9900; // $99.00 in cents
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Custom Song for ${formData.recipientName || 'Loved One'}`,
                            description: `Genre: ${formData.genre}, Voice: ${formData.voiceGender}`,
                        },
                        unit_amount: unitAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${DOMAIN}/success.html?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
            cancel_url: `${DOMAIN}/create.html`,
            metadata: {
                orderId: orderId,
                recipientName: formData.recipientName
            },
            customer_email: formData.email, 
        });

        res.json({ id: session.id, url: session.url });

    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to verify payment and update order status (called from success page or webhook)
app.get('/verify-payment', async (req, res) => {
    const { session_id, order_id } = req.query;
    
    if (!session_id || !order_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);
        
        if (session.payment_status === 'paid') {
            // Update MongoDB order status
            const updatedOrder = await Order.findOneAndUpdate(
                { id: order_id },
                { 
                    status: 'paid',
                    stripe_session_id: session_id,
                    amount_total: session.amount_total,
                    payment_status: session.payment_status
                },
                { new: true }
            );
            
            res.json({ success: true, order: updatedOrder });
        } else {
            res.json({ success: false, status: session.payment_status });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});

// Admin Routes
app.get('/secret-admin-panel', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/admin/orders', checkAuth, async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders for admin:', err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

