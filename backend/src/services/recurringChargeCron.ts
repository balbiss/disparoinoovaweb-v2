import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { mercadoPagoService } from './mercadoPagoService';

const prisma = new PrismaClient();

export function initializeRecurringChargeCron() {
  console.log('Starting Recurring Charge Cron Job...');

  // Roda todo dia às 03:00 da manhã
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Iniciando verificação de cobranças recorrentes...');
    await processRecurringCharges();
  });

  // Também roda imediatamente na inicialização (opcional, para testar mais fácil)
  // setTimeout(() => processRecurringCharges(), 5000);
}

async function processRecurringCharges() {
  try {
    const activeCharges = await prisma.recurringCharge.findMany({
      where: { active: true },
      include: {
        contact: true,
        category: {
          include: { contacts: true }
        }
      }
    });

    const now = new Date();

    for (const recurring of activeCharges) {
      try {
        // 1. Evitar duplicidade: se gerou nos últimos 20 dias, pula
        if (recurring.lastGeneratedAt) {
          const daysSinceLast = (now.getTime() - recurring.lastGeneratedAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceLast < 20) {
            continue;
          }
        }

        // 2. Descobrir a próxima data de vencimento
        let nextDueDate = new Date(now.getFullYear(), now.getMonth(), recurring.dayOfMonth);
        // Se a data deste mês já passou, o próximo vencimento é no mês que vem
        if (now.getTime() > nextDueDate.getTime()) {
          nextDueDate = new Date(now.getFullYear(), now.getMonth() + 1, recurring.dayOfMonth);
        }

        // 3. Verificar se está dentro da janela de 5 dias
        const diffDays = (nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (diffDays <= 5 && diffDays >= -1) {
          console.log(`[Cron] Gerando cobrança recorrente para a assinatura ${recurring.id}`);

          // Gerar as faturas!
          const contactsToCharge = [];
          if (recurring.contact) {
            contactsToCharge.push(recurring.contact);
          } else if (recurring.category && recurring.category.contacts) {
            contactsToCharge.push(...recurring.category.contacts);
          }

          for (const contact of contactsToCharge) {
            // Gerar link MP
            const mpCharge = await mercadoPagoService.createCheckoutPreference(recurring.tenantId, {
              amount: Number(recurring.amount),
              description: recurring.description || 'Cobrança Recorrente',
              payerEmail: contact.email || 'email@padrao.com',
              payerFirstName: contact.nome,
            });

            // Salvar no BD
            await prisma.billingCharge.create({
              data: {
                tenantId: recurring.tenantId,
                contactId: contact.id,
                amount: recurring.amount,
                dueDate: nextDueDate,
                status: 'PENDING',
                description: recurring.description,
                paymentUrl: mpCharge.initPoint,
                mercadoPagoId: mpCharge.id
              }
            });
          }

          // 4. Atualizar o RecurringCharge com lastGeneratedAt
          await prisma.recurringCharge.update({
            where: { id: recurring.id },
            data: { lastGeneratedAt: new Date() }
          });
        }
      } catch (error) {
        console.error(`[Cron] Erro ao processar assinatura ${recurring.id}:`, error);
      }
    }
    console.log('[Cron] Verificação de cobranças recorrentes concluída.');
  } catch (error) {
    console.error('[Cron] Erro geral:', error);
  }
}
