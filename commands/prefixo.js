module.exports = {
    name: 'prefixo',
    async execute(client, msg, { chatId, senderRaw, args, GroupConfig, User }) {
        try {
            const autorId = String(senderRaw).trim();

            // Só o dono do plano (isBotAdmin) pode usar
            const userData = await User.findOne({ userId: autorId, groupId: chatId });
            if (!userData?.isBotAdmin) {
                return await client.sendMessage(chatId, "❌ Apenas o dono do plano pode alterar o prefixo do grupo.");
            }

            const config = await GroupConfig.findOne({ groupId: chatId }).lean();
            const prefixoAtual = config?.prefixo || 'Nenhum';

            // --- MENU ---
            if (!args.length) {
                return await client.sendMessage(chatId, `⚙️ *PREFIXO CUSTOMIZADO — YUKON*
━━━━━━━━━━━━━━━━━━━━━
🔧 *Prefixo atual:* ${prefixoAtual}
🌐 *Universal:* / (sempre funciona)

👉 *COMO USAR:*
/prefixo [símbolo desejado]

_Exemplos:_
• /prefixo !
• /prefixo #
• /prefixo ??
• /prefixo >>

⚠️ *REGRAS:*
• Máximo de 3 caracteres
• Não pode ser / (já é universal)

🔴 Para *remover*: /prefixo remover
━━━━━━━━━━━━━━━━━━━━━`);
            }

            const escolha = args[0];

            // --- REMOVER ---
            if (escolha.toLowerCase() === 'remover') {
                await GroupConfig.updateOne(
                    { groupId: chatId },
                    { $unset: { prefixo: "" } },
                    { upsert: true }
                );
                return await client.sendMessage(chatId, `✅ *PREFIXO REMOVIDO*\n\nO grupo agora usa apenas o prefixo universal */*`);
            }

            // --- VALIDAÇÕES ---
            if (escolha === '/') {
                return await client.sendMessage(chatId, "❌ O */* já é o prefixo universal e não pode ser escolhido como prefixo customizado.");
            }

            if (escolha.length > 3) {
                return await client.sendMessage(chatId, "❌ O prefixo deve ter no máximo *3 caracteres*!\n_Exemplo: !, ##, ???_");
            }

            // --- SALVA ---
            await GroupConfig.updateOne(
                { groupId: chatId },
                { $set: { prefixo: escolha } },
                { upsert: true }
            );

            await client.sendMessage(chatId, `✅ *PREFIXO ATUALIZADO!*
━━━━━━━━━━━━━━━━━━━━━
🔧 *Novo prefixo:* \`${escolha}\`
🌐 *Universal:* \`/\`

Agora os comandos funcionam com *${escolha}* e com */*!

_Exemplo: ${escolha}perfil ou /perfil_
━━━━━━━━━━━━━━━━━━━━━`);

        } catch (e) {
            console.error("❌ Erro no /prefixo:", e);
            await client.sendMessage(chatId, "⚠️ Erro ao atualizar o prefixo.");
        }
    }
};