module.exports = {
    name: 'confirmar',
    async execute(client, msg, { args, isAdmin }) {
        if (!isAdmin) return;

        // Aceita ID do cliente (número@c.us) ou ID do grupo (@g.us)
        const alvo = args[0];
        if (!alvo) {
            return msg.reply("⚠️ Use: `/confirmar [número@c.us]` ou `/confirmar [ID@g.us]`\n\n_Prefira usar o número do cliente para ativar todos os grupos de uma vez._");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.model('UserProfile');

            const dataVencimento = new Date();
            dataVencimento.setDate(dataVencimento.getDate() + 30);

            // --- ATIVAÇÃO POR NÚMERO DO CLIENTE ---
            if (alvo.endsWith('@c.us') || (!alvo.includes('@g.us') && alvo.includes('@'))) {
                const clienteId = alvo.endsWith('@c.us') ? alvo : `${alvo.replace(/\D/g, '')}@c.us`;
                const perfil = await UserProfile.findOne({ userId: clienteId });

                if (!perfil || perfil.gruposVinculados.length === 0) {
                    return msg.reply(`⚠️ Cliente \`${clienteId}\` não encontrado ou sem grupos vinculados.`);
                }

                const nomePlano = perfil.planoPreco === 10 ? 'Recruta' : perfil.planoPreco === 30 ? 'Astronauta' : 'Intergaláctico';
                let ativados = 0;

                // Ativa TODOS os grupos vinculados com a mesma validade
                for (const grupoId of perfil.gruposVinculados) {
                    await AuthorizedGroup.updateOne(
                        { groupId: grupoId },
                        { $set: { isAuthorized: true, expiresAt: dataVencimento, authorizedBy: clienteId } },
                        { upsert: true }
                    );

                    // Notifica cada grupo
                    try {
                        await client.sendMessage(grupoId, `🚀 *YUKON STATION ATIVADA*
━━━━━━━━━━━━━━━━━━━━━
✅ Assinatura ativada com sucesso!
📦 *Plano:* ${nomePlano}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🎮 Comandos liberados! Divirtam-se.`);
                        ativados++;
                    } catch {}
                }

                // Notifica o cliente no PV
                try {
                    await client.sendMessage(clienteId, `✅ *PAGAMENTO APROVADO!*
━━━━━━━━━━━━━━━━━━━━━
Obrigado por assinar a Yukon Station! 🚀

📦 *Plano:* ${nomePlano}
📍 *Grupos ativados:* ${ativados}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}

_Use */meu_plano* para acompanhar sua assinatura._`);
                } catch {}

                return msg.reply(`✅ *ATIVAÇÃO CONCLUÍDA*
━━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* @${clienteId.split('@')[0]}
📦 *Plano:* ${nomePlano}
📍 *Grupos ativados:* ${ativados}/${perfil.gruposVinculados.length}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}`, { mentions: [clienteId] });
            }

            // --- ATIVAÇÃO POR ID DO GRUPO (modo antigo mantido) ---
            if (alvo.includes('@g.us')) {
                await AuthorizedGroup.updateOne(
                    { groupId: alvo },
                    { $set: { isAuthorized: true, expiresAt: dataVencimento } },
                    { upsert: true }
                );

                try {
                    await client.sendMessage(alvo, `🚀 *SISTEMA ATUALIZADO*
━━━━━━━━━━━━━━━━━━━━━
✅ Assinatura ativada com sucesso!
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🎮 Comandos liberados! Divirtam-se.`);
                } catch {}

                // Tenta notificar o dono pelo perfil
                const dono = await UserProfile.findOne({ gruposVinculados: alvo });
                if (dono) {
                    try {
                        await client.sendMessage(dono.userId, `✅ *PAGAMENTO APROVADO!*\nSeu grupo \`${alvo}\` foi ativado!\n📅 Válido até: ${dataVencimento.toLocaleDateString('pt-BR')}`);
                    } catch {}
                }

                return msg.reply(`✅ Grupo \`${alvo}\` ativado até *${dataVencimento.toLocaleDateString('pt-BR')}*!`);
            }

            return msg.reply("⚠️ ID inválido. Use o número do cliente ou o ID do grupo.");

        } catch (err) {
            console.error("❌ Erro no /confirmar:", err);
            return msg.reply("⚠️ Erro ao confirmar ativação.");
        }
    }
};