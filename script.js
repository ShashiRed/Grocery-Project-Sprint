// Base API URL for your backend server (relative path works automatically in both local and cloud)
const API_URL = '/api';

// Function to add a product to the cart (used in index.html)
function addToCart(productId) {
    const customerId = 1; // Default test customer ID

    fetch(`${API_URL}/cart/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customerId, product_id: productId, quantity: 1 })
    })
    .then(response => response.json())
    .then(data => {
        alert("Product added to cart successfully!");
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        alert("Failed to add product to cart.");
    });
}

function removeItem(cartId) {
    fetch(`${API_URL}/cart/delete/${cartId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        alert("Item removed from cart!");
        location.reload(); // Refresh page to update the cart list
    })
    .catch(error => {
        console.error('Error deleting item:', error);
        alert("Failed to delete item.");
    });
}
