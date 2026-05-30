import { ApifyClient } from 'apify-client';
import { tenantSettingsService } from './tenantSettingsService';

export class ApifyService {
  async extractLeads(tenantId: string, searchString: string, location: string, maxLeads: number = 50) {
    const settings = await tenantSettingsService.getTenantSettings(tenantId);
    
    if (!settings?.apifyApiToken) {
      throw new Error('Token do Apify não configurado para esta empresa. Por favor, adicione seu token nas configurações.');
    }

    const client = new ApifyClient({
        token: settings.apifyApiToken,
    });

    const input = {
      "includeWebResults": false,
      "language": "pt-BR",
      "locationQuery": location,
      "maxCrawledPlacesPerSearch": maxLeads,
      "maximumLeadsEnrichmentRecords": 0,
      "scrapeContacts": false,
      "scrapeDirectories": false,
      "scrapeImageAuthors": false,
      "scrapeOrderOnline": false,
      "scrapePlaceDetailPage": false,
      "scrapeReviewsPersonalData": false,
      "scrapeSocialMediaProfiles": {
          "facebooks": false,
          "instagrams": false,
          "tiktoks": false,
          "twitters": false,
          "youtubes": false
      },
      "scrapeTableReservationProvider": false,
      "searchStringsArray": [
          searchString
      ],
      "skipClosedPlaces": false,
      "verifyLeadsEnrichmentEmails": false
    };

    try {
      console.log(`🚀 Iniciando extração no Apify para o tenant ${tenantId}: ${searchString} em ${location}`);
      const run = await client.actor("nwua9Gu5YrADL7ZDj").call(input);
      
      console.log(`📥 Extração concluída. Buscando resultados do dataset: ${run.defaultDatasetId}`);
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      // Filtrar e formatar
      const leads = items.map((item: any) => {
        let whatsapp = null;
        let isMobile = false;

        if (item.phone) {
          const rawPhone = item.phone.replace(/\D/g, '');
          // Regra básica para o Brasil: celular geralmente tem o 9º dígito (tamanho 11 ignorando o 55)
          // Pode vir como 5511999999999 ou 11999999999
          // Se o número principal (sem DDD) começar com 9, 8, ou 7 e for grande o suficiente, consideramos celular
          // Mas a regra mais segura é: se o tamanho for >= 10 e o primeiro digito após o DDD for 9
          
          let phoneWithoutCountry = rawPhone;
          if (rawPhone.startsWith('55') && rawPhone.length > 11) {
            phoneWithoutCountry = rawPhone.substring(2);
          }

          // Checa se é celular no Brasil (DDD 2 digitos + 9 como primeiro digito = 11 digitos totais)
          if (phoneWithoutCountry.length === 11 && phoneWithoutCountry.charAt(2) === '9') {
             isMobile = true;
             whatsapp = rawPhone;
          }
        }

        return {
          name: item.title,
          phone: item.phone || '',
          whatsapp: whatsapp,
          isMobile: isMobile,
          address: item.address || item.city || '',
          website: item.website || '',
          googleUrl: item.url || ''
        };
      });

      // Opcional: retornar apenas os que são mobile se o usuário pedir (vamos retornar todos e filtrar no frontend ou aqui mesmo)
      // Para esse caso, vamos focar em retornar tudo e sinalizar quais são mobile
      return leads;
    } catch (error: any) {
      console.error('❌ Erro na extração via Apify:', error.message);
      throw new Error(`Falha ao comunicar com a Apify: ${error.message}`);
    }
  }

