import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { SyncPayService } from '../services/syncpay.service';
import bcrypt from 'bcryptjs';

const router = Router();

// Rota para assinar o sistema (cria Tenant, User e gera Pix)
router.post('/subscribe', async (req, res) => {
  try {
    const { userName, email, password, companyName } = req.body;
    // CPF e telefone são enviados como mock para o gateway de pagamento
    const cpf = '00000000000';
    const phone = '11999999999';

    if (!userName || !email || !password || !companyName) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    const settings = await prisma.globalSettings.findFirst();
    if (!settings || !settings.syncpayClientId || !settings.syncpayClientSecret) {
      return res.status(400).json({ error: 'O sistema de pagamentos ainda não está configurado. Entre em contato com o administrador.' });
    }
    if (settings.monthlyPrice <= 0) {
      return res.status(400).json({ error: 'O valor da mensalidade ainda não foi definido. Entre em contato com o administrador.' });
    }

    // Verifica se e-mail já existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está em uso.' });
    }

    // Transação: Criação do Tenant PENDENTE e Usuário
    const result = await prisma.$transaction(async (tx) => {
      const slug = companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          active: false,
          paymentStatus: 'PENDING',
          allowedProviders: settings.defaultAllowedProviders,
          quotas: {
            create: {
              maxUsers: settings.defaultQuotaUsers,
              maxContacts: settings.defaultQuotaContacts,
              maxCampaigns: settings.defaultQuotaCampaigns,
              maxConnections: settings.defaultQuotaConnections
            }
          },
          settings: {
            create: {}
          }
        }
      });

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await tx.user.create({
        data: {
          nome: userName,
          email,
          senha: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
          tenants: {
            create: [
              {
                tenantId: tenant.id,
                role: 'ADMIN'
              }
            ]
          }
        }
      });

      return { tenant, user };
    });

    // Agora gera o CashIn no SyncPay
    const pixResponse = await SyncPayService.createCashIn({
      amount: settings.monthlyPrice,
      description: `Assinatura Sistema - ${companyName}`,
      client: {
        name: userName,
        cpf: cpf.replace(/\D/g, ''),
        email,
        phone: phone.replace(/\D/g, '')
      }
    });

    // Registra a transação aguardando pagamento
    const paymentTx = await prisma.paymentTransaction.create({
      data: {
        tenantId: result.tenant.id,
        syncpayIdentifier: pixResponse.identifier,
        amount: settings.monthlyPrice,
        status: 'PENDING',
        qrCodeCopy: pixResponse.pix_code
      }
    });

    res.status(200).json({
      success: true,
      transaction: {
        txId: paymentTx.id,
        pixCode: pixResponse.pix_code,
        amount: settings.monthlyPrice
      }
    });
  } catch (error: any) {
    console.error('Erro no checkout:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao processar assinatura' });
  }
});

// Polling de status da transação pelo frontend
router.get('/status/:txId', async (req, res) => {
  try {
    const tx = await prisma.paymentTransaction.findUnique({
      where: { id: req.params.txId }
    });

    if (!tx) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    res.json({ status: tx.status });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

// Rota para renovar assinatura
router.post('/renew', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.tenant) {
      return res.status(401).json({ error: 'Tenant não encontrado.' });
    }

    const settings = await prisma.globalSettings.findFirst();
    if (!settings || !settings.syncpayClientId || settings.monthlyPrice <= 0) {
      return res.status(400).json({ error: 'Pagamentos via Pix não estão configurados no momento.' });
    }

    // Agora gera o CashIn no SyncPay
    const pixResponse = await SyncPayService.createCashIn({
      amount: settings.monthlyPrice,
      description: `Renovação de Assinatura Sistema - ${req.tenant.name}`,
      client: {
        name: req.user!.nome,
        cpf: '00000000000', // SyncPay exige CPF na v2? No teste de CashIn usamos o recebido.
        email: req.user!.email,
        phone: '00000000000'
      }
    });

    // Cria a transação PENDENTE
    const paymentTx = await prisma.paymentTransaction.create({
      data: {
        tenantId: req.tenant.id,
        syncpayIdentifier: pixResponse.identifier,
        amount: settings.monthlyPrice,
        status: 'PENDING',
        qrCodeCopy: pixResponse.pix_code
      }
    });

    res.status(200).json({
      success: true,
      transaction: {
        txId: paymentTx.id,
        amount: paymentTx.amount,
        pixCode: pixResponse.pix_code
      }
    });
  } catch (error: any) {
    console.error('Erro na renovação:', error);
    res.status(500).json({ error: error.message || 'Erro interno ao processar renovação' });
  }
});

export default router;
