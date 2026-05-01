module.exports = {
    name: 'meu_plano',
    async execute(client, msg) {
        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            const perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil || perfil.gruposVinculados.length === 0) {
                return msg.reply("⚠️ *SEM PLANO ATIVO*\nVocê ainda não possui grupos vinculados ou uma assinatura ativa. Use **/assinar**.");
            }

            let listaGrupos = "";
            for (let i = 0; i < perfil.gruposVinculados.length; i++) {
                const id = perfil.gruposVinculados[i];
                const auth = await AuthorizedGroup.findOne({ groupId: id });
                const status = auth?.isAuthorized ? "✅ Ativo" : "🔴 Pendente/Expirado";
                const vencimento = auth?.expiresAt ? auth.expiresAt.toLocaleDateString('pt-BR') : "--/--/--";
                
                listaGrupos += `\n${i+1}️⃣ **ID:** \`${id}\` \n   *Status:* ${status} \n   *Vence em:* ${vencimento}\n`;
            }

            return msg.reply(`👤 *SEU PAINEL YUKON*
━━━━━━━━━━━━━━━━━━━━━
📊 *Resumo da Conta:*
Grupos Vinculados: ${perfil.gruposVinculados.length}

🛰️ *Detalhes das Estações:*
${listaGrupos}
━━━━━━━━━━━━━━━━━━━━━
💡 _Precisa trocar um grupo ou renovar? Fale com o nosso /suporte._`);

        } catch (err) {
            console.error(err);
            return msg.reply("⚠️ Erro ao carregar as informações do seu plano.");
        }
    }
};