// /memoria — (só admins da Yukon) raio-X da RAM: Node, Chrome do WhatsApp, cache de disco e total do container.
// Com "/memoria reiniciar", reinicia só o WhatsApp (mesma sessão, sem QR Code) para liberar a memória do Chrome.
module.exports = {
    name: 'memoria',
    async execute(client, msg, { args, isSuperAdmin }) {
        if (!isSuperAdmin) return;
        if ((args[0] || '').toLowerCase() === 'reiniciar' && global.reiniciarWhatsApp) {
            await msg.reply('♻️ Reiniciando o WhatsApp da Yukon (~1 minuto)...');
            const ok = await global.reiniciarWhatsApp('pedido no /memoria');
            if (!ok) return msg.reply('⏳ O WhatsApp foi reiniciado há menos de 30 minutos. Aguarde um pouco.');
            return;
        }
        const r = global.raioXMemoria ? global.raioXMemoria() : null;
        if (!r) return msg.reply('⚠️ Raio-X indisponível nesta versão.');
        return msg.reply(`🧠 *MEMÓRIA DA YUKON*
━━━━━━━━━━━━━━━━━━━━━
🟢 Node (comandos): *${r.nodeMB} MB* (heap ${r.heapMB} MB)
🌐 Chrome (WhatsApp): *${r.chromeMB} MB* em ${r.chromeProcessos} processo(s)
${r.outros.length ? `⚙️ Outros: ${r.outros.join(', ')}\n` : ''}${r.ocupadaMB !== null ? `📦 Ocupada de verdade: *${r.ocupadaMB} MB*\n💾 Cache de disco (o sistema libera sozinho): ${r.cacheMB} MB\n` : ''}📊 Total do container: *${r.totalMB ?? '—'} MB*${r.limiteMB ? ` de ${r.limiteMB} MB` : ''}

_/memoria reiniciar → reinicia só o WhatsApp para liberar a memória do Chrome._`);
    },
};