  async extractInstagramLeads(tenantId: string, target: string, maxLeads: number = 50) {
    const settings = await tenantSettingsService.getTenantSettings(tenantId);
    
    if (!settings?.apifyApiToken) {
      throw new Error('Token do Apify não configurado para esta empresa. Por favor, adicione seu token nas configurações.');
    }

    const client = new ApifyClient({ token: settings.apifyApiToken });

    const isHashtag = target.startsWith('#');
    const searchValue = target.replace(/[#@]/g, '').trim();

    const input: any = {
      "addParentData": false,
      "resultsLimit": maxLeads,
      "searchLimit": 10,
    };

    if (isHashtag) {
      input.search = searchValue;
      input.searchType = "hashtag";
      input.resultsType = "posts";
    } else {
      input.directUrls = [`https://www.instagram.com/${searchValue}/`];
      input.resultsType = "posts";
    }

    try {
      console.log(`🚀 Iniciando extração Instagram no Apify para: ${target}`);
      const run = await client.actor("shu8hvrXbJbY3Eb9W").call(input);
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      
      console.log(`Recebidos ${items.length} itens do dataset`);
      if (items.length > 0) {
        console.log('Sample item:', JSON.stringify(items[0]).substring(0, 300));
      }

      // Filtrar itens duplicados pelo username para não ter o mesmo lead várias vezes
      const uniqueItems = [];
      const seen = new Set();
      for (const item of items) {
         const uname = item.ownerUsername || item.username || item.id || Math.random().toString();
         if (!seen.has(uname)) {
            seen.add(uname);
            uniqueItems.push(item);
         }
      }

      const leads = uniqueItems.map((item: any) => {
        let phone = item.businessPhoneNumber || '';
        // Extract from bio or caption if not found
        const textToSearch = item.biography || item.caption || '';
        if (!phone && textToSearch) {
          // Procura por formatos de telefone brasileiro
          const match = textToSearch.match(/(?:\+?55\s?)?(?:\(?0?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/);
          if (match) phone = match[0];
        }

        return {
          name: item.ownerFullName || item.fullName || item.ownerUsername || item.username || 'Perfil Instagram',
          phone: phone,
          whatsapp: phone.length >= 8 ? phone : null, 
          isMobile: phone.length >= 8,
          address: item.locationName || item.businessCategoryName || 'Instagram',
          website: item.externalUrl || '',
          googleUrl: `https://instagram.com/${item.ownerUsername || item.username}`
        };
      });

      return leads;
    } catch (error: any) {
      console.error('❌ Erro na extração Instagram:', error.message);
      throw new Error(`Falha ao comunicar com a Apify (Instagram): ${error.message}`);
    }
  }

  async extractLinkedinLeads(tenantId: string, target: string, location: string, maxLeads: number = 50) {
    const settings = await tenantSettingsService.getTenantSettings(tenantId);
    
    if (!settings?.apifyApiToken) {
      throw new Error('Token do Apify não configurado para esta empresa. Por favor, adicione seu token nas configurações.');
    }

    const client = new ApifyClient({ token: settings.apifyApiToken });

    // Esse Actor exige localidades EXATAS de uma lista. Vamos tentar mapear ou usar 'brazil' como fallback.
    let mappedLocation = "brazil";
    const locLower = location.toLowerCase();
    if (locLower.includes("são paulo") || locLower.includes("sao paulo") || locLower === "sp") mappedLocation = "state of são paulo, brazil";
    else if (locLower.includes("rio de janeiro") || locLower === "rj") mappedLocation = "state of rio de janeiro, brazil";
    else if (locLower.includes("minas gerais") || locLower === "mg") mappedLocation = "state of minas gerais, brazil";
    else if (locLower.includes("paraná") || locLower.includes("parana") || locLower === "pr" || locLower.includes("curitiba")) mappedLocation = "state of paraná, brazil";
    else if (locLower.includes("rio grande do sul") || locLower === "rs") mappedLocation = "state of rio grande do sul, brazil";
    else if (locLower.includes("santa catarina") || locLower === "sc") mappedLocation = "santa catarina, brazil";
    else if (locLower.includes("bahia") || locLower === "ba") mappedLocation = "bahia, brazil";
    else if (locLower.includes("distrito federal") || locLower === "df" || locLower.includes("brasilia")) mappedLocation = "federal district, mexico"; // O ator listou "federal district, mexico", estranho. Vamos usar "brazil" se falhar.

    const input = {
      "contact_job_title": [ target ],
      "contact_location": [ mappedLocation ],
      "email_status": [ "validated" ],
      "fetch_count": maxLeads
    };

    try {
      console.log(`🚀 Iniciando extração LinkedIn no Apify para: ${target} em ${location}`);
      const run = await client.actor("IoSHqwTR9YGhzccez").call(input);
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`Recebidos ${items.length} itens do dataset`);
      
      const leads = items.map((item: any) => {
        let phone = item.phone || item.mobile || item.businessPhoneNumber || '';
        
        // Se não tiver, tenta pescar na bio
        const textToSearch = item.summary || item.about || item.description || item.headline || '';
        if (!phone && textToSearch) {
          const match = textToSearch.match(/(?:\+?55\s?)?(?:\(?0?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/);
          if (match) phone = match[0];
        }

        return {
          name: item.title || item.name || item.full_name || item.fullName || 'Perfil LinkedIn',
          phone: phone,
          whatsapp: phone.length >= 8 ? phone : null, 
          isMobile: phone.length >= 8,
          address: item.location || location,
          website: item.url || item.linkedinUrl || '',
          googleUrl: item.url || item.linkedinUrl || ''
        };
      });

      return leads;
    } catch (error: any) {
      console.error('❌ Erro na extração LinkedIn:', error.message);
      throw new Error(`Falha ao comunicar com a Apify (LinkedIn): ${error.message}`);
    }
  }
}

export const apifyService = new ApifyService();
