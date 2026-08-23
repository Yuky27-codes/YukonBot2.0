const NIVEIS = {
    1: { nome: 'Leve', emoji: '🟡', limite: 5 },
    2: { nome: 'Moderada', emoji: '🟠', limite: 3 },
    3: { nome: 'Pesada', emoji: '🔴', limite: 3 }
};

module.exports = {
    name: 'listaadv',
    async execute(client, msg, { chatId, User }) {
        try {
            // 1. Busca usuários com pelo menos uma advertência ativa (em qualquer nível) no grupo atual
            const advertidos = await User.find({
                groupId: chatId,
                $or: [
                    { advsNivel1: { $gt: 0 } },
                    { advsNivel2: { $gt: 0 } },
                    { advsNivel3: { $gt: 0 } }
                ]
            }).lean();

            if (!advertidos || advertidos.length === 0) {
                return await client.sendMessage(chatId, "✅ *YUKON:* Ninguém possui advertências neste grupo.", { sendSeen: false });
            }

            let listaMsg = "📋 *LISTA DE ADVERTÊNCIAS - YUKON*\n\n";
            let targets = [];

            // 2. Monta a lista, com os níveis e motivos, e prepara as menções
            advertidos.forEach((u) => {
                const userIdStr = String(u.userId).trim();
                const numeroExibicao = userIdStr.split('@')[0];
                const historico = Array.isArray(u.advHistory) ? u.advHistory : [];

                listaMsg += `👤 @${numeroExibicao}\n`;

                [1, 2, 3].forEach((nivel) => {
                    const count = u[`advsNivel${nivel}`] || 0;
                    if (count === 0) return;

                    const { nome, emoji, limite } = NIVEIS[nivel];
                    listaMsg += `   ${emoji} *${nome}:* ${count}/${limite}\n`;

                    // Igual antes: as advertências ATIVAS desse nível são sempre as últimas
                    // "count" entradas do histórico filtradas por esse nível específico.
                    const doNivel = historico.filter(h => h?.nivel === nivel);
                    const ativas = doNivel.slice(-count);

                    if (ativas.length > 0) {
                        ativas.forEach((h) => {
                            const motivo = h?.motivo || 'Motivo não especificado';
                            listaMsg += `      • ${motivo}\n`;
                        });
                    } else {
                        listaMsg += `      • _Motivo não registrado_\n`;
                    }
                });

                listaMsg += "\n";
                targets.push(userIdStr);
            });

            listaMsg += "_Fique atento às regras da tripulação!_ 🛰️";

            // 3. Envio com menções para os números ficarem azuis/clicáveis
            await client.sendMessage(chatId, listaMsg, {
                mentions: targets,
                sendSeen: false
            });

        } catch (error) {
            console.error("❌ ERRO NO COMANDO LISTAADV:", error);
            await client.sendMessage(chatId, "⚠️ Erro interno ao processar a lista de advertências.");
        }
    }
};