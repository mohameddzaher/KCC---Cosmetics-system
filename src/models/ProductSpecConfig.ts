import mongoose, { Schema, Document } from 'mongoose';
import type { SpecCategoryKey } from './SpecOptionMaster';

/**
 * ProductSpecConfig — per-product (level-3 item) spec configuration.
 * Admin defines which spec categories show, which options are allowed,
 * titles, max-select, required flag, sort order.
 *
 * Customer quiz fetches by productKey and renders Phase 4 dynamically.
 */

export interface IProductSpec {
  specKey: SpecCategoryKey;
  enabled: boolean;
  titleEn?: string;
  titleAr?: string;
  subtitleEn?: string;
  subtitleAr?: string;
  maxSelect: number;
  isRequired: boolean;
  sortOrder: number;
  allowedOptions: string[]; // subset of values from SpecOptionMaster.options
}

export interface IProductSpecConfig extends Document {
  productKey: string;        // e.g. "hair-care__shampoo__anti-dandruff-sulphate-free"
  mainSlug: string;
  subSlug: string;
  itemName: string;
  specs: IProductSpec[];
  notes?: string;            // internal admin notes
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSpecSchema = new Schema<IProductSpec>(
  {
    // Matches whatever categories exist in SpecOptionMaster, which is also
    // unconstrained: an enum here would silently reject a category the admin
    // added — `fragrance-intensity` already existed as a master and could never
    // have been attached to a product.
    specKey: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    titleEn: { type: String },
    titleAr: { type: String },
    subtitleEn: { type: String },
    subtitleAr: { type: String },
    maxSelect: { type: Number, default: 5 },
    isRequired: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    allowedOptions: { type: [String], default: [] },
  },
  { _id: false }
);

const ProductSpecConfigSchema = new Schema<IProductSpecConfig>(
  {
    productKey: { type: String, required: true, unique: true, trim: true },
    mainSlug: { type: String, required: true },
    subSlug: { type: String, required: true },
    itemName: { type: String, required: true },
    specs: { type: [ProductSpecSchema], default: [] },
    notes: { type: String },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSpecConfigSchema.index({ productKey: 1 }, { unique: true });
ProductSpecConfigSchema.index({ mainSlug: 1, subSlug: 1 });

const ProductSpecConfig =
  mongoose.models.ProductSpecConfig ||
  mongoose.model<IProductSpecConfig>('ProductSpecConfig', ProductSpecConfigSchema);

export default ProductSpecConfig;
