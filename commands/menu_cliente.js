module.exports = {
    name: 'menu_cliente',
    async execute(client, msg) {
        try {
            // Endereço do painel web (variável PAINEL_URL do Bot); sem ela, só o nome
            const painel = process.env.PAINEL_URL ? `*${process.env.PAINEL_URL}*` : '*Painel Yukon* (site)';

            const txtCliente = `╭━━━〔 🛰️ CENTRAL DO CLIENTE YUKON 〕━━━╮
◇ */id_grupo* ➜ Ver o ID do grupo (no grupo)

◇ */teste* ➜ Testar a Yukon por 24h grátis

◇ */codigo* ➜ Código para vincular o grupo (dono, no grupo)

◇ */assinar* ➜ Ver planos e assinar pelo WhatsApp

◇ */vincular* ➜ Vincular grupo à assinatura do WhatsApp

◇ */pix* ➜ Gerar o Pix da assinatura do WhatsApp

◇ */meu_plano* ➜ Ver plano, validade e grupos

◇ */upgrade* ➜ Mudar para um plano maior

◇ */indicar* ➜ Indicar a Yukon e ganhar dias

◇ */suporte* ➜ FAQ e central de ajuda
╰━━━━━━━━━━━━━━━━━━━━━━╯

🖥️ **ASSINAR PELO PAINEL (RECOMENDADO):**
1️⃣ Crie sua conta em ${painel} e confirme o e-mail.
2️⃣ No grupo, o dono envia */codigo* (o código chega no privado).
3️⃣ No painel, cole o código para vincular o grupo.
4️⃣ Escolha o plano e pague por Pix: a liberação é automática.
_Planos com painel: Astronauta, Intergaláctico e Cósmico._

📱 **ASSINAR PELO WHATSAPP:**
1️⃣ */assinar* para ver os planos e escolher.
2️⃣ No grupo, o dono envia */codigo*.
3️⃣ Aqui no PV: */vincular [CÓDIGO]*.
4️⃣ */pix* para pagar e envie o comprovante.
_O plano Recruta é vendido só pelo WhatsApp e não inclui o painel._

🧪 **COMO TESTAR GRÁTIS (24H):**
1️⃣ Adicione a Yukon no seu grupo.
2️⃣ Digite */id_grupo* lá dentro e copie o ID.
3️⃣ Envie aqui no PV: */teste [ID_DO_GRUPO]*

_Nota: o teste vale uma única vez por grupo, só para grupos que nunca tiveram licença, e precisa ser pedido pelo dono ou por um administrador do grupo. Durante o teste o grupo não entra no /rankglobal, e o que for feito nele é apagado quando o teste acaba (assinando antes, tudo é mantido)._
`;

            if (typeof global.enviarMenuComFoto === 'function') {
                await global.enviarMenuComFoto(msg, 'menu_cliente.jpg', txtCliente);
            } else {
                await msg.reply(txtCliente);
            }

        } catch (err) {
            console.error("❌ ERRO NO MENU_CLIENTE:", err);
        }
    }
};