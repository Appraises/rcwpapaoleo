// server/utils/MessageVariation.js
// Provides randomized message fragments to avoid WhatsApp detection of repeated templates.
// Each function returns a randomly chosen variant of a given message element.

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Dispatch (roteiro) ───────────────────────────────────────────────

const dispatchGreetings = [
    (name) => `Olá, *${name}*! Segue o roteiro de hoje:`,
    (name) => `Bom dia, *${name}*! Aqui está o roteiro do dia:`,
    (name) => `E aí, *${name}*! Separei o roteiro de hoje pra você:`,
    (name) => `Fala, *${name}*! Seu roteiro de coleta está pronto:`,
    (name) => `Oi, *${name}*! Confira o roteiro de hoje:`,
    (name) => `Bom dia, *${name}*! Já tá pronto o roteiro:`,
];

const dispatchHeaders = [
    (date) => `🛢️ *Roteiro de Coleta — ${date}*`,
    (date) => `📋 *Rota do Dia — ${date}*`,
    (date) => `🚛 *Coletas Programadas — ${date}*`,
    (date) => `♻️ *Roteiro ${date}*`,
    (date) => `📍 *Coletas de Hoje — ${date}*`,
];

const dispatchDistanceLabels = [
    (km) => `📏 Distância total estimada: *${km} km*`,
    (km) => `🗺️ Percurso estimado: *${km} km*`,
    (km) => `📐 Trajeto total aprox.: *${km} km*`,
    (km) => `🛣️ Distância estimada da rota: *${km} km*`,
];

const dispatchGoogleLabels = [
    '🗺️ *Abrir rota no Google Maps:*',
    '🗺️ *Ver rota completa no Maps:*',
    '📍 *Google Maps — rota completa:*',
    '🗺️ *Navegar pelo Google Maps:*',
];

const dispatchWazeLabels = [
    '🔵 *Abrir no Waze (1ª parada):*',
    '🔵 *Navegar pelo Waze:*',
    '🔵 *Waze — ir pra 1ª parada:*',
    '🔵 *Iniciar navegação no Waze:*',
];

const dispatchClosings = [
    'Bom trabalho! ♻️💚',
    'Boa coleta! 💪🛢️',
    'Manda ver! ♻️🚛',
    'Boa sorte na rota! 💚',
    'Vamos nessa! ♻️💪',
    'Bora pra cima! 🛢️💚',
];

// ─── Completion (confirmação pro coletor) ─────────────────────────────

const completionAllDone = [
    (name, count) => `✅ Perfeito, ${name}! Todas as ${count} coletas foram registradas como concluídas.\n\nBom descanso! 💚♻️`,
    (name, count) => `✅ Show, ${name}! As ${count} coletas do dia foram finalizadas com sucesso.\n\nDescanse bem! 🛢️💚`,
    (name, count) => `✅ Maravilha, ${name}! ${count} coletas concluídas — tudo registrado.\n\nAté amanhã! ♻️💪`,
    (name, count) => `✅ Boa, ${name}! Registrado: ${count} coleta(s) feita(s) hoje.\n\nValeu pelo trabalho! 💚🛢️`,
    (name, count) => `✅ Fechado, ${name}! Todas as ${count} coletas do dia anotadas.\n\nBom descanso! ♻️`,
];

const completionPartial = [
    (name, done, left) => `✅ Registrado, ${name}!\n\n• *${done}* coleta(s) concluída(s)\n• *${left}* coleta(s) ficaram para o próximo dia (com prioridade)\n\nBom descanso! 💚♻️`,
    (name, done, left) => `✅ Anotado, ${name}!\n\n• *${done}* concluída(s) ✔️\n• *${left}* voltaram pra fila de amanhã (prioridade alta)\n\nDescanse bem! 🛢️`,
    (name, done, left) => `✅ Tudo certo, ${name}!\n\n• *${done}* coleta(s) feita(s)\n• *${left}* reagendada(s) com prioridade pro próximo dia\n\nValeu! ♻️💪`,
    (name, done, left) => `✅ Ok, ${name}!\n\n• Concluídas: *${done}*\n• Para amanhã (prioridade): *${left}*\n\nBom descanso! 💚`,
];

// ─── Owner Report ─────────────────────────────────────────────────────

const ownerReportHeaders = [
    (date) => `📊 *Relatório de Coleta — ${date}*`,
    (date) => `📋 *Resumo do Dia — ${date}*`,
    (date) => `🛢️ *Resultado das Coletas — ${date}*`,
    (date) => `📊 *Fechamento do Dia — ${date}*`,
    (date) => `📋 *Relatório Diário — ${date}*`,
];

const ownerCollectorLabels = [
    (name) => `Coletador: *${name}*`,
    (name) => `Responsável: *${name}*`,
    (name) => `Coletor do dia: *${name}*`,
    (name) => `Feito por: *${name}*`,
];

const ownerCompletedLabels = [
    (count) => `✅ *Coletados (${count}):*`,
    (count) => `✅ *Concluídos (${count}):*`,
    (count) => `✅ *Finalizados (${count}):*`,
    (count) => `✅ *Coletas feitas (${count}):*`,
];

