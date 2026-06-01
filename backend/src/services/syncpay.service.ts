import axios from 'axios';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SYNCPAY_API_URL = process.env.SYNCPAY_API_URL || 'https://api.syncpayments.com.br';

export class SyncPayService {
  private static tokenCache: { token: string; expiresAt: Date } | null = null;

  static async getAuthToken(): Promise<string> {
    // Verifica se já temos um token válido no cache
    if (this.tokenCache && this.tokenCache.expiresAt > new Date()) {
      return this.tokenCache.token;
    }

    const settings = await prisma.globalSettings.findFirst();
    if (!settings || !settings.syncpayClientId || !settings.syncpayClientSecret) {
      throw new Error('Credenciais do SyncPay não configuradas nas Configurações Globais.');
    }

    try {
      const response = await axios.post(`${SYNCPAY_API_URL}/api/partner/v1/auth-token`, {
        client_id: settings.syncpayClientId,
        client_secret: settings.syncpayClientSecret
      });

      const { access_token, expires_in } = response.data;
      
      // Armazena no cache (margem de segurança de 5 minutos)
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in - 300);

      this.tokenCache = {
        token: access_token,
        expiresAt
      };

      return access_token;
    } catch (error: any) {
      console.error('Erro ao gerar token SyncPay:', error.response?.data || error.message);
      throw new Error('Falha na autenticação com SyncPay');
    }
  }

  static async createCashIn(params: {
    amount: number;
    description?: string;
    client: {
      name: string;
      cpf: string;
      email: string;
      phone: string;
    };
  }): Promise<{ pix_code: string; identifier: string }> {
    const token = await this.getAuthToken();
    
    // Define a URL do webhook (deve ser a URL pública do seu sistema)
    const webhook_url = process.env.APP_URL 
      ? `${process.env.APP_URL}/api/webhooks/syncpay` 
      : 'https://seu-dominio.com.br/api/webhooks/syncpay';

    try {
      const response = await axios.post(
        `${SYNCPAY_API_URL}/api/partner/v1/cash-in`,
        {
          amount: params.amount,
          description: params.description || 'Assinatura Sistema',
          client: params.client,
          webhook_url
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      return {
        pix_code: response.data.pix_code,
        identifier: response.data.identifier
      };
    } catch (error: any) {
      console.error('Erro ao gerar Pix no SyncPay:', error.response?.data || error.message);
      throw new Error('Falha ao gerar cobrança via Pix');
    }
  }
}
