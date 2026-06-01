import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MercadoPagoService {
  /**
   * Inicializa o cliente do Mercado Pago com as credenciais do Tenant
   */
  private async getClient(tenantId: string): Promise<MercadoPagoConfig> {
    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId }
    });

    if (!settings || !settings.mpAccessToken) {
      throw new Error('Credenciais do Mercado Pago não configuradas para esta empresa.');
    }

    return new MercadoPagoConfig({
      accessToken: settings.mpAccessToken,
      options: { timeout: 5000 }
    });
  }

  /**
   * Cria uma Preferência de Pagamento (Checkout Pro) no Mercado Pago
   * Permite que o cliente pague por PIX, Boleto ou Cartão
   */
  async createCheckoutPreference(tenantId: string, chargeData: {
    amount: number;
    description: string;
    payerEmail: string;
    payerFirstName: string;
    payerLastName?: string;
  }) {
    try {
      const client = await this.getClient(tenantId);
      const preference = new Preference(client);

      const body = {
        items: [
          {
            id: `charge-${Date.now()}`,
            title: chargeData.description,
            quantity: 1,
            unit_price: chargeData.amount,
            currency_id: 'BRL'
          }
        ],
        payer: {
          email: chargeData.payerEmail || 'email@padrao.com',
          name: chargeData.payerFirstName,
          surname: chargeData.payerLastName,
        },
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12
        },
        back_urls: {
          success: 'https://www.mercadopago.com.br/', // URL genérica já que a cobrança é via WhatsApp
          failure: 'https://www.mercadopago.com.br/',
          pending: 'https://www.mercadopago.com.br/'
        },
        auto_return: 'approved',
        external_reference: `${tenantId}-${Date.now()}`
      };

      const response = await preference.create({ body });

      return {
        id: response.id,
        initPoint: response.init_point, // Link do checkout (Cartão, PIX, Boleto)
        sandboxInitPoint: response.sandbox_init_point
      };
    } catch (error) {
      console.error('Erro ao criar preferência de checkout no Mercado Pago:', error);
      throw error;
    }
  }

  /**
   * Consulta o status de um pagamento no Mercado Pago
   */
  async getPaymentStatus(tenantId: string, paymentId: number) {
    try {
      const client = await this.getClient(tenantId);
      const payment = new Payment(client);
      
      const response = await payment.get({ id: paymentId });
      return response;
    } catch (error) {
      console.error(`Erro ao consultar pagamento ${paymentId} no Mercado Pago:`, error);
      throw error;
    }
  }
}

export const mercadoPagoService = new MercadoPagoService();
