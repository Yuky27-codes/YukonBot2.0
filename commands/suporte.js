module.exports = {
    name: 'suporte',
    async execute(client, msg) {
        try {
            const txtSuporte = `🛠️ *CENTRAL DE AJUDA YUKON*
━━━━━━━━━━━━━━━━━━━━━━
🚀 **PASSO A PASSO PARA ATIVAÇÃO:**
1️⃣ Vá ao seu grupo e digite **/id_grupo**.
2️⃣ No meu PV, use **/assinar [1, 2 ou 3]** para escolher seu plano.
3️⃣ No meu PV, use **/vincular [ID]** para registrar seu grupo.
4️⃣ Use **/pix** para pagar e envie o print com a legenda *comprovante*.

❓ **DÚVIDAS FREQUENTES:**
Digite **/duvida [número]** para ler a resposta.

1. Posso trocar o grupo vinculado?
2. O bot saiu do grupo, o que eu faço?
3. Como funciona o bônus de indicação?
4. Quais as vantagens do Plano Intergaláctico?
5. Enviei o comprovante, quanto tempo demora?
6. O bot não responde aos comandos no grupo.
7. Como renovar minha assinatura?
8. Posso colocar o bot em mais grupos do que o limite?
9. Como gerar um cupom de desconto?
10. Esqueci de colocar a legenda no comprovante.

━━━━━━━━━━━━━━━━━━━━━━
👤 **FALAR COM HUMANO:**
Caso sua dúvida não esteja acima, digite **/admin** para falar diretamente com o Comandante.`;

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