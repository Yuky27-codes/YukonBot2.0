// Limite e nome do plano vêm do catálogo central publicado pelo painel (commands/_catalogo.js).
const { planoDoPerfil } = require('./_catalogo');

module.exports = {
    name: 'vincular',
    async execute(client, msg, { args, chatId }) {
        if (chatId.endsWith('@g.us')) return msg.reply("❌ Use este comando apenas no meu *Privado*.");

        // Prova de autoridade sobre o grupo: o código de vinculação do /codigo. Só o dono do grupo
        // (AuthorizedGroup.authorizedBy ou dono do chat) ou a equipe da Yukon consegue gerá-lo, e ele chega
        // no privado de quem tem essa autoridade. É a mesma prova usada pelo painel.
        // Aceita "/vincular CÓDIGO" ou "/vincular ID_DO_GRUPO CÓDIGO".
        const informouId = Boolean(args[0] && args[0].includes('@g.us'));
        const idInformado = informouId ? args[0] : null;
        const codigo = String((informouId ? args[1] : args[0]) || '').trim().toUpperCase();

        if (!codigo) {
            return msg.reply("⚠️ Use: `/vincular [CÓDIGO]`\n\n_O dono do grupo deve enviar */codigo* dentro do grupo. O código chega no privado dele._");
        }

        try {
            const mongoose = require('mongoose');
            const UserProfile = mongoose.model('UserProfile');
            const LinkCode = mongoose.model('LinkCode');

            const linkCode = await LinkCode.findOne({ code: codigo, expiresAt: { $gt: new Date() } });
            if (!linkCode) {
                return msg.reply("❌ Código inválido ou expirado.\n\n_Peça para o dono do grupo enviar */codigo* no grupo e use o código recebido no privado._");
            }
            if (idInformado && linkCode.groupId !== idInformado) {
                return msg.reply("❌ Esse código não pertence ao grupo informado.");
            }
            const idGrupo = linkCode.groupId;

            let perfil = await UserProfile.findOne({ userId: msg.from });

            if (!perfil) {
                return msg.reply("⚠️ Você precisa escolher um plano primeiro!\nUse **/assinar** para ver os planos disponíveis.");
            }

            // Limite por plano (catálogo central)
            const plano = await planoDoPerfil(perfil);
            if (!plano) {
                return msg.reply("⚠️ Você precisa escolher um plano primeiro!\nUse **/assinar** para ver os planos disponíveis.");
            }
            const limite = plano.groupLimit;
            const nomePlano = plano.label;

            if (perfil.gruposVinculados.includes(idGrupo)) {
                return msg.reply("⚠️ Este grupo já está vinculado ao seu perfil.");
            }

            if (perfil.gruposVinculados.length >= limite) {
                return msg.reply(`🚫 *LIMITE ATINGIDO*\nSeu plano *${nomePlano}* permite apenas *${limite} grupo(s)*.\n\nUse */upgrade* para aumentar o limite.`);
            }

            // Adiciona o grupo ao perfil.
            // Cada grupo tem a própria licença: o vínculo NÃO copia validade nem plano de outro grupo.
            // A licença deste grupo só é ativada quando a equipe confirmar o pagamento (/pix + comprovante).
            perfil.gruposVinculados.push(idGrupo);
            await perfil.save();

            return msg.reply(`✅ *GRUPO VINCULADO!*
━━━━━━━━━━━━━━━━━━━━━
📍 *ID:* \`${idGrupo}\`
📦 *Plano:* ${nomePlano}
📊 *Vagas:* ${perfil.gruposVinculados.length}/${limite}

📋 *Próximo passo:* Use */pix* para ver os dados de pagamento e envie o comprovante para ativar a licença deste grupo.`);

        } catch (err) {
            console.error("❌ Erro no /vincular:", err);
            return msg.reply("⚠️ Erro ao vincular grupo.");
        }
    }
};
