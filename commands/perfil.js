module.exports = {
    name: 'perfil',
    // Note que agora incluímos o "User" dentro das chaves {}
    async execute(client, msg, { chatId, senderRaw, User }) { 
        try {
            const senderId = senderRaw.toString();
            
            // Agora ele usa o User que veio do index.js!
            const userProfile = await User.findOne({ userId: senderId, groupId: chatId });

            if (!userProfile) {
                return await client.sendMessage(chatId, "❌ Registro não encontrado nos arquivos da Yukon.", { sendSeen: false });
            }

            let patente = "❄️ Recruta do Gelo";
            const lvl = userProfile.level || 1;
            if (lvl >= 5) patente = "🏹 Explorador Ártico";
            if (lvl >= 15) patente = "🛡️ Veterano de Yukon";
            if (lvl >= 30) patente = "👨‍✈️ Comandante Glacial";
            if (lvl >= 50) patente = "👑 Lenda de Yukon";

            // --- BARRA DE PROGRESSO ---
            const xpAtual = userProfile.xp || 0;
            const xpNecessario = 100; 
            let calculoProgresso = Math.floor((xpAtual / xpNecessario) * 10);
            let progresso = Math.max(0, Math.min(10, calculoProgresso)); 
            const barra = "▓".repeat(progresso) + "░".repeat(10 - progresso);

            // --- STATUS CIVIL (Com Menção) ---
            let statusCivil = "🤍 Solteiro(a)";
            let mentions = [senderId];
            
            if (userProfile.marriedWith) {
                const conjugeId = userProfile.marriedWith.toString();
                statusCivil = `💍 Casado(a) com @${conjugeId.split('@')[0]}`;
                mentions.push(conjugeId);
            }

            const nomeUsuario = msg._data.notifyName || "Tripulante";
            const moedas = Number(userProfile.coins || 0).toLocaleString('pt-BR');

            const perfilCustom = `
❄️ *ID DE ACESSO — YUKON STATION* ❄️
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃👤 *NOME:* ${nomeUsuario}
┃🎖️ *PATENTE:* ${patente}
┃🆙 *NÍVEL:* ${lvl}
┃💰 *CRÉDITOS:* ${moedas} YC
┠━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃📊 *XP:* [${barra}] ${xpAtual}%
┃📜 *STATUS:* ${statusCivil}
┠━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏅 *CARGOS:* ${userProfile.roles && userProfile.roles.length > 0 ? userProfile.roles.join(' | ') : 'Tripulante'}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`.trim();

            await client.sendMessage(chatId, perfilCustom, { 
                mentions, 
                sendSeen: false 
            });

        } catch (err) {
            console.error("❌ Erro no comando perfil:", err.message);
            await client.sendMessage(chatId, "❌ Erro ao acessar o banco de dados de tripulantes.", { sendSeen: false });
        }
    }
};