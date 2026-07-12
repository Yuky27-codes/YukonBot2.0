module.exports = {
    name: 'perfil',
    async execute(client, msg, { chatId, senderRaw, User }) { 
        try {
            const senderId = senderRaw.toString();
            const userProfile = await User.findOne({ userId: senderId, groupId: chatId });

            if (!userProfile) {
                return await client.sendMessage(chatId, "❌ Registro não encontrado nos arquivos da Yukon.", { sendSeen: false });
            }

            // --- BUSCA DA FOTO DE PERFIL ---
            let fotoUrl;
            try {
                fotoUrl = await client.getProfilePicUrl(senderId);
            } catch (e) {
                fotoUrl = null; // Caso não tenha foto ou erro de privacidade
            }

            // --- LÓGICA DE ANIVERSÁRIO E ESCUDO (Mantida) ---
            const hoje = new Date();
            const diaMesHoje = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}`;
            let displayAniversario = userProfile.birthday || "Não registrado";
            if (userProfile.birthday === diaMesHoje) displayAniversario += " 🎂 *[HOJE!]*";

            const agora = Date.now();
            const estaProtegido = userProfile.protectedUntil && userProfile.protectedUntil > agora;
            const statusEscudo = estaProtegido ? "🛡️ ATIVO" : "🔓 VULNERÁVEL";

            let patente = "❄️ Recruta do Gelo";
            const lvl = userProfile.level || 1;
            if (lvl >= 5) patente = "🏹 Explorador Ártico";
            if (lvl >= 15) patente = "🛡️ Veterano de Yukon";
            if (lvl >= 30) patente = "👨‍✈️ Comandante Glacial";
            if (lvl >= 50) patente = "👑 Lenda de Yukon";

            const xpAtual = userProfile.xp || 0;
            const barra = "▓".repeat(Math.min(10, Math.floor(xpAtual / 10))) + "░".repeat(Math.max(0, 10 - Math.floor(xpAtual / 10)));

            let statusCivil = "🤍 Solteiro(a)";
            let mentions = [senderId];
            if (userProfile.marriedWith) {
                const conjugeId = userProfile.marriedWith.toString();
                statusCivil = `💍 Casado(a) com @${conjugeId.split('@')[0]}`;
                mentions.push(conjugeId);
            }

            const nomeUsuario = msg._data.notifyName || "Tripulante";
            const moedas = Number(userProfile.coins || 0).toLocaleString('pt-BR');

            const perfilCustom = `❄️ *ID DE ACESSO — YUKON STATION* ❄️
┏━━━━━━━━━━━━━━━━━━━━━━
┃👤 *NOME:* ${nomeUsuario}
┃🎂 *ANIVER:* ${displayAniversario}
┃🛡️ *ESCUDO:* ${statusEscudo}
┃🎖️ *PATENTE:* ${patente}
┃🆙 *NÍVEL:* ${lvl}
┃💰 *CRÉDITOS:* ${moedas} YC
┃📊 *XP:* [${barra}] ${xpAtual}%
┃📜 *STATUS:* ${statusCivil}
┗━━━━━━━━━━━━━━━━━━━━━━`.trim();

            // --- ENVIO COM FOTO ---
            if (fotoUrl) {
                const { MessageMedia } = require('whatsapp-web.js');
                const media = await MessageMedia.fromUrl(fotoUrl);
                await client.sendMessage(chatId, media, { caption: perfilCustom, mentions });
            } else {
                await client.sendMessage(chatId, perfilCustom, { mentions, sendSeen: false });
            }

        } catch (err) {
            console.error("❌ Erro no comando perfil:", err.message);
            await client.sendMessage(chatId, "❌ Erro ao acessar o banco de dados de tripulantes.", { sendSeen: false });
        }
    }
};