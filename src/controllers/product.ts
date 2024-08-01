import { Request, Response, NextFunction } from "express";
import { TryCatch } from "../middlewares/error.js";
import { Product } from "../models/product.js";
import { myCache } from "../app.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import ErrorHandler from "../utils/utility-class.js";
import { rm } from "fs";
import { invalidateCache } from "../utils/features.js";

// Revalidate on New, Update, Delete Product and on new order
export const getLatestProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  let products;

  if (myCache.has("latest-products"))
    products = JSON.parse(myCache.get("latest-products") as string);
  else {
    products = await Product.find({}).sort({ createdAt: -1 }).limit(10);
    myCache.set("latest-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

// Revalidate on New, Update, Delete Product and on new order
export const getAllCategories = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  let categories;

  if (myCache.has("categories"))
    categories = JSON.parse(myCache.get("categories") as string);
  else {
    categories = await Product.distinct("category");
    myCache.set("categories", JSON.stringify(categories));
  }

  return res.status(200).json({
    success: true,
    categories,
  });
});

// Revalidate on New, Update, Delete Product and on new order
export const getAdminProducts = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  let products;

  if (myCache.has("admin-products"))
    products = JSON.parse(myCache.get("admin-products") as string);
  else {
    products = await Product.find({}).sort({createdAt: -1});
    myCache.set("admin-products", JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

// Revalidate on New, Update, Delete Product and on new order
export const getSingleProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  let product;
  const id = req.params.id;

  if (myCache.has(`product-${id}`))
    product = JSON.parse(myCache.get(`product-${id}`) as string);
  else {
    product = await Product.findById(id);
    if (!product) return next(new ErrorHandler("Product Not Found!", 404));
    myCache.set(`product-${id}`, JSON.stringify(product));
  }

  return res.status(200).json({
    success: true,
    product,
  });
});

// Revalidate on New, Update, Delete Product and on new order
export const getProductsByCategory = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  const category = req.params.category;
  console.log(category);

  if (!category) return next(new ErrorHandler("Category parameter is required", 400));

  let products;
  const key = `category-products-${category}`;

  // Try fetching from cache
  if (myCache.has(key)) {
    products = JSON.parse(myCache.get(key) as string);
  } else {
    products = await Product.find({ category: category.toLowerCase() });
    myCache.set(key, JSON.stringify(products));
  }

  return res.status(200).json({
    success: true,
    products,
  });
});

export const newProduct = TryCatch(
  async (req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
    const { name, category, price, stock, description, size, color } = req.body;
    const photo = req.file;

    if (!photo) return next(new ErrorHandler("Please Add Photo!", 400));

    if (!name || !category || !price || !stock || !description || !size || !color) {
      rm(photo.path, () => {
        console.log("Deleted!");
      });

      return next(new ErrorHandler("Please Enter All Fields!", 400));
    }

    await Product.create({
      name,
      category: category.toLowerCase(),
      price,
      stock,
      description,
      size,
      color,
      photo: photo.path,
    });

    invalidateCache({ product: true, admin: true})

    return res.status(201).json({
      success: true,
      message: "Product Created Successfully!",
    });
  }
);

export const updateProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { name, category, price, stock } = req.body;
  const photo = req.file;
  const product = await Product.findById(id);

  if (!product) return next(new ErrorHandler("Product Not Found!", 404));

  if (photo) {
    rm(product.photo, () => {
      console.log("Old Photo Deleted!");

      product.photo = photo.path;
    });
  }

  if (name) product.name = name;
  if (category) product.category = category.toLowerCase();
  if (price) product.price = price;
  if (stock) product.stock = stock;

  await product.save();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Updated Successfully!",
  });
});

export const deleteProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  const product = await Product.findById(req.params.id);

  if (!product) return next(new ErrorHandler("Product Not Found!", 404));

  rm(product.photo, () => {
    console.log("Product Photo Deleted!");
  });

  await product.deleteOne();

  invalidateCache({
    product: true,
    productId: String(product._id),
    admin: true,
  });

  return res.status(200).json({
    success: true,
    message: "Product Deleted Successfully!",
  });
});

export const getAllProducts = TryCatch(
  async (req: Request<{}, {}, {}, SearchRequestQuery>, res: Response, next: NextFunction) => {
    const { search, category, price, sort } = req.query;

    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCT_PER_PAGE) || 20;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};

    if (search)
      baseQuery.name = {
        $regex: search,
        $options: "i",
      };

    if (price)
      baseQuery.price = {
        $lte: Number(price),
      };

    if (category) baseQuery.category = category;

    const productPromise = Product.find(baseQuery)
      .sort(sort && { price: sort === "asc" ? 1 : -1 })
      .limit(limit)
      .skip(skip);

    // all filtered products without sorting and limit stored in allFilteredProducts
    const [products, allFilteredProducts] = await Promise.all([
      productPromise,
      Product.find(baseQuery),
    ]);

    const totalPage = Math.ceil(allFilteredProducts.length / limit);

    return res.status(200).json({
      success: true,
      products,
      totalPage,
    });
  }
);
