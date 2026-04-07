module.exports = {
    name: 'adotar',
    async execute(client, msg, { chatId, senderRaw, User, args }) {
        try {
            const mencoes = msg.mentionedIds;
            const autorId = String(senderRaw).trim();
            
            // Lista de graus permitidos
            const grausPermitidos = ['filho', 'filha', 'pai', 'mãe', 'irmão', 'irmã', 'primo', 'prima', 'tio', 'tia'];

            if (mencoes.length === 0 || args.length < 2) {
                return await msg.reply(`❓ *COMO USAR:* \`/adotar @tripulante [grau]\`\nEx: \`/adotar @fulano filho\`\n\n*Graus:* ${grausPermitidos.join(', ')}`);
            }

            const alvoId = String(mencoes[0]._serialized || mencoes[0]).trim();
            const grauInformado = args.find(a => grausPermitidos.includes(a.toLowerCase()));

            if (!grauInformado) {
                return await msg.reply("❌ *SISTEMA:* Grau de parentesco inválido ou não reconhecido pela Yukon.");
            }

            if (alvoId === autorId) return await msg.reply("❓ Você não pode adotar a si mesmo no vácuo do espaço.");

            // Adiciona na família do autor
            await User.updateOne(
                { userId: autorId, groupId: chatId },
                { $push: { family: { userId: alvoId, role: grauInformado.toLowerCase() } } }
            );

            // (Opcional) Adiciona a relação inversa simplificada ou deixa apenas de um lado
            // Vamos manter do lado de quem adotou para facilitar

            const textoSucesso = `
🧬 *NOVO MEMBRO NA FAMÍLIA!*
━━━━━━━━━━━━━━━━━━━━━
O registro civil da Yukon Station informa:
@${autorId.split('@')[0]} adotou @${alvoId.split('@')[0]} como seu(sua) **${grauInformado.toUpperCase()}**!

🏠 *A base ficou mais acolhedora agora.*
━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, textoSucesso, { mentions: [autorId, alvoId] });

        } catch (e) {
            console.error(e);
            await msg.reply("❌ Erro ao registrar parentesco no banco de dados.");
        }
    }
};