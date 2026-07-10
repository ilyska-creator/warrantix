import Ed25519Signer, { buildSignaturePayload } from './crypto-signature.js';

class ReceiptVerifier {
    constructor() {
        this.signer = new Ed25519Signer();
    }


    async verifyReceipt(receipt, shop) {
        try {
            if (!receipt.fiscal_hash) {
                return { valid: false, error: 'No signature found' };
            }

            if (!shop || !shop.public_key) {
                return { valid: false, error: 'Shop public key not found' };
            }

            if (!Array.isArray(receipt.items) || receipt.items.length === 0) {
                // Чек без позиций не мог быть подписан текущей схемой —
                // либо повреждённые данные, либо старый формат, который
                // ещё не мигрировал в receipt_items.
                return { valid: false, error: 'Receipt has no line items to verify' };
            }

            const publicKey = await this.signer.importPublicKey(shop.public_key);

            // RPC отдаёт позиции в snake_case (как в БД) — приводим к тем же
            // именам полей, которые buildSignaturePayload использовал при
            // подписи в business-panel.js (там объекты собираются в camelCase).
            const items = receipt.items.map(it => ({
                itemName: it.item_name,
                qty: it.qty,
                unitPrice: it.unit_price,
                vatRate: it.vat_rate,
                warrantyMonths: it.warranty_months,
                netTotal: it.net_total,
                vatAmount: it.vat_amount,
            }));

            const signData = buildSignaturePayload({
                taxId: shop.tax_id,
                purchaseDate: receipt.purchase_date,
                items,
                netTotal: receipt.net_total,
                vatAmount: receipt.vat_amount,
                grossTotal: receipt.gross_total,
            });

            const isValid = await this.signer.verify(signData, receipt.fiscal_hash, publicKey);

            return { valid: isValid };
        } catch (error) {
            console.error('Receipt verification error:', error);
            return { valid: false, error: error.message };
        }
    }


    async verifyReceiptsBatch(receipts, shop) {
        const results = [];

        for (const receipt of receipts) {
            const result = await this.verifyReceipt(receipt, shop);
            results.push({ receipt, ...result });
        }

        return results;
    }


    static isSupported() {
        return Ed25519Signer.isSupported();
    }
}

export default ReceiptVerifier;