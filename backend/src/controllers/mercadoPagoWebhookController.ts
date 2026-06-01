import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { mercadoPagoService } from '../services/mercadoPagoService';

const prisma = new PrismaClient();

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;
    const { type, data } = req.body;

    console.log(`[Webhook MP] Recebido para o tenant ${tenantSlug}: type=${type}`);

    // Só nos interessa pagamentos
    if (type !== 'payment' || !data || !data.id) {
      return res.status(200).send('Ignorado');
    }

    const paymentId = data.id;

    // Buscar o tenant pelo slug
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    if (!tenant) {
      console.warn(`[Webhook MP] Tenant não encontrado: ${tenantSlug}`);
      return res.status(404).send('Tenant não encontrado');
    }

    // Consultar o status real do pagamento no Mercado Pago usando as credenciais do Tenant
    try {
      const paymentData = await mercadoPagoService.getPaymentStatus(tenant.id, Number(paymentId));
      
      // Buscar a cobrança no nosso banco pelo ID do Mercado Pago (ou pelo ID que pode estar no external_reference se estivéssemos enviando, mas salvamos o mercadoPagoId)
      const charge = await prisma.billingCharge.findFirst({
        where: {
          tenantId: tenant.id,
          mercadoPagoId: paymentId.toString()
        }
      });

      if (!charge) {
        console.warn(`[Webhook MP] Cobrança não encontrada para o pagamento MP ${paymentId}`);
        return res.status(200).send('Cobrança não encontrada'); // Retornamos 200 para o MP parar de tentar
      }

      // Atualizar o status baseado no MP
      let newStatus = charge.status;
      if (paymentData.status === 'approved') {
        newStatus = 'PAID';
        // TODO: Enviar mensagem no WhatsApp de agradecimento?
      } else if (paymentData.status === 'cancelled' || paymentData.status === 'rejected') {
        newStatus = 'CANCELLED';
      }

      if (newStatus !== charge.status) {
        await prisma.billingCharge.update({
          where: { id: charge.id },
          data: { status: newStatus }
        });
        console.log(`[Webhook MP] Status da cobrança ${charge.id} atualizado para ${newStatus}`);
      }

    } catch (error) {
      console.error(`[Webhook MP] Erro ao buscar dados do pagamento ${paymentId}:`, error);
      // Se deu erro ao buscar no MP (ex: chave inválida), retornamos erro para tentar depois
      return res.status(500).send('Erro interno');
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('[Webhook MP] Erro geral:', error);
    return res.status(500).send('Erro interno do servidor');
  }
};
