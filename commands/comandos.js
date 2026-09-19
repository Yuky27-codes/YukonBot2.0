// Todos os comandos do bot agrupados por categoria
const TODOS_COMANDOS = {
    '🔧 Moderação': ['adv', 'rmvadv', 'listaadv', 'ban', 'banblack', 'unbanblack', 'blacklist', 'mute', 'desmute', 'mutep', 'desmutep', 'promover', 'rebaixar', 'imune', 'protecao'],
    '⚙️ Administração': ['addcoins', 'rmvcoins', 'lock', 'unlock', 'todos', 'manutencao', 'monitorar', 'resetar', 'resetconf', 'editarconf', 'prefixo', 'simbolo'],
    '📡 Sistema Yukon': ['auth', 'checkauth', 'broadcast', 'grupos', 'sairgrupo', 'limpar', 'transferirplano', 'confirmar', 'codigo', 'perfilv', 'dono'],
    '🎟️ Financeiro': ['cupom', 'cupomp', 'pix', 'meu_plano'],
    '📅 Eventos': ['evento', 'listaevento', 'finalizar', 'participar', 'confirmarp'],
    '🤝 Parceria': ['parceria', 'parcerias', 'parceriaCode', 'parceriadel'],
    '💰 Economia': ['perfil', 'inventario', 'rank', 'rankglobal', 'yukonshop', 'doar', 'roubar', 'missao', 'pousar', 'banco', 'modocaos', 'caixasurpresa'],
    '🎮 Diversão': ['quiz', 'forca', 'jogovelha', 'desafiodiario', 'cassino', 'curiosidades', 'humor', 'palpite', 'matar', 'encontro', 'f'],
    '👨‍👩‍👧 Social': ['casar', 'divorciar', 'amante', 'ship', 'familia', 'parentesco', 'heranca', 'mesada', 'deserdar', 'dar_flores', 'meu_aniver', 'lista_aniver'],
    '🤖 IA': ['ia', 'resumir', 'personalidade'],
    '🏠 Sala': ['sala', 'salap', 'fsala', 'vincular', 'desvincular'],
    '📋 Menus': ['painel', 'help', 'menu_adm', 'menu_cliente', 'menu_diversao', 'menu_economia', 'menu_ia', 'menu_sala', 'menu_social', 'menu_util'],
    '👤 Perfil': ['registrar', 'meu_aniver', 'meu_plano', 'quemsoueu'],
    '🐾 Pets': ['pet', 'adotarpet'],
};

// Comandos que requerem permissão especial (sensíveis)
const COMANDOS_SENSIVEIS = [
    'auth', 'broadcast','checkauth', 'codigo','confirmarp', 'cupom','grupos', 'limpar',
    'perfilv','promover','rebaixar','sairgrupo','transferirplano','setmidia'
];

module.exports = {
    name: 'comandos',
    async execute(client, msg, { isAdmin, senderRaw }) {
        const ehDono = global.LISTA_ADMS.includes(senderRaw);
        const ehFuncionaria = global.isFuncionario(senderRaw);

        // Usuários comuns não têm acesso a este comando de gestão
        if (!ehDono && !ehFuncionaria) {
            return msg.reply('❌ Este comando é restrito à equipe Yukon.');
        }

        if (ehDono) {
            // Dono vê TODOS os comandos sensíveis com descrição
            let texto = '🗂️ *COMANDOS SENSÍVEIS — VISÃO DO DONO*\n━━━━━━━━━━━━━━━━━━━━━\n\n';
            texto += '📌 _Esses são os comandos que você pode liberar para funcionárias via /liberaruso_\n\n';
            
            COMANDOS_SENSIVEIS.forEach(cmd => {
                texto += `• \`/${cmd}\`\n`;
            });

            texto += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `📊 Total: *${COMANDOS_SENSIVEIS.length} comandos sensíveis*\n\n`;
            texto += `*Gerenciamento:*\n`;
            texto += `• /funcionarios — ver lista de funcionárias\n`;
            texto += `• /liberaruso [ID] [cmds] — liberar acesso\n`;
            texto += `• /restringiruso [ID] [cmds] — revogar acesso\n`;
            texto += `• /funcionario [ID] [nome] — cadastrar funcionária`;

            return msg.reply(texto);
        }

        // Funcionária vê apenas os comandos liberados para ela
        const perms = global.lerPermissoesFuncionarios();
        const dadosFuncionaria = perms[senderRaw];
        const nome = dadosFuncionaria?.nome || 'Funcionária';
        const liberados = dadosFuncionaria?.comandosLiberados || [];

        let texto = `🗂️ *SEUS COMANDOS — ${nome.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━━\n\n`;

        if (liberados.length === 0) {
            texto += '⚠️ _Você ainda não possui nenhum comando especial liberado._\n';
            texto += '_Peça ao dono da Yukon para liberar acesso via /liberaruso._';
        } else {
            texto += `✅ *Comandos especiais que você pode usar:*\n\n`;
            liberados.forEach(cmd => {
                texto += `• \`/${cmd}\`\n`;
            });
            texto += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
            texto += `📊 Total: *${liberados.length} comando(s) especial(is)*\n\n`;
            texto += `_Todos os comandos comuns do bot também estão disponíveis normalmente._`;
        }

        return msg.reply(texto);
    }
};

