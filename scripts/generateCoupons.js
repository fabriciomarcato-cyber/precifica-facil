
/**
 * Script para gerar 100 cupons únicos no formato XXXX-XXXX-XXXX
 * Formato: 3 blocos de 4 caracteres alfanuméricos maiúsculos
 */

function generateRandomBlock(length = 4) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function generateCoupon() {
    return `${generateRandomBlock()}-${generateRandomBlock()}-${generateRandomBlock()}`;
}

function generate100Coupons() {
    const coupons = new Set();
    const result = [];

    while (coupons.size < 100) {
        const code = generateCoupon();
        if (!coupons.has(code)) {
            coupons.add(code);
            result.push({
                codigo: code,
                status: 'disponivel',
                data_ativacao: null,
                data_vencimento: null
            });
        }
    }

    return result;
}

const couponsJSON = generate100Coupons();
console.log(JSON.stringify(couponsJSON, null, 2));

// Para executar no console do navegador ou Node.js:
// Copie e cole o código acima.
