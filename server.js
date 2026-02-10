require('dotenv').config();
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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

        // Create a unique Order ID
        const orderId = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        
        // Save preliminary order data
        const orderData = {
            id: orderId,
            status: 'pending_payment',
            date: new Date().toISOString(),
            formData: formData
        };
        
        saveOrder(orderData);

        // Determine price based on logic (e.g., Sibling discount)
        // Default price
        let unitAmount = 19900; // $199.00 in cents
        
        if (formData.recipientType === 'Sibling') {
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
            // Update local order status
            const orders = JSON.parse(fs.readFileSync(DB_FILE));
            const orderIndex = orders.findIndex(o => o.id === order_id);
            
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'paid';
                orders[orderIndex].stripe_session_id = session_id;
                orders[orderIndex].amount_total = session.amount_total;
                orders[orderIndex].payment_status = session.payment_status;
                fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
            }
            
            res.json({ success: true, order: orders[orderIndex] });
        } else {
            res.json({ success: false, status: session.payment_status });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
