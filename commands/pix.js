const QRCode = require('qrcode');

// URL do backend do painel (Fastify) e chave de autenticação — configurar no .env
const PANEL_API_URL = process.env.PANEL_API_URL; // ex: https://api.seusaas.com
const PANEL_API_SECRET = process.env.PANEL_API_SECRET;

// Evita gerar uma cobrança nova toda vez que o cliente manda /pix de novo —
// se já tem uma pendente recente, reenvia a mesma em vez de duplicar na Efí.
const VALIDADE_COBRANCA_MS = 15 * 60 * 1000; // 15 minutos

module.exports = {
    name: 'pix',
    async execute(client, msg) {
        if (msg.from.endsWith('@g.us')) {
            return msg.reply("❌ *AÇÃO PRIVADA*\nSolicite os dados de pagamento apenas no meu chat privado.");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const Coupon = mongoose.model('Coupon');
            const PixCharge = mongoose.model('PixCharge');

            const perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil || !perfil.planoPreco) {
                return msg.reply("⚠️ *PLANO NÃO SELECIONADO*\nEscolha um plano primeiro com **/assinar [1, 2 ou 3]**.");
            }

            if (!PANEL_API_URL || !PANEL_API_SECRET) {
                console.error("❌ [PIX] PANEL_API_URL ou PANEL_API_SECRET não configurados no .env");
                return msg.reply("⚠️ O pagamento automático está temporariamente indisponível. Tente novamente mais tarde ou contate o suporte.");
            }

            // Busca cupom pelos grupos vinculados do cliente
            let desc = 0;
            if (perfil.gruposVinculados?.length > 0) {
                for (const gId of perfil.gruposVinculados) {
                    const cupom = await Coupon.findOne({ usedByGroup: gId, isUsed: true }).sort({ _id: -1 }).lean();
                    if (cupom) { desc = cupom.discountPercent; break; }
                }
            }

            const nomePlano = perfil.planoPreco === 10 ? "RECRUTA" : perfil.planoPreco === 30 ? "ASTRONAUTA" : "INTERGALÁCTICO";
            const limiteGrupos = perfil.planoPreco === 10 ? 1 : perfil.planoPreco === 30 ? 2 : 3;
            const valorFinal = Number((perfil.planoPreco * (1 - desc / 100)).toFixed(2));
            const valorFormatado = valorFinal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            // Reaproveita uma cobrança pendente recente, se existir, em vez de gerar outra na Efí
            let cobranca = await PixCharge.findOne({
                userId: msg.from,
                status: 'pendente',
                createdAt: { $gte: new Date(Date.now() - VALIDADE_COBRANCA_MS) }
            }).sort({ createdAt: -1 });

            if (!cobranca) {
                let respostaPainel;
                try {
                    const resp = await fetch(`${PANEL_API_URL}/api/pix/gerar`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': PANEL_API_SECRET
                        },
                        body: JSON.stringify({
                            userId: msg.from,
                            valor: valorFinal,
                            planoPreco: perfil.planoPreco
                        })
                    });
                    respostaPainel = await resp.json().catch(() => null);

                    if (!resp.ok || !respostaPainel?.txid || !respostaPainel?.pixCopiaECola) {
                        console.error("❌ [PIX] Resposta inválida do painel:", resp.status, respostaPainel);
                        return msg.reply("❌ Não consegui gerar o Pix agora. Tente novamente em instantes ou contate o suporte.");
                    }
                } catch (e) {
                    console.error("❌ [PIX] Erro ao chamar o painel:", e.message);
                    return msg.reply("❌ Não consegui me conectar ao sistema de pagamentos agora. Tente novamente em instantes.");
                }

                cobranca = await PixCharge.create({
                    userId: msg.from,
                    txid: respostaPainel.txid,
                    valor: valorFinal,
                    planoPreco: perfil.planoPreco,
                    pixCopiaECola: respostaPainel.pixCopiaECola,
                    status: 'pendente'
                });
            }

            // Gera o QR Code localmente a partir do código copia-e-cola (não precisa que o painel mande a imagem)
            let qrBuffer = null;
            try {
                qrBuffer = await QRCode.toBuffer(cobranca.pixCopiaECola, { width: 500, margin: 1 });
            } catch (e) {
                console.error("⚠️ [PIX] Falha ao gerar QR Code (seguindo só com o copia-e-cola):", e.message);
            }

            const legenda = `🛰️ *PAGAMENTO VIA PIX*
━━━━━━━━━━━━━━━━━━━━━
📦 *PLANO:* ${nomePlano}
📍 *Grupos vinculados:* ${perfil.gruposVinculados.length}/${limiteGrupos}
💰 *VALOR:* ${valorFormatado}${desc > 0 ? ` (-${desc}% de desconto)` : ""}
━━━━━━━━━━━━━━━━━━━━━
📲 Escaneie o QR Code ou use o *Pix Copia e Cola* abaixo:

\`\`\`${cobranca.pixCopiaECola}\`\`\`

⏳ Assim que o pagamento for identificado, seu plano é ativado *automaticamente* — sem precisar mandar comprovante!`;

            if (qrBuffer) {
                const { MessageMedia } = require('whatsapp-web.js');
                const media = new MessageMedia('image/png', qrBuffer.toString('base64'), 'pix.png');
                return await client.sendMessage(msg.from, media, { caption: legenda });
            }

            return msg.reply(legenda);

        } catch (err) {
            console.error("❌ Erro no /pix:", err);
            return msg.reply("⚠️ Erro ao gerar dados de pagamento.");
        }
    }
};