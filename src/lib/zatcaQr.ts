import QRCode from 'qrcode';

/**
 * The QR on a Saudi tax invoice: five fields, tag-length-value, base64.
 *
 * This is the simplified format from ZATCA's first e-invoicing phase. It does
 * not replace the second phase, where each invoice is signed and cleared with
 * the authority through a registered integration.
 */

export interface QrFields {
  seller: string;
  vatNumber: string;
  issuedAt: Date;
  total: number;
  vat: number;
}

function tlv(tag: number, value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
}

export function zatcaPayload(f: QrFields): string {
  return Buffer.concat([
    tlv(1, f.seller),
    tlv(2, f.vatNumber),
    tlv(3, f.issuedAt.toISOString().replace(/\.\d{3}Z$/, 'Z')),
    tlv(4, f.total.toFixed(2)),
    tlv(5, f.vat.toFixed(2)),
  ]).toString('base64');
}

export function zatcaQrSvg(f: QrFields): Promise<string> {
  return QRCode.toString(zatcaPayload(f), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
}
