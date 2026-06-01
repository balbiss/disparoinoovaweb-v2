import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    nome: string;
    role: string;
    tenantId?: string;
  };
  tenantId?: string; // For easier access
  tenant?: {
    id: string;
    slug: string;
    name: string;
    active: boolean;
    expiresAt?: Date | null;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  iat?: number;
  exp?: number;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      console.log('❌ authMiddleware: 401 - Token não fornecido');
      res.status(401).json({
        success: false,
        message: 'Token de acesso não fornecido'
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não configurado!');
      res.status(500).json({
        success: false,
        message: 'Erro de configuração do servidor'
      });
      return;
    }
    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Verificar se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.ativo) {
      console.log('❌ authMiddleware: 401 - Usuário não encontrado ou inativo', { userId: decoded.userId });
      res.status(401).json({
        success: false,
        message: 'Usuário não encontrado ou inativo'
      });
      return;
    }

    // Adicionar dados do usuário à request
    req.user = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role,
      tenantId: decoded.tenantId
    };

    // Para SuperAdmin, permitir override do tenantId via header X-Tenant-Id
    let effectiveTenantId = decoded.tenantId;
    if (user.role === 'SUPERADMIN') {
      const headerTenantId = req.header('X-Tenant-Id');
      if (headerTenantId) {
        effectiveTenantId = headerTenantId;
      }
    }

    // Adicionar tenantId diretamente para fácil acesso
    req.tenantId = effectiveTenantId === 'all' ? undefined : effectiveTenantId;

    // Se não é SUPERADMIN ou tem tenantId definido, buscar dados do tenant
    if (effectiveTenantId && effectiveTenantId !== 'all') {
      const tenant = await prisma.tenant.findUnique({
        where: {
          id: effectiveTenantId,
          active: true
        },
        select: {
          id: true,
          slug: true,
          name: true,
          active: true
        }
      });

      if (!tenant) {
        if (user.role === 'SUPERADMIN') {
          console.log('⚠️ authMiddleware: X-Tenant-Id inválido ignorado para SUPERADMIN', { tenantId: effectiveTenantId });
          req.tenantId = undefined;
        } else {
          console.log('❌ authMiddleware: 401 - Tenant não encontrado ou inativo', { tenantId: effectiveTenantId });
          res.status(401).json({
            success: false,
            message: 'A conta da sua empresa foi suspensa. Por favor, entre em contato com nosso suporte.'
          });
          return;
        }
      } else {
        const tenantFull = await prisma.tenant.findUnique({
          where: { id: tenant.id },
          select: { paymentStatus: true, expiresAt: true }
        });

        if (tenantFull) {
          const now = new Date();
          const isExpired = tenantFull.paymentStatus === 'EXPIRED' || (tenantFull.expiresAt && new Date(tenantFull.expiresAt) < now) || tenantFull.paymentStatus === 'PENDING';
          if (isExpired && !req.originalUrl.includes('/api/checkout/renew') && !req.originalUrl.includes('/api/checkout/status') && !req.originalUrl.includes('/api/auth/verify')) {
             res.status(402).json({
               success: false,
               message: 'Assinatura expirada ou pendente. Redirecionando para pagamento.',
               paymentExpired: true
             });
             return;
          }
        }

        req.tenant = {
          ...tenant,
          expiresAt: tenantFull?.expiresAt || null
        };
      }
    }

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('❌ authMiddleware: 401 - Token expirado');
      res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ authMiddleware: 401 - Token inválido');
      res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
      return;
    }

    console.log('❌ authMiddleware: 401 - Erro de autenticação genérico', error);
    res.status(401).json({
      success: false,
      message: 'Erro de autenticação'
    });
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Usuário não autenticado'
    });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Acesso negado. Permissão de administrador necessária.'
    });
    return;
  }

  next();
};