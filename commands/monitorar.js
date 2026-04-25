module.exports = {
    name: 'monitorar',
    async execute(client, msg, { chatId, isAdmin, isGroupAdmins, User, GroupConfig }) {
        // 1. Verificação de Permissão (Admins do Bot ou do Grupo)
        if (!isAdmin && !isGroupAdmins) {
            return msg.reply("❌ Acesso negado ao painel de monitoramento.");
        }

        try {
            const mongoose = require('mongoose');
            const GroupStats = mongoose.model('GroupStats');

            const chat = await msg.getChat();
            if (!chat.isGroup) return msg.reply("Este comando só funciona em grupos.");

            // 2. Coleta de dados do WhatsApp
            const totalMembros = chat.participants.length;
            const adminsGrupo = chat.participants.filter(p => p.isAdmin || p.isSuperAdmin).length;
            const botEhAdmin = chat.participants.find(p => p.id._serialized === client.info.wid._serialized)?.isAdmin;

            // 3. Coleta de dados do MongoDB (Estatísticas e Usuários)
            const stats = await GroupStats.findOne({ groupId: chatId }).lean();
            const dadosBanco = await User.find({ groupId: chatId }).lean();
            
            const totalMutados = dadosBanco.filter(u => u.isMuted).length;
            const totalAdvs = dadosBanco.reduce((acc, curr) => acc + (curr.advs || 0), 0);
            const pessoasComAdv = dadosBanco.filter(u => u.advs > 0).length;
            
            const totalCoins = dadosBanco.reduce((acc, curr) => acc + (curr.coins || 0), 0);
            const mediaLevel = dadosBanco.length > 0 
                ? (dadosBanco.reduce((acc, curr) => acc + (curr.level || 1), 0) / dadosBanco.length).toFixed(1)
                : 0;

            // 4. Verificação de Configurações
            const config = await GroupConfig.findOne({ groupId: chatId }).lean();
            const modoLock = config?.onlyAdms ? "🔴 ATIVADO" : "🟢 DESATIVADO";

            // 5. Montagem do Painel conforme solicitado
            const painel = `📊 *PAINEL DE MONITORAMENTO YUKON*
━━━━━━━━━━━━━━━━━━━━━
🛰️ *ESTAÇÃO:* ${chat.name}
🆔 *ID:* \`${chatId.split('@')[0]}\`

👥 *TRIPULAÇÃO:*
• Total de Membros: *${totalMembros}*
• Oficiais (Admins): *${adminsGrupo}*
• Bot é Admin: *${botEhAdmin ? "Sim" : "Não"}*
• Total que Entrou: *${stats?.entradas || 0}*
• Total que Saiu: *${stats?.saidas || 0}*

🛡️ *SEGURANÇA & MODERAÇÃO:*
• Tripulantes Mutados: *${totalMutados}*
• Total de Advertências: *${totalAdvs}*
• Pessoas com ADV: *${pessoasComAdv}*
• Modo Lock (Só ADMs): *${modoLock}*

💰 *ECONOMIA & ENGAJAMENTO:*
• Total de YukonCoins: *${totalCoins.toLocaleString('pt-BR')}*
• Média de Nível: *${mediaLevel}*
• Usuários Registrados: *${dadosBanco.length}*

━━━━━━━━━━━━━━━━━━━━━
_Relatório gerado em tempo real._`;

            await client.sendMessage(chatId, painel);

        } catch (err) {
            console.error("❌ ERRO NO MONITORAR:", err);
            await msg.reply("⚠️ Erro ao gerar relatório de monitoramento.");
        }
    }
};