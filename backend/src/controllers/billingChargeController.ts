import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { mercadoPagoService } from '../services/mercadoPagoService';

const prisma = new PrismaClient();

// Criar nova(s) cobrança(s)
export const createCharge = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { contactId, categoryId, amount, dueDate, description } = req.body;

    if ((!contactId && !categoryId) || !amount || !dueDate) {
      return res.status(400).json({ error: 'Faltam campos obrigatórios (contactId ou categoryId, amount, dueDate).' });
    }

    // Obter dados do(s) contato(s)
    let contacts = [];
    if (categoryId) {
      contacts = await prisma.contact.findMany({
        where: { categoriaId: categoryId, tenantId }
      });
    } else if (contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, tenantId }
      });
      if (contact) contacts.push(contact);
    }

    if (contacts.length === 0) {
      return res.status(404).json({ error: 'Nenhum contato encontrado para gerar cobrança.' });
    }

    const createdCharges = [];
    const errors = [];

    // Processar cada contato
    for (const contact of contacts) {
      try {
        // Gerar link de pagamento (Checkout Pro) no Mercado Pago
        const mpResponse = await mercadoPagoService.createCheckoutPreference(tenantId, {
          amount: Number(amount),
          description: description || `Cobrança - ${contact.nome}`,
          payerEmail: contact.email || 'email@padrao.com',
          payerFirstName: contact.nome.split(' ')[0],
          payerLastName: contact.nome.split(' ').slice(1).join(' ') || undefined,
        });

        // Salvar no banco de dados
        const charge = await prisma.billingCharge.create({
          data: {
            tenantId,
            contactId: contact.id,
            amount: Number(amount),
            dueDate: new Date(dueDate),
            status: 'PENDING',
            pixCopiaCola: null,
            pixQrCodeBase64: null,
            boletoUrl: mpResponse.initPoint,
            mercadoPagoId: mpResponse.id?.toString()
          }
        });
        createdCharges.push(charge);
      } catch (err: any) {
        console.error(`Erro ao gerar para contato ${contact.id}:`, err);
        errors.push(`Erro para ${contact.nome}: ${err.message || 'Erro desconhecido'}`);
      }
    }

    return res.status(201).json({
      success: true,
      created: createdCharges.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Erro ao criar cobrança:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor ao criar cobrança.' });
  }
};

// Listar todas as cobranças
export const listCharges = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const charges = await prisma.billingCharge.findMany({
      where: { tenantId },
      include: {
        contact: {
          select: { 
            nome: true, 
            telefone: true,
            categoria: {
              select: { nome: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(charges);
  } catch (error) {
    console.error('Erro ao listar cobranças:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao listar cobranças.' });
  }
};

// Deletar cobrança
export const deleteCharge = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    const charge = await prisma.billingCharge.findFirst({
      where: { id, tenantId }
    });

    if (!charge) {
      return res.status(404).json({ error: 'Cobrança não encontrada.' });
    }

    await prisma.billingCharge.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cobrança:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao deletar cobrança.' });
  }
};

// Atualizar status da cobrança
export const updateChargeStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }

    const charge = await prisma.billingCharge.findFirst({
      where: { id, tenantId }
    });

    if (!charge) {
      return res.status(404).json({ error: 'Cobrança não encontrada.' });
    }

    const updatedCharge = await prisma.billingCharge.update({
      where: { id },
      data: { status }
    });

    return res.json(updatedCharge);
  } catch (error) {
    console.error('Erro ao atualizar status da cobrança:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar status.' });
  }
};

// Deletar cobranças em massa
export const bulkDeleteCharges = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida.' });
    }

    await prisma.billingCharge.deleteMany({
      where: { 
        id: { in: ids },
        tenantId 
      }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cobranças em massa:', error);
    return res.status(500).json({ error: 'Erro interno do servidor ao deletar cobranças em massa.' });
  }
};

// =======================================================
// COBRANÇAS RECORRENTES
// =======================================================

// Listar assinaturas
export const listRecurringCharges = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;

    const recurring = await prisma.recurringCharge.findMany({
      where: { tenantId },
      include: {
        contact: {
          select: { nome: true, telefone: true }
        },
        category: {
          select: { nome: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(recurring);
  } catch (error) {
    console.error('Erro ao listar cobranças recorrentes:', error);
    return res.status(500).json({ error: 'Erro ao listar cobranças recorrentes.' });
  }
};

// Criar assinatura
export const createRecurringCharge = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { contactId, categoryId, amount, dayOfMonth, description } = req.body;

    if (!amount || !dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
      return res.status(400).json({ error: 'Valor e Dia de Vencimento (1-31) são obrigatórios.' });
    }

    if (!contactId && !categoryId) {
      return res.status(400).json({ error: 'É necessário informar um Contato ou Categoria.' });
    }

    const newRecurring = await prisma.recurringCharge.create({
      data: {
        tenantId,
        contactId: contactId || null,
        categoryId: categoryId || null,
        amount,
        dayOfMonth,
        description
      }
    });

    return res.status(201).json(newRecurring);
  } catch (error) {
    console.error('Erro ao criar cobrança recorrente:', error);
    return res.status(500).json({ error: 'Erro ao criar cobrança recorrente.' });
  }
};

// Deletar assinatura
export const deleteRecurringCharge = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    await prisma.recurringCharge.delete({
      where: {
        id,
        tenantId
      }
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Erro ao deletar cobrança recorrente:', error);
    return res.status(500).json({ error: 'Erro interno ao deletar cobrança recorrente.' });
  }
};
