import mongoose, { Schema, Document } from 'mongoose';

/**
 * The code catalogue — the sales team's price book.
 *
 * One row per developed product: its ECC code, what it is benchmarked against
 * internationally and locally, what it costs to make, and what KCC recommends
 * selling it for. It is what a rep opens in front of an account, which is why
 * it lives alongside the CRM rather than with the public product catalogue:
 * nothing here is for customers to read.
 *
 * Every figure is kept exactly as the sheet holds it, including the blanks. A
 * missing cost is a cost nobody has worked out yet, and inventing one would put
 * a number in front of a customer that the factory never agreed to.
 */

export interface IProductCode extends Document {
  /** Grouping as the sheet has it: Cleansers, Moisturizers, Skin Serums… */
  category: string;
  product: string;
  /** The sheet's "Cat." column — a size or tier marker (M, L, H). */
  sizeCode?: string;
  /** ECC8010 and the like. Unique where present. */
  code?: string;
  /** Confirmed, or blank while still in development. */
  status?: string;
  /** Millilitres. */
  volume?: number;

  benchmarkIntl?: string;
  /** Shelf price of that benchmark in Saudi. */
  rspSaudi?: number;
  benchmarkEgypt?: string;
  benchmarkSaudi?: string;

  package?: string;
  form?: string;
  ingredients?: string;

  /** Quoted by each factory, in its own currency. */
  priceEccEgp?: number;
  bonnSar?: number;
  alKamalUae?: number;

  cost?: number;
  rsp?: number;
  /**
   * The sheet's "%" column: cost divided by shelf price, not the margin. Kept
   * under its real meaning so nobody reads 0.20 as a 20% profit.
   */
  costRatio?: number;
  kccRecommendedSar?: number;

  notes?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductCodeSchema = new Schema<IProductCode>(
  {
    category: { type: String, required: true, trim: true, index: true },
    product: { type: String, required: true, trim: true },
    sizeCode: { type: String, trim: true },
    code: { type: String, trim: true, index: true },
    status: { type: String, trim: true },
    volume: { type: Number },

    benchmarkIntl: { type: String, trim: true },
    rspSaudi: { type: Number },
    benchmarkEgypt: { type: String, trim: true },
    benchmarkSaudi: { type: String, trim: true },

    package: { type: String, trim: true },
    form: { type: String, trim: true },
    ingredients: { type: String, trim: true },

    priceEccEgp: { type: Number },
    bonnSar: { type: Number },
    alKamalUae: { type: Number },

    cost: { type: Number },
    rsp: { type: Number },
    costRatio: { type: Number },
    kccRecommendedSar: { type: Number },

    notes: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductCodeSchema.index({ category: 1, product: 1 });
ProductCodeSchema.index({ product: 'text', code: 'text', ingredients: 'text' });

const ProductCode =
  mongoose.models.ProductCode || mongoose.model<IProductCode>('ProductCode', ProductCodeSchema);
export default ProductCode;
