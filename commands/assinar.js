// Planos, preços, durações e limites vêm do catálogo central publicado pelo painel (commands/_catalogo.js).
const { listarPlanos, planoPorNumero, formatarPreco, MENSAGEM_CATALOGO_INDISPONIVEL } = require('./_catalogo');

const NUMEROS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

module.exports = {
    name: 'assinar',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) {
            return client.sendMessage(chatId, "🛰️ *CENTRAL DE VENDAS*\nPara ver os planos e assinar, me chame no *Privado*!");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');

            const planos = await listarPlanos();
            if (!planos) return client.sendMessage(msg.from, MENSAGEM_CATALOGO_INDISPONIVEL);

            const escolha = parseInt(args[0]);
            const perfil = await UserProfile.findOne({ userId: msg.from });

            let desc = 0;

            // Verifica se o usuário tem desconto e se o prazo de 24 horas ainda está valendo
            if (perfil && perfil.descontoAtivo && perfil.cupomExpiraEm) {
                if (new Date() < new Date(perfil.cupomExpiraEm)) {
                    desc = perfil.descontoAtivo; // Cupom válido dentro das 24h!
                } else {
                    // Se o prazo expirou, limpa o cupom do perfil automaticamente
                    await UserProfile.updateOne(
                        { userId: msg.from },
                        { $set: { descontoAtivo: 0, cupomExpiraEm: null } }
                    );
                }
            }

            const comDesconto = (valor) => valor * (1 - desc / 100);
            const grupos = (n) => (n === 1 ? '*1 Grupo* vinculado' : `*Até ${n} Grupos* vinculados`);

            const plano = await planoPorNumero(escolha);
            if (!plano) {
                const lista = planos.map((p, i) => {
                    const valor = desc > 0 ? `~${formatarPreco(p.priceBRL)}~ por *${formatarPreco(comDesconto(p.priceBRL))}*` : `*${formatarPreco(p.priceBRL)}*`;
                    return `${NUMEROS[i] || `${i + 1}.`} *PLANO ${p.label.toUpperCase()}*\n💰 Valor: ${valor}\n📍 Limite: ${grupos(p.groupLimit)}\n📅 Duração: *${p.days} dias*${p.panelAccess ? '\n🖥️ Inclui o painel web' : ''}`;
                }).join('\n\n');

                return client.sendMessage(msg.from, `🛰️ *CATÁLOGO DE ASSINATURAS YUKON*
━━━━━━━━━━━━━━━━━━━━━
${desc > 0 ? `🔥 *CUPOM DE ${desc}% APLICADO!* (Válido por tempo limitado)\n` : ""}
${lista}

━━━━━━━━━━━━━━━━━━━━━
📌 *COMO ASSINAR:*
1️⃣ Digite */assinar [número]* para escolher o plano
2️⃣ O dono do grupo envia */codigo* no grupo (o código chega no privado)
3️⃣ Use */vincular [CÓDIGO]* aqui no PV
4️⃣ Use */pix* para pagar`);
            }

            const nomePlano = plano.label.toUpperCase();
            const gruposAtuais = perfil?.gruposVinculados || [];

            if (gruposAtuais.length > plano.groupLimit) {
                return client.sendMessage(msg.from, `⚠️ *ATENÇÃO:* Você já tem *${gruposAtuais.length} grupo(s)* vinculados.\nO plano *${nomePlano}* permite apenas *${plano.groupLimit} grupo(s)*.\n\nEscolha um plano maior ou remova grupos antes de mudar.`);
            }

            // Calcula o valor final com base no desconto ativo (se houver)
            const valorFinalCalculado = comDesconto(plano.priceBRL);

            // planoEscolhido/planoPreco = plano ESCOLHIDO (pendente de pagamento). Não concede licença nem plano pago:
            // o plano pago fica em AuthorizedGroup.paidPlan e só é gravado na confirmação do pagamento.
            await UserProfile.updateOne(
                { userId: msg.from },
                { $set: { planoPreco: valorFinalCalculado, planoEscolhido: plano.id } },
                { upsert: true }
            );

            return client.sendMessage(msg.from, `✅ *PLANO ${nomePlano} SELECIONADO!*
━━━━━━━━━━━━━━━━━━━━━
💰 *Valor final:* ${formatarPreco(valorFinalCalculado)} ${desc > 0 ? `(Com ${desc}% de desconto)` : ""}
📍 *Limite:* ${plano.groupLimit} grupo(s)
📅 *Duração:* ${plano.days} dias

🚀 *PRÓXIMOS PASSOS:*
1️⃣ O dono do grupo envia */codigo* no grupo que deseja adicionar
2️⃣ Use */vincular [CÓDIGO]* aqui no PV
3️⃣ Use */pix* para pagar e envie o comprovante`);

        } catch (err) {
            console.error("❌ Erro no /assinar:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao carregar os planos.");
        }
    }
};
