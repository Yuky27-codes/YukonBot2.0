module.exports = {
    name: 'vincular',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) return msg.reply("❌ Use este comando no meu PV.");

        const idGrupo = args[0];
        if (!idGrupo || !idGrupo.includes('@g.us')) return msg.reply("⚠️ Use: `/vincular [ID_DO_GRUPO]`");

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            let perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil) return msg.reply("⚠️ Você precisa escolher um plano primeiro! Use **/assinar**.");

            // Definição de limites baseada nos preços dos planos definidos
            let limite = 1; 
            if (perfil.planoPreco === 30) limite = 2;
            if (perfil.planoPreco === 75) limite = 3;

            // Verifica se o grupo já possui assinatura ativa no banco de dados (Migração)
            const grupoAntigo = await AuthorizedGroup.findOne({ groupId: idGrupo, isAuthorized: true });
            const temDiasAtivos = grupoAntigo && grupoAntigo.expiresAt > new Date();

            if (perfil.gruposVinculados.length >= limite) {
                return msg.reply(`🚫 *LIMITE ATINGIDO*\nSeu plano atual permite vincular apenas ${limite} grupo(s).`);
            }

            if (perfil.gruposVinculados.includes(idGrupo)) {
                return msg.reply("⚠️ Este grupo já está vinculado ao seu perfil.");
            }

            // --- LÓGICA DE MIGRAÇÃO ---
            if (temDiasAtivos) {
                const meuNumero = "5524988268426@c.us";
                
                // Envia os dados para você conferir e aprovar
                await client.sendMessage(meuNumero, `🔄 *SOLICITAÇÃO DE MIGRAÇÃO*
━━━━━━━━━━━━━━━━━━━━━━
👤 **Dono:** @${msg.from.split('@')[0]}
📍 **Grupo:** \`${idGrupo}\`
📅 **Expira em:** ${grupoAntigo.expiresAt.toLocaleDateString('pt-BR')}

Para migrar sem perder os dias, use:
\`/confirmar ${idGrupo} migrar\``, { mentions: [msg.from] });

                return msg.reply("🔄 *SISTEMA ANTIGO DETECTADO*\nIdentificamos que este grupo já possui dias ativos! O Comandante Yukon recebeu seu pedido de migração e validará seus dias em instantes.");
            }

            // Fluxo normal para novos vínculos
            perfil.gruposVinculados.push(idGrupo);
            await perfil.save();

            return msg.reply(`✅ *GRUPO VINCULADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 ID: \`${idGrupo}\`
📊 Vagas: ${perfil.gruposVinculados.length}/${limite}

Agora você pode prosseguir para o pagamento com **/pix**.`);

        } catch (err) {
            console.error("ERRO NO VINCULAR:", err);
            return msg.reply("⚠️ Erro ao vincular grupo.");
        }
    }
};