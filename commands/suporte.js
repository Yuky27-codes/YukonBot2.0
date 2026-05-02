module.exports = {
    name: 'suporte',
    async execute(client, msg) {
        try {
            const txtSuporte = `🛠️ *CENTRAL DE AJUDA YUKON*
━━━━━━━━━━━━━━━━━━━━━━
🚀 *GUIA DE ATIVAÇÃO RÁPIDA:*
1️⃣ Vá ao seu grupo e digite */id_grupo*.
2️⃣ No meu PV, use */assinar [1, 2 ou 3]* para escolher seu nível.
3️⃣ No meu PV, use */vincular [ID]* para registrar sua estação.
4️⃣ Use */pix* para pagar e envie o print com a legenda: *comprovante*

❓ *DÚVIDAS FREQUENTES:*
Digite */duvida [número]* para obter a resposta imediata.

1️⃣ Posso trocar o grupo vinculado?
2️⃣ O bot saiu do grupo, o que eu faço?
3️⃣ Como funciona o bônus de indicação?
4️⃣ Quais as vantagens do Plano Intergaláctico?
5️⃣ Enviei o comprovante, quanto tempo demora?
6️⃣ O bot não responde aos comandos no grupo.
7️⃣ Como renovar minha assinatura?
8️⃣ Como migrar meus dias do sistema antigo? 🔄
9️⃣ Como gerar um cupom de desconto?
🔟 Esqueci de colocar a legenda no comprovante.

━━━━━━━━━━━━━━━━━━━━━━
👤 *SUPORTE AVANÇADO:*
Se precisar falar com um humano, use */admin* para ser redirecionado ao Comandante.`;

            // Utilizando sua função global de envio com foto
            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'suporte_central.jpg', txtSuporte);
            } else {
                await msg.reply(txtSuporte);
            }

        } catch (err) {
            console.error("❌ ERRO NO SUPORTE:", err);
        }
    }
};