import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = Router();

router.post('/syncpay', async (req, res) => {
  try {
    const payload = req.body;

    // Verifica se é o evento de atualização de transação e tem o formato esperado
    if (payload && payload.data && payload.data.id && payload.data.status) {
      const { id, status } = payload.data;

      const tx = await prisma.paymentTransaction.findUnique({
        where: { syncpayIdentifier: id }
      });

      if (!tx) {
        console.warn(`Webhook SyncPay recebido para transação desconhecida: ${id}`);
        return res.status(404).send('Transação não encontrada');
      }

      // Se foi pago e ainda estava PENDING
      if ((status === 'PAID' || status === 'paid') && tx.status !== 'PAID') {
        await prisma.$transaction(async (prismaTx) => {
          // Atualiza a transação
          await prismaTx.paymentTransaction.update({
            where: { id: tx.id },
            data: { status: 'PAID' }
          });

          // Ativa o Tenant e estende por 30 dias
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          await prismaTx.tenant.update({
            where: { id: tx.tenantId },
            data: {
              active: true,
              paymentStatus: 'ACTIVE',
              expiresAt
            }
          });
        });

        console.log(`Transação ${id} aprovada. Tenant ${tx.tenantId} ativado por 30 dias.`);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar webhook do SyncPay:', error);
    res.status(500).send('Erro Interno');
  }
});

export default router;
