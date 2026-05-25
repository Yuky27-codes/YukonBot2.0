module.exports = {
    name: 'confirmar',
    async execute(client, msg, { args, isAdmin, User }) {
        if (!isAdmin) return;

        const alvo = args[0];
        if (!alvo) {
            return client.sendMessage(msg.from, "⚠️ Use: `/confirmar [número@c.us]` ou `/confirmar [ID@g.us]`\n\n_Prefira usar o número do cliente para ativar todos os grupos de uma vez._");
        }

        try {
            const mongoose = require('mongoose');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.model('UserProfile');

            // ✅ Dias corretos por plano
            const diasPorPlano = { 10: 10, 30: 30, 75: 90 };

            // --- ATIVAÇÃO POR NÚMERO DO CLIENTE ---
            if (alvo.endsWith('@c.us') || (!alvo.includes('@g.us') && alvo.includes('@'))) {
                const clienteId = alvo.endsWith('@c.us') ? alvo : `${alvo.replace(/\D/g, '')}@c.us`;
                const perfil = await UserProfile.findOne({ userId: clienteId });

                if (!perfil || perfil.gruposVinculados.length === 0) {
                    return client.sendMessage(msg.from, `⚠️ Cliente \`${clienteId}\` não encontrado ou sem grupos vinculados.`);
                }

                // ✅ Define os dias baseado no plano do cliente
                const dias = diasPorPlano[perfil.planoPreco] || 30;
                const nomePlano = perfil.planoPreco === 10 ? 'Recruta' : perfil.planoPreco === 30 ? 'Astronauta' : 'Intergaláctico';

                // Verifica se já tem assinatura ativa para somar os dias
                let dataBase = new Date();
                const authAtual = await AuthorizedGroup.findOne({ groupId: perfil.gruposVinculados[0] });
                if (authAtual?.expiresAt && new Date(authAtual.expiresAt) > new Date()) {
                    dataBase = new Date(authAtual.expiresAt);
                }

                const dataVencimento = new Date(dataBase);
                dataVencimento.setDate(dataVencimento.getDate() + dias);

                let ativados = 0;

                // Ativa TODOS os grupos vinculados com a mesma validade
                for (const grupoId of perfil.gruposVinculados) {
                    await AuthorizedGroup.updateOne(
                        { groupId: grupoId },
                        { $set: { isAuthorized: true, expiresAt: dataVencimento, authorizedBy: clienteId } },
                        { upsert: true }
                    );

                    // ✅ Promove o dono automaticamente como isBotAdmin no grupo
                    await User.updateOne(
                        { userId: clienteId, groupId: grupoId },
                        { $set: { isBotAdmin: true } },
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
📅 *Duração:* ${dias} dias
📍 *Grupos ativados:* ${ativados}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}

🔑 *Você agora tem acesso aos comandos de administração da Yukon nos seus grupos!*

_Use */meu_plano* para acompanhar sua assinatura._`);
                } catch {}

                return client.sendMessage(msg.from, `✅ *ATIVAÇÃO CONCLUÍDA*
━━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* @${clienteId.split('@')[0]}
📦 *Plano:* ${nomePlano}
📅 *Duração:* ${dias} dias
📍 *Grupos ativados:* ${ativados}/${perfil.gruposVinculados.length}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🔑 *isBotAdmin:* Promovido automaticamente`, { mentions: [clienteId] });
            }

            // --- ATIVAÇÃO POR ID DO GRUPO (modo antigo mantido) ---
            if (alvo.includes('@g.us')) {
                const dono = await UserProfile.findOne({ gruposVinculados: alvo });
                const dias = diasPorPlano[dono?.planoPreco] || 30;
                const nomePlano = dono?.planoPreco === 10 ? 'Recruta' : dono?.planoPreco === 30 ? 'Astronauta' : dono?.planoPreco === 75 ? 'Intergaláctico' : 'Padrão';

                // Verifica se já tem assinatura ativa para somar os dias
                let dataBase = new Date();
                const authAtual = await AuthorizedGroup.findOne({ groupId: alvo });
                if (authAtual?.expiresAt && new Date(authAtual.expiresAt) > new Date()) {
                    dataBase = new Date(authAtual.expiresAt);
                }

                const dataVencimento = new Date(dataBase);
                dataVencimento.setDate(dataVencimento.getDate() + dias);

                await AuthorizedGroup.updateOne(
                    { groupId: alvo },
                    { $set: { isAuthorized: true, expiresAt: dataVencimento } },
                    { upsert: true }
                );

                // ✅ Promove o dono automaticamente se encontrado
                if (dono) {
                    await User.updateOne(
                        { userId: dono.userId, groupId: alvo },
                        { $set: { isBotAdmin: true } },
                        { upsert: true }
                    );
                }

                try {
                    await client.sendMessage(alvo, `🚀 *YUKON STATION ATIVADA*
━━━━━━━━━━━━━━━━━━━━━
✅ Assinatura ativada com sucesso!
📦 *Plano:* ${nomePlano}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🎮 Comandos liberados! Divirtam-se.`);
                } catch {}

                if (dono) {
                    try {
                        await client.sendMessage(dono.userId, `✅ *PAGAMENTO APROVADO!*
━━━━━━━━━━━━━━━━━━━━━
Seu grupo foi ativado com sucesso!
📦 *Plano:* ${nomePlano}
📅 *Duração:* ${dias} dias
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🔑 Você agora tem acesso aos comandos de administração!`);
                    } catch {}
                }

                return client.sendMessage(msg.from, `✅ Grupo \`${alvo}\` ativado!\n📦 *Plano:* ${nomePlano}\n📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}${dono ? `\n🔑 *Dono promovido:* @${dono.userId.split('@')[0]}` : ''}`);
            }

            return client.sendMessage(msg.from, "⚠️ ID inválido. Use o número do cliente ou o ID do grupo.");

        } catch (err) {
            console.error("❌ Erro no /confirmar:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao confirmar ativação.");
        }
    }
};