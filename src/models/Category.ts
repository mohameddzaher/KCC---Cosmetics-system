import mongoose, { Schema, Document } from 'mongoose';

/**
 * Category — the admin-editable product taxonomy that drives the sample quiz.
 * Replaces the static categories.json as the live source of truth.
 * main category -> subcategories -> items (level-3 product names).
 */

export interface ISubCategory {
  name: string;
  slug: string;
  items: string[];
  order: number;
}

export interface ICategory extends Document {
  name: string;
  slug: string;
  order: number;
  active: boolean;
  subcategories: ISubCategory[];
  createdAt: Date;
  updatedAt: Date;
}

const SubCategorySchema = new Schema<ISubCategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    items: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    subcategories: { type: [SubCategorySchema], default: [] },
  },
  { timestamps: true }
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ order: 1 });

const Category =
  mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);
export default Category;
