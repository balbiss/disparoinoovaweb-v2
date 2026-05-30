import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { apifyService } from '../services/apifyService';

export class LeadExtractorController {
  static async extractLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { searchString, location, maxLeads } = req.body;

      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Tenant não identificado' });
      }

      if (!searchString || !location) {
        return res.status(400).json({ 
          success: false, 
          message: 'Termo de busca e localidade são obrigatórios' 
        });
      }

      const leads = await apifyService.extractLeads(
        tenantId, 
        searchString, 
        location, 
        maxLeads ? parseInt(maxLeads) : 50
      );

      res.json({
        success: true,
        message: 'Leads extraídos com sucesso',
        count: leads.length,
        leads: leads
      });
    } catch (error: any) {
      console.error('❌ LeadExtractorController.extractLeads - erro:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro interno do servidor'
      });
    }
  }

  static async extractInstagramLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { target, maxLeads } = req.body;

      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant não identificado' });
      if (!target) return res.status(400).json({ success: false, message: 'Perfil ou hashtag é obrigatório' });

      // TODO: Substituir por chamada real ao apifyService.extractInstagramLeads quando o usuário definir o Actor ID
      const leads = await apifyService.extractInstagramLeads(
        tenantId,
        target,
        maxLeads ? parseInt(maxLeads) : 50
      );

      res.json({
        success: true,
        message: 'Leads do Instagram extraídos com sucesso',
        count: leads.length,
        leads: leads
      });

    } catch (error: any) {
      console.error('❌ LeadExtractorController.extractInstagramLeads - erro:', error);
      res.status(500).json({ success: false, message: error.message || 'Erro interno' });
    }
  }

  static async extractLinkedinLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { jobTitle, location, maxLeads } = req.body;

      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant não identificado' });
      if (!jobTitle || !location) return res.status(400).json({ success: false, message: 'Cargo e localidade obrigatórios' });

      const leads = await apifyService.extractLinkedinLeads(
        tenantId,
        jobTitle,
        location,
        maxLeads ? parseInt(maxLeads) : 50
      );

      res.json({
        success: true,
        message: 'Leads do LinkedIn extraídos com sucesso',
        count: leads.length,
        leads: leads
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Erro interno' });
    }
  }

  static async extractFacebookLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.tenantId;
      const { niche, city, maxLeads } = req.body;

      if (!tenantId) return res.status(401).json({ success: false, message: 'Tenant não identificado' });
      if (!niche || !city) return res.status(400).json({ success: false, message: 'Nicho e cidade obrigatórios' });

      // TODO: Substituir por chamada real ao apifyService quando o usuário definir o Actor ID
      const mockLeads = [
        { name: `Página FB ${niche}`, phone: '+5511966664444', whatsapp: '+5511966664444', isMobile: true, address: city, website: `https://facebook.com/pagina`, googleUrl: '' }
      ];

      setTimeout(() => {
        res.json({ success: true, message: 'Mock Extraído com sucesso', count: mockLeads.length, leads: mockLeads });
      }, 2000);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Erro interno' });
    }
  }
}