const ownerPendingLabels = [
    (count) => `⏳ *Não coletados — ficaram pro próximo dia (${count}):*`,
    (count) => `⏳ *Pendentes — reagendados com prioridade (${count}):*`,
    (count) => `⏳ *Ficaram pra amanhã (${count}):*`,
    (count) => `⏳ *Não finalizados — voltaram pra fila (${count}):*`,
];

const ownerAllDoneMessages = [
    '🎉 Todas as coletas do dia foram concluídas!',
    '🎉 Dia 100%! Tudo coletado com sucesso.',
    '🎉 Nenhuma pendência — rota concluída por completo!',
    '🎉 Excelente! Todas as paradas foram atendidas.',
];

const ownerPendingWarnings = [
    (count) => `⚠️ ${count} coleta(s) pendente(s) com prioridade para amanhã.`,
    (count) => `⚠️ ${count} ponto(s) ficaram sem coleta — terão prioridade amanhã.`,
    (count) => `⚠️ Atenção: ${count} coleta(s) reagendada(s) para o próximo dia.`,
    (count) => `⚠️ ${count} local(is) não coletado(s), já ficou com prioridade pra amanhã.`,
];

// ─── Unknown message reply ────────────────────────────────────────────

const unknownMessageReplies = [
    (name) => `Oi, ${name}! Não entendi a mensagem. Para informar as coletas do dia, envie:\n\n• "coletei todos" — se completou toda a rota\n• "coletei até o 4" — se coletou até o ponto 4\n\nOu fale com o admin pelo sistema. 🛢️`,
    (name) => `Fala, ${name}! Não consegui entender. Pra registrar as coletas, mande:\n\n• "coletei todos" — pra fechar o dia\n• "coletei até o 3" — se parou no ponto 3\n\nQualquer dúvida, fala com o responsável. ♻️`,
    (name) => `Oi ${name}! Não entendi essa mensagem. Você pode enviar:\n\n• "coletei todos"\n• "coletei até o X"\n\nAssim consigo registrar certinho! 🛢️`,
];

const noDispatchReplies = [
    (name) => `Não encontrei solicitações despachadas pra hoje, ${name}. Pode ser que já tenham sido encerradas. 👍`,
    (name) => `Oi, ${name}! Parece que não tem coletas em aberto no momento. Talvez já foram fechadas. ✅`,
    (name) => `${name}, não achei nenhuma rota aberta pra hoje. Já pode ter sido encerrada! 👍`,
];

// ─── Churn Reminder (Prevenção de Inatividade) ──────────────────────

const churnReminders = [
    (name) => `Olá ${name}! Tudo bem?\n\nPercebemos que já faz um tempinho desde a nossa última coleta de óleo com vocês. Precisam de uma nova coleta? ♻️💚\n\nÉ só responder com "Sim" e já enviamos alguém no próximo roteiro!`,
    (name) => `Oi ${name}, tudo joia?\n\nPassando pra lembrar da nossa coleta de óleo! Já faz um tempo desde que passamos aí. 🛢️\n\nSe precisarem recolher o óleo, é só dar um "ok" aqui. Valeu! 💚`,
    (name) => `Bom dia ${name}!\n\nVi no sistema que já faz um tempo da nossa última coleta aí. Querem agendar pro próximo roteiro? ♻️🚛\n\nQualquer coisa é só responder essa mensagem!`,
    (name) => `Oi ${name}! RCW Papa Óleo passando pra dar um alô. 👋\n\nJá estamos na época da coleta de vocês? Se o tambor/bombona já tiver cheio, fiquem à vontade pra pedir a coleta por aqui. 💚🛢️`
];

// ─── Exports ──────────────────────────────────────────────────────────

module.exports = {
    pick,
    dispatch: {
        greeting: (name) => pick(dispatchGreetings)(name),
        header: (date) => pick(dispatchHeaders)(date),
        distance: (km) => pick(dispatchDistanceLabels)(km),
        googleLabel: () => pick(dispatchGoogleLabels),
        wazeLabel: () => pick(dispatchWazeLabels),
        closing: () => pick(dispatchClosings),
    },
    completion: {
        allDone: (name, count) => pick(completionAllDone)(name, count),
        partial: (name, done, left) => pick(completionPartial)(name, done, left),
        unknownMessage: (name) => pick(unknownMessageReplies)(name),
        noDispatch: (name) => pick(noDispatchReplies)(name),
    },
    ownerReport: {
        header: (date) => pick(ownerReportHeaders)(date),
        collectorLabel: (name) => pick(ownerCollectorLabels)(name),
        completedLabel: (count) => pick(ownerCompletedLabels)(count),
        pendingLabel: (count) => pick(ownerPendingLabels)(count),
        allDone: () => pick(ownerAllDoneMessages),
        pendingWarning: (count) => pick(ownerPendingWarnings)(count),
    },
    churn: {
        reminder: (name) => pick(churnReminders)(name),
    }
};
