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
            const AuthorizedGroup = mongoose.models.AuthorizedGroup || mongoose.model('AuthorizedGroup');
            const UserProfile = mongoose.models.UserProfile || mongoose.model('UserProfile');

            // ✅ Dias corretos por preço
            const diasPorPlano = { 10: 10, 30: 30, 75: 90 };

            // 🧠 INTELIGÊNCIA DE DETECÇÃO (Cliente vs Grupo)
            const apenasNumeros = alvo.replace(/\D/g, '');
            let targetType = 'desconhecido';
            
            if (alvo.includes('@g.us') || alvo.includes('-') || apenasNumeros.length >= 17) {
                targetType = 'grupo'; // IDs de comunidade tem 18+ dígitos
            } else if (alvo.includes('@c.us') || (apenasNumeros.length >= 8 && apenasNumeros.length <= 15)) {
                targetType = 'cliente';
            }

            // --- ATIVAÇÃO POR NÚMERO DO CLIENTE ---
            if (targetType === 'cliente') {
                const clienteId = `${apenasNumeros}@c.us`;
                const perfil = await UserProfile.findOne({ userId: clienteId });

                if (!perfil || !perfil.gruposVinculados || perfil.gruposVinculados.length === 0) {
                    return client.sendMessage(msg.from, `⚠️ Cliente \`${clienteId}\` não encontrado ou sem grupos vinculados.`);
                }

                const dias = diasPorPlano[perfil.planoPreco] || 30;
                let nomePlano = 'FREE';
                if (perfil.planoPreco === 10) nomePlano = 'ASTRONAUTA';
                if (perfil.planoPreco === 30) nomePlano = 'COMANDANTE';
                if (perfil.planoPreco === 75) nomePlano = 'INTERGALÁCTICO';

                let dataBase = new Date();
                
                // Pega o primeiro grupo para calcular se a assinatura já existe
                let primeiroGrupoMatch = perfil.gruposVinculados[0].match(/[\d\-]+/);
                let idPrimeiroGrupo = primeiroGrupoMatch ? primeiroGrupoMatch[0] + '@g.us' : perfil.gruposVinculados[0];

                const authAtual = await AuthorizedGroup.findOne({ groupId: idPrimeiroGrupo });
                if (authAtual?.expiresAt && new Date(authAtual.expiresAt) > new Date()) {
                    dataBase = new Date(authAtual.expiresAt);
                }

                const dataVencimento = new Date(dataBase);
                dataVencimento.setDate(dataVencimento.getDate() + dias);

                let ativados = 0;

                // Ativa TODOS os grupos vinculados forçando a formatação correta
                for (const grupoCru of perfil.gruposVinculados) {
                    // 🧲 A SOLUÇÃO: Normaliza qualquer ID mal formatado para o padrão @g.us
                    const matchG = grupoCru.match(/[\d\-]+/);
                    if (!matchG) continue;
                    const grupoIdFormatado = matchG[0] + '@g.us';

                    await AuthorizedGroup.updateOne(
                        { groupId: grupoIdFormatado },
                        { $set: { isAuthorized: true, expiresAt: dataVencimento, authorizedBy: clienteId } },
                        { upsert: true }
                    );

                    await User.updateOne(
                        { userId: clienteId, groupId: grupoIdFormatado },
                        { $set: { isBotAdmin: true } },
                        { upsert: true }
                    );

                    try {
                        await client.sendMessage(grupoIdFormatado, `🚀 *YUKON STATION ATIVADA*
━━━━━━━━━━━━━━━━━━━━━
✅ Assinatura ativada com sucesso!
📦 *Plano:* ${nomePlano}
📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}
🎮 Comandos liberados! Divirtam-se.`);
                        ativados++;
                    } catch {}
                }

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

            // --- ATIVAÇÃO POR ID DO GRUPO (AVULSO) ---
            if (targetType === 'grupo') {
                const matchG = alvo.match(/[\d\-]+/);
                const idFormatado = matchG ? matchG[0] + '@g.us' : alvo;

                // Busca o dono pelo ID exato ou pelas variações
                const dono = await UserProfile.findOne({
                    $or: [
                        { gruposVinculados: idFormatado },
                        { gruposVinculados: idFormatado.replace('@g.us', '') }
                    ]
                });
                
                let nomePlano = 'FREE';
                const dias = diasPorPlano[dono?.planoPreco] || 30;
                
                if (dono?.planoPreco === 10) nomePlano = 'ASTRONAUTA';
                if (dono?.planoPreco === 30) nomePlano = 'COMANDANTE';
                if (dono?.planoPreco === 75) nomePlano = 'INTERGALÁCTICO';

                let dataBase = new Date();
                const authAtual = await AuthorizedGroup.findOne({ groupId: idFormatado });
                if (authAtual?.expiresAt && new Date(authAtual.expiresAt) > new Date()) {
                    dataBase = new Date(authAtual.expiresAt);
                }

                const dataVencimento = new Date(dataBase);
                dataVencimento.setDate(dataVencimento.getDate() + dias);

                await AuthorizedGroup.updateOne(
                    { groupId: idFormatado },
                    { $set: { isAuthorized: true, expiresAt: dataVencimento, authorizedBy: dono ? dono.userId : "Sistema" } },
                    { upsert: true }
                );

                if (dono) {
                    await User.updateOne(
                        { userId: dono.userId, groupId: idFormatado },
                        { $set: { isBotAdmin: true } },
                        { upsert: true }
                    );
                }

                try {
                    await client.sendMessage(idFormatado, `🚀 *YUKON STATION ATIVADA*
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

                return client.sendMessage(msg.from, `✅ Grupo \`${idFormatado}\` ativado!\n📦 *Plano:* ${nomePlano}\n📅 *Válido até:* ${dataVencimento.toLocaleDateString('pt-BR')}${dono ? `\n🔑 *Dono promovido:* @${dono.userId.split('@')[0]}` : ''}`);
            }

            return client.sendMessage(msg.from, "⚠️ Formato não reconhecido. Use o número do cliente (com DDD) ou o ID numérico do grupo.");

        } catch (err) {
            console.error("❌ Erro no /confirmar:", err);
            return client.sendMessage(msg.from, "⚠️ Erro ao confirmar ativação.");
        }
    }
};