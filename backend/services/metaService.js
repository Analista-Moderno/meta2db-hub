import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const buildMetaApiUrl = (accountId, jobConfig, dateStart = null, dateEnd = null) => {
  const { apiVersion, level, datePreset, timeIncrement, fields } = jobConfig;
  
  // Mapeamento dos blocos de campos solicitados via UI
  const availableFields = [];
  availableFields.push('account_id','campaign_id','adset_id','ad_id');
  if (level === 'ad') availableFields.push('ad_name');
  if (level === 'campaign') availableFields.push('campaign_name');
  
  const parsedFields = typeof fields === 'string' ? JSON.parse(fields) : fields;

  if (parsedFields.basicMetrics) {
    availableFields.push('spend','impressions','reach','frequency','cpm','cpc','inline_link_clicks','inline_link_click_ctr','objective');
  }
  if (parsedFields.standardEvents) {
    availableFields.push('actions','action_values');
  }
  if (parsedFields.videoEngagement) {
    availableFields.push('video_play_actions','video_p25_watched_actions','video_p50_watched_actions','video_p75_watched_actions','video_p100_watched_actions');
  }

  // Breakdowns
  const breakdowns = [];
  if (parsedFields.demographics) breakdowns.push('age','gender');
  if (parsedFields.geographics) breakdowns.push('region','country');
  if (parsedFields.platforms) breakdowns.push('publisher_platform','platform_position','device_platform');

  let url = `https://graph.facebook.com/${apiVersion}/act_${accountId}/insights?fields=${availableFields.join(',')}&level=${level}&time_increment=${timeIncrement}`;
  
  if (breakdowns.length > 0) {
    url += `&breakdowns=${breakdowns.join(',')}`;
  }

  // Backfill logic or Date preset
  if (dateStart && dateEnd) {
    url += `&time_range={'since':'${dateStart}','until':'${dateEnd}'}`;
  } else {
    url += `&date_preset=${datePreset}`;
  }

  return url;
};

export const fetchMetaInsights = async (userId, accountId, jobConfig, dateStart = null, dateEnd = null) => {
  const credentials = await prisma.metaOAuthConfig.findUnique({ where: { userId } });
  
  if (!credentials || !credentials.accessToken) {
    throw new Error('Usuário não possui token do Meta configurado.');
  }

  const url = buildMetaApiUrl(accountId, jobConfig, dateStart, dateEnd);

  try {
    const response = await axios.get(url, {
      params: { access_token: credentials.accessToken }
    });

    // Handle Pagination
    let allData = response.data.data;
    let nextUrl = response.data.paging?.next;

    // Seguindo links de paginação se a requisição retornar páginas (Limite padrão Meta é ~25)
    while (nextUrl) {
      const nextPage = await axios.get(nextUrl);
      if (nextPage.data.data) {
        allData = allData.concat(nextPage.data.data);
      }
      nextUrl = nextPage.data.paging?.next;
    }

    return allData;

  } catch (error) {
    // Tratamento avançado de Rate Limit do Meta Ads API
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;
      if (fbError.code === 17 || fbError.code === 80004) {
        throw new Error('META_RATE_LIMIT_REACHED');
      }
    }
    throw error;
  }
};
