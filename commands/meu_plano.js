module.exports = {
    name: 'meu_plano',
    async execute(client, msg) {
        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const AuthorizedGroup = mongoose.model('AuthorizedGroup');

            const perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil || perfil.gruposVinculados.length === 0) {
                return msg.reply("⚠️ *SEM PLANO ATIVO*\nVocê ainda não possui grupos vinculados.\nUse **/assinar** para começar.");
            }

            // ✅ CORRIGIDO: mostra nome do plano em vez de só o preço
            const nomePlano = perfil.planoPreco === 10 ? 'Recruta ⭐' : perfil.planoPreco === 30 ? 'Astronauta 🚀' : 'Intergaláctico 🌌';
            const limiteGrupos = perfil.planoPreco === 10 ? 1 : perfil.planoPreco === 30 ? 2 : 3;

            let listaGrupos = "";
            let validadeGeral = null;

            for (let i = 0; i < perfil.gruposVinculados.length; i++) {
                const id = perfil.gruposVinculados[i];
                const auth = await AuthorizedGroup.findOne({ groupId: id });

                const status = auth?.isAuthorized && new Date(auth.expiresAt) > new Date() ? "✅ Ativo" : "🔴 Inativo";
                const vencimento = auth?.expiresAt ? new Date(auth.expiresAt).toLocaleDateString('pt-BR') : "--/--/--";

                if (!validadeGeral && auth?.expiresAt) validadeGeral = vencimento;

                listaGrupos += `\n${i + 1}️⃣ \`${id}\`\n   *Status:* ${status} | *Vence:* ${vencimento}\n`;
            }

            // Calcula dias restantes
            let diasRestantes = "";
            if (validadeGeral) {
                const auth = await AuthorizedGroup.findOne({ groupId: perfil.gruposVinculados[0] });
                if (auth?.expiresAt) {
                    const restante = new Date(auth.expiresAt) - new Date();
                    const dias = Math.max(0, Math.floor(restante / (1000 * 60 * 60 * 24)));
                    diasRestantes = `⏳ *Dias restantes:* ${dias} dia(s)`;
                }
            }

            return msg.reply(`👤 *SEU PAINEL YUKON*
━━━━━━━━━━━━━━━━━━━━━
📦 *Plano:* ${nomePlano}
📍 *Grupos:* ${perfil.gruposVinculados.length}/${limiteGrupos}
${diasRestantes}

🛰️ *DETALHES DAS ESTAÇÕES:*
${listaGrupos}
━━━━━━━━━━━━━━━━━━━━━
💡 _Precisa de ajuda? Use */suporte* ou */admin*._`);

        } catch (err) {
            console.error("❌ Erro no /meu_plano:", err);
            return msg.reply("⚠️ Erro ao carregar as informações do seu plano.");
        }
    }
};