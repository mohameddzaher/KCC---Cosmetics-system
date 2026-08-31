import mongoose, { Schema, Document } from 'mongoose';

/**
 * A Super Admin's overrides to what a role can reach.
 *
 * The defaults live in `src/lib/roles.ts` and describe how the business is
 * normally organised. This collection holds only the deliberate departures
 * from those defaults, one document per role — so a role with no document
 * behaves exactly as shipped, and deleting a document restores it.
 *
 * SUPER_ADMIN is never stored here: the account that hands out access cannot
 * be allowed to lock itself out of the screen that hands it out.
 */
export interface IRolePermission extends Document {
  role: string;
  permissions: string[];
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    role: { type: String, required: true, unique: true, trim: true },
    permissions: { type: [String], default: [] },
    /** Name of the admin who last changed it, for the audit trail. */
    updatedBy: { type: String },
  },
  { timestamps: true }
);

const RolePermission =
  mongoose.models.RolePermission ||
  mongoose.model<IRolePermission>('RolePermission', RolePermissionSchema);

export default RolePermission;
