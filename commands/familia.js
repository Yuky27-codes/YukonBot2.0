module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });
            if (!user) return await msg.reply("❌ Você não tem um registro na Yukon Station.");

            // 1. FUNÇÃO AUXILIAR PARA PEGAR O NOME
            // Tenta pegar o nome do perfil, se não tiver, usa o número limpo
            const pegarNome = async (id) => {
                try {
                    const contato = await client.getContactById(id);
                    return contato.pushname || contato.name || id.split('@')[0];
                } catch {
                    return id.split('@')[0];
                }
            };

            // 2. BUSCANDO NOMES DOS PROTAGONISTAS
            const nomeAutor = await pegarNome(senderRaw);
            const nomeConjuge = user.marriedWith ? await pegarNome(user.marriedWith) : "Solteiro(a)";

            // 3. SEPARANDO E FORMATANDO FILHOS E PARENTES
            const filhos = user.family.filter(p => p.role.toLowerCase() === 'filho' || p.role.toLowerCase() === 'filha');
            const parentes = user.family.filter(p => !['filho', 'filha'].includes(p.role.toLowerCase()));

            let texto = `👨‍👩‍👧‍👦 *ESTRUTURA FAMILIAR — YUKON*\n`;
            texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `💍 *CASAL:* ${nomeAutor} & ${nomeConjuge}\n\n`;
            
            texto += `👶 *FILHOS [${filhos.length}]:*\n`;
            if (filhos.length === 0) {
                texto += `_Nenhum herdeiro registrado._\n`;
            } else {
                for (const f of filhos) {
                    const n = await pegarNome(f.userId);
                    texto += `• ${n}\n`;
                }
            }

            texto += `\n🧬 *PARENTES DOS SETORES:* \n`;
            if (parentes.length === 0) {
                texto += `_Nenhum parente colateral._\n`;
            } else {
                for (const p of parentes) {
                    const n = await pegarNome(p.userId);
                    texto += `• ${n} (${p.role})\n`;
                }
            }
            
            texto += `\n━━━━━━━━━━━━━━━━━━━━━`;

            // 4. PREPARANDO MENÇÕES (Para garantir que fiquem clicáveis se necessário)
            const mencoesIds = [senderRaw];
            if (user.marriedWith) mencoesIds.push(user.marriedWith);
            user.family.forEach(p => mencoesIds.push(p.userId));

            // 5. ENVIO COM FOTO
            // 'familia.jpg' deve estar na pasta assets
            await global.enviarMenuComFoto({ from: chatId }, 'familia.jpg', texto, mencoesIds);

        } catch (e) {
            console.error("❌ Erro ao gerar relatório de família:", e);
            await msg.reply("❌ Falha ao acessar os arquivos genealógicos.");
        }
    }
};