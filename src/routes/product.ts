import express from "express";
import { AdminOnly } from "../middlewares/auth.js";
import {
  deleteProduct,
  getAdminProducts,
  getAllCategories,
  getAllProducts,
  getLatestProduct,
  getSingleProduct,
  newProduct,
  updateProduct,
  getProductsByCategory,  // Import the new controller function
} from "../controllers/product.js";
import { singleUpload } from "../middlewares/multer.js";

const app = express.Router();

// to create new product
app.post("/new", AdminOnly, singleUpload, newProduct);

// to get all products with filters
app.get("/all", getAllProducts);

// to get last 5 products
app.get("/latest", getLatestProduct);

// to get all unique categories
app.get("/categories", getAllCategories);

// to get all products
app.get("/admin-products", AdminOnly, getAdminProducts);

// to get products by category
app.get("/category/:category", getProductsByCategory);  // New route for category-based product fetching

// to get, update and delete
app
  .route("/:id")
  .get(getSingleProduct)
  .put(AdminOnly, singleUpload, updateProduct)
  .delete(AdminOnly, deleteProduct);

export default app;
