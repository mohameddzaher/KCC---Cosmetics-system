import mongoose, { Schema } from 'mongoose';

/**
 * A number that only goes up. An invoice number has to be sequential with no
 * gaps a reader could question, and counting existing invoices would hand two
 * simultaneous requests the same one.
 *
 * Not audited: the invoice it numbers is, and a counter ticking is not an event.
 */
const CounterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
export default Counter;
