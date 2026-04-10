module.exports = {
    name: 'familia',
    async execute(client, msg, { chatId, senderRaw, User }) {
        try {
            const user = await User.findOne({ userId: senderRaw, groupId: chatId });
            if (!user) return;

            const conjugeId = user.marriedWith;
            const mencoesSet = new Set();
            mencoesSet.add(senderRaw);
            if (conjugeId) mencoesSet.add(conjugeId);

            // Filtros de categoria
            const filhos = user.family.filter(p => p.role.toLowerCase() === 'filho');
            const paisOuOutros = user.family.filter(p => p.role.toLowerCase() !== 'filho');

            // Construção do Texto (Estilo Yukon Station)
            let texto = `👨‍👩‍👧‍👦 *RELATÓRIO DE LINHAGEM — YUKON*\n`;
            texto += `━━━━━━━━━━━━━━━━━━━━━\n`;
            
            // Seção de Casal (Para quem é casado)
            const autorLimpo = senderRaw.split('@')[0];
            const conjugeLimpo = conjugeId ? conjugeId.split('@')[0] : null;
            
            texto += `💍 *VÍNCULO:* @${autorLimpo} & ${conjugeId ? `@${conjugeLimpo}` : "_Solteiro_"}\n\n`;
            
            // Seção: Meus Pais (Caso o usuário seja um filho adotado)
            // No /adotar novo, salvamos os pais no array family do filho com a role 'pai/mãe'
            const meusPais = user.family.filter(p => p.role === 'pai/mãe');
            if (meusPais.length > 0) {
                texto += `👨‍👩‍👦 *MEUS PAIS:* \n`;
                meusPais.forEach(p => {
                    const idLimpo = p.userId.split('@')[0];
                    texto += `• @${idLimpo}\n`;
                    mencoesSet.add(p.userId);
                });
                texto += `\n`;
            }

            // Seção: Filhos (Caso o usuário tenha adotado alguém)
            texto += `👶 *FILHOS REGISTRADOS [${filhos.length}]:*\n`;
            if (filhos.length === 0) {
                texto += `_Nenhum descendente direto._\n`;
            } else {
                filhos.forEach(f => {
                    const idLimpo = f.userId.split('@')[0];
                    texto += `• @${idLimpo}\n`;
                    mencoesSet.add(f.userId);
                });
            }

            // Outros Parentes (Caso existam outras roles no futuro)
            const outros = paisOuOutros.filter(p => p.role !== 'pai/mãe');
            if (outros.length > 0) {
                texto += `\n🧬 *OUTROS VÍNCULOS:* \n`;
                outros.forEach(p => {
                    const idLimpo = p.userId.split('@')[0];
                    texto += `• @${idLimpo} (${p.role})\n`;
                    mencoesSet.add(p.userId);
                });
            }
            
            texto += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `> 📂 *Protocolo de Linhagem Ativo.*`;

            const mencoesIds = Array.from(mencoesSet);

            // Chamada com foto para manter o padrão
            await global.enviarMenuComFoto({ from: chatId }, 'familia.jpg', texto, mencoesIds);

        } catch (e) {
            console.error("Erro no comando familia:", e);
            await msg.reply("❌ Erro ao acessar registros genealógicos.");
        }
    }
};