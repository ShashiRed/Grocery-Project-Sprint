const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();

// 1. CRITICAL MIDDLEWARE (Must be at the top to parse incoming JSON & handle CORS)
app.use(express.json());
app.use(cors());

// Static file serving
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Configure your database connection using cloud environment variables
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'grocery_store',
    port: process.env.MYSQLPORT || 3306
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL Database successfully.');
});

// ==========================================
// 1. SOFT DELETE CUSTOMER DETAILS (US_Prog_004)
// ==========================================
app.put('/api/customer/delete/:id', (req, res) => {
    const customerId = req.params.id;
    const query = "UPDATE customers SET status = 'Inactive' WHERE customer_id = ?";
    
    db.query(query, [customerId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log("Your Profile is Inactivated Successfully");
        res.json({ message: "Your Profile is Inactivated Successfully" });
    });
});

// ==========================================
// 2. ACTIVATE CUSTOMER PROFILE (US_Prog_005)
// ==========================================
app.put('/api/customer/activate/:id', (req, res) => {
    const customerId = req.params.id;
    const query = "UPDATE customers SET status = 'Active' WHERE customer_id = ?";
    
    db.query(query, [customerId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        console.log("Your Profile is Activated Successfully");
        res.json({ message: "Your Profile is Activated Successfully" });
    });
});

// ==========================================
// 3. SEARCH CUSTOMER BY EMAIL DOMAIN (US_Prog_006)
// ==========================================
app.get('/api/customers/search', (req, res) => {
    const domain = req.query.domain;
    const query = "SELECT customer_id, customer_name, customer_email FROM customers WHERE customer_email LIKE ? ORDER BY customer_id ASC";
    
    db.query(query, [`%@${domain}`], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            console.log(`No such customer is registered with ${domain}`);
            return res.json({ message: `No such customer is registered with ${domain}` });
        }
        
        results.forEach(cust => {
            console.log(`${cust.customer_id} ${cust.customer_name} ${cust.customer_email}`);
        });
        
        res.json(results);
    });
});

// ==========================================
// 4. SQL BACKEND QUERY ENDPOINTS (US_SQL_008 to 010)
// ==========================================

app.get('/api/reports/customer-orders', (req, res) => {
    const query = `
        SELECT c.customer_id, c.customer_name, o.order_id 
        FROM customers c 
        JOIN orders o ON c.customer_id = o.customer_id 
        ORDER BY c.customer_id ASC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/products/expensive', (req, res) => {
    const query = "SELECT * FROM products WHERE price > 1000";
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/reports/frequent-buyers', (req, res) => {
    const query = `
        SELECT c.customer_id, c.customer_name, COUNT(o.product_id) as total_products
        FROM customers c
        JOIN transactions o ON c.customer_id = o.customer_id
        GROUP BY c.customer_id, c.customer_name
        HAVING COUNT(o.product_id) > 5
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 5. CART ENDPOINTS
// ==========================================

app.post('/api/cart/add', (req, res) => {
    const { customer_id, product_id, quantity } = req.body;
    const query = "INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)";
    db.query(query, [customer_id, product_id, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product added to cart successfully!" });
    });
});

app.get('/api/cart/:customer_id', (req, res) => {
    const customerId = req.params.customer_id;
    const query = `
        SELECT c.cart_id, p.product_id, p.product_name, p.price, c.quantity 
        FROM cart c 
        JOIN products p ON c.product_id = p.product_id 
        WHERE c.customer_id = ?
    `;
    db.query(query, [customerId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.delete('/api/cart/delete/:cart_id', (req, res) => {
    const cartId = req.params.cart_id;
    const query = "DELETE FROM cart WHERE cart_id = ?";
    
    db.query(query, [cartId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Item deleted from cart successfully!" });
    });
});


// ==========================================
// 6. TRANSACTION & CHECKOUT ENDPOINTS
// ==========================================
app.post('/api/transaction/checkout', (req, res) => {
    const { customer_id, payment_method, total_amount } = req.body;
    
    const insertQuery = "INSERT INTO transactions (customer_id, total_amount, payment_method) VALUES (?, ?, ?)";
    db.query(insertQuery, [customer_id, total_amount, payment_method], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const transactionId = result.insertId;

        const clearCartQuery = "DELETE FROM cart WHERE customer_id = ?";
        db.query(clearCartQuery, [customer_id], (clearErr) => {
            if (clearErr) console.error("Error clearing cart:", clearErr);
            
            res.json({ 
                success: true, 
                transaction_id: transactionId,
                message: "Transaction completed successfully!" 
            });
        });
    });
});

// Start server with dynamic cloud port assignment
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
