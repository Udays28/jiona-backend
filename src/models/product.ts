import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter Name"],
    },
    photo: {
      type: String,
      required: [true, "Please add Photo"],
    },
    price: {
      type: Number,
      required: [true, "Please enter Price"],
    },
    stock: {
      type: Number,
      required: [true, "Please enter Stock"],
    },
    category: {
      type: String,
      required: [true, "Please enter Category"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Please enter Description"],
    },
    size: {
      type: String,
      enum: ["XS", "S", "M", "L", "XL", "XXL", "regular"],
      default: "regular",
    },
    color: {
      type: String,
      required: [true, "Please enter Color"],
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model("Product", schema);
