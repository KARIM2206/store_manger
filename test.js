const query = `UPDATE products SET 
        name = ?, sku = ?, barcode = ?, category_id = ?, unit_id = ?, 
        purchase_price = ?, selling_price = ?, minimum_stock = ?, 
        maximum_stock = ?, description = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`;

const match = query.trim().match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
if (match) {
    console.log("table:", match[1]);
    console.log("where:", match[3]);
    const setParts = match[2].split(",").map(s => s.trim());
    console.log("setParts length:", setParts.length);
    console.log("last part:", setParts[setParts.length - 1]);
} else {
    console.log("No match");
}
